from django.contrib import admin

from .models import GelatoConnection, GelatoExportTask, GelatoTemplate, TemporaryDesignUpload


@admin.register(GelatoConnection)
class GelatoConnectionAdmin(admin.ModelAdmin):
    list_display = ("user", "store_id", "store_name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("user__username", "store_id", "store_name")
    readonly_fields = ("api_key_enc", "created_at", "updated_at")


@admin.register(GelatoTemplate)
class GelatoTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "gelato_template_id", "connection", "is_active", "synced_at")
    list_filter = ("is_active",)
    search_fields = ("name", "gelato_template_id")
    raw_id_fields = ("connection",)


@admin.register(GelatoExportTask)
class GelatoExportTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "gelato_product_id", "created_at")
    list_filter = ("status",)
    search_fields = ("gelato_product_id", "user__username")
    raw_id_fields = ("user", "gelato_template")
    readonly_fields = ("created_at", "updated_at")


@admin.register(TemporaryDesignUpload)
class TemporaryDesignUploadAdmin(admin.ModelAdmin):
    list_display = ("id", "image", "uploaded_at")
    readonly_fields = ("uploaded_at",)
    ordering = ("-uploaded_at",)
