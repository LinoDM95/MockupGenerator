from django.apps import AppConfig


class AiIntegrationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai_integration"

    def ready(self) -> None:
        from . import signals  # noqa: F401
