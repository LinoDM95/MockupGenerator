from __future__ import annotations

from rest_framework import serializers

from core.models import TemplateSet

from .models import AutomationJob, ImageTask

_STATUS_WEIGHTS: dict[str, int] = {
    ImageTask.Status.PENDING: 0,
    ImageTask.Status.UPSCALING: 20,
    ImageTask.Status.SEO: 40,
    ImageTask.Status.MOCKUPS: 60,
    ImageTask.Status.GELATO: 80,
    ImageTask.Status.DONE: 100,
    ImageTask.Status.ERROR: 100,
}


class ImageTaskSerializer(serializers.ModelSerializer):
    """Read-only task row for polling UI."""

    original_image = serializers.SerializerMethodField()
    high_res_image = serializers.SerializerMethodField()

    class Meta:
        model = ImageTask
        fields = (
            "id",
            "status",
            "error_message",
            "generated_title",
            "generated_tags",
            "generated_description",
            "mockup_paths",
            "original_image",
            "high_res_image",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_original_image(self, obj: ImageTask) -> str | None:
        request = self.context.get("request")
        if obj.original_image and getattr(request, "build_absolute_uri", None):
            return request.build_absolute_uri(obj.original_image.url)
        if obj.original_image:
            return obj.original_image.url
        return None

    def get_high_res_image(self, obj: ImageTask) -> str | None:
        """Ohne echtes Upscale (Stub) entfällt ``high_res_image`` — URL vom Original."""
        field = obj.high_res_image if obj.high_res_image else obj.original_image
        request = self.context.get("request")
        if field and getattr(request, "build_absolute_uri", None):
            return request.build_absolute_uri(field.url)
        if field:
            return field.url
        return None


class AutomationJobSerializer(serializers.ModelSerializer):
    tasks = ImageTaskSerializer(many=True, read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    result_zip_url = serializers.SerializerMethodField()
    mockup_set_name = serializers.SerializerMethodField()

    class Meta:
        model = AutomationJob
        fields = (
            "id",
            "status",
            "ai_model_name",
            "upscale_factor",
            "mockup_set",
            "mockup_set_name",
            "gelato_profile",
            "result_zip",
            "result_zip_url",
            "error_message",
            "progress_percentage",
            "tasks",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_mockup_set_name(self, obj: AutomationJob) -> str | None:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return None
        return (
            TemplateSet.objects.filter(pk=obj.mockup_set, user=user)
            .values_list("name", flat=True)
            .first()
        )

    def get_progress_percentage(self, obj: AutomationJob) -> int:
        tasks = list(obj.tasks.all())
        if not tasks:
            if obj.status == AutomationJob.Status.COMPLETED:
                return 100
            return 0
        total_w = sum(_STATUS_WEIGHTS.get(t.status, 0) for t in tasks)
        return min(100, int(total_w / len(tasks)))

    def get_result_zip_url(self, obj: AutomationJob) -> str | None:
        if not obj.result_zip:
            return None
        request = self.context.get("request")
        if request and getattr(request, "build_absolute_uri", None):
            return request.build_absolute_uri(obj.result_zip.url)
        return obj.result_zip.url if obj.result_zip else None
