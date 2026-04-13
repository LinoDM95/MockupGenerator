from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, RegisterView, TemplateSetViewSet, TemplateViewSet

router = DefaultRouter()
router.register("sets", TemplateSetViewSet, basename="templateset")
router.register("templates", TemplateViewSet, basename="template")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/token/", LoginView.as_view(), name="auth-token"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("etsy/", include("etsy.urls")),
    path("", include(router.urls)),
]
