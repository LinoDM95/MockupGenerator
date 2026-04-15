from django.contrib import admin

from .models import AutomationJob, ImageTask


class ImageTaskInline(admin.TabularInline):
    model = ImageTask
    extra = 0
    readonly_fields = ("id", "status", "created_at", "updated_at")


@admin.register(AutomationJob)
class AutomationJobAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "ai_model_name", "upscale_factor", "created_at")
    list_filter = ("status",)
    search_fields = ("id", "user__username")
    inlines = (ImageTaskInline,)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ImageTask)
class ImageTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "status", "created_at")
    list_filter = ("status",)
    readonly_fields = ("created_at", "updated_at")
