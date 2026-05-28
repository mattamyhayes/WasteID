// Client-side port of backend/api/determination.py
// Implements the same 4-step RCRA hazardous waste determination so the
// app remains fully functional when deployed as a static bundle (e.g. GitHub
// Pages) without a Django backend. The output shape matches what the backend
// WasteDeterminationSerializer produces so the UI can render results
// identically in either mode.

export const F_LIST_SOLVENTS = {
  F001: {
    name: 'Spent Halogenated Solvents',
    chemicals: ['tetrachloroethylene', 'trichloroethylene', 'methylene chloride',
      'carbon tetrachloride', 'chlorinated fluorocarbons'],
    threshold_pct: 10.0,
  },
  F002: {
    name: 'Spent Halogenated Solvents',
    chemicals: ['tetrachloroethylene', 'methylene chloride', 'trichloroethylene',
      '1,1,1-trichloroethane', 'chlorobenzene', '1,1,2-trichloro-1,2,2-trifluoroethane',
      'ortho-dichlorobenzene', 'trichlorofluoromethane'],
    threshold_pct: 10.0,
  },
  F003: {
    name: 'Spent Non-Halogenated Solvents',
    chemicals: ['xylene', 'acetone', 'ethyl acetate', 'ethyl benzene', 'ethyl ether',
      'methyl isobutyl ketone', 'n-butyl alcohol', 'cyclohexanone', 'methanol'],
    threshold_pct: 10.0,
  },
  F004: {
    name: 'Spent Non-Halogenated Solvents',
    chemicals: ['cresols', 'cresylic acid', 'nitrobenzene'],
    threshold_pct: 10.0,
  },
  F005: {
    name: 'Spent Non-Halogenated Solvents',
    chemicals: ['toluene', 'methyl ethyl ketone', 'carbon disulfide', 'isobutanol',
      'pyridine', '2-ethoxyethanol', 'benzene', '2-nitropropane'],
    threshold_pct: 10.0,
  },
}

function componentName(comp) {
  if (comp.chemical_detail && comp.chemical_detail.name) return comp.chemical_detail.name
  if (comp.custom_name) return comp.custom_name
  return 'Unknown Chemical'
}

function componentIsDetected(comp) {
  const qty = Number(comp?.quantity)
  return Number.isFinite(qty) && qty > 0
}

/**
 * Run the RCRA determination for an in-memory mixture.
 *
 * @param {object} mixture - { is_discarded, discard_reason, components: [...] }
 *   Each component should have: chemical_detail (object or null), custom_name,
 *   quantity, unit, override_flash_point_c, override_ph, override_is_reactive.
 * @param {object} additionalProps - { flash_point_c, ph, is_reactive }
 * @returns {object} Same structure as backend determine_hazardous_waste().
 */
export function determineHazardousWaste(mixture, additionalProps = {}) {
  const reasoning = []
  const wasteCodes = []

  // ---------------------------------------------------------------- Step 1
  reasoning.push({
    step: 1,
    title: 'Solid Waste Determination',
    question: 'Is the material a "solid waste" under RCRA (i.e., is it discarded/abandoned)?',
    answer: null,
    result: null,
    details: [],
  })

  if (!mixture.is_discarded) {
    reasoning[0].answer = 'No'
    reasoning[0].result = 'NOT_SOLID_WASTE'
    reasoning[0].details.push('Material is not discarded; it is not a solid waste under RCRA.')
    return {
      is_solid_waste: false,
      is_excluded: false,
      is_listed_hazardous: false,
      has_ignitability: false,
      has_corrosivity: false,
      has_reactivity: false,
      has_toxicity: false,
      is_hazardous_waste: false,
      waste_codes: [],
      reasoning,
      recommendations: 'This material does not appear to be a solid waste under RCRA. If the intended use changes, re-evaluate.',
    }
  }

  reasoning[0].answer = 'Yes'
  reasoning[0].result = 'IS_SOLID_WASTE'
  const discardReason = mixture.discard_reason || 'discarded'
  reasoning[0].details.push(`Material is identified as discarded (${discardReason}). It qualifies as a solid waste.`)

  // ---------------------------------------------------------------- Step 2
  reasoning.push({
    step: 2,
    title: 'Exclusions Check',
    question: 'Is the material excluded from RCRA hazardous waste regulations?',
    answer: null,
    result: null,
    details: [],
  })

  let isExcluded = false
  const exclusionDetails = []
  if (mixture.discard_reason === 'recycled_product_exempt') {
    isExcluded = true
    exclusionDetails.push('Material may qualify as excluded if it is legitimately recycled. Verify specific recycling exclusion applies.')
  }
  if (isExcluded) {
    reasoning[1].answer = 'Possibly'
    reasoning[1].result = 'POSSIBLY_EXCLUDED'
    reasoning[1].details = exclusionDetails
  } else {
    reasoning[1].answer = 'No known exclusions apply'
    reasoning[1].result = 'NOT_EXCLUDED'
    reasoning[1].details = ['No standard RCRA exclusions identified. Proceeding to hazardous waste evaluation.']
  }

  // ---------------------------------------------------------------- Step 3
  reasoning.push({
    step: 3,
    title: 'Listed Hazardous Waste Check',
    question: 'Does the mixture contain any listed hazardous wastes (P, U, F, K lists)?',
    answer: null,
    result: null,
    details: [],
  })

  const components = mixture.components || []
  const listedCodes = []
  const listedDetails = []

  for (const comp of components) {
    if (!componentIsDetected(comp)) continue
    const chem = comp.chemical_detail
    const name = componentName(comp)

    if (chem && chem.epa_waste_code) {
      const code = chem.epa_waste_code
      if (!code.startsWith('D')) {
        listedCodes.push(code)
        const categoryDisplay = chem.category_display || chem.category || ''
        listedDetails.push(
          `${name} has EPA waste code ${code}` +
          (categoryDisplay ? ` (${categoryDisplay}).` : '.') +
          ` Quantity: ${comp.quantity} ${comp.unit}.`
        )
        if (!wasteCodes.includes(code)) wasteCodes.push(code)
      }
    }

    if (chem) {
      const chemNameLower = (chem.name || '').toLowerCase()
      for (const [fCode, fInfo] of Object.entries(F_LIST_SOLVENTS)) {
        for (const solvent of fInfo.chemicals) {
          const sLower = solvent.toLowerCase()
          if (chemNameLower && (chemNameLower.includes(sLower) || sLower.includes(chemNameLower))) {
            if ((comp.unit === 'pct_weight' || comp.unit === 'pct_volume') &&
                comp.quantity >= fInfo.threshold_pct) {
              if (!listedCodes.includes(fCode)) {
                listedCodes.push(fCode)
                listedDetails.push(
                  `${name} may qualify as ${fCode} (${fInfo.name}) ` +
                  `at ${comp.quantity}% concentration (threshold: ${fInfo.threshold_pct}%).`
                )
                if (!wasteCodes.includes(fCode)) wasteCodes.push(fCode)
              }
            }
          }
        }
      }
    }
  }

  const isListed = listedCodes.length > 0
  reasoning[2].answer = isListed ? 'Yes' : 'No'
  reasoning[2].result = isListed ? 'LISTED' : 'NOT_LISTED'
  reasoning[2].details = listedDetails.length
    ? listedDetails
    : ['No listed waste codes identified in mixture components.']

  // ---------------------------------------------------------------- Step 4
  reasoning.push({
    step: 4,
    title: 'Characteristic Hazardous Waste Check',
    question: 'Does the mixture exhibit hazardous characteristics (D001-D043)?',
    answer: null,
    result: null,
    details: [],
  })

  const charDetails = []
  let hasIgnitability = false
  let hasCorrosivity = false
  let hasReactivity = false
  let hasToxicity = false

  // D001 - Ignitability
  let flashPoint = additionalProps.flash_point_c
  if (flashPoint == null) {
    for (const comp of components) {
      if (!componentIsDetected(comp)) continue
      if (comp.override_flash_point_c != null) {
        if (flashPoint == null || comp.override_flash_point_c < flashPoint) {
          flashPoint = comp.override_flash_point_c
        }
      } else if (comp.chemical_detail && comp.chemical_detail.flash_point_c != null) {
        if (flashPoint == null || comp.chemical_detail.flash_point_c < flashPoint) {
          flashPoint = comp.chemical_detail.flash_point_c
        }
      }
    }
  }
  if (flashPoint != null && flashPoint < 60.0) {
    hasIgnitability = true
    if (!wasteCodes.includes('D001')) wasteCodes.push('D001')
    charDetails.push(`D001 (Ignitability): Flash point ${flashPoint}°C < 60°C threshold. Waste is ignitable.`)
  }
  for (const comp of components) {
    if (!componentIsDetected(comp)) continue
    if (comp.chemical_detail && comp.chemical_detail.is_ignitable) {
      hasIgnitability = true
      if (!wasteCodes.includes('D001')) wasteCodes.push('D001')
      charDetails.push(`D001 (Ignitability): ${componentName(comp)} is an ignitable material.`)
    }
  }

  // D002 - Corrosivity
  let ph = additionalProps.ph
  if (ph == null) {
    for (const comp of components) {
      if (!componentIsDetected(comp)) continue
      if (comp.override_ph != null) { ph = comp.override_ph; break }
      if (comp.chemical_detail && comp.chemical_detail.ph_value != null) {
        ph = comp.chemical_detail.ph_value; break
      }
    }
  }
  if (ph != null && (ph <= 2.0 || ph >= 12.5)) {
    hasCorrosivity = true
    if (!wasteCodes.includes('D002')) wasteCodes.push('D002')
    charDetails.push(
      `D002 (Corrosivity): pH ${ph} is ` +
      (ph <= 2.0 ? '≤2.0 (highly acidic)' : '≥12.5 (highly alkaline)') +
      '. Waste is corrosive.'
    )
  }
  for (const comp of components) {
    if (!componentIsDetected(comp)) continue
    if (comp.chemical_detail && comp.chemical_detail.is_corrosive) {
      hasCorrosivity = true
      if (!wasteCodes.includes('D002')) wasteCodes.push('D002')
      charDetails.push(`D002 (Corrosivity): ${componentName(comp)} is a corrosive material.`)
    }
  }

  // D003 - Reactivity
  let isReactive = !!additionalProps.is_reactive
  for (const comp of components) {
    if (!componentIsDetected(comp)) continue
    if (comp.override_is_reactive || (comp.chemical_detail && comp.chemical_detail.is_reactive)) {
      isReactive = true
    }
  }
  if (isReactive) {
    hasReactivity = true
    if (!wasteCodes.includes('D003')) wasteCodes.push('D003')
    charDetails.push('D003 (Reactivity): Mixture contains reactive materials (unstable, water-reactive, or explosive potential).')
  }

  // D004-D043 - Toxicity (TCLP)
  const toxicCodes = []
  for (const comp of components) {
    if (!componentIsDetected(comp)) continue
    const chem = comp.chemical_detail
    if (!chem) continue
    if (chem.tclp_threshold_mgl != null && chem.epa_waste_code && chem.epa_waste_code.startsWith('D')) {
      if ((comp.unit === 'pct_weight' || comp.unit === 'pct_volume') && comp.quantity > 0) {
        // Simplified TCLP estimate: (pct/100) * 1,000,000 mg/kg / 20 dilution = mg/L
        const tclpEstimate = (comp.quantity / 100.0) * 1_000_000 / 20.0
        if (tclpEstimate >= chem.tclp_threshold_mgl) {
          const dCode = chem.epa_waste_code
          if (!toxicCodes.includes(dCode)) {
            toxicCodes.push(dCode)
            charDetails.push(
              `${dCode} (Toxicity - ${chem.name}): Estimated TCLP ~${tclpEstimate.toFixed(2)} mg/L ` +
              `exceeds regulatory threshold of ${chem.tclp_threshold_mgl} mg/L.`
            )
          }
        }
      } else if (comp.unit !== 'pct_weight' && comp.unit !== 'pct_volume' && comp.quantity > 0) {
        const dCode = chem.epa_waste_code
        if (!toxicCodes.includes(dCode)) {
          toxicCodes.push(dCode)
          charDetails.push(
            `${dCode} (Toxicity - ${chem.name}): Chemical present in mixture. ` +
            `TCLP threshold is ${chem.tclp_threshold_mgl} mg/L. Testing recommended.`
          )
        }
      }
    }
  }
  if (toxicCodes.length) {
    hasToxicity = true
    for (const c of toxicCodes) if (!wasteCodes.includes(c)) wasteCodes.push(c)
  }

  const allChar = hasIgnitability || hasCorrosivity || hasReactivity || hasToxicity
  if (!charDetails.length) {
    charDetails.push('No characteristic hazards identified based on provided information.')
  }
  reasoning[3].answer = allChar ? 'Yes' : 'No'
  reasoning[3].result = allChar ? 'HAS_CHARACTERISTICS' : 'NO_CHARACTERISTICS'
  reasoning[3].details = charDetails

  const isHazardous = isListed || allChar

  const recs = [
    'DISCLAIMER: This determination is for informational purposes only and does not constitute legal advice.',
    'Verify results with qualified environmental professionals.',
    'Laboratory testing (SW-846 methods) is recommended to confirm characteristics.',
    'Check state-specific regulations, which may be more stringent than federal RCRA.',
  ]
  if (isHazardous) {
    recs.unshift('Proper storage, labeling, manifesting, and disposal at a permitted facility are required.')
    recs.unshift(`This mixture appears to be a HAZARDOUS WASTE under RCRA with code(s): ${wasteCodes.join(', ')}.`)
  } else {
    recs.unshift('Consider additional testing if composition is uncertain.')
    recs.unshift('Based on available information, this mixture does not appear to be a hazardous waste under RCRA.')
  }

  return {
    is_solid_waste: true,
    is_excluded: isExcluded,
    is_listed_hazardous: isListed,
    has_ignitability: hasIgnitability,
    has_corrosivity: hasCorrosivity,
    has_reactivity: hasReactivity,
    has_toxicity: hasToxicity,
    is_hazardous_waste: isHazardous,
    waste_codes: wasteCodes,
    reasoning,
    recommendations: recs.join('\n'),
  }
}
