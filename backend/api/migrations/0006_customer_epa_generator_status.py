from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_journey'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='epa_generator_status',
            field=models.CharField(blank=True, choices=[('VSQG', 'VSQG – Very Small Quantity Generator'), ('SQG', 'SQG – Small Quantity Generator'), ('LQG', 'LQG – Large Quantity Generator')], max_length=4),
        ),
    ]

