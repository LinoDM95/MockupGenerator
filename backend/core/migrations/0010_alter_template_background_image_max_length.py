import core.upload_paths
import core.validators
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_alter_template_background_image_default_storage"),
    ]

    operations = [
        migrations.AlterField(
            model_name="template",
            name="background_image",
            field=models.ImageField(
                max_length=512,
                upload_to=core.upload_paths.template_background_upload_to,
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=["jpg", "jpeg", "png", "webp"]
                    ),
                    core.validators.validate_real_image,
                ],
            ),
        ),
    ]
