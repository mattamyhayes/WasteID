"""Management command to seed state-specific hazardous waste rules."""
import json
from django.core.management.base import BaseCommand
from api.models import StateRule


STATE_RULES_DATA = [
    # Alabama (AL)
    {
        'state_code': 'AL',
        'rule_category': 'manifest',
        'rule_id_code': 'AL-001',
        'rule_reference': 'ADEM Admin Code 335-14-5',
        'description': 'Alabama requires state manifest copy submission to ADEM within 30 days of shipment.',
        'condition_expression': json.dumps({'generator_state': 'AL', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AL',
        'rule_category': 'reporting',
        'rule_id_code': 'AL-002',
        'rule_reference': 'ADEM Admin Code 335-14-3',
        'description': 'Alabama LQGs must submit biennial hazardous waste reports to ADEM.',
        'condition_expression': json.dumps({'generator_state': 'AL', 'generator_status': 'LQG'}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AL',
        'rule_category': 'storage',
        'rule_id_code': 'AL-003',
        'rule_reference': 'ADEM Admin Code 335-14-4',
        'description': 'Alabama SQG satellite accumulation area must be at or near point of generation.',
        'condition_expression': json.dumps({'generator_state': 'AL', 'generator_status': 'SQG', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'al003_sat_area', 'type': 'boolean', 'text': 'Is the satellite accumulation area at or near the point of generation?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AL',
        'rule_category': 'identification',
        'rule_id_code': 'AL-004',
        'rule_reference': 'ADEM Admin Code 335-14-2',
        'description': 'Alabama requires EPA ID number for all hazardous waste generators.',
        'condition_expression': json.dumps({'generator_state': 'AL', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'al004_epa_id', 'type': 'text', 'text': 'Provide the Alabama EPA generator ID number.'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AL',
        'rule_category': 'labeling',
        'rule_id_code': 'AL-005',
        'rule_reference': 'ADEM Admin Code 335-14-5-.04',
        'description': 'Alabama requires hazardous waste containers to be labeled with accumulation start date and composition.',
        'condition_expression': json.dumps({'generator_state': 'AL', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # Alaska (AK)
    {
        'state_code': 'AK',
        'rule_category': 'manifest',
        'rule_id_code': 'AK-001',
        'rule_reference': '18 AAC 62.200',
        'description': 'Alaska requires state-specific manifest procedures for hazardous waste shipments within and out of state.',
        'condition_expression': json.dumps({'generator_state': 'AK', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AK',
        'rule_category': 'transport',
        'rule_id_code': 'AK-002',
        'rule_reference': '18 AAC 62.210',
        'description': 'Alaska requires additional placarding and labeling for marine transport of hazardous waste.',
        'condition_expression': json.dumps({'generator_state': 'AK', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'ak002_marine', 'type': 'boolean', 'text': 'Will this shipment be transported via marine vessel?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AK',
        'rule_category': 'storage',
        'rule_id_code': 'AK-003',
        'rule_reference': '18 AAC 62.220',
        'description': 'Alaska cold-weather storage exemption allows extended accumulation during winter months (Nov-Mar).',
        'condition_expression': json.dumps({'generator_state': 'AK', 'generator_status': ['SQG', 'LQG']}),
        'question_template': json.dumps([
            {'id': 'ak003_winter', 'type': 'boolean', 'text': 'Is this waste accumulated during the winter exemption period (Nov-Mar)?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AK',
        'rule_category': 'reporting',
        'rule_id_code': 'AK-004',
        'rule_reference': '18 AAC 62.250',
        'description': 'Alaska requires annual waste minimization reports from LQGs.',
        'condition_expression': json.dumps({'generator_state': 'AK', 'generator_status': 'LQG'}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AK',
        'rule_category': 'identification',
        'rule_id_code': 'AK-005',
        'rule_reference': '18 AAC 62.100',
        'description': 'Alaska follows federal RCRA identification with additional state notification requirements.',
        'condition_expression': json.dumps({'generator_state': 'AK', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # Arizona (AZ)
    {
        'state_code': 'AZ',
        'rule_category': 'manifest',
        'rule_id_code': 'AZ-001',
        'rule_reference': 'A.R.S. 49-922',
        'description': 'Arizona requires use of the Uniform Hazardous Waste Manifest (EPA Form 8700-22) for all HW shipments.',
        'condition_expression': json.dumps({'generator_state': 'AZ', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AZ',
        'rule_category': 'transport',
        'rule_id_code': 'AZ-002',
        'rule_reference': 'A.A.C. R18-8-264',
        'description': 'Arizona requires all hazardous waste transporters to hold a valid ADEQ transporter permit.',
        'condition_expression': json.dumps({'generator_state': 'AZ', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'az002_permit', 'type': 'text', 'text': 'Provide the ADEQ transporter permit number.'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AZ',
        'rule_category': 'storage',
        'rule_id_code': 'AZ-003',
        'rule_reference': 'A.A.C. R18-8-262',
        'description': 'Arizona SQGs may store hazardous waste for up to 270 days if shipping more than 200 miles.',
        'condition_expression': json.dumps({'generator_state': 'AZ', 'generator_status': 'SQG', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'az003_distance', 'type': 'boolean', 'text': 'Is the TSDF more than 200 miles from the generator site?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AZ',
        'rule_category': 'reporting',
        'rule_id_code': 'AZ-004',
        'rule_reference': 'A.A.C. R18-8-262.41',
        'description': 'Arizona LQGs must submit biennial reports to ADEQ by March 1 of even-numbered years.',
        'condition_expression': json.dumps({'generator_state': 'AZ', 'generator_status': 'LQG'}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AZ',
        'rule_category': 'labeling',
        'rule_id_code': 'AZ-005',
        'rule_reference': 'A.A.C. R18-8-262.34',
        'description': 'Arizona requires containers to display HAZARDOUS WASTE label with accumulation start date.',
        'condition_expression': json.dumps({'generator_state': 'AZ', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # Arkansas (AR)
    {
        'state_code': 'AR',
        'rule_category': 'manifest',
        'rule_id_code': 'AR-001',
        'rule_reference': 'APC&EC Reg. 23.601',
        'description': 'Arkansas requires a state copy of the manifest submitted to ADEQ within 10 days.',
        'condition_expression': json.dumps({'generator_state': 'AR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AR',
        'rule_category': 'identification',
        'rule_id_code': 'AR-002',
        'rule_reference': 'APC&EC Reg. 23.301',
        'description': 'Arkansas requires all generators to notify ADEQ and obtain an EPA ID before treating, storing, or disposing of HW.',
        'condition_expression': json.dumps({'generator_state': 'AR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'ar002_epa_id', 'type': 'text', 'text': 'Provide the generator EPA ID number issued by ADEQ.'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AR',
        'rule_category': 'storage',
        'rule_id_code': 'AR-003',
        'rule_reference': 'APC&EC Reg. 23.401',
        'description': 'Arkansas SQGs must not accumulate more than 6,000 kg of hazardous waste on-site.',
        'condition_expression': json.dumps({'generator_state': 'AR', 'generator_status': 'SQG', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AR',
        'rule_category': 'transport',
        'rule_id_code': 'AR-004',
        'rule_reference': 'APC&EC Reg. 23.501',
        'description': 'Arkansas requires transporters to have a valid hazardous waste transporter permit from ADEQ.',
        'condition_expression': json.dumps({'generator_state': 'AR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AR',
        'rule_category': 'reporting',
        'rule_id_code': 'AR-005',
        'rule_reference': 'APC&EC Reg. 23.701',
        'description': 'Arkansas LQGs must submit biennial hazardous waste generation and management reports.',
        'condition_expression': json.dumps({'generator_state': 'AR', 'generator_status': 'LQG'}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # California (CA)
    {
        'state_code': 'CA',
        'rule_category': 'identification',
        'rule_id_code': 'CA-001',
        'rule_reference': '22 CCR 66261.24',
        'description': 'California requires STLC/TTLC testing for non-RCRA hazardous waste determination (state-only hazardous).',
        'condition_expression': json.dumps({'generator_state': 'CA'}),
        'question_template': json.dumps([
            {'id': 'ca001_stlc', 'type': 'boolean', 'text': 'Has STLC (Soluble Threshold Limit Concentration) testing been performed?'},
            {'id': 'ca001_ttlc', 'type': 'boolean', 'text': 'Has TTLC (Total Threshold Limit Concentration) testing been performed?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'CA',
        'rule_category': 'manifest',
        'rule_id_code': 'CA-002',
        'rule_reference': '22 CCR 66262.20',
        'description': 'California requires use of the DTSC Uniform Hazardous Waste Manifest in addition to federal manifest.',
        'condition_expression': json.dumps({'generator_state': 'CA', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'CA',
        'rule_category': 'identification',
        'rule_id_code': 'CA-003',
        'rule_reference': '22 CCR 66261.120',
        'description': 'California classifies additional non-RCRA wastes as hazardous under state criteria (corrosivity, persistence, bioaccumulation).',
        'condition_expression': json.dumps({'generator_state': 'CA'}),
        'question_template': json.dumps([
            {'id': 'ca003_state_criteria', 'type': 'boolean', 'text': 'Does the waste exhibit California-specific hazardous characteristics (non-RCRA)?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'CA',
        'rule_category': 'reporting',
        'rule_id_code': 'CA-004',
        'rule_reference': '22 CCR 66262.41',
        'description': 'California requires annual hazardous waste reports from SQGs and LQGs via CalEPA reporting portal.',
        'condition_expression': json.dumps({'generator_state': 'CA', 'generator_status': ['SQG', 'LQG']}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'CA',
        'rule_category': 'labeling',
        'rule_id_code': 'CA-005',
        'rule_reference': '22 CCR 66262.34',
        'description': 'California requires non-RCRA hazardous waste labels to include California waste codes.',
        'condition_expression': json.dumps({'generator_state': 'CA', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'ca005_ca_codes', 'type': 'text', 'text': 'Provide applicable California waste code(s) (e.g., 141, 551, 791).'}
        ]),
        'is_active': True,
    },
    # Puerto Rico (PR)
    {
        'state_code': 'PR',
        'rule_category': 'manifest',
        'rule_id_code': 'PR-001',
        'rule_reference': 'PR EQB Regulation 7784',
        'description': 'Puerto Rico requires bilingual (English/Spanish) manifest documentation for all hazardous waste.',
        'condition_expression': json.dumps({'generator_state': 'PR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'pr001_bilingual', 'type': 'boolean', 'text': 'Is the manifest prepared in both English and Spanish?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'PR',
        'rule_category': 'transport',
        'rule_id_code': 'PR-002',
        'rule_reference': 'PR EQB Regulation 7784 Art. 5',
        'description': 'Puerto Rico requires maritime transport documentation for all off-island HW shipments (IMDG Code compliance).',
        'condition_expression': json.dumps({'generator_state': 'PR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'pr002_maritime', 'type': 'boolean', 'text': 'Will this shipment require maritime transport off-island?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'PR',
        'rule_category': 'identification',
        'rule_id_code': 'PR-003',
        'rule_reference': 'PR EQB Regulation 7784 Art. 2',
        'description': 'Puerto Rico follows federal RCRA identification rules with EQB notification requirements.',
        'condition_expression': json.dumps({'generator_state': 'PR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'PR',
        'rule_category': 'storage',
        'rule_id_code': 'PR-004',
        'rule_reference': 'PR EQB Regulation 7784 Art. 4',
        'description': 'Puerto Rico hurricane preparedness: generators must secure HW storage during hurricane season (Jun-Nov).',
        'condition_expression': json.dumps({'generator_state': 'PR', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'pr004_hurricane_plan', 'type': 'boolean', 'text': 'Does the facility have a hurricane preparedness plan for hazardous waste storage?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'PR',
        'rule_category': 'reporting',
        'rule_id_code': 'PR-005',
        'rule_reference': 'PR EQB Regulation 7784 Art. 7',
        'description': 'Puerto Rico LQGs must submit annual reports to EQB by March 1 each year.',
        'condition_expression': json.dumps({'generator_state': 'PR', 'generator_status': 'LQG'}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # Guam (GU)
    {
        'state_code': 'GU',
        'rule_category': 'manifest',
        'rule_id_code': 'GU-001',
        'rule_reference': 'Guam EPA Reg. Chapter 22',
        'description': 'Guam requires all hazardous waste manifests to include maritime shipping documentation.',
        'condition_expression': json.dumps({'generator_state': 'GU', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'GU',
        'rule_category': 'transport',
        'rule_id_code': 'GU-002',
        'rule_reference': 'Guam EPA Reg. Chapter 22.3',
        'description': 'Guam requires IMDG Code compliance for all hazardous waste shipments (island territory - all shipments are maritime).',
        'condition_expression': json.dumps({'generator_state': 'GU', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'gu002_imdg', 'type': 'boolean', 'text': 'Has IMDG Code classification been completed for this shipment?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'GU',
        'rule_category': 'identification',
        'rule_id_code': 'GU-003',
        'rule_reference': 'Guam EPA Reg. Chapter 22.1',
        'description': 'Guam follows federal RCRA hazardous waste identification with Guam EPA notification.',
        'condition_expression': json.dumps({'generator_state': 'GU', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'GU',
        'rule_category': 'storage',
        'rule_id_code': 'GU-004',
        'rule_reference': 'Guam EPA Reg. Chapter 22.4',
        'description': 'Guam requires typhoon-resistant storage for all hazardous waste containers.',
        'condition_expression': json.dumps({'generator_state': 'GU', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'gu004_typhoon', 'type': 'boolean', 'text': 'Is the storage facility rated for typhoon conditions?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'GU',
        'rule_category': 'reporting',
        'rule_id_code': 'GU-005',
        'rule_reference': 'Guam EPA Reg. Chapter 22.7',
        'description': 'Guam generators must submit annual hazardous waste activity reports to Guam EPA.',
        'condition_expression': json.dumps({'generator_state': 'GU', 'generator_status': ['SQG', 'LQG']}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # U.S. Virgin Islands (VI)
    {
        'state_code': 'VI',
        'rule_category': 'manifest',
        'rule_id_code': 'VI-001',
        'rule_reference': 'VIDPNR Title 12 Chapter 9',
        'description': 'U.S. Virgin Islands requires manifest submission to DPNR for all hazardous waste shipments.',
        'condition_expression': json.dumps({'generator_state': 'VI', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'VI',
        'rule_category': 'transport',
        'rule_id_code': 'VI-002',
        'rule_reference': 'VIDPNR Title 12 Chapter 9.5',
        'description': 'USVI requires maritime transport compliance (IMDG) for all hazardous waste leaving the territory.',
        'condition_expression': json.dumps({'generator_state': 'VI', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'vi002_destination', 'type': 'text', 'text': 'What is the destination port for this maritime HW shipment?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'VI',
        'rule_category': 'storage',
        'rule_id_code': 'VI-003',
        'rule_reference': 'VIDPNR Title 12 Chapter 9.3',
        'description': 'USVI requires hurricane-rated storage for hazardous waste during hurricane season.',
        'condition_expression': json.dumps({'generator_state': 'VI', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'vi003_hurricane_rated', 'type': 'boolean', 'text': 'Is the HW storage facility hurricane-rated per DPNR standards?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'VI',
        'rule_category': 'identification',
        'rule_id_code': 'VI-004',
        'rule_reference': 'VIDPNR Title 12 Chapter 9.1',
        'description': 'USVI follows federal RCRA identification with DPNR notification.',
        'condition_expression': json.dumps({'generator_state': 'VI', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'VI',
        'rule_category': 'reporting',
        'rule_id_code': 'VI-005',
        'rule_reference': 'VIDPNR Title 12 Chapter 9.7',
        'description': 'USVI requires annual hazardous waste reports from all generators with EPA IDs.',
        'condition_expression': json.dumps({'generator_state': 'VI', 'generator_status': ['SQG', 'LQG']}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # American Samoa (AS)
    {
        'state_code': 'AS',
        'rule_category': 'manifest',
        'rule_id_code': 'AS-001',
        'rule_reference': 'ASEPA Regulation 04-0501',
        'description': 'American Samoa requires manifest documentation for all hazardous waste with ASEPA copy submission.',
        'condition_expression': json.dumps({'generator_state': 'AS', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'AS',
        'rule_category': 'transport',
        'rule_id_code': 'AS-002',
        'rule_reference': 'ASEPA Regulation 04-0502',
        'description': 'American Samoa requires all HW to be shipped off-territory via maritime with IMDG compliance.',
        'condition_expression': json.dumps({'generator_state': 'AS', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'as002_ship_route', 'type': 'text', 'text': 'Provide the planned maritime shipping route for this hazardous waste shipment.'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AS',
        'rule_category': 'storage',
        'rule_id_code': 'AS-003',
        'rule_reference': 'ASEPA Regulation 04-0503',
        'description': 'American Samoa requires cyclone-resistant storage for hazardous waste (Nov-Apr wet season).',
        'condition_expression': json.dumps({'generator_state': 'AS', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'as003_cyclone', 'type': 'boolean', 'text': 'Is the HW storage facility rated for cyclone conditions?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'AS',
        'rule_category': 'identification',
        'rule_id_code': 'AS-004',
        'rule_reference': 'ASEPA Regulation 04-0504',
        'description': 'American Samoa adopts federal RCRA hazardous waste identification standards with local notification.',
        'condition_expression': json.dumps({'generator_state': 'AS', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    # Northern Mariana Islands (MP)
    {
        'state_code': 'MP',
        'rule_category': 'manifest',
        'rule_id_code': 'MP-001',
        'rule_reference': 'CNMI DEQ Regulation 65-30',
        'description': 'Northern Mariana Islands requires manifest submission to DEQ for all hazardous waste.',
        'condition_expression': json.dumps({'generator_state': 'MP', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
    {
        'state_code': 'MP',
        'rule_category': 'transport',
        'rule_id_code': 'MP-002',
        'rule_reference': 'CNMI DEQ Regulation 65-31',
        'description': 'CNMI requires maritime IMDG compliance and DEQ transport approval for all HW shipments.',
        'condition_expression': json.dumps({'generator_state': 'MP', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'mp002_deq_approval', 'type': 'boolean', 'text': 'Has DEQ transport approval been obtained for this shipment?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'MP',
        'rule_category': 'storage',
        'rule_id_code': 'MP-003',
        'rule_reference': 'CNMI DEQ Regulation 65-32',
        'description': 'CNMI requires typhoon-resistant storage and secondary containment for all hazardous waste.',
        'condition_expression': json.dumps({'generator_state': 'MP', 'waste_is_hazardous': True}),
        'question_template': json.dumps([
            {'id': 'mp003_containment', 'type': 'boolean', 'text': 'Does the storage area have secondary containment per CNMI DEQ standards?'}
        ]),
        'is_active': True,
    },
    {
        'state_code': 'MP',
        'rule_category': 'identification',
        'rule_id_code': 'MP-004',
        'rule_reference': 'CNMI DEQ Regulation 65-33',
        'description': 'CNMI follows federal RCRA identification with DEQ notification requirement.',
        'condition_expression': json.dumps({'generator_state': 'MP', 'waste_is_hazardous': True}),
        'question_template': json.dumps([]),
        'is_active': True,
    },
]


class Command(BaseCommand):
    help = 'Seed state-specific hazardous waste rules'

    def handle(self, *args, **options):
        created = 0
        for rule_data in STATE_RULES_DATA:
            _, was_created = StateRule.objects.update_or_create(
                rule_id_code=rule_data['rule_id_code'],
                defaults=rule_data,
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created} new state rules (total: {len(STATE_RULES_DATA)})'
        ))
