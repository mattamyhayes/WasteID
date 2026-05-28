import json
import re
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


def _component_is_detected(comp):
    """
    Return True when a MixtureComponent represents a detected constituent.

    Components with missing/invalid quantity or quantity <= 0 are treated as
    non-detect placeholders and excluded from hazard code assignment.
    """
    try:
        return float(comp.quantity) > 0
    except (TypeError, ValueError):
        return False


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
        if not _component_is_detected(comp):
            continue
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
            if not _component_is_detected(comp):
                continue
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
        if not _component_is_detected(comp):
            continue
        if comp.chemical and comp.chemical.is_ignitable:
            has_ignitability = True
            if 'D001' not in waste_codes:
                waste_codes.append('D001')
            char_details.append(f'D001 (Ignitability): {comp.component_name} is an ignitable material.')

    # D002 - Corrosivity (pH ≤ 2 or ≥ 12.5)
    ph = additional_props.get('ph')
    if ph is None:
        for comp in components:
            if not _component_is_detected(comp):
                continue
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
        if not _component_is_detected(comp):
            continue
        if comp.chemical and comp.chemical.is_corrosive:
            has_corrosivity = True
            if 'D002' not in waste_codes:
                waste_codes.append('D002')
            char_details.append(f'D002 (Corrosivity): {comp.component_name} is a corrosive material.')

    # D003 - Reactivity
    is_reactive = additional_props.get('is_reactive', False)
    for comp in components:
        if not _component_is_detected(comp):
            continue
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
        if not _component_is_detected(comp):
            continue
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


# ─── SDS-Based Characteristic Hazardous Waste Determination ───────────────────

def _parse_numeric_value(text):
    """Extract a numeric value from a text string (e.g., '23 °C' -> 23.0)."""
    if not text:
        return None
    # Match negative/positive numbers with optional decimal
    match = re.search(r'(-?\d+(?:\.\d+)?)', str(text)[:100])
    if match:
        try:
            return float(match.group(1))
        except (ValueError, TypeError):
            return None
    return None


def _parse_temperature_celsius(text):
    """Parse a temperature value, converting from Fahrenheit if needed."""
    if not text:
        return None
    text = str(text)[:200]

    # Check if value is given in Fahrenheit
    fahrenheit_match = re.search(r'(-?\d+(?:\.\d+)?)\s*°?\s*F', text, re.IGNORECASE)
    celsius_match = re.search(r'(-?\d+(?:\.\d+)?)\s*°?\s*C', text, re.IGNORECASE)

    if celsius_match:
        try:
            return float(celsius_match.group(1))
        except (ValueError, TypeError):
            pass

    if fahrenheit_match:
        try:
            f_val = float(fahrenheit_match.group(1))
            return (f_val - 32) * 5.0 / 9.0
        except (ValueError, TypeError):
            pass

    # Try bare number
    return _parse_numeric_value(text)


def _is_liquid(physical_state):
    """Determine if material is a liquid based on physical state description."""
    if not physical_state:
        return None  # Unknown
    state_lower = str(physical_state).lower()
    liquid_keywords = ['liquid', 'fluid', 'solution', 'emulsion', 'suspension']
    solid_keywords = ['solid', 'powder', 'granul', 'crystal', 'pellet', 'flake', 'paste']
    gas_keywords = ['gas', 'vapor', 'aerosol']

    for kw in liquid_keywords:
        if kw in state_lower:
            return True
    for kw in solid_keywords + gas_keywords:
        if kw in state_lower:
            return False
    return None


def _has_un_number(un_number_text):
    """Check if a valid UN number is present (indicates DOT-regulated hazardous material)."""
    if not un_number_text:
        return False
    text = str(un_number_text).strip()
    # UN numbers are 4-digit identifiers
    match = re.search(r'(?:UN\s*)?(\d{4})', text, re.IGNORECASE)
    if match:
        number = match.group(1)
        # UN0000 is not a valid assignment; also filter out placeholder text
        if number != '0000':
            return True
    return False


def _match_composition_to_tclp(composition):
    """
    Match SDS composition chemicals against TCLP Table 1 (40 CFR 261.24).
    Returns list of matches with D-codes where concentration may exceed regulatory limits.
    """
    matches = []
    if not composition:
        return matches

    # Parse composition JSON
    if isinstance(composition, str):
        try:
            comp_list = json.loads(composition)
        except (json.JSONDecodeError, TypeError):
            return matches
    elif isinstance(composition, list):
        comp_list = composition
    else:
        return matches

    for entry in comp_list:
        if not isinstance(entry, dict):
            continue

        cas = entry.get('cas_number', '').strip()
        name = entry.get('name', '').lower().strip()
        concentration_str = entry.get('concentration', '')

        # Parse concentration percentage
        concentration_pct = None
        if concentration_str:
            # Handle range like "10-30%" - use upper bound
            range_match = re.search(r'(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%', str(concentration_str)[:100])
            single_match = re.search(r'(\d+(?:\.\d+)?)\s*%', str(concentration_str)[:100])
            if range_match:
                try:
                    concentration_pct = float(range_match.group(2))
                except ValueError:
                    pass
            elif single_match:
                try:
                    concentration_pct = float(single_match.group(1))
                except ValueError:
                    pass

        # Match against TCLP thresholds by CAS number or exact name match
        for d_code, info in TCLP_THRESHOLDS.items():
            matched = False
            if cas and info.get('cas') and cas == info['cas']:
                matched = True
            elif name and info['name'].lower() == name:
                matched = True

            if matched:
                match_entry = {
                    'chemical_name': entry.get('name', info['name']),
                    'cas_number': cas or info.get('cas', ''),
                    'd_code': d_code,
                    'regulatory_limit_mgl': info['threshold'],
                    'concentration_pct': concentration_pct,
                }
                # TCLP estimation: assumes 1 g/mL density and standard 20:1 liquid-to-solid
                # dilution ratio per EPA Method 1311. (pct/100) converts to fraction,
                # * 1,000,000 converts to mg/kg, / 20 applies TCLP dilution factor.
                if concentration_pct is not None and concentration_pct > 0:
                    tclp_estimate = (concentration_pct / 100.0) * 1_000_000 / 20.0
                    match_entry['tclp_estimate_mgl'] = round(tclp_estimate, 2)
                    match_entry['exceeds_limit'] = tclp_estimate >= info['threshold']
                else:
                    match_entry['tclp_estimate_mgl'] = None
                    match_entry['exceeds_limit'] = None

                matches.append(match_entry)
                break  # Only match each component once

    return matches


def determine_from_sds(sds_record):
    """
    Perform hazardous waste characteristic determination from SDS data.

    Uses:
    - Section 9 (Physical and Chemical Properties): flash point, pH, physical state
    - Section 14 (Transport Information): UN number for DOT-regulated status
    - Section 3 (Composition): chemicals matched against 40 CFR 261.24 Table 1
    - Section 10 (Stability/Reactivity): reactivity indicators

    Returns a dict with characteristic determination results per 40 CFR 261 Subpart C.
    """
    findings = {
        'characteristics': [],
        'waste_codes': [],
        'dot_regulated': False,
        'reasoning': [],
        'regulatory_references': [],
        'recommendations': [],
    }

    # ─── Physical State Determination ─────────────────────────────────────────
    physical_state = getattr(sds_record, 'physical_state', '') or ''
    is_liquid = _is_liquid(physical_state)
    state_desc = physical_state if physical_state else 'Not specified'
    findings['physical_state'] = state_desc
    findings['reasoning'].append({
        'section': 'Physical State',
        'source': 'SDS Section 9',
        'value': state_desc,
        'determination': f'Material identified as: {state_desc}',
    })

    # ─── D001 Ignitability (40 CFR 261.21) ────────────────────────────────────
    flash_point_raw = getattr(sds_record, 'flash_point', '') or ''
    flash_point_c = _parse_temperature_celsius(flash_point_raw)

    ignitability_detail = {
        'characteristic': 'D001 - Ignitability',
        'regulation': '40 CFR 261.21',
        'raw_value': flash_point_raw,
        'parsed_value_c': flash_point_c,
        'physical_state': state_desc,
        'is_liquid': is_liquid,
        'threshold': 'Flash point < 60°C (140°F) for liquids',
        'result': 'NOT_DETERMINED',
        'detail': '',
    }

    if flash_point_c is not None:
        if is_liquid is None or is_liquid is True:
            # Apply liquid rule: flash point < 60°C
            if flash_point_c < 60.0:
                ignitability_detail['result'] = 'HAZARDOUS'
                ignitability_detail['detail'] = (
                    f'Flash point {flash_point_c:.1f}°C is below 60°C threshold. '
                    f'Material is characteristic hazardous waste D001 (Ignitability) per 40 CFR 261.21.'
                )
                findings['characteristics'].append('D001')
                if 'D001' not in findings['waste_codes']:
                    findings['waste_codes'].append('D001')
            else:
                ignitability_detail['result'] = 'NOT_HAZARDOUS'
                ignitability_detail['detail'] = (
                    f'Flash point {flash_point_c:.1f}°C is at or above 60°C threshold. '
                    f'Does not meet ignitability characteristic.'
                )
        elif is_liquid is False:
            ignitability_detail['result'] = 'NOT_APPLICABLE_SOLID'
            ignitability_detail['detail'] = (
                f'Flash point {flash_point_c:.1f}°C noted, but material is solid. '
                f'Flash point test applies primarily to liquids. '
                f'Solids are ignitable if they can cause fire through friction, absorption of moisture, '
                f'or spontaneous chemical changes per 40 CFR 261.21(a)(2).'
            )
    else:
        ignitability_detail['result'] = 'INSUFFICIENT_DATA'
        ignitability_detail['detail'] = (
            'Flash point not reported or could not be parsed from SDS Section 9. '
            'Laboratory testing per ASTM D93 or D3278 (SW-846 Method 1010B/1020C) recommended.'
        )

    findings['reasoning'].append(ignitability_detail)

    # ─── D002 Corrosivity (40 CFR 261.22) ─────────────────────────────────────
    ph_raw = getattr(sds_record, 'ph', '') or ''
    ph_value = _parse_numeric_value(ph_raw)

    corrosivity_detail = {
        'characteristic': 'D002 - Corrosivity',
        'regulation': '40 CFR 261.22',
        'raw_value': ph_raw,
        'parsed_value': ph_value,
        'threshold': 'pH ≤ 2.0 or pH ≥ 12.5 (aqueous liquids)',
        'result': 'NOT_DETERMINED',
        'detail': '',
    }

    if ph_value is not None:
        if ph_value <= 2.0:
            corrosivity_detail['result'] = 'HAZARDOUS'
            corrosivity_detail['detail'] = (
                f'pH {ph_value} is ≤ 2.0 (highly acidic). '
                f'Material is characteristic hazardous waste D002 (Corrosivity) per 40 CFR 261.22.'
            )
            findings['characteristics'].append('D002')
            if 'D002' not in findings['waste_codes']:
                findings['waste_codes'].append('D002')
        elif ph_value >= 12.5:
            corrosivity_detail['result'] = 'HAZARDOUS'
            corrosivity_detail['detail'] = (
                f'pH {ph_value} is ≥ 12.5 (highly alkaline). '
                f'Material is characteristic hazardous waste D002 (Corrosivity) per 40 CFR 261.22.'
            )
            findings['characteristics'].append('D002')
            if 'D002' not in findings['waste_codes']:
                findings['waste_codes'].append('D002')
        else:
            corrosivity_detail['result'] = 'NOT_HAZARDOUS'
            corrosivity_detail['detail'] = (
                f'pH {ph_value} is between 2.0 and 12.5. '
                f'Does not meet corrosivity characteristic.'
            )
    else:
        corrosivity_detail['result'] = 'INSUFFICIENT_DATA'
        corrosivity_detail['detail'] = (
            'pH not reported or could not be parsed from SDS Section 9. '
            'Testing per EPA Method 9040C or 9045D recommended for aqueous/liquid wastes.'
        )

    findings['reasoning'].append(corrosivity_detail)

    # ─── D003 Reactivity (40 CFR 261.23) ──────────────────────────────────────
    chemical_stability = getattr(sds_record, 'chemical_stability', '') or ''
    conditions_to_avoid = getattr(sds_record, 'conditions_to_avoid', '') or ''
    possibility_of_reactions = getattr(sds_record, 'possibility_of_reactions', '') or ''
    hazardous_decomposition = getattr(sds_record, 'hazardous_decomposition', '') or ''

    reactivity_indicators = []
    reactivity_text = f'{chemical_stability} {conditions_to_avoid} {possibility_of_reactions}'.lower()

    reactive_keywords = [
        'unstable', 'explosive', 'shock sensitive', 'water reactive',
        'reacts violently', 'self-reactive', 'organic peroxide',
        'forbidden explosive', 'class 1', 'detonation',
        'generates toxic gas', 'cyanide', 'sulfide',
    ]
    for kw in reactive_keywords:
        if kw in reactivity_text:
            reactivity_indicators.append(kw)

    reactivity_detail = {
        'characteristic': 'D003 - Reactivity',
        'regulation': '40 CFR 261.23',
        'indicators_found': reactivity_indicators,
        'stability_info': chemical_stability,
        'conditions_to_avoid': conditions_to_avoid,
        'result': 'NOT_DETERMINED',
        'detail': '',
    }

    if reactivity_indicators:
        reactivity_detail['result'] = 'POTENTIALLY_HAZARDOUS'
        reactivity_detail['detail'] = (
            f'Reactivity indicators found in SDS Section 10: {", ".join(reactivity_indicators)}. '
            f'Material may be characteristic hazardous waste D003 (Reactivity) per 40 CFR 261.23. '
            f'Further evaluation recommended.'
        )
        findings['characteristics'].append('D003')
        if 'D003' not in findings['waste_codes']:
            findings['waste_codes'].append('D003')
    elif chemical_stability:
        stability_lower = chemical_stability.lower()
        if 'stable' in stability_lower and 'unstable' not in stability_lower:
            reactivity_detail['result'] = 'NOT_HAZARDOUS'
            reactivity_detail['detail'] = (
                'Material reported as stable in SDS Section 10. '
                'No reactivity indicators identified.'
            )
        else:
            reactivity_detail['result'] = 'INSUFFICIENT_DATA'
            reactivity_detail['detail'] = (
                'Stability information present but inconclusive. '
                'Review SDS Section 10 and conduct reactivity testing if needed.'
            )
    else:
        reactivity_detail['result'] = 'INSUFFICIENT_DATA'
        reactivity_detail['detail'] = (
            'No stability/reactivity information found in SDS Section 10. '
            'Reactivity testing per 40 CFR 261.23 criteria recommended.'
        )

    findings['reasoning'].append(reactivity_detail)

    # ─── D004-D043 Toxicity Characteristic (40 CFR 261.24) ────────────────────
    composition_raw = getattr(sds_record, 'composition', '') or '[]'
    tclp_matches = _match_composition_to_tclp(composition_raw)

    toxicity_detail = {
        'characteristic': 'D004-D043 - Toxicity (TCLP)',
        'regulation': '40 CFR 261.24',
        'method': 'EPA Method 1311 (TCLP)',
        'composition_chemicals_matched': len(tclp_matches),
        'matches': tclp_matches,
        'result': 'NOT_DETERMINED',
        'detail': '',
    }

    toxic_codes = []
    for match in tclp_matches:
        if match.get('exceeds_limit') is True:
            d_code = match['d_code']
            if d_code not in toxic_codes:
                toxic_codes.append(d_code)

    if toxic_codes:
        toxicity_detail['result'] = 'HAZARDOUS'
        toxicity_detail['detail'] = (
            f'SDS composition contains chemicals that may exceed TCLP regulatory limits: '
            f'{", ".join(toxic_codes)}. Based on concentration estimates from SDS Section 3 '
            f'compared to 40 CFR 261.24 Table 1 regulatory levels. '
            f'Confirm with TCLP testing (EPA Method 1311).'
        )
        findings['characteristics'].extend([c for c in toxic_codes if c not in findings['characteristics']])
        findings['waste_codes'].extend([c for c in toxic_codes if c not in findings['waste_codes']])
    elif tclp_matches:
        # Chemicals from Table 1 are present but don't clearly exceed limits
        has_unknown = any(m.get('exceeds_limit') is None for m in tclp_matches)
        if has_unknown:
            toxicity_detail['result'] = 'TESTING_RECOMMENDED'
            toxicity_detail['detail'] = (
                f'SDS composition contains {len(tclp_matches)} chemical(s) listed in '
                f'40 CFR 261.24 Table 1, but concentrations could not be fully determined. '
                f'TCLP testing (EPA Method 1311) recommended to confirm toxicity characteristic.'
            )
        else:
            toxicity_detail['result'] = 'NOT_HAZARDOUS'
            toxicity_detail['detail'] = (
                f'SDS composition contains chemicals from 40 CFR 261.24 Table 1, '
                f'but estimated TCLP concentrations are below regulatory limits.'
            )
    else:
        toxicity_detail['result'] = 'NO_LISTED_CHEMICALS'
        toxicity_detail['detail'] = (
            'No chemicals from 40 CFR 261.24 Table 1 identified in SDS Section 3 composition. '
            'If waste stream composition differs from the SDS product, TCLP testing may still be warranted.'
        )

    findings['reasoning'].append(toxicity_detail)

    # ─── Section 14: DOT / Transport Hazard Assessment ────────────────────────
    un_number_raw = getattr(sds_record, 'un_number', '') or ''
    shipping_name = getattr(sds_record, 'un_proper_shipping_name', '') or ''
    transport_class = getattr(sds_record, 'transport_hazard_class', '') or ''
    dot_description = getattr(sds_record, 'dot_description', '') or ''

    dot_detail = {
        'section': 'DOT / Transport Hazard (Section 14)',
        'un_number': un_number_raw,
        'proper_shipping_name': shipping_name,
        'transport_hazard_class': transport_class,
        'dot_description': dot_description,
        'has_un_number': _has_un_number(un_number_raw),
        'result': 'NOT_DETERMINED',
        'detail': '',
    }

    if _has_un_number(un_number_raw):
        findings['dot_regulated'] = True
        dot_detail['result'] = 'DOT_REGULATED'
        dot_detail['detail'] = (
            f'UN Number {un_number_raw} assigned in SDS Section 14. '
            f'Material is DOT-regulated for transport. '
            f'Proper shipping name: {shipping_name or "See SDS"}. '
            f'This indicates the manufacturer identifies this material as hazardous for shipping. '
            f'A UN number strongly suggests the material has hazardous properties.'
        )
    elif shipping_name and 'not regulated' not in shipping_name.lower():
        dot_detail['result'] = 'REVIEW_NEEDED'
        dot_detail['detail'] = (
            f'Shipping name identified ({shipping_name}) but no clear UN number parsed. '
            f'Review SDS Section 14 for full DOT classification.'
        )
    else:
        dot_detail['result'] = 'NOT_REGULATED'
        dot_detail['detail'] = (
            'No UN number identified in SDS Section 14. '
            'Material may not be DOT-regulated for transport, but this does not '
            'preclude RCRA hazardous waste classification.'
        )

    findings['reasoning'].append(dot_detail)

    # ─── Summary and Recommendations ─────────────────────────────────────────
    is_characteristic_hazardous = len(findings['waste_codes']) > 0
    findings['is_characteristic_hazardous'] = is_characteristic_hazardous

    # Build regulatory references
    findings['regulatory_references'] = [
        '40 CFR 261.21 - Characteristic of Ignitability',
        '40 CFR 261.22 - Characteristic of Corrosivity',
        '40 CFR 261.23 - Characteristic of Reactivity',
        '40 CFR 261.24 - Toxicity Characteristic (TCLP Table 1)',
        '40 CFR 261 Subpart C - Characteristics of Hazardous Waste',
    ]

    # Build recommendations
    recs = []
    if is_characteristic_hazardous:
        recs.append(
            f'⚠️ SDS indicates CHARACTERISTIC HAZARDOUS WASTE with code(s): '
            f'{", ".join(findings["waste_codes"])}.'
        )
        recs.append(
            'Manage as hazardous waste per 40 CFR Parts 262-265. '
            'Proper storage, labeling, manifesting, and disposal at a permitted TSDF required.'
        )
    else:
        recs.append(
            'Based on SDS data, no definitive characteristic hazardous waste indicators were confirmed.'
        )

    if findings['dot_regulated']:
        recs.append(
            'Material is DOT-regulated (has UN number). '
            'Follow DOT packaging, marking, and labeling requirements for shipment.'
        )

    # Check for data gaps
    data_gaps = []
    if flash_point_c is None and (is_liquid is None or is_liquid is True):
        data_gaps.append('Flash point (ignitability)')
    if ph_value is None:
        data_gaps.append('pH (corrosivity)')
    if not tclp_matches:
        data_gaps.append('TCLP testing (toxicity)')

    if data_gaps:
        recs.append(
            f'Data gaps identified: {", ".join(data_gaps)}. '
            f'Laboratory testing per SW-846 methods recommended for complete characterization.'
        )

    recs.append(
        'DISCLAIMER: This determination is based on SDS information only. '
        'Actual waste characterization requires representative sampling and '
        'laboratory testing per 40 CFR 261 Subpart C methods. '
        'Consult a qualified environmental professional.'
    )

    findings['recommendations'] = recs

    return findings
