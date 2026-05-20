/**
 * Manifest Utilities for WasteID
 * 
 * Implements EPA Form 8700-22 business rules including:
 * - R-9.2: "Waste" prefix rule for DOT proper shipping names
 * - R-1.2: Manifest tracking number validation
 * - R-9.4: UN/NA number format validation
 * - R-9.5: Packing group validation
 * - R-2.1: Page count computation (continuation sheets)
 * - R-10.2: Container type validation
 * - R-11.2: Quantity unit validation
 */

// Valid container types per EPA Form 8700-22 (Item 10)
export const VALID_CONTAINER_TYPES = ['DM', 'DW', 'DF', 'TP', 'TT', 'TC', 'CY', 'CM', 'CF', 'CW', 'BA']

// Valid quantity units per EPA Form 8700-22 (Item 11/12)
export const VALID_QUANTITY_UNITS = ['G', 'P', 'T', 'K', 'M', 'N', 'L']

// Valid packing groups
export const VALID_PACKING_GROUPS = ['PG I', 'PG II', 'PG III', '']

/**
 * Build a DOT proper shipping description per 49 CFR 172.101 with
 * the "Waste" prefix rule (R-9.2).
 * 
 * For SQG/LQG generators, the proper shipping name MUST be prefixed
 * with "Waste" unless it already begins with "Waste".
 * For VSQG generators, the prefix MUST NOT be applied.
 * 
 * @param {object} params
 * @param {string} params.unNumber - UN/NA identification number (e.g., "UN1090")
 * @param {string} params.properShippingName - Proper shipping name (e.g., "Acetone")
 * @param {string} params.hazardClass - Hazard class or division (e.g., "3")
 * @param {string} params.packingGroup - Packing group (e.g., "PG II")
 * @param {string} params.epaGeneratorStatus - Generator status: "VSQG", "SQG", or "LQG"
 * @returns {object} { description: string, wastePrefix Applied: boolean }
 */
export function buildDotDescription({ unNumber, properShippingName, hazardClass, packingGroup, epaGeneratorStatus }) {
  const psn = (properShippingName || '').trim()
  const un = (unNumber || '').trim()
  const hc = (hazardClass || '').trim()
  const pg = (packingGroup || '').trim()
  const status = (epaGeneratorStatus || '').toUpperCase()

  // R-9.2: Apply "Waste" prefix for SQG/LQG
  let finalPsn = psn
  let wastePrefixApplied = false

  if (status === 'SQG' || status === 'LQG') {
    // R-9.2.b: Idempotency - don't duplicate if already starts with "Waste"
    if (!psn.toLowerCase().startsWith('waste ') && !psn.toLowerCase().startsWith('waste,')) {
      finalPsn = `Waste ${psn}`
      wastePrefixApplied = true
    }
  }
  // For VSQG: do NOT apply prefix (R-9.2 specifies this)

  // Build full description: UN#, PSN, Hazard Class, Packing Group
  const parts = [un, finalPsn, hc, pg].filter(Boolean)
  const description = parts.join(', ')

  return { description, wastePrefixApplied, finalPsn }
}

/**
 * Validate manifest tracking number format (R-1.2).
 * Format: 9 digits followed by 3 uppercase letters (e.g., "123456789ELC")
 * @param {string} trackingNumber
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateManifestTrackingNumber(trackingNumber) {
  if (!trackingNumber || !trackingNumber.trim()) {
    return { valid: true } // Blank is allowed (not yet assigned)
  }
  const cleaned = trackingNumber.replace(/\s/g, '')
  const pattern = /^[0-9]{9}[A-Z]{3}$/
  if (!pattern.test(cleaned)) {
    return { valid: false, error: 'Manifest tracking number must be 9 digits followed by 3 uppercase letters (e.g., 123456789ELC).' }
  }
  return { valid: true }
}

/**
 * Validate UN/NA number format (R-9.4).
 * @param {string} unNumber
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateUnNumber(unNumber) {
  if (!unNumber || !unNumber.trim()) {
    return { valid: false, error: 'UN/NA number is required (Item 9).' }
  }
  const pattern = /^(UN|NA)\d{4}$/
  if (!pattern.test(unNumber.trim())) {
    return { valid: false, error: 'UN/NA number must be in format UN#### or NA#### (e.g., UN1090).' }
  }
  return { valid: true }
}

/**
 * Validate packing group (R-9.5).
 * @param {string} packingGroup
 * @returns {object} { valid: boolean, error?: string }
 */
export function validatePackingGroup(packingGroup) {
  if (!packingGroup || !packingGroup.trim()) {
    return { valid: true } // Blank allowed for materials that don't require one
  }
  if (!VALID_PACKING_GROUPS.includes(packingGroup.trim())) {
    return { valid: false, error: 'Packing group must be PG I, PG II, or PG III.' }
  }
  return { valid: true }
}

/**
 * Validate EPA ID format (R-1.1).
 * @param {string} epaId
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateEpaId(epaId) {
  if (!epaId || !epaId.trim()) {
    return { valid: true } // Blank allowed for state-permitted generators
  }
  if (epaId.trim().length !== 12) {
    return { valid: false, error: 'EPA ID must be exactly 12 characters when provided (Item 1).' }
  }
  return { valid: true }
}

/**
 * Compute total page count including continuation sheets (R-2.1).
 * Main form holds 4 waste line items; continuation sheet holds up to 6.
 * @param {number} wasteItemCount
 * @returns {number} total pages
 */
export function computePageCount(wasteItemCount) {
  if (wasteItemCount <= 4) return 1
  return 1 + Math.ceil((wasteItemCount - 4) / 6)
}

/**
 * Validate a complete manifest form per EPA Form 8700-22 rules.
 * Returns an array of validation errors with EPA box references.
 * @param {object} form - manifest form data
 * @param {array} wasteItems - waste line items
 * @param {string} epaGeneratorStatus - generator status
 * @returns {array} Array of { field, box, message }
 */
export function validateManifestForm(form, wasteItems, epaGeneratorStatus) {
  const errors = []

  // R-1.2: Tracking number format
  const tnResult = validateManifestTrackingNumber(form.manifest_tracking_number)
  if (!tnResult.valid) {
    errors.push({ field: 'manifest_tracking_number', box: '1', message: tnResult.error })
  }

  // R-1.1: Generator EPA ID
  const epaIdResult = validateEpaId(form.generator_epa_id)
  if (!epaIdResult.valid) {
    errors.push({ field: 'generator_epa_id', box: '1', message: epaIdResult.error })
  }

  // R-3.1: Emergency response phone required
  if (!form.emergency_response_phone || !form.emergency_response_phone.trim()) {
    errors.push({ field: 'emergency_response_phone', box: '3', message: 'Emergency response phone is required (Item 3).' })
  }

  // R-4.1: Generator name required
  if (!form.generator_name || !form.generator_name.trim()) {
    errors.push({ field: 'generator_name', box: '4', message: 'Generator name is required (Item 4).' })
  }

  // R-4.2: Full address required
  if (!form.generator_address || !form.generator_address.trim()) {
    errors.push({ field: 'generator_address', box: '4', message: 'Generator mailing address is required (Item 4).' })
  }
  if (!form.generator_city || !form.generator_city.trim()) {
    errors.push({ field: 'generator_city', box: '4', message: 'Generator city is required (Item 4).' })
  }
  if (!form.generator_state || !form.generator_state.trim()) {
    errors.push({ field: 'generator_state', box: '4', message: 'Generator state is required (Item 4).' })
  }
  if (!form.generator_zip || !form.generator_zip.trim()) {
    errors.push({ field: 'generator_zip', box: '4', message: 'Generator ZIP code is required (Item 4).' })
  }

  // R-4.3: Generator phone required
  if (!form.generator_phone || !form.generator_phone.trim()) {
    errors.push({ field: 'generator_phone', box: '4', message: 'Generator phone is required (Item 4).' })
  }

  // R-6.1: Transporter 1 required
  if (!form.transporter1_name || !form.transporter1_name.trim()) {
    errors.push({ field: 'transporter1_name', box: '6', message: 'Transporter 1 name is required (Item 6).' })
  }
  if (!form.transporter1_epa_id || !form.transporter1_epa_id.trim()) {
    errors.push({ field: 'transporter1_epa_id', box: '6', message: 'Transporter 1 EPA ID is required (Item 6).' })
  }

  // R-8.1: Designated facility required
  if (!form.designated_facility_name || !form.designated_facility_name.trim()) {
    errors.push({ field: 'designated_facility_name', box: '8', message: 'Designated facility name is required (Item 8).' })
  }
  if (!form.designated_facility_epa_id || !form.designated_facility_epa_id.trim()) {
    errors.push({ field: 'designated_facility_epa_id', box: '8', message: 'Designated facility EPA ID is required (Item 8).' })
  }

  // R-10/11: Waste items validation
  if (!wasteItems || wasteItems.length === 0) {
    errors.push({ field: 'waste_items', box: '9', message: 'At least one waste line item is required (Items 9-13).' })
  } else {
    wasteItems.forEach((item, idx) => {
      const lineNum = idx + 1
      if (!item.dot_description || !item.dot_description.trim()) {
        errors.push({ field: `waste_items[${idx}].dot_description`, box: '9b', message: `Line ${lineNum}: DOT description is required (Item 9b).` })
      }
      if (!item.containers_no || Number(item.containers_no) < 1) {
        errors.push({ field: `waste_items[${idx}].containers_no`, box: '10', message: `Line ${lineNum}: Number of containers must be ≥ 1 (Item 10).` })
      }
      if (!item.container_type || !VALID_CONTAINER_TYPES.includes(item.container_type)) {
        errors.push({ field: `waste_items[${idx}].container_type`, box: '10', message: `Line ${lineNum}: Valid container type is required (Item 10).` })
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        errors.push({ field: `waste_items[${idx}].quantity`, box: '11', message: `Line ${lineNum}: Quantity must be > 0 (Item 11).` })
      }
      if (!item.unit || !VALID_QUANTITY_UNITS.includes(item.unit)) {
        errors.push({ field: `waste_items[${idx}].unit`, box: '12', message: `Line ${lineNum}: Valid unit of measure is required (Item 12).` })
      }
    })
  }

  // R-15.1: Generator certification for signing
  if (form.generator_certification) {
    if (!form.generator_printed_name || !form.generator_printed_name.trim()) {
      errors.push({ field: 'generator_printed_name', box: '15', message: 'Generator printed name is required for certification (Item 15).' })
    }
    if (!form.generator_signature_date) {
      errors.push({ field: 'generator_signature_date', box: '15', message: 'Generator signature date is required for certification (Item 15).' })
    }
  }

  // R-16.1: International shipment fields
  if (form.international_shipment) {
    if (!form.port_of_entry_exit || !form.port_of_entry_exit.trim()) {
      errors.push({ field: 'port_of_entry_exit', box: '16', message: 'Port of entry/exit is required for international shipments (Item 16).' })
    }
    if (!form.date_leaving_us) {
      errors.push({ field: 'date_leaving_us', box: '16', message: 'Date leaving US is required for international shipments (Item 16).' })
    }
  }

  return errors
}

/**
 * Get the appropriate certification text based on generator status (R-15.2).
 * @param {string} epaGeneratorStatus
 * @returns {string} certification text
 */
export function getCertificationText(epaGeneratorStatus) {
  const baseText = 'I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked and labeled/placarded, and are in all respects in proper condition for transport according to applicable international and national governmental regulations.'

  if (epaGeneratorStatus === 'LQG') {
    return `${baseText} If I am a large quantity generator, I certify that I have a program in place to reduce the volume and toxicity of waste generated to the degree I have determined to be economically practicable and that I have selected the practicable method of treatment, storage, or disposal currently available to me which minimizes the present and future threat to human health and the environment.`
  }
  if (epaGeneratorStatus === 'SQG') {
    return `${baseText} If I am a small quantity generator, I have made a good faith effort to minimize my waste generation and select the best waste management method that is available to me and that I can afford.`
  }
  return baseText
}
