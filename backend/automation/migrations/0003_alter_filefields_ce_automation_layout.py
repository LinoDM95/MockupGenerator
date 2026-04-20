# Generated manually — R2-Layout ce/automation/jobs/…

import automation.upload_paths
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("automation", "0002_alter_imagetask_mockup_paths_help_text"),
    ]

    operations = [
        migrations.AlterField(
            model_name="automationjob",
            name="result_zip",
            field=models.FileField(
                blank=True,
                max_length=512,
                null=True,
                upload_to=automation.upload_paths.automation_job_result_upload_to,
            ),
        ),
        migrations.AlterField(
            model_name="imagetask",
            name="original_image",
            field=models.ImageField(
                max_length=512,
                upload_to=automation.upload_paths.image_task_original_upload_to,
            ),
        ),
        migrations.AlterField(
            model_name="imagetask",
            name="high_res_image",
            field=models.ImageField(
                blank=True,
                max_length=512,
                null=True,
                upload_to=automation.upload_paths.image_task_high_res_upload_to,
            ),
        ),
    ]
