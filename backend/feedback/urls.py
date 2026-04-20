from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AckNotificationsView, FeedbackThreadViewSet, PendingNotificationsView

router = DefaultRouter()
router.register("threads", FeedbackThreadViewSet, basename="feedbackthread")

urlpatterns = [
    path(
        "notifications/pending/",
        PendingNotificationsView.as_view(),
        name="feedback-notifications-pending",
    ),
    path(
        "notifications/ack/",
        AckNotificationsView.as_view(),
        name="feedback-notifications-ack",
    ),
] + router.urls
