# Generated manually — R2-Keys ce/gelato/…

import gelato_integration.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gelato_integration", "0006_temporarydesignupload_user_path"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gelatoexporttask",
            name="design_image",
            field=models.ImageField(
                blank=True,
                max_length=512,
                null=True,
                upload_to=gelato_integration.models.gelato_export_upload_to,
            ),
        ),
        migrations.AlterField(
            model_name="temporarydesignupload",
            name="image",
            field=models.ImageField(
                max_length=512,
                storage=gelato_integration.models._r2_storage,
                upload_to=gelato_integration.models.temp_design_upload_to,
            ),
        ),
    ]
