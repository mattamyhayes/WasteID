// Shared constants and utilities for ship-by date calculations.
// EPA generator status hold days (single source of truth for the frontend).

export const EPA_STATUS_HOLD_DAYS = { VSQG: 10, SQG: 30, LQG: 60 }

/**
 * Calculate ship-by date info given EPA status and generation date.
 * @param {string} epaGeneratorStatus - 'VSQG', 'SQG', or 'LQG'
 * @param {string} generationDate - ISO date string (YYYY-MM-DD)
 * @returns {Object|null}
 * @property {string} shipByDate
 * @property {number} daysRemaining
 * @property {number} holdDays
 */
export function calcShipByInfo(epaGeneratorStatus, generationDate) {
  const holdDays = EPA_STATUS_HOLD_DAYS[epaGeneratorStatus] ?? null
  if (holdDays == null || !generationDate) return null
  const genDate = new Date(generationDate + 'T00:00:00')
  const shipDate = new Date(genDate)
  shipDate.setDate(shipDate.getDate() + holdDays)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = Math.round((shipDate - today) / (1000 * 60 * 60 * 24))
  return { shipByDate: shipDate.toISOString().split('T')[0], daysRemaining, holdDays }
}

/**
 * Parse a date string as a local date (avoids timezone issues).
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  return new Date(dateStr + 'T00:00:00')
}
