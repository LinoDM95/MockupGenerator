from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="default_frame_style",
            field=models.CharField(
                choices=[
                    ("none", "none"),
                    ("black", "black"),
                    ("white", "white"),
                    ("wood", "wood"),
                ],
                default="none",
                help_text="Standard-Rahmen im Generator, wenn „Vorlagen-Standard“ aktiv ist.",
                max_length=16,
            ),
        ),
    ]
