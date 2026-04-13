from django.urls import path

from . import views

urlpatterns = [
    path("oauth/start/", views.EtsyOAuthStartView.as_view(), name="etsy-oauth-start"),
    path("oauth/callback/", views.EtsyOAuthCallbackView.as_view(), name="etsy-oauth-callback"),
    path("oauth/disconnect/", views.EtsyOAuthDisconnectView.as_view(), name="etsy-oauth-disconnect"),
    path("listings/", views.EtsyListingsView.as_view(), name="etsy-listings"),
    path("bulk-assets/", views.EtsyBulkAssetUploadView.as_view(), name="etsy-bulk-assets"),
    path("bulk-jobs/", views.EtsyBulkJobCreateView.as_view(), name="etsy-bulk-jobs"),
    path("bulk-jobs/<uuid:job_id>/", views.EtsyBulkJobDetailView.as_view(), name="etsy-bulk-job-detail"),
]
