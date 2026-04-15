from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gelato_integration", "0004_add_r2_url_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="gelatoexporttask",
            name="free_shipping",
            field=models.BooleanField(default=False),
        ),
    ]
