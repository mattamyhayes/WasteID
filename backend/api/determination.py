import json
from .models import Chemical, MixtureComponent

F_LIST_SOLVENTS = {
    'F001': {
        'name': 'Spent Halogenated Solvents',
        'chemicals': ['tetrachloroethylene', 'trichloroethylene', 'methylene chloride',
                      'carbon tetrachloride', 'chlorinated fluorocarbons'],
        'threshold_pct': 10.0,
    },
    'F002': {
        'name': 'Spent Halogenated Solvents',
        'chemicals': ['tetrachloroethylene', 'methylene chloride', 'trichloroethylene',
                      '1,1,1-trichloroethane', 'chlorobenzene', '1,1,2-trichloro-1,2,2-trifluoroethane',
                      'ortho-dichlorobenzene', 'trichlorofluoromethane'],
        'threshold_pct': 10.0,
    },
    'F003': {
        'name': 'Spent Non-Halogenated Solvents',
        'chemicals': ['xylene', 'acetone', 'ethyl acetate', 'ethyl benzene', 'ethyl ether',
                      'methyl isobutyl ketone', 'n-butyl alcohol', 'cyclohexanone', 'methanol'],
        'threshold_pct': 10.0,
    },
    'F004': {
        'name': 'Spent Non-Halogenated Solvents',
        'chemicals': ['cresols', 'cresylic acid', 'nitrobenzene'],
        'threshold_pct': 10.0,
    },
    'F005': {
        'name': 'Spent Non-Halogenated Solvents',
        'chemicals': ['toluene', 'methyl ethyl ketone', 'carbon disulfide', 'isobutanol',
                      'pyridine', '2-ethoxyethanol', 'benzene', '2-nitropropane'],
        'threshold_pct': 10.0,
    },
}

TCLP_THRESHOLDS = {
    'D004': {'name': 'Arsenic', 'threshold': 5.0, 'cas': '7440-38-2'},
    'D005': {'name': 'Barium', 'threshold': 100.0, 'cas': '7440-39-3'},
    'D006': {'name': 'Cadmium', 'threshold': 1.0, 'cas': '7440-43-9'},
    'D007': {'name': 'Chromium', 'threshold': 5.0, 'cas': '7440-47-3'},
    'D008': {'name': 'Lead', 'threshold': 5.0, 'cas': '7439-92-1'},
    'D009': {'name': 'Mercury', 'threshold': 0.2, 'cas': '7439-97-6'},
    'D010': {'name': 'Selenium', 'threshold': 1.0, 'cas': '7782-49-2'},
    'D011': {'name': 'Silver', 'threshold': 5.0, 'cas': '7440-22-4'},
    'D012': {'name': 'Endrin', 'threshold': 0.02, 'cas': '72-20-8'},
    'D013': {'name': 'Lindane (gamma-BHC)', 'threshold': 0.4, 'cas': '58-89-9'},
    'D014': {'name': 'Methoxychlor', 'threshold': 10.0, 'cas': '72-43-5'},
    'D015': {'name': 'Toxaphene', 'threshold': 0.5, 'cas': '8001-35-2'},
    'D016': {'name': '2,4-D', 'threshold': 10.0, 'cas': '94-75-7'},
    'D017': {'name': '2,4,5-TP (Silvex)', 'threshold': 1.0, 'cas': '93-72-1'},
    'D018': {'name': 'Benzene', 'threshold': 0.5, 'cas': '71-43-2'},
    'D019': {'name': 'Carbon tetrachloride', 'threshold': 0.5, 'cas': '56-23-5'},
    'D020': {'name': 'Chlordane', 'threshold': 0.03, 'cas': '57-74-9'},
    'D021': {'name': 'Chlorobenzene', 'threshold': 100.0, 'cas': '108-90-7'},
    'D022': {'name': 'Chloroform', 'threshold': 6.0, 'cas': '67-66-3'},
    'D023': {'name': 'o-Cresol', 'threshold': 200.0, 'cas': '95-48-7'},
    'D024': {'name': 'm-Cresol', 'threshold': 200.0, 'cas': '108-39-4'},
    'D025': {'name': 'p-Cresol', 'threshold': 200.0, 'cas': '106-44-5'},
    'D026': {'name': 'Cresol', 'threshold': 200.0, 'cas': None},
    'D027': {'name': '1,4-Dichlorobenzene', 'threshold': 7.5, 'cas': '106-46-7'},
    'D028': {'name': '1,2-Dichloroethane', 'threshold': 0.5, 'cas': '107-06-2'},
    'D029': {'name': '1,1-Dichloroethylene', 'threshold': 0.7, 'cas': '75-35-4'},
    'D030': {'name': '2,4-Dinitrotoluene', 'threshold': 0.13, 'cas': '121-14-2'},
    'D031': {'name': 'Heptachlor (and epoxide)', 'threshold': 0.008, 'cas': '76-44-8'},
    'D032': {'name': 'Hexachlorobenzene', 'threshold': 0.13, 'cas': '118-74-1'},
    'D033': {'name': 'Hexachlorobutadiene', 'threshold': 0.5, 'cas': '87-68-3'},
    'D034': {'name': 'Hexachloroethane', 'threshold': 3.0, 'cas': '67-72-1'},
    'D035': {'name': 'Methyl ethyl ketone', 'threshold': 200.0, 'cas': '78-93-3'},
    'D036': {'name': 'Nitrobenzene', 'threshold': 2.0, 'cas': '98-95-3'},
    'D037': {'name': 'Pentachlorophenol', 'threshold': 100.0, 'cas': '87-86-5'},
    'D038': {'name': 'Pyridine', 'threshold': 5.0, 'cas': '110-86-1'},
    'D039': {'name': 'Tetrachloroethylene', 'threshold': 0.7, 'cas': '127-18-4'},
    'D040': {'name': 'Trichloroethylene', 'threshold': 0.5, 'cas': '79-01-6'},
    'D041': {'name': '2,4,5-Trichlorophenol', 'threshold': 400.0, 'cas': '95-95-4'},
    'D042': {'name': '2,4,6-Trichlorophenol', 'threshold': 2.0, 'cas': '88-06-2'},
    'D043': {'name': 'Vinyl chloride', 'threshold': 0.2, 'cas': '75-01-4'},
}


def determine_hazardous_waste(mixture, additional_props=None):
    """
    Main determination function following EPA RCRA hazardous waste identification process.
    Returns a dict with full determination results.
    """
    if additional_props is None:
        additional_props = {}

    reasoning = []
    waste_codes = []

    # Step 1: Is it a solid waste?
    reasoning.append({
        'step': 1,
        'title': 'Solid Waste Determination',
        'question': 'Is the material a "solid waste" under RCRA (i.e., is it discarded/abandoned)?',
        'answer': None,
        'result': None,
        'details': []
    })

    if not mixture.is_discarded:
        reasoning[0]['answer'] = 'No'
        reasoning[0]['result'] = 'NOT_SOLID_WASTE'
        reasoning[0]['details'].append('Material is not discarded; it is not a solid waste under RCRA.')
        return {
            'is_solid_waste': False,
            'is_excluded': False,
            'is_listed_hazardous': False,
            'has_ignitability': False,
            'has_corrosivity': False,
            'has_reactivity': False,
            'has_toxicity': False,
            'is_hazardous_waste': False,
            'waste_codes': [],
            'reasoning': reasoning,
            'recommendations': 'This material does not appear to be a solid waste under RCRA. If the intended use changes, re-evaluate.',
        }

    reasoning[0]['answer'] = 'Yes'
    reasoning[0]['result'] = 'IS_SOLID_WASTE'
    discard_reason = mixture.discard_reason or 'discarded'
    reasoning[0]['details'].append(f'Material is identified as discarded ({discard_reason}). It qualifies as a solid waste.')

    # Step 2: Exclusions check
    reasoning.append({
        'step': 2,
        'title': 'Exclusions Check',
        'question': 'Is the material excluded from RCRA hazardous waste regulations?',
        'answer': None,
        'result': None,
        'details': []
    })

    is_excluded = False
    exclusion_details = []

    if mixture.discard_reason == 'recycled_product_exempt':
        is_excluded = True
        exclusion_details.append('Material may qualify as excluded if it is legitimately recycled. Verify specific recycling exclusion applies.')

    if is_excluded:
        reasoning[1]['answer'] = 'Possibly'
        reasoning[1]['result'] = 'POSSIBLY_EXCLUDED'
        reasoning[1]['details'] = exclusion_details
    else:
        reasoning[1]['answer'] = 'No known exclusions apply'
        reasoning[1]['result'] = 'NOT_EXCLUDED'
        reasoning[1]['details'] = ['No standard RCRA exclusions identified. Proceeding to hazardous waste evaluation.']

    # Step 3: Listed waste check
    reasoning.append({
        'step': 3,
        'title': 'Listed Hazardous Waste Check',
        'question': 'Does the mixture contain any listed hazardous wastes (P, U, F, K lists)?',
        'answer': None,
        'result': None,
        'details': []
    })

    listed_codes = []
    listed_details = []
    components = mixture.components.select_related('chemical').all()

    for comp in components:
        chem = comp.chemical
        if chem and chem.epa_waste_code:
            code = chem.epa_waste_code
            if not code.startswith('D'):
                listed_codes.append(code)
                listed_details.append(
                    f'{comp.component_name} has EPA waste code {code} '
                    f'({chem.get_category_display()}). '
                    f'Quantity: {comp.quantity} {comp.unit}.'
                )
                if code not in waste_codes:
                    waste_codes.append(code)

        # Check F-list solvents by name matching
        if chem:
            chem_name_lower = chem.name.lower()
            for f_code, f_info in F_LIST_SOLVENTS.items():
                for solvent in f_info['chemicals']:
                    if solvent.lower() in chem_name_lower or chem_name_lower in solvent.lower():
                        if comp.unit in ('pct_weight', 'pct_volume') and comp.quantity >= f_info['threshold_pct']:
                            if f_code not in listed_codes:
                                listed_codes.append(f_code)
                                listed_details.append(
                                    f'{comp.component_name} may qualify as {f_code} ({f_info["name"]}) '
                                    f'at {comp.quantity}% concentration (threshold: {f_info["threshold_pct"]}%).'
                                )
                                if f_code not in waste_codes:
                                    waste_codes.append(f_code)

    is_listed = len(listed_codes) > 0
    reasoning[2]['answer'] = 'Yes' if is_listed else 'No'
    reasoning[2]['result'] = 'LISTED' if is_listed else 'NOT_LISTED'
    reasoning[2]['details'] = listed_details if listed_details else ['No listed waste codes identified in mixture components.']

    # Step 4: Characteristic waste checks
    reasoning.append({
        'step': 4,
        'title': 'Characteristic Hazardous Waste Check',
        'question': 'Does the mixture exhibit hazardous characteristics (D001-D043)?',
        'answer': None,
        'result': None,
        'details': []
    })

    char_details = []
    has_ignitability = False
    has_corrosivity = False
    has_reactivity = False
    has_toxicity = False

    # D001 - Ignitability (flash point < 60°C for liquids)
    flash_point = additional_props.get('flash_point_c')
    if flash_point is None:
        for comp in components:
            if comp.override_flash_point_c is not None:
                if flash_point is None or comp.override_flash_point_c < flash_point:
                    flash_point = comp.override_flash_point_c
            elif comp.chemical and comp.chemical.flash_point_c is not None:
                if flash_point is None or comp.chemical.flash_point_c < flash_point:
                    flash_point = comp.chemical.flash_point_c

    if flash_point is not None and flash_point < 60.0:
        has_ignitability = True
        if 'D001' not in waste_codes:
            waste_codes.append('D001')
        char_details.append(f'D001 (Ignitability): Flash point {flash_point}°C < 60°C threshold. Waste is ignitable.')

    for comp in components:
        if comp.chemical and comp.chemical.is_ignitable:
            has_ignitability = True
            if 'D001' not in waste_codes:
                waste_codes.append('D001')
            char_details.append(f'D001 (Ignitability): {comp.component_name} is an ignitable material.')

    # D002 - Corrosivity (pH ≤ 2 or ≥ 12.5)
    ph = additional_props.get('ph')
    if ph is None:
        for comp in components:
            if comp.override_ph is not None:
                ph = comp.override_ph
                break
            if comp.chemical and comp.chemical.ph_value is not None:
                ph = comp.chemical.ph_value
                break

    if ph is not None and (ph <= 2.0 or ph >= 12.5):
        has_corrosivity = True
        if 'D002' not in waste_codes:
            waste_codes.append('D002')
        char_details.append(f'D002 (Corrosivity): pH {ph} is {"≤2.0 (highly acidic)" if ph <= 2.0 else "≥12.5 (highly alkaline)"}. Waste is corrosive.')

    for comp in components:
        if comp.chemical and comp.chemical.is_corrosive:
            has_corrosivity = True
            if 'D002' not in waste_codes:
                waste_codes.append('D002')
            char_details.append(f'D002 (Corrosivity): {comp.component_name} is a corrosive material.')

    # D003 - Reactivity
    is_reactive = additional_props.get('is_reactive', False)
    for comp in components:
        if comp.override_is_reactive or (comp.chemical and comp.chemical.is_reactive):
            is_reactive = True

    if is_reactive:
        has_reactivity = True
        if 'D003' not in waste_codes:
            waste_codes.append('D003')
        char_details.append('D003 (Reactivity): Mixture contains reactive materials (unstable, water-reactive, or explosive potential).')

    # D004-D043 - Toxicity Characteristic (TCLP)
    toxic_codes = []
    for comp in components:
        if not comp.chemical:
            continue
        chem = comp.chemical
        if chem.tclp_threshold_mgl is not None and chem.epa_waste_code and chem.epa_waste_code.startswith('D'):
            if comp.unit in ('pct_weight', 'pct_volume') and comp.quantity > 0:
                # Simplified TCLP estimate: (pct/100) * 1,000,000 mg/kg / 20 dilution = mg/L
                tclp_estimate = (comp.quantity / 100.0) * 1_000_000 / 20.0
                if tclp_estimate >= chem.tclp_threshold_mgl:
                    d_code = chem.epa_waste_code
                    if d_code not in toxic_codes:
                        toxic_codes.append(d_code)
                        char_details.append(
                            f'{d_code} (Toxicity - {chem.name}): Estimated TCLP ~{tclp_estimate:.2f} mg/L '
                            f'exceeds regulatory threshold of {chem.tclp_threshold_mgl} mg/L.'
                        )
            elif comp.unit not in ('pct_weight', 'pct_volume') and comp.quantity > 0:
                d_code = chem.epa_waste_code
                if d_code not in toxic_codes:
                    toxic_codes.append(d_code)
                    char_details.append(
                        f'{d_code} (Toxicity - {chem.name}): Chemical present in mixture. '
                        f'TCLP threshold is {chem.tclp_threshold_mgl} mg/L. Testing recommended.'
                    )

    if toxic_codes:
        has_toxicity = True
        waste_codes.extend([c for c in toxic_codes if c not in waste_codes])

    all_char = has_ignitability or has_corrosivity or has_reactivity or has_toxicity
    if not char_details:
        char_details.append('No characteristic hazards identified based on provided information.')

    reasoning[3]['answer'] = 'Yes' if all_char else 'No'
    reasoning[3]['result'] = 'HAS_CHARACTERISTICS' if all_char else 'NO_CHARACTERISTICS'
    reasoning[3]['details'] = char_details

    is_hazardous = is_listed or all_char

    recs = [
        'DISCLAIMER: This determination is for informational purposes only and does not constitute legal advice.',
        'Verify results with qualified environmental professionals.',
        'Laboratory testing (SW-846 methods) is recommended to confirm characteristics.',
        'Check state-specific regulations, which may be more stringent than federal RCRA.',
    ]

    if is_hazardous:
        recs.insert(0, f'This mixture appears to be a HAZARDOUS WASTE under RCRA with code(s): {", ".join(waste_codes)}.')
        recs.insert(1, 'Proper storage, labeling, manifesting, and disposal at a permitted facility are required.')
    else:
        recs.insert(0, 'Based on available information, this mixture does not appear to be a hazardous waste under RCRA.')
        recs.insert(1, 'Consider additional testing if composition is uncertain.')

    return {
        'is_solid_waste': True,
        'is_excluded': is_excluded,
        'is_listed_hazardous': is_listed,
        'has_ignitability': has_ignitability,
        'has_corrosivity': has_corrosivity,
        'has_reactivity': has_reactivity,
        'has_toxicity': has_toxicity,
        'is_hazardous_waste': is_hazardous,
        'waste_codes': waste_codes,
        'reasoning': reasoning,
        'recommendations': '\n'.join(recs),
    }
