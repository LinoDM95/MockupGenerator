from django.urls import path

from .views import AutomationJobCreateView, AutomationJobDetailView

urlpatterns = [
    path("jobs/", AutomationJobCreateView.as_view(), name="automation-job-create"),
    path(
        "jobs/<uuid:pk>/",
        AutomationJobDetailView.as_view(),
        name="automation-job-detail",
    ),
]
