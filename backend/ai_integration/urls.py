from django.urls import path

from . import views

urlpatterns = [
    path("connect/", views.AIConnectView.as_view(), name="ai-connect"),
    path(
        "vertex-service-account/",
        views.AIVertexServiceAccountView.as_view(),
        name="ai-vertex-service-account",
    ),
    path("update-model/", views.AIUpdateModelView.as_view(), name="ai-update-model"),
    path("status/", views.AIStatusView.as_view(), name="ai-status"),
    path("disconnect/", views.AIDisconnectView.as_view(), name="ai-disconnect"),
    path("generate-listing/", views.GenerateListingDataView.as_view(), name="ai-generate-listing"),
]
