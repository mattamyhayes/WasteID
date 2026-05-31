// Analytics (Lab Results) analysis logic
// Implements EPA 40 CFR 261 threshold comparison for waste codes D, F, U, P, K
//
// Key rules:
// - If testing type is "Totals", apply the Rule of 20
//   (Totals threshold = TCLP regulatory level × 20)
// - If testing type is "TCLP", compare directly against tclp_threshold_mgl
// - If units are ppb, convert to ppm (divide by 1000) before comparison
// - ND (Non-Detect) results require no further action
// - Ignore everything after "Quality Control" section header

/**
 * Normalize a result value from a lab report.
 * Returns { isND: true } for non-detect, or { isND: false, value: number } for numeric.
 */
export function parseResultValue(raw) {
  if (raw === null || raw === undefined) return { isND: true, value: 0 }
  const str = String(raw).trim().toUpperCase()
  if (!str || str === 'ND' || str === 'NON-DETECT' || str === 'NONDETECT' || str === 'N/D' || str === 'BDL' || str === 'BELOW DETECTION LIMIT') {
    return { isND: true, value: 0 }
  }
  // Strip any trailing units or qualifiers (e.g. "0.5 mg/L", "<0.01")
  const cleaned = str.replace(/^[<>~≈]+/, '').replace(/[A-Z/%]+$/g, '').trim()
  const num = parseFloat(cleaned)
  if (isNaN(num)) return { isND: true, value: 0 }
  return { isND: false, value: num }
}

/**
 * Convert a value from the lab's reported units to mg/L (ppm) for comparison.
 * @param {number} value - The detected value
 * @param {string} units - 'ppm' or 'ppb'
 * @returns {number} value in mg/L (ppm)
 */
export function convertToPpm(value, units) {
  if (units === 'ppb') return value / 1000
  return value // already ppm (mg/L)
}

/**
 * Get the effective regulatory threshold for a chemical based on test type.
 * - TCLP: use the tclp_threshold_mgl directly
 * - Totals (Rule of 20): threshold = tclp_threshold_mgl × 20
 *
 * @param {number|null} tclpThreshold - The TCLP regulatory level in mg/L
 * @param {string} testType - 'totals' or 'tclp'
 * @returns {number|null} the effective threshold, or null if no threshold defined
 */
export function getEffectiveThreshold(tclpThreshold, testType) {
  if (tclpThreshold === null || tclpThreshold === undefined) return null
  if (testType === 'totals') {
    // Rule of 20: for Totals testing, the regulatory threshold is 20× the TCLP level
    return tclpThreshold * 20
  }
  return tclpThreshold
}

/**
 * Determine if a detected value is "reportable" (at or above EPA threshold).
 * @param {number} valuePpm - detected value in ppm (mg/L)
 * @param {number|null} threshold - effective threshold in mg/L
 * @returns {boolean}
 */
export function isReportable(valuePpm, threshold) {
  if (threshold === null || threshold === undefined) return false
  return valuePpm >= threshold
}

/**
 * Analyze a set of lab results against the EPA chemical database.
 *
 * @param {Array} results - Array of { chemicalName, casNumber, resultValue } from parsed lab report
 * @param {Array} chemicals - EPA chemical database entries (from chemicals.json)
 * @param {string} testType - 'totals' or 'tclp'
 * @param {string} units - 'ppm' or 'ppb'
 * @param {Array} existingComponents - Current profile constituents
 * @returns {Object} { analyzedResults, reportableResults, ndResults, noMatchResults, summary }
 */
export function analyzeLabResults(results, chemicals, testType, units, existingComponents = []) {
  const analyzedResults = []
  const reportableResults = []
  const ndResults = []
  const noMatchResults = []

  for (const result of results) {
    const parsed = parseResultValue(result.resultValue)

    if (parsed.isND) {
      ndResults.push({
        ...result,
        status: 'ND',
        message: 'Non-Detect – no further action required',
      })
      analyzedResults.push({ ...result, status: 'ND', isND: true })
      continue
    }

    // Convert to ppm for comparison
    const valuePpm = convertToPpm(parsed.value, units)

    // Find matching chemical in EPA database (by CAS number or name)
    const matchedChemical = findMatchingChemical(result, chemicals)

    if (!matchedChemical) {
      noMatchResults.push({
        ...result,
        detectedValuePpm: valuePpm,
        status: 'NO_MATCH',
        message: 'Chemical not found in EPA database – manual review recommended',
      })
      analyzedResults.push({ ...result, status: 'NO_MATCH', detectedValuePpm: valuePpm })
      continue
    }

    const threshold = getEffectiveThreshold(matchedChemical.tclp_threshold_mgl, testType)
    const reportable = isReportable(valuePpm, threshold)

    // Check if chemical is already in the profile's constituents
    const existsInConstituents = existingComponents.some(c =>
      (c._casNumber && matchedChemical.cas_number && c._casNumber === matchedChemical.cas_number) ||
      (c.custom_name && matchedChemical.name && c.custom_name.toLowerCase() === matchedChemical.name.toLowerCase())
    )

    const entry = {
      ...result,
      matchedChemical,
      detectedValuePpm: valuePpm,
      threshold,
      testType,
      isReportable: reportable,
      existsInConstituents,
      epaWasteCode: matchedChemical.epa_waste_code,
      category: matchedChemical.category,
      status: reportable ? 'REPORTABLE' : 'BELOW_THRESHOLD',
      message: reportable
        ? `REPORTABLE: ${valuePpm.toFixed(4)} mg/L detected ≥ threshold ${threshold != null ? threshold : 'N/A'} mg/L (EPA waste code: ${matchedChemical.epa_waste_code})`
        : `Below threshold: ${valuePpm.toFixed(4)} mg/L < ${threshold != null ? threshold : 'N/A'} mg/L`,
    }

    if (reportable) {
      if (existsInConstituents) {
        entry.action = 'ADD_WASTE_CODE'
        entry.actionMessage = `Chemical is in Constituents – add waste code ${matchedChemical.epa_waste_code} to profile`
      } else {
        entry.action = 'ADD_TO_CONSTITUENTS'
        entry.actionMessage = `Chemical NOT in Constituents – add ${matchedChemical.name} with exact quantity ${valuePpm} mg/L and waste code ${matchedChemical.epa_waste_code}`
      }
      reportableResults.push(entry)
    }

    analyzedResults.push(entry)
  }

  return {
    analyzedResults,
    reportableResults,
    ndResults,
    noMatchResults,
    summary: {
      total: results.length,
      nd: ndResults.length,
      reportable: reportableResults.length,
      belowThreshold: analyzedResults.filter(r => r.status === 'BELOW_THRESHOLD').length,
      noMatch: noMatchResults.length,
    },
  }
}

/**
 * Find a matching chemical from the EPA database by CAS number or name.
 */
function findMatchingChemical(result, chemicals) {
  // Try CAS number match first (most reliable)
  if (result.casNumber) {
    const casCleaned = result.casNumber.trim().replace(/\s+/g, '')
    const match = chemicals.find(c => c.cas_number && c.cas_number.replace(/\s+/g, '') === casCleaned)
    if (match) return match
  }

  // Try name match (case-insensitive)
  if (result.chemicalName) {
    const nameLower = result.chemicalName.trim().toLowerCase()
    const match = chemicals.find(c =>
      (c.name && c.name.toLowerCase() === nameLower) ||
      (c.synonyms && String(c.synonyms).toLowerCase().includes(nameLower))
    )
    if (match) return match
  }

  return null
}

/**
 * Parse raw text content from a lab report, extracting chemical results.
 * Stops processing at "Quality Control" section (per requirement G).
 *
 * This is a heuristic parser that looks for tabular data with chemical names
 * and result values. It handles common lab report formats.
 *
 * @param {string} text - Raw text content from a lab report
 * @returns {Array} Array of { chemicalName, casNumber, resultValue, rawLine }
 */
export function parseLabReportText(text) {
  if (!text) return []

  const lines = text.split('\n')
  const results = []
  let foundResultsSection = false
  let headerIndices = null

  for (const line of lines) {
    const trimmed = line.trim()

    // G) Stop at Quality Control section
    if (/quality\s*control/i.test(trimmed)) {
      break
    }

    // Try to detect header row to understand column positions
    if (/result|concentration|detected|analyte/i.test(trimmed) && /chemical|compound|parameter|analyte/i.test(trimmed)) {
      foundResultsSection = true
      headerIndices = detectColumnLayout(trimmed)
      continue
    }

    // Skip empty lines and obvious non-data lines
    if (!trimmed || /^[-=_*]+$/.test(trimmed) || /^page\s+\d/i.test(trimmed)) {
      continue
    }

    // Try to parse as a result row
    const parsed = parseResultRow(trimmed)
    if (parsed) {
      results.push(parsed)
    }
  }

  return results
}

/**
 * Attempt to parse a single row from a lab report as a chemical result.
 * Common formats:
 *   "Arsenic    7440-38-2    0.005    mg/L"
 *   "Lead | 7439-92-1 | ND"
 *   "Benzene,71-43-2,0.5"
 */
function parseResultRow(line) {
  // Try tab/multi-space delimited
  const parts = line.split(/\t+|\s{2,}|[|,;]/).map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null

  // Look for a CAS number pattern (digits-digits-digit)
  const casPattern = /^\d{1,7}-\d{2}-\d$/
  let chemicalName = ''
  let casNumber = ''
  let resultValue = ''

  for (let i = 0; i < parts.length; i++) {
    if (casPattern.test(parts[i])) {
      casNumber = parts[i]
      chemicalName = parts.slice(0, i).join(' ') || ''
    }
  }

  if (!chemicalName && parts.length >= 2) {
    // Assume first part is chemical name
    chemicalName = parts[0]
  }

  // Look for the result value (ND or numeric) - typically later in the row
  for (let i = parts.length - 1; i >= 1; i--) {
    const upper = parts[i].toUpperCase()
    if (upper === 'ND' || upper === 'NON-DETECT' || upper === 'NONDETECT' || upper === 'BDL') {
      resultValue = 'ND'
      break
    }
    if (/^[<>~]?\d+\.?\d*/.test(parts[i])) {
      resultValue = parts[i]
      break
    }
  }

  if (!chemicalName || !resultValue) return null

  return {
    chemicalName: chemicalName.trim(),
    casNumber: casNumber.trim(),
    resultValue: resultValue.trim(),
    rawLine: line,
  }
}

function detectColumnLayout(headerLine) {
  // Simple column detection - not critical for the heuristic parser
  return { detected: true }
}
