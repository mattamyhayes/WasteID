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

/**
 * Returns inline style for a days-remaining badge, matching the Review page color scheme.
 * @param {number|null} daysLeft
 * @returns {Object}
 */
export function holdTimeColor(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return {}
  if (daysLeft <= 3) return { background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }
  if (daysLeft <= 7) return { background: '#fef9c3', color: '#854d0e', fontWeight: 700 }
  return { background: '#dcfce7', color: '#15803d', fontWeight: 600 }
}

/**
 * Compute days remaining until a pickup/ship-by date from today.
 * @param {string|null} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {number|null}
 */
export function daysRemainingFromDate(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}
