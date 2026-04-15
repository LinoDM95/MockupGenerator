from __future__ import annotations

from rest_framework import serializers

from .models import GelatoConnection, GelatoExportTask, GelatoTemplate, TemporaryDesignUpload

MAX_BULK_DESIGNS = 200


class ConnectSerializer(serializers.Serializer):
    api_key = serializers.CharField(min_length=10, max_length=512)


class SelectStoreSerializer(serializers.Serializer):
    store_id = serializers.CharField(min_length=1, max_length=128)
    store_name = serializers.CharField(max_length=255, required=False, default="")


class GelatoConnectionSerializer(serializers.ModelSerializer):
    connected = serializers.SerializerMethodField()

    class Meta:
        model = GelatoConnection
        fields = ("connected", "store_id", "store_name", "is_active", "created_at")
        read_only_fields = fields

    def get_connected(self, obj: GelatoConnection) -> bool:
        return bool(obj.api_key_enc and obj.store_id and obj.is_active)


class GelatoTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GelatoTemplate
        fields = (
            "id",
            "gelato_template_id",
            "name",
            "preview_url",
            "is_active",
            "synced_at",
        )
        read_only_fields = fields


class GelatoExportTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = GelatoExportTask
        fields = (
            "id",
            "status",
            "title",
            "artwork_r2_url",
            "mockup_r2_url",
            "gelato_product_id",
            "gelato_product_uid",
            "error_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TemplateSyncSerializer(serializers.Serializer):
    template_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=1,
        max_length=50,
    )


class TemporaryDesignUploadSerializer(serializers.ModelSerializer):
    public_url = serializers.CharField(read_only=True)

    class Meta:
        model = TemporaryDesignUpload
        fields = ("id", "image", "public_url", "uploaded_at")
        read_only_fields = ("id", "public_url", "uploaded_at")
