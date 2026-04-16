"""Pinterest OAuth2 — Start, Callback, Status, Disconnect."""

from __future__ import annotations

import logging
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from etsy.oauth_utils import generate_oauth_state

from .models import PinterestOAuthState, SocialPlatform
from .pinterest_oauth import exchange_authorization_code
from .serializers import PinterestOAuthCallbackSerializer

logger = logging.getLogger(__name__)

PINTEREST_OAUTH_AUTHORIZE = "https://www.pinterest.com/oauth/"


def _require_pinterest_oauth_config() -> None:
    if not getattr(settings, "PINTEREST_APP_ID", "").strip():
        raise ValueError("PINTEREST_APP_ID muss gesetzt sein.")
    if not getattr(settings, "PINTEREST_REDIRECT_URI", "").strip():
        raise ValueError("PINTEREST_REDIRECT_URI muss gesetzt sein.")
    if not getattr(settings, "PINTEREST_APP_SECRET", "").strip():
        raise ValueError("PINTEREST_APP_SECRET muss gesetzt sein.")


class PinterestOAuthStartView(APIView):
    """GET — Redirect-URL für Pinterest OAuth."""

    def get(self, request):
        try:
            _require_pinterest_oauth_config()
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        state = generate_oauth_state()
        expires_at = timezone.now() + timedelta(minutes=10)
        PinterestOAuthState.objects.create(
            user=request.user,
            state=state,
            expires_at=expires_at,
        )

        scopes = getattr(settings, "PINTEREST_SCOPES", "").strip()
        if not scopes:
            scopes = (
                "pins:read,pins:write,boards:read,boards:write,user_accounts:read"
            )
        scopes = scopes.replace(" ", ",")

        q = urlencode(
            {
                "client_id": settings.PINTEREST_APP_ID.strip(),
                "redirect_uri": settings.PINTEREST_REDIRECT_URI.strip(),
                "response_type": "code",
                "scope": scopes,
                "state": state,
            },
        )
        authorization_url = f"{PINTEREST_OAUTH_AUTHORIZE}?{q}"
        return Response({"authorization_url": authorization_url, "state": state})


class PinterestOAuthCallbackView(APIView):
    """POST — Authorization Code gegen Tokens tauschen und SocialPlatform speichern."""

    def post(self, request):
        try:
            _require_pinterest_oauth_config()
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        ser = PinterestOAuthCallbackSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        code = ser.validated_data["code"]
        state = ser.validated_data["state"]

        row = (
            PinterestOAuthState.objects.filter(user=request.user, state=state)
            .order_by("-created_at")
            .first()
        )
        if not row or row.is_expired():
            return Response(
                {"detail": "Ungültiger oder abgelaufener OAuth-State."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        row.delete()

        redirect_uri = settings.PINTEREST_REDIRECT_URI.strip()

        try:
            token_json = exchange_authorization_code(
                code=code,
                redirect_uri=redirect_uri,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        access = str(token_json.get("access_token", "") or "")
        refresh = str(token_json.get("refresh_token", "") or "")
        expires_in = int(token_json.get("expires_in", 3600))
        scope_str = str(token_json.get("scope", "") or settings.PINTEREST_SCOPES)

        expires_at = timezone.now() + timedelta(seconds=max(60, expires_in))

        sp, _ = SocialPlatform.objects.get_or_create(
            user=request.user,
            platform=SocialPlatform.Platform.PINTEREST,
            defaults={"scopes": scope_str[:512]},
        )
        sp.set_access_token(access)
        sp.set_refresh_token(refresh)
        sp.expires_at = expires_at
        sp.scopes = scope_str[:512]
        sp.save()

        return Response(
            {
                "ok": True,
                "expires_at": expires_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class PinterestOAuthDisconnectView(APIView):
    """DELETE — Pinterest-Verknüpfung und OAuth-States entfernen."""

    def delete(self, request):
        PinterestOAuthState.objects.filter(user=request.user).delete()
        SocialPlatform.objects.filter(
            user=request.user,
            platform=SocialPlatform.Platform.PINTEREST,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PinterestConnectionStatusView(APIView):
    """GET — Pinterest verbunden?"""

    def get(self, request):
        sp = SocialPlatform.objects.filter(
            user=request.user,
            platform=SocialPlatform.Platform.PINTEREST,
        ).first()
        connected = bool(
            sp and sp.access_token_enc and sp.get_access_token().strip()
        )
        return Response(
            {
                "connected": connected,
                "expires_at": sp.expires_at.isoformat() if sp and sp.expires_at else None,
            }
        )
