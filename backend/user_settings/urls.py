from django.urls import path

from . import views

urlpatterns = [
    path("integrations/", views.IntegrationsStatusView.as_view(), name="settings-integrations-status"),
    path("integrations/save/", views.IntegrationsSaveView.as_view(), name="settings-integrations-save"),
    path("integrations/test/", views.IntegrationsTestView.as_view(), name="settings-integrations-test"),
]
