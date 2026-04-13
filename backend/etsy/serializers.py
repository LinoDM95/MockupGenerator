from __future__ import annotations

import uuid

from rest_framework import serializers

from .models import EtsyBulkJob

MAX_BULK_ITEMS = 100


class OAuthCallbackSerializer(serializers.Serializer):
    code = serializers.CharField()
    state = serializers.CharField(max_length=128)


class BulkUploadItemSerializer(serializers.Serializer):
    asset_id = serializers.UUIDField()
    rank = serializers.IntegerField(min_value=1, max_value=10)


class BulkJobItemSerializer(serializers.Serializer):
    listing_id = serializers.IntegerField(min_value=1)
    deletes = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )
    uploads = BulkUploadItemSerializer(many=True, required=False, default=list)

    def validate(self, attrs):
        if not attrs.get("deletes") and not attrs.get("uploads"):
            raise serializers.ValidationError("Mindestens deletes oder uploads erforderlich.")
        return attrs


class BulkJobCreateSerializer(serializers.Serializer):
    items = BulkJobItemSerializer(many=True)

    def validate_items(self, value):
        if len(value) > MAX_BULK_ITEMS:
            raise serializers.ValidationError(f"Maximal {MAX_BULK_ITEMS} Listings pro Job.")
        if len(value) == 0:
            raise serializers.ValidationError("Mindestens ein Listing.")
        return value


class EtsyBulkJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = EtsyBulkJob
        fields = (
            "id",
            "status",
            "payload",
            "result",
            "error_log",
            "celery_task_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class BulkAssetResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()


def validate_asset_belongs_user(asset_id: uuid.UUID, user) -> None:
    from .models import EtsyBulkAsset

    if not EtsyBulkAsset.objects.filter(id=asset_id, user=user).exists():
        raise serializers.ValidationError({"asset_id": "Unbekanntes Asset oder fremder Besitzer."})
