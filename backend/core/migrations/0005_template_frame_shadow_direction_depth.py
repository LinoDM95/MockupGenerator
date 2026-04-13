from django.db import migrations, models
import django.core.validators


def forwards_copy_drop_shadow(apps, schema_editor):
    Template = apps.get_model("core", "Template")
    Template.objects.filter(frame_drop_shadow=True).update(frame_shadow_direction="outward")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_template_artwork_saturation"),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="frame_shadow_direction",
            field=models.CharField(
                choices=[("none", "none"), ("outward", "outward"), ("inward", "inward")],
                default="none",
                help_text="Rahmen-Schatten: aus, nach außen oder als Tiefe ins Motiv.",
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name="template",
            name="frame_shadow_depth",
            field=models.FloatField(
                default=0.82,
                help_text="Stärke/Tiefe (0.15–1): Innenschatten kräftiger; Außenschatten weicher.",
                validators=[
                    django.core.validators.MinValueValidator(0.15),
                    django.core.validators.MaxValueValidator(1.0),
                ],
            ),
        ),
        migrations.RunPython(forwards_copy_drop_shadow, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="template",
            name="frame_drop_shadow",
        ),
    ]
