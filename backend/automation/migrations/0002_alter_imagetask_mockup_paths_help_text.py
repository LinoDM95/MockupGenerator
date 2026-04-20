from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("automation", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="imagetask",
            name="mockup_paths",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Speicher-relative Pfade der gerenderten Mockup-PNGs (Default-Storage: lokal oder R2).",
            ),
        ),
    ]
