# Generated manually — R2-Layout ce/etsy/bulk_assets/…

import etsy.upload_paths
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("etsy", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="etsybulkasset",
            name="image",
            field=models.ImageField(
                max_length=512,
                upload_to=etsy.upload_paths.etsy_bulk_asset_upload_to,
            ),
        ),
    ]
