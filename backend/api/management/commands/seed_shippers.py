from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Shipper


# Well-known hazardous waste pickup / transportation / disposal companies
# used as demo shipper profiles for EPA manifests.
SHIPPERS = [
    {
        'company_name': 'Clean Harbors Environmental Services',
        'epa_id': 'MAD053452637',
        'contact_name': 'David Patterson',
        'address': '42 Longwater Dr',
        'city': 'Norwell',
        'state': 'MA',
        'zip_code': '02061',
        'phone': '(781) 792-5000',
        'emergency_phone': '(800) 645-8265',
        'site_address': '42 Longwater Dr',
        'site_city': 'Norwell',
        'site_state': 'MA',
        'site_zip_code': '02061',
        'notes': 'Full-service environmental services. Hazardous waste '
                 'collection, transportation, treatment, and disposal.',
    },
    {
        'company_name': 'Stericycle Environmental Solutions',
        'epa_id': 'ILD000805937',
        'contact_name': 'Michelle Torres',
        'address': '2355 Waukegan Rd',
        'city': 'Bannockburn',
        'state': 'IL',
        'zip_code': '60015',
        'phone': '(866) 783-7422',
        'emergency_phone': '(866) 783-7422',
        'site_address': '2355 Waukegan Rd',
        'site_city': 'Bannockburn',
        'site_state': 'IL',
        'site_zip_code': '60015',
        'notes': 'Hazardous and non-hazardous waste management, lab-packing, '
                 'pharmaceutical waste disposal.',
    },
    {
        'company_name': 'US Ecology Holdings',
        'epa_id': 'IDD073114654',
        'contact_name': 'Robert Gould',
        'address': '101 S Capitol Blvd, Ste 1000',
        'city': 'Boise',
        'state': 'ID',
        'zip_code': '83702',
        'phone': '(208) 331-8400',
        'emergency_phone': '(800) 272-4729',
        'site_address': '20400 Lemley Rd',
        'site_city': 'Grand View',
        'site_state': 'ID',
        'site_zip_code': '83624',
        'notes': 'Hazardous waste treatment, storage, and disposal facility '
                 '(TSDF). Landfill and incineration services.',
    },
    {
        'company_name': 'Veolia Environmental Services',
        'epa_id': 'TXD000838896',
        'contact_name': 'Anne-Marie Laurent',
        'address': '3 Riverway, Ste 700',
        'city': 'Houston',
        'state': 'TX',
        'zip_code': '77056',
        'phone': '(713) 496-5000',
        'emergency_phone': '(800) 832-7157',
        'site_address': '14855 Almeda Rd',
        'site_city': 'Houston',
        'site_state': 'TX',
        'site_zip_code': '77053',
        'notes': 'Global environmental services provider. Industrial waste '
                 'management, chemical treatment, and recycling.',
    },
    {
        'company_name': 'Heritage Crystal Clean',
        'epa_id': 'IND089783012',
        'contact_name': 'Jason Wilkins',
        'address': '2175 Point Blvd, Ste 375',
        'city': 'Elgin',
        'state': 'IL',
        'zip_code': '60123',
        'phone': '(847) 836-5670',
        'emergency_phone': '(877) 938-7948',
        'site_address': '2175 Point Blvd, Ste 375',
        'site_city': 'Elgin',
        'site_state': 'IL',
        'site_zip_code': '60123',
        'notes': 'Parts cleaning, used oil collection, vacuum truck services, '
                 'and hazardous/non-hazardous waste disposal.',
    },
    {
        'company_name': 'Tradebe Environmental Services',
        'epa_id': 'CTD001455814',
        'contact_name': 'Carlos Mendez',
        'address': '200 Merritt 7, 3rd Floor',
        'city': 'Norwalk',
        'state': 'CT',
        'zip_code': '06851',
        'phone': '(203) 750-9800',
        'emergency_phone': '(800) 388-7242',
        'site_address': '68 Thermos Ave',
        'site_city': 'East Bridgewater',
        'site_state': 'MA',
        'site_zip_code': '02333',
        'notes': 'Hazardous waste incineration, fuel blending, and '
                 'industrial cleaning services.',
    },
    {
        'company_name': 'Republic Services Environmental Solutions',
        'epa_id': 'AZD982441263',
        'contact_name': 'Karen Mitchell',
        'address': '18500 N Allied Way',
        'city': 'Phoenix',
        'state': 'AZ',
        'zip_code': '85054',
        'phone': '(480) 627-2700',
        'emergency_phone': '(800) 722-8529',
        'site_address': '18500 N Allied Way',
        'site_city': 'Phoenix',
        'site_state': 'AZ',
        'site_zip_code': '85054',
        'notes': 'Hazardous and non-hazardous waste transportation, treatment, '
                 'and landfill disposal services.',
    },
]


class Command(BaseCommand):
    help = ('Seed the database with demo shipper profiles for hazardous waste '
            'pickup companies (Clean Harbors, Stericycle, US Ecology, etc.).')

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Seeding shipper profiles...')
        created_count = 0
        updated_count = 0

        for entry in SHIPPERS:
            _, created = Shipper.objects.update_or_create(
                company_name=entry['company_name'],
                defaults=entry,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Shippers created: {created_count}, '
            f'updated: {updated_count}.'
        ))
