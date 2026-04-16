from django.contrib import admin

from .models import UserIntegration


@admin.register(UserIntegration)
class UserIntegrationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "updated_at")
    raw_id_fields = ("user",)
    readonly_fields = ("id", "created_at", "updated_at")
