from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .manager import SocialManager, SocialProviderNotFoundError
from .models import SocialPlatform, SocialPost
from .providers.base_social import SocialProviderError
from .serializers import PublishSingleSocialPostSerializer

logger = logging.getLogger(__name__)


def _get_user_pinterest_platform(request):
    return SocialPlatform.objects.filter(
        user=request.user,
        platform=SocialPlatform.Platform.PINTEREST,
    ).first()


class GetPinterestBoardsView(APIView):
    """GET — Pinterest-Boards des verbundenen Kontos."""

    def get(self, request):
        sp = _get_user_pinterest_platform(request)
        if not sp or not sp.access_token_enc:
            return Response(
                {
                    "detail": (
                        "Pinterest ist nicht verbunden. Bitte unter Integrationen → "
                        "Marketing verknüpfen."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = sp.get_access_token()
        if not token.strip():
            return Response(
                {"detail": "Pinterest-Zugriffstoken fehlt oder ist ungültig."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            boards = SocialManager.list_boards("pinterest", access_token=token)
        except SocialProviderNotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except SocialProviderError as exc:
            logger.warning("Pinterest boards: %s", exc)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"boards": boards}, status=status.HTTP_200_OK)


class PublishSingleSocialPostView(APIView):
    """POST — Einen Pin synchron veröffentlichen und SocialPost speichern."""

    def post(self, request):
        ser = PublishSingleSocialPostSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        sp = _get_user_pinterest_platform(request)
        if not sp or not sp.access_token_enc:
            return Response(
                {
                    "detail": (
                        "Pinterest ist nicht verbunden. Bitte unter Integrationen → "
                        "Marketing verknüpfen."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = sp.get_access_token()
        if not token.strip():
            return Response(
                {"detail": "Pinterest-Zugriffstoken fehlt oder ist ungültig."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        post = SocialPost.objects.create(
            user=request.user,
            social_platform=sp,
            image_url=data["image_url"],
            title=data["title"],
            caption=data["caption"],
            destination_link=data["destination_url"],
            status=SocialPost.Status.DRAFT,
        )

        post_data = {
            "board_id": data["board_id"],
            "image_url": data["image_url"],
            "title": data["title"],
            "description": data["caption"],
            "link": data["destination_url"],
        }

        try:
            result = SocialManager.post_single(
                data["platform"],
                access_token=token,
                post_data=post_data,
            )
        except SocialProviderNotFoundError as exc:
            post.status = SocialPost.Status.FAILED
            post.last_error = str(exc)
            post.save(update_fields=["status", "last_error", "updated_at"])
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except SocialProviderError as exc:
            err = str(exc)
            post.status = SocialPost.Status.FAILED
            post.last_error = err
            post.save(update_fields=["status", "last_error", "updated_at"])
            return Response({"detail": err}, status=status.HTTP_400_BAD_REQUEST)

        pin_id = str(result.get("pin_id") or "")
        post.status = SocialPost.Status.POSTED
        post.external_pin_id = pin_id[:64]
        post.last_error = ""
        post.save(
            update_fields=["status", "external_pin_id", "last_error", "updated_at"]
        )

        return Response(
            {
                "id": str(post.id),
                "pin_id": pin_id,
                "status": "posted",
            },
            status=status.HTTP_200_OK,
        )
