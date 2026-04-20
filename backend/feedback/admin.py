from django.contrib import admin

from .models import FeedbackMessage, FeedbackNotification, FeedbackThread


class FeedbackMessageInline(admin.TabularInline):
    model = FeedbackMessage
    extra = 0
    readonly_fields = ("id", "created_at", "author", "is_staff_message")
    ordering = ("created_at",)


@admin.register(FeedbackThread)
class FeedbackThreadAdmin(admin.ModelAdmin):
    list_display = ("subject", "user", "status", "removed_at", "updated_at", "id")
    list_filter = ("status", "removed_at")
    search_fields = ("subject", "user__username", "user__email")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = (FeedbackMessageInline,)


@admin.register(FeedbackNotification)
class FeedbackNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "kind", "acknowledged_at", "created_at", "id")
    list_filter = ("kind", "acknowledged_at")
    search_fields = ("title", "recipient__username")
    readonly_fields = ("id", "created_at")
