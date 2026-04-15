from __future__ import annotations

import logging
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EtsyBulkAsset, EtsyBulkJob, EtsyConnection, EtsyOAuthState
from .oauth_utils import code_challenge_s256, generate_code_verifier, generate_oauth_state
from .serializers import (
    BulkJobCreateSerializer,
    EtsyBulkJobSerializer,
    OAuthCallbackSerializer,
    validate_asset_belongs_user,
)
from .services.etsy_client import EtsyOpenApiClient, exchange_authorization_code
from .services.normalize import get_listing_id, get_results, get_shop_id, get_user_id
from .services.rate_limit import EtsyRateLimiter
from .services.tokens import ensure_fresh_access_token
from .tasks import process_etsy_bulk_job

logger = logging.getLogger(__name__)

ETSY_OAUTH_AUTHORIZE = "https://www.etsy.com/oauth/connect"


def _require_etsy_config() -> None:
    if not settings.ETSY_CLIENT_ID or not settings.ETSY_REDIRECT_URI:
        raise ValueError("ETSY_CLIENT_ID und ETSY_REDIRECT_URI müssen gesetzt sein.")


def _get_user_connection_or_error(user) -> tuple[EtsyConnection | None, Response | None]:
    conn = EtsyConnection.objects.filter(user=user).first()
    if not conn or not conn.shop_id:
        return None, Response(
            {"detail": "Keine Etsy-Verknüpfung oder kein Shop."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return conn, None


class EtsyOAuthStartView(APIView):
    def get(self, request):
        try:
            _require_etsy_config()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        code_verifier = generate_code_verifier()
        challenge = code_challenge_s256(code_verifier)
        state = generate_oauth_state()
        expires_at = timezone.now() + timedelta(minutes=10)

        EtsyOAuthState.objects.create(
            user=request.user,
            state=state,
            code_verifier=code_verifier,
            expires_at=expires_at,
        )

        q = urlencode(
            {
                "response_type": "code",
                "client_id": settings.ETSY_CLIENT_ID,
                "redirect_uri": settings.ETSY_REDIRECT_URI,
                "scope": settings.ETSY_SCOPES.strip(),
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            },
        )
        authorization_url = f"{ETSY_OAUTH_AUTHORIZE}?{q}"
        return Response({"authorization_url": authorization_url, "state": state})


class EtsyOAuthCallbackView(APIView):
    def post(self, request):
        try:
            _require_etsy_config()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        ser = OAuthCallbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = ser.validated_data["code"]
        state = ser.validated_data["state"]

        row = (
            EtsyOAuthState.objects.filter(user=request.user, state=state)
            .order_by("-created_at")
            .first()
        )
        if not row or row.is_expired():
            return Response(
                {"detail": "Ungültiger oder abgelaufener OAuth-State."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code_verifier = row.code_verifier
        row.delete()

        try:
            token_json = exchange_authorization_code(
                code=code,
                redirect_uri=settings.ETSY_REDIRECT_URI,
                code_verifier=code_verifier,
            )
        except httpx.HTTPStatusError as e:
            logger.warning("Etsy token exchange failed: %s", e.response.text[:500])
            return Response(
                {"detail": "Token-Austausch bei Etsy fehlgeschlagen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        access = token_json.get("access_token", "")
        refresh = token_json.get("refresh_token", "")
        expires_in = int(token_json.get("expires_in", 3600))
        expires_at = timezone.now() + timedelta(seconds=expires_in)

        conn, _ = EtsyConnection.objects.get_or_create(user=request.user)
        conn.set_access_token(access)
        conn.set_refresh_token(refresh)
        conn.expires_at = expires_at
        conn.scopes = settings.ETSY_SCOPES.strip()

        rate = EtsyRateLimiter(settings.ETSY_API_RPS)
        client = EtsyOpenApiClient(access, rate_limiter=rate)

        def refresh_fn():
            return ensure_fresh_access_token(conn)

        try:
            me = client.get_json("/users/me", refresh_fn=refresh_fn)
            etsy_user_id = get_user_id(me)
            conn.etsy_user_id = etsy_user_id or None
            shops = client.get_json(f"/users/{etsy_user_id}/shops", refresh_fn=refresh_fn)
            shop_results = get_results(shops, "shops")
            if shop_results:
                conn.shop_id = get_shop_id(shop_results[0])
        except Exception as e:
            logger.exception("Etsy shop resolution failed: %s", e)
            conn.save()
            client.close()
            return Response(
                {
                    "detail": "Verbunden, aber Shop konnte nicht ermittelt werden — bitte Scopes prüfen.",
                    "partial": True,
                },
                status=status.HTTP_200_OK,
            )

        conn.save()
        client.close()
        return Response(
            {
                "ok": True,
                "shop_id": conn.shop_id,
                "etsy_user_id": conn.etsy_user_id,
            },
        )


class EtsyOAuthDisconnectView(APIView):
    def delete(self, request):
        EtsyOAuthState.objects.filter(user=request.user).delete()
        EtsyConnection.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EtsyListingsView(APIView):
    def get(self, request):
        conn, err = _get_user_connection_or_error(request.user)
        if err:
            return err

        try:
            access = ensure_fresh_access_token(conn)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        limit = min(int(request.query_params.get("limit", 25)), 100)
        offset = int(request.query_params.get("offset", 0))
        rate = EtsyRateLimiter(settings.ETSY_API_RPS)
        client = EtsyOpenApiClient(access, rate_limiter=rate)

        def refresh_fn():
            return ensure_fresh_access_token(conn)

        try:
            listings_data = client.get_json(
                f"/shops/{conn.shop_id}/listings/active",
                refresh_fn=refresh_fn,
                params={"limit": limit, "offset": offset},
            )
        except httpx.HTTPStatusError as e:
            return Response(
                {"detail": e.response.text[:1000]},
                status=e.response.status_code,
            )
        finally:
            client.close()

        results = get_results(listings_data)
        out = []
        rate2 = EtsyRateLimiter(settings.ETSY_API_RPS)
        client2 = EtsyOpenApiClient(ensure_fresh_access_token(conn), rate_limiter=rate2)

        def rf2():
            return ensure_fresh_access_token(conn)

        try:
            for listing in results:
                lid = get_listing_id(listing)
                if lid is None:
                    continue
                try:
                    imgs = client2.get_json(
                        f"/shops/{conn.shop_id}/listings/{lid}/images",
                        refresh_fn=rf2,
                    )
                    listing = {**listing, "images": get_results(imgs, "images")}
                except httpx.HTTPStatusError:
                    listing = {**listing, "images": []}
                out.append(listing)
        finally:
            client2.close()

        return Response(
            {
                "count": listings_data.get("count", len(out)),
                "results": out,
            },
        )


class EtsyBulkAssetUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        upload = request.FILES.get("image")
        if not upload:
            return Response({"detail": "Feld image erforderlich."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size and upload.size > 20 * 1024 * 1024:
            return Response({"detail": "Datei zu groß (max. 20 MB)."}, status=status.HTTP_400_BAD_REQUEST)

        asset = EtsyBulkAsset.objects.create(user=request.user, image=upload)
        return Response({"id": str(asset.id)}, status=status.HTTP_201_CREATED)


class EtsyBulkJobCreateView(APIView):
    def post(self, request):
        ser = BulkJobCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        items = ser.validated_data["items"]

        conn, err = _get_user_connection_or_error(request.user)
        if err:
            return err

        for it in items:
            for u in it.get("uploads", []):
                validate_asset_belongs_user(u["asset_id"], request.user)

        job = EtsyBulkJob.objects.create(
            user=request.user,
            status=EtsyBulkJob.Status.PENDING,
            payload={"items": items, "shop_id": int(conn.shop_id)},
        )
        try:
            async_result = process_etsy_bulk_job.delay(str(job.id))
            job.celery_task_id = async_result.id
            job.save(update_fields=["celery_task_id"])
        except Exception:
            logger.warning("Celery broker unavailable – running Etsy bulk job synchronously")
            process_etsy_bulk_job(str(job.id))

        return Response(EtsyBulkJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class EtsyBulkJobDetailView(APIView):
    def get(self, request, job_id):
        job = EtsyBulkJob.objects.filter(id=job_id, user=request.user).first()
        if not job:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(EtsyBulkJobSerializer(job).data)
