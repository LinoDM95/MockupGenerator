from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai_integration", "0005_add_service_account_json_enc"),
    ]

    operations = [
        migrations.AddField(
            model_name="aiconnection",
            name="prefer_expert_mode",
            field=models.BooleanField(
                default=False,
                help_text="Default: Multi-Agent Listing (Scout/Kritiker/Editor) statt Einzel-Prompt.",
            ),
        ),
    ]
