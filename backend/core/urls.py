from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RegisterView, TemplateSetViewSet, TemplateViewSet

router = DefaultRouter()
router.register("sets", TemplateSetViewSet, basename="templateset")
router.register("templates", TemplateViewSet, basename="template")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("etsy/", include("etsy.urls")),
    path("", include(router.urls)),
]
