from django.contrib import admin

from .models import PinterestOAuthState, SocialPlatform, SocialPost


@admin.register(SocialPlatform)
class SocialPlatformAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "platform", "updated_at")
    list_filter = ("platform",)
    search_fields = ("user__username", "user__email")


@admin.register(PinterestOAuthState)
class PinterestOAuthStateAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "expires_at", "created_at")
    search_fields = ("user__username", "state")


@admin.register(SocialPost)
class SocialPostAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "social_platform", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "user__username")
    raw_id_fields = ("user", "social_platform")
