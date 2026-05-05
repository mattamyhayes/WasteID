# Generated for customer/location/transaction_id support

import api.models
from django.db import migrations, models
import django.db.models.deletion


def _backfill_transaction_ids(apps, schema_editor):
    Mixture = apps.get_model('api', 'Mixture')
    for mixture in Mixture.objects.all():
        mixture.transaction_id = api.models._generate_transaction_id()
        mixture.save(update_fields=['transaction_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True)),
                ('contact_name', models.CharField(blank=True, max_length=200)),
                ('contact_email', models.EmailField(blank=True, max_length=254)),
                ('contact_phone', models.CharField(blank=True, max_length=50)),
                ('billing_address', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='CustomerLocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('address', models.TextField(blank=True)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('state', models.CharField(blank=True, max_length=100)),
                ('postal_code', models.CharField(blank=True, max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='locations', to='api.customer')),
            ],
            options={
                'ordering': ['customer__name', 'name'],
                'unique_together': {('customer', 'name')},
            },
        ),
        migrations.AddField(
            model_name='mixture',
            name='transaction_id',
            field=models.CharField(default=api.models._generate_transaction_id, max_length=32),
        ),
        migrations.RunPython(_backfill_transaction_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='mixture',
            name='transaction_id',
            field=models.CharField(default=api.models._generate_transaction_id, max_length=32, unique=True),
        ),
        migrations.AddField(
            model_name='mixture',
            name='customer',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mixtures', to='api.customer'),
        ),
        migrations.AddField(
            model_name='mixture',
            name='customer_location',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mixtures', to='api.customerlocation'),
        ),
    ]
