from django.urls import path

from . import views

urlpatterns = [
    path("connect/", views.GelatoConnectView.as_view(), name="gelato-connect"),
    path("select-store/", views.GelatoSelectStoreView.as_view(), name="gelato-select-store"),
    path("disconnect/", views.GelatoDisconnectView.as_view(), name="gelato-disconnect"),
    path("status/", views.GelatoStatusView.as_view(), name="gelato-status"),
    path("templates/", views.GelatoTemplateListView.as_view(), name="gelato-templates"),
    path("templates/sync/", views.GelatoTemplateSyncView.as_view(), name="gelato-templates-sync"),
    path("export/", views.GelatoExportView.as_view(), name="gelato-export"),
    path("tasks/", views.GelatoTaskStatusView.as_view(), name="gelato-tasks"),
    path("upload-temp-image/", views.UploadTempDesignView.as_view(), name="gelato-upload-temp-image"),
]
