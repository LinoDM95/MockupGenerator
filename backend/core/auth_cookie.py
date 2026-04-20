"""JWT from HttpOnly cookie (with optional Authorization header fallback)."""

from __future__ import annotations

from rest_framework_simplejwt.authentication import JWTAuthentication

ACCESS_COOKIE_NAME = "access_token"


class JWTCookieAuthentication(JWTAuthentication):
    """Prefer ``Authorization``; otherwise read access JWT from cookie."""

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw = self.get_raw_token(header)
            if raw is None:
                return None
            validated = self.get_validated_token(raw)
            return self.get_user(validated), validated

        raw = request.COOKIES.get(ACCESS_COOKIE_NAME)
        if not raw:
            return None
        validated = self.get_validated_token(raw)
        return self.get_user(validated), validated
