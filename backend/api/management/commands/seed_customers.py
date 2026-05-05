from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Customer, CustomerLocation


# Five typical customers that would need hazardous chemical removal services,
# each with at least three locations in Oregon, Washington, Idaho, or Alaska.
CUSTOMERS = [
    {
        'name': 'Cascade Auto Body & Paint',
        'contact_name': 'Marcus Reilly',
        'contact_email': 'marcus.reilly@cascadeautobody.com',
        'contact_phone': '(503) 555-0142',
        'billing_address': '1820 NW Industrial St, Portland, OR 97209',
        'notes': 'Auto body shop chain. Generates waste paint, solvents, '
                 'thinners, and used oil from collision repair operations.',
        'locations': [
            {
                'name': 'Portland - NW Industrial',
                'address': '1820 NW Industrial St',
                'city': 'Portland', 'state': 'OR', 'postal_code': '97209',
                'notes': 'Main shop and corporate office. Largest paint booth operation.',
            },
            {
                'name': 'Beaverton Collision Center',
                'address': '4455 SW Murray Blvd',
                'city': 'Beaverton', 'state': 'OR', 'postal_code': '97005',
                'notes': 'High-volume collision repair location.',
            },
            {
                'name': 'Vancouver Service Bay',
                'address': '7820 NE Hwy 99',
                'city': 'Vancouver', 'state': 'WA', 'postal_code': '98665',
                'notes': 'Smaller satellite shop, serves SW Washington.',
            },
            {
                'name': 'Salem Refinish',
                'address': '2210 Mission St SE',
                'city': 'Salem', 'state': 'OR', 'postal_code': '97302',
                'notes': 'Refinish-only location.',
            },
        ],
    },
    {
        'name': 'Pacific Northwest Printing Co.',
        'contact_name': 'Jenna Whitcomb',
        'contact_email': 'jwhitcomb@pnwprinting.com',
        'contact_phone': '(206) 555-0188',
        'billing_address': '900 4th Ave, Seattle, WA 98104',
        'notes': 'Commercial printer. Generates waste inks, photographic '
                 'fixers, isopropyl alcohol, and press-cleaning solvents.',
        'locations': [
            {
                'name': 'Seattle Headquarters Press',
                'address': '900 4th Ave',
                'city': 'Seattle', 'state': 'WA', 'postal_code': '98104',
                'notes': 'Headquarters and main commercial press operation.',
            },
            {
                'name': 'Tacoma Print Facility',
                'address': '3120 S 38th St',
                'city': 'Tacoma', 'state': 'WA', 'postal_code': '98409',
                'notes': 'Large-format and packaging printing.',
            },
            {
                'name': 'Spokane Quick Print',
                'address': '511 W Riverside Ave',
                'city': 'Spokane', 'state': 'WA', 'postal_code': '99201',
                'notes': 'Eastern Washington branch, digital and offset.',
            },
            {
                'name': 'Boise Print Shop',
                'address': '1410 W Main St',
                'city': 'Boise', 'state': 'ID', 'postal_code': '83702',
                'notes': 'Idaho branch serving Treasure Valley.',
            },
        ],
    },
    {
        'name': 'Evergreen Pharmaceuticals',
        'contact_name': 'Dr. Priya Natarajan',
        'contact_email': 'p.natarajan@evergreenpharma.com',
        'contact_phone': '(425) 555-0117',
        'billing_address': '15500 NE 38th St, Redmond, WA 98052',
        'notes': 'Pharmaceutical research and manufacturing. Generates '
                 'P-listed and U-listed pharmaceutical waste, lab solvents, '
                 'and reactive intermediates.',
        'locations': [
            {
                'name': 'Redmond R&D Campus',
                'address': '15500 NE 38th St',
                'city': 'Redmond', 'state': 'WA', 'postal_code': '98052',
                'notes': 'Primary research labs. Significant P-list waste generation.',
            },
            {
                'name': 'Bothell Manufacturing Plant',
                'address': '22130 17th Ave SE',
                'city': 'Bothell', 'state': 'WA', 'postal_code': '98021',
                'notes': 'GMP manufacturing facility.',
            },
            {
                'name': 'Hillsboro Bio Lab',
                'address': '2701 NW 229th Ave',
                'city': 'Hillsboro', 'state': 'OR', 'postal_code': '97124',
                'notes': 'Biologics development laboratory.',
            },
        ],
    },
    {
        'name': 'Sawtooth Mining & Metals',
        'contact_name': 'Hank Brennan',
        'contact_email': 'hbrennan@sawtoothmining.com',
        'contact_phone': '(208) 555-0163',
        'billing_address': '500 W Bannock St, Boise, ID 83702',
        'notes': 'Mining and ore processing. Generates corrosive acids, '
                 'cyanide solutions, heavy-metal sludges, and reactive '
                 'reagents from extraction processes.',
        'locations': [
            {
                'name': 'Boise Corporate & Assay Lab',
                'address': '500 W Bannock St',
                'city': 'Boise', 'state': 'ID', 'postal_code': '83702',
                'notes': 'Corporate office and assay laboratory.',
            },
            {
                'name': 'Coeur d\'Alene Mill Site',
                'address': '8200 Silver Valley Rd',
                'city': 'Coeur d\'Alene', 'state': 'ID', 'postal_code': '83814',
                'notes': 'Active ore milling and concentration. Heavy metal '
                         'sludge and acid waste streams.',
            },
            {
                'name': 'Fairbanks Operations',
                'address': '3501 Airport Way',
                'city': 'Fairbanks', 'state': 'AK', 'postal_code': '99709',
                'notes': 'Alaska placer and hard-rock operations.',
            },
            {
                'name': 'Anchorage Logistics Yard',
                'address': '1200 E Ship Creek Ave',
                'city': 'Anchorage', 'state': 'AK', 'postal_code': '99501',
                'notes': 'Equipment staging and reagent storage.',
            },
        ],
    },
    {
        'name': 'Northern Lights Hospital Network',
        'contact_name': 'Sarah Kowalski, RN',
        'contact_email': 'skowalski@nlhospitals.org',
        'contact_phone': '(907) 555-0199',
        'billing_address': '3260 Providence Dr, Anchorage, AK 99508',
        'notes': 'Regional hospital network. Generates chemotherapy waste '
                 '(P-listed), formaldehyde, xylene, mercury-containing '
                 'devices, and expired pharmaceuticals.',
        'locations': [
            {
                'name': 'Anchorage Regional Medical Center',
                'address': '3260 Providence Dr',
                'city': 'Anchorage', 'state': 'AK', 'postal_code': '99508',
                'notes': 'Flagship hospital. Oncology and pathology departments.',
            },
            {
                'name': 'Juneau Community Hospital',
                'address': '3260 Hospital Dr',
                'city': 'Juneau', 'state': 'AK', 'postal_code': '99801',
                'notes': 'Smaller community hospital with full lab.',
            },
            {
                'name': 'Eugene Outpatient Clinic',
                'address': '1255 Hilyard St',
                'city': 'Eugene', 'state': 'OR', 'postal_code': '97401',
                'notes': 'Outpatient and infusion services.',
            },
            {
                'name': 'Idaho Falls Medical Pavilion',
                'address': '3100 Channing Way',
                'city': 'Idaho Falls', 'state': 'ID', 'postal_code': '83404',
                'notes': 'Pathology lab and pharmacy waste streams.',
            },
        ],
    },
]


class Command(BaseCommand):
    help = ('Seed the database with 5 typical customers (each with at least '
            '3 locations in OR/WA/ID/AK) needing hazardous chemical removal.')

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Seeding customers and locations...')
        customers_created = 0
        customers_updated = 0
        locations_created = 0

        for entry in CUSTOMERS:
            locations = entry.pop('locations')
            customer, created = Customer.objects.update_or_create(
                name=entry['name'],
                defaults=entry,
            )
            if created:
                customers_created += 1
            else:
                customers_updated += 1

            for loc in locations:
                _, loc_created = CustomerLocation.objects.update_or_create(
                    customer=customer,
                    name=loc['name'],
                    defaults=loc,
                )
                if loc_created:
                    locations_created += 1

            # Restore locations key so re-runs of this command in the same
            # process behave consistently.
            entry['locations'] = locations

        self.stdout.write(self.style.SUCCESS(
            f'Done. Customers created: {customers_created}, '
            f'updated: {customers_updated}. New locations: {locations_created}.'
        ))
