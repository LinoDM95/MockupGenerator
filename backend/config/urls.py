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
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.views import ChangePasswordView, CurrentUserView

urlpatterns = [
    path("admin/", admin.site.urls),
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
