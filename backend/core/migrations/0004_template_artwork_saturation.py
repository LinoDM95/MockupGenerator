import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_template_frame_drop_shadow"),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="artwork_saturation",
            field=models.FloatField(
                default=1.0,
                help_text="Sättigung des Motivs im Export (1.0 = unverändert, niedriger = dezenter zum Hintergrund).",
                validators=[
                    django.core.validators.MinValueValidator(0.15),
                    django.core.validators.MaxValueValidator(1.0),
                ],
            ),
        ),
    ]
