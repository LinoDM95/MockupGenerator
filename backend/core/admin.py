from django.contrib import admin

from .models import Template, TemplateElement, TemplateSet


class TemplateElementInline(admin.TabularInline):
    model = TemplateElement
    extra = 0


@admin.register(TemplateSet)
class TemplateSetAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "updated_at")
    search_fields = ("name", "user__username")


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "template_set", "width", "height", "order")
    inlines = [TemplateElementInline]
