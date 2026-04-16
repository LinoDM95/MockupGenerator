from django.core.management.base import BaseCommand

from ...r2_cleanup import cleanup_expired_r2_temp_uploads


class Command(BaseCommand):
    help = (
        "Löscht TemporaryDesignUpload-Einträge (und R2-Objekte) älter als "
        "R2_TEMP_DESIGN_MAX_AGE_HOURS. Ohne Celery; für Cron geeignet."
    )

    def handle(self, *args, **options) -> None:
        n = cleanup_expired_r2_temp_uploads(force=True)
        self.stdout.write(self.style.SUCCESS(f"R2 temp cleanup: {n} row(s) removed."))
