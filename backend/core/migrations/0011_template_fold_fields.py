from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_alter_template_background_image_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="folds_enabled",
            field=models.BooleanField(
                default=False,
                help_text="WebGL-Stoffverformung (Sobel-Normalen aus BG-Luminanz) aktivieren.",
            ),
        ),
        migrations.AddField(
            model_name="template",
            name="fold_strength",
            field=models.FloatField(
                default=0.4,
                help_text="Verschiebungsstärke entlang der Sobel-Normalen (0–1).",
                validators=[
                    django.core.validators.MinValueValidator(0.0),
                    django.core.validators.MaxValueValidator(1.0),
                ],
            ),
        ),
        migrations.AddField(
            model_name="template",
            name="fold_shadow_depth",
            field=models.FloatField(
                default=0.6,
                help_text="Multiply-Blend-Stärke gegen Hintergrund-Luminanz (0–1).",
                validators=[
                    django.core.validators.MinValueValidator(0.0),
                    django.core.validators.MaxValueValidator(1.0),
                ],
            ),
        ),
        migrations.AddField(
            model_name="template",
            name="fold_highlight_strength",
            field=models.FloatField(
                default=0.25,
                help_text="Additive Glanzlichter an Faltenkämmen (0–1).",
                validators=[
                    django.core.validators.MinValueValidator(0.0),
                    django.core.validators.MaxValueValidator(1.0),
                ],
            ),
        ),
        migrations.AddField(
            model_name="template",
            name="fold_smoothing",
            field=models.PositiveSmallIntegerField(
                default=4,
                help_text="Pre-Smoothing-Radius (Pixel) der Heightmap vor Sobel.",
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(32),
                ],
            ),
        ),
    ]
