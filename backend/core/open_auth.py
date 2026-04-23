"""Optional: API-Zugriff ohne JWT (nur explizit per MOCKUP_AUTH_DISABLED, s. settings)."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication

User = get_user_model()


class DefaultUserAuthentication(BaseAuthentication):
    """
    Wenn ``MOCKUP_AUTH_DISABLED`` aktiv: nach fehlgeschlagenem Cookie/JWT
    den Nutzer per PK (``MOCKUP_OPEN_ACCESS_USER_ID``) oder den ersten
    User in der DB annehmen. Niemals in Produktion einschalten.
    """

    def authenticate(self, request):
        if not getattr(settings, "MOCKUP_AUTH_DISABLED", False):
            return None
        uid = getattr(settings, "MOCKUP_OPEN_ACCESS_USER_ID", None)
        if uid is not None:
            try:
                user = User.objects.get(pk=uid)
            except User.DoesNotExist:
                return None
        else:
            user = User.objects.order_by("pk").first()
        if not user:
            return None
        return (user, None)
