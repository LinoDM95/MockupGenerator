"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404, HttpResponse
from django.urls import include, path, re_path

from core.auth_cookie_views import (
    CookieLoginView,
    CookieLogoutView,
    CookieTokenRefreshView,
    CsrfBootstrapView,
)
from core.views import ChangePasswordView, CurrentUserView


def healthz(_request):
    """Liveness für Load Balancer / Render (kein DB-Hit)."""
    return HttpResponse("ok", content_type="text/plain; charset=utf-8")


def spa_entry(_request):
    """Serve built Vite ``index.html`` (production: ``collectstatic``)."""
    index = Path(settings.STATIC_ROOT) / "index.html"
    if not index.is_file():
        raise Http404("SPA build missing (run frontend build + collectstatic).")
    return FileResponse(index.open("rb"), content_type="text/html")


urlpatterns = [
    path("healthz", healthz, name="healthz"),
    path("admin/", admin.site.urls),
    path("api/auth/csrf/", CsrfBootstrapView.as_view(), name="auth-csrf"),
    path("api/auth/login/", CookieLoginView.as_view(), name="auth-login"),
    path("api/auth/refresh/", CookieTokenRefreshView.as_view(), name="auth-refresh"),
    path("api/auth/logout/", CookieLogoutView.as_view(), name="auth-logout"),
    # Explizit vor include("core.urls"), damit /api/auth/me/ sicher gematcht wird (Profil / Passwort).
    path("api/auth/me/", CurrentUserView.as_view(), name="auth-me"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("api/", include("core.urls")),
    path("api/gelato/", include("gelato_integration.urls")),
    path("api/ai/", include("ai_integration.urls")),
    path("api/upscaler/", include("upscaler.urls")),
    path("api/automation/", include("automation.urls")),
    path("api/marketing/", include("marketing_integration.urls")),
    path("api/settings/", include("user_settings.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(r"^(?!api|admin|media|static).*$", spa_entry),
    ]
