from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_template_default_frame_style"),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="frame_drop_shadow",
            field=models.BooleanField(
                default=False,
                help_text="Schatten unter dem Mockup-Rahmen (nur wenn aktiv).",
            ),
        ),
    ]
