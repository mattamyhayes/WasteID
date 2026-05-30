# Generated for mixture component CAS number support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_sds_hazardous_determination'),
    ]

    operations = [
        migrations.AddField(
            model_name='mixturecomponent',
            name='cas_number',
            field=models.CharField(blank=True, help_text='CAS number for components without a linked Chemical record (e.g. parsed from an SDS import)', max_length=50),
        ),
    ]
