from django.db import migrations, models
import django.core.validators


def forwards_from_direction(apps, schema_editor):
    Template = apps.get_model("core", "Template")
    Template.objects.filter(frame_shadow_direction="outward").update(
        frame_shadow_outer_enabled=True,
        frame_shadow_inner_enabled=False,
        frame_outer_sides=15,
        frame_inner_sides=15,
    )
    Template.objects.filter(frame_shadow_direction="inward").update(
        frame_shadow_outer_enabled=False,
        frame_shadow_inner_enabled=True,
        frame_outer_sides=15,
        frame_inner_sides=15,
    )
    Template.objects.exclude(frame_shadow_direction__in=("outward", "inward")).update(
        frame_shadow_outer_enabled=False,
        frame_shadow_inner_enabled=False,
        frame_outer_sides=15,
        frame_inner_sides=15,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_template_frame_shadow_direction_depth"),
    ]

    operations = [
        migrations.AddField(
            model_name="template",
            name="frame_shadow_outer_enabled",
            field=models.BooleanField(default=False, help_text="Schatten nach außen am Rahmen."),
        ),
        migrations.AddField(
            model_name="template",
            name="frame_shadow_inner_enabled",
            field=models.BooleanField(default=False, help_text="Schatten/Tiefe ins Motiv."),
        ),
        migrations.AddField(
            model_name="template",
            name="frame_outer_sides",
            field=models.PositiveSmallIntegerField(
                default=15,
                help_text="Bitmaske 1=oben,2=rechts,4=unten,8=links (Außenschatten).",
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(15),
                ],
            ),
        ),
        migrations.AddField(
            model_name="template",
            name="frame_inner_sides",
            field=models.PositiveSmallIntegerField(
                default=15,
                help_text="Bitmaske Innenschatten pro Seite.",
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(15),
                ],
            ),
        ),
        migrations.RunPython(forwards_from_direction, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="template",
            name="frame_shadow_direction",
        ),
    ]
