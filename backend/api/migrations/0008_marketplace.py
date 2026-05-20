# Generated migration for marketplace models

import api.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_staterule_remove_journey_created_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='MarketplaceListing',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('listing_id', models.CharField(default=api.models._generate_listing_id, max_length=32, unique=True)),
                ('status', models.CharField(choices=[('open', 'Open for Bids'), ('bid_accepted', 'Bid Accepted'), ('completed', 'Completed'), ('withdrawn', 'Withdrawn')], default='open', max_length=20)),
                ('bid_type_needed', models.CharField(choices=[('shipping', 'Shipping Only'), ('disposal', 'Disposal Only'), ('both', 'Shipping and Disposal'), ('either', 'Either Shipping or Disposal')], default='either', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('preferred_completion_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('mixture', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='marketplace_listing', to='api.mixture')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Bid',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bid_id', models.CharField(default=api.models._generate_bid_id, max_length=32, unique=True)),
                ('bidder_company_name', models.CharField(max_length=300)),
                ('bidder_contact_name', models.CharField(blank=True, max_length=200)),
                ('bidder_contact_email', models.EmailField(blank=True)),
                ('bidder_contact_phone', models.CharField(blank=True, max_length=50)),
                ('epa_id', models.CharField(blank=True, help_text='Bidder EPA ID number', max_length=20)),
                ('bid_type', models.CharField(choices=[('shipping', 'Shipping Only'), ('disposal', 'Disposal Only'), ('both', 'Shipping and Disposal')], max_length=20)),
                ('amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('service_area_states', models.TextField(default='[]', help_text='JSON array of 2-letter state codes')),
                ('waste_codes_handled', models.TextField(default='[]', help_text='JSON array of EPA waste codes the bidder can handle')),
                ('certifications', models.TextField(blank=True, help_text='Description of certifications and permits')),
                ('notes', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('withdrawn', 'Withdrawn')], default='pending', max_length=20)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('listing', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bids', to='api.marketplacelisting')),
            ],
            options={
                'ordering': ['-submitted_at'],
            },
        ),
    ]
