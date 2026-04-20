"""JWT-over-HttpOnly-cookie login, refresh, logout with CSRF on unsafe methods."""

from __future__ import annotations

from django.conf import settings
from django.middleware.csrf import get_token as django_get_csrf_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _cookie_flags() -> dict:
    secure = not settings.DEBUG
    return {
        "path": "/",
        "httponly": True,
        "secure": secure,
        "samesite": "Lax",
    }


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    flags = _cookie_flags()
    access_sec = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_sec = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        ACCESS_COOKIE_NAME, access, max_age=access_sec, **flags
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME, refresh, max_age=refresh_sec, **flags
    )


def _clear_auth_cookies(response: Response) -> None:
    flags = _cookie_flags()
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/", samesite=flags["samesite"], secure=flags["secure"])
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/", samesite=flags["samesite"], secure=flags["secure"])


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfBootstrapView(APIView):
    """GET /api/auth/csrf/ — setzt csrftoken-Cookie und liefert Token im JSON."""

    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({"csrftoken": django_get_csrf_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class CookieLoginView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "login"

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "Ungültige Zugangsdaten."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        access = serializer.validated_data["access"]
        refresh = serializer.validated_data["refresh"]
        response = Response({"detail": "Login erfolgreich."})
        _set_auth_cookies(response, access, refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class CookieTokenRefreshView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "login"

    def post(self, request):
        raw = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not raw:
            return Response(
                {"detail": "Kein Refresh-Token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = TokenRefreshSerializer(data={"refresh": raw})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response(
                {"detail": "Refresh ungültig."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response

        data = serializer.validated_data
        access = data["access"]
        refresh = data.get("refresh", raw)
        response = Response({"detail": "Refreshed."})
        _set_auth_cookies(response, access, refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class CookieLogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        raw = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Ausgeloggt."})
        _clear_auth_cookies(response)
        return response
