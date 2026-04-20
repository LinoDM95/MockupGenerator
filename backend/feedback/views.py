from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Max, Prefetch
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FeedbackMessage, FeedbackNotification, FeedbackThread
from .serializers import (
    AckNotificationsSerializer,
    FeedbackMessageCreateSerializer,
    FeedbackMessageSerializer,
    FeedbackThreadCreateSerializer,
    FeedbackThreadDetailSerializer,
    FeedbackThreadListSerializer,
    FeedbackThreadStaffPatchSerializer,
)
from .services import notify_staff_message, notify_status_changed, notify_thread_removed


class FeedbackPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 50
    page_size_query_param = "page_size"


def _messages_prefetch() -> Prefetch:
    return Prefetch(
        "messages",
        queryset=FeedbackMessage.objects.select_related("author").order_by("created_at", "id"),
    )


class FeedbackThreadViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    pagination_class = FeedbackPagination
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            base = FeedbackThread.objects.select_related("user")
        else:
            base = FeedbackThread.objects.filter(user=user, removed_at__isnull=True)

        base = base.annotate(
            message_count=Count("messages", distinct=True),
            last_message_at=Max("messages__created_at"),
        )

        if self.action == "retrieve":
            base = base.prefetch_related(_messages_prefetch())
        return base.order_by("-updated_at", "-id")

    def get_serializer_class(self):
        if self.action == "create":
            return FeedbackThreadCreateSerializer
        if self.action in ("partial_update", "update"):
            return FeedbackThreadStaffPatchSerializer
        if self.action == "retrieve":
            return FeedbackThreadDetailSerializer
        return FeedbackThreadListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def _detail_response(
        self,
        thread: FeedbackThread,
        *,
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        t = (
            FeedbackThread.objects.filter(pk=thread.pk)
            .select_related("user")
            .prefetch_related(_messages_prefetch())
            .annotate(
                message_count=Count("messages", distinct=True),
                last_message_at=Max("messages__created_at"),
            )
            .first()
        )
        if not t:
            return Response(status=status.HTTP_404_NOT_FOUND)
        data = FeedbackThreadDetailSerializer(t, context=self.get_serializer_context()).data
        return Response(data, status=status_code)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sub = (ser.validated_data.get("subject") or "").strip()
        msg = ser.validated_data["message"].strip()
        with transaction.atomic():
            thread = FeedbackThread.objects.create(user=request.user, subject=sub)
            FeedbackMessage.objects.create(
                thread=thread,
                author=request.user,
                body=msg,
                is_staff_message=False,
            )
        return self._detail_response(thread, status_code=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {"detail": "Nur für Team-Mitglieder."},
                status=status.HTTP_403_FORBIDDEN,
            )
        thread = self.get_object()
        old_status = thread.status
        ser = self.get_serializer(thread, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        thread.refresh_from_db()
        if old_status != thread.status:
            notify_status_changed(thread, old_status)
        return self._detail_response(thread)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {"detail": "Nur für Team-Mitglieder."},
                status=status.HTTP_403_FORBIDDEN,
            )
        thread = self.get_object()
        thread.removed_at = timezone.now()
        thread.save(update_fields=["removed_at", "updated_at"])
        notify_thread_removed(thread)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="messages")
    def add_message(self, request, pk=None):
        thread = self.get_object()
        if thread.removed_at and not request.user.is_staff:
            return Response(status=status.HTTP_404_NOT_FOUND)

        ser = FeedbackMessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        body = ser.validated_data["body"].strip()
        is_staff_message = bool(request.user.is_staff)
        msg = FeedbackMessage.objects.create(
            thread=thread,
            author=request.user,
            body=body,
            is_staff_message=is_staff_message,
        )
        thread.save(update_fields=["updated_at"])
        if is_staff_message:
            notify_staff_message(msg)
        return Response(
            FeedbackMessageSerializer(msg).data,
            status=status.HTTP_201_CREATED,
        )


class PendingNotificationsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        qs = (
            FeedbackNotification.objects.filter(
                recipient=request.user,
                acknowledged_at__isnull=True,
            )
            .order_by("created_at")[:40]
        )
        results = [
            {
                "id": str(n.id),
                "kind": n.kind,
                "title": n.title,
                "body": n.body,
                "thread_id": str(n.thread_id) if n.thread_id else None,
                "created_at": n.created_at.isoformat(),
            }
            for n in qs
        ]
        return Response({"results": results})


class AckNotificationsView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        ser = AckNotificationsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["ids"]
        now = timezone.now()
        n = FeedbackNotification.objects.filter(
            recipient=request.user,
            id__in=ids,
            acknowledged_at__isnull=True,
        ).update(acknowledged_at=now)
        return Response({"acknowledged": n})
