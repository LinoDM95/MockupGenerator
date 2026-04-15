from django.urls import path

from . import views

urlpatterns = [
    path("upscale/", views.UpscaleImageView.as_view(), name="upscaler-upscale"),
]
