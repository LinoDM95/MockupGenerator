from __future__ import annotations

from rest_framework import serializers

from .models import FeedbackMessage, FeedbackThread


class FeedbackMessageSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = FeedbackMessage
        fields = ("id", "body", "is_staff_message", "author_username", "created_at")
        read_only_fields = fields


class FeedbackThreadListSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True)
    last_message_at = serializers.DateTimeField(read_only=True, allow_null=True)
    user_username = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackThread
        fields = (
            "id",
            "subject",
            "status",
            "message_count",
            "last_message_at",
            "created_at",
            "updated_at",
            "removed_at",
            "user_username",
        )
        read_only_fields = fields

    def get_user_username(self, obj: FeedbackThread) -> str | None:
        request = self.context.get("request")
        if request and request.user.is_staff:
            return obj.user.username
        return None


class FeedbackThreadDetailSerializer(serializers.ModelSerializer):
    messages = FeedbackMessageSerializer(many=True, read_only=True)
    user_username = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackThread
        fields = (
            "id",
            "subject",
            "status",
            "created_at",
            "updated_at",
            "removed_at",
            "messages",
            "user_username",
        )
        read_only_fields = fields

    def get_user_username(self, obj: FeedbackThread) -> str | None:
        request = self.context.get("request")
        if request and request.user.is_staff:
            return obj.user.username
        return None


class FeedbackThreadCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200, allow_blank=True, required=False, default="")
    message = serializers.CharField(max_length=8000, min_length=1)


class FeedbackMessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=8000, min_length=1)


class FeedbackThreadStaffPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackThread
        fields = ("status",)


class AckNotificationsSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        max_length=50,
    )
