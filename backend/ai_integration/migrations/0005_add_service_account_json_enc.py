# Generated manually for Vertex AI BYOK upscaler

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai_integration", "0004_add_use_grounding"),
    ]

    operations = [
        migrations.AddField(
            model_name="aiconnection",
            name="service_account_json_enc",
            field=models.TextField(
                blank=True,
                help_text="Encrypted GCP service account JSON for Vertex AI Imagen upscaler (BYOK).",
            ),
        ),
    ]
