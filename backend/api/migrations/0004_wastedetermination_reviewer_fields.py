from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_shipper_epamanifest'),
    ]

    operations = [
        migrations.AddField(
            model_name='wastedetermination',
            name='reviewer_name',
            field=models.CharField(blank=True, help_text='Name of person who reviewed and signed off on this determination', max_length=200),
        ),
        migrations.AddField(
            model_name='wastedetermination',
            name='reviewer_sign_off_date',
            field=models.DateField(blank=True, help_text='Date the reviewer signed off on this determination', null=True),
        ),
    ]
