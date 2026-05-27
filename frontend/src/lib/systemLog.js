const SYSTEM_ERRORS_KEY = 'wasteid_system_errors_v1'
const MAX_ERROR_LOGS = 200

let isLogging = false
let listenersInstalled = false
let volatileErrors = []

function readStoredErrors() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(SYSTEM_ERRORS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredErrors(errors) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(errors.slice(0, MAX_ERROR_LOGS)))
    return true
  } catch {
    return false
  }
}

function normalizeError(error) {
  if (!error) return { name: 'Error', message: 'Unknown error' }
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack || '',
    }
  }
  if (typeof error === 'object') {
    return {
      name: error.name || 'Error',
      message: error.message || JSON.stringify(error),
      stack: error.stack || '',
    }
  }
  return { name: 'Error', message: String(error), stack: '' }
}

function mergeErrors(stored, transient) {
  const seen = new Set()
  return [...stored, ...transient].filter(item => {
    if (!item || !item.id) return false
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function getSystemErrors() {
  const stored = readStoredErrors()
  return mergeErrors(stored, volatileErrors)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
}

export function clearSystemErrors() {
  volatileErrors = []
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(SYSTEM_ERRORS_KEY)
  } catch {
    // ignore
  }
}

export function logSystemError(error, metadata = {}) {
  const normalized = normalizeError(error)
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    metadata: metadata || {},
  }

  isLogging = true
  const stored = readStoredErrors()
  const next = [entry, ...stored].slice(0, MAX_ERROR_LOGS)
  const persisted = writeStoredErrors(next)
  isLogging = false

  if (!persisted) {
    volatileErrors = [entry, ...volatileErrors].slice(0, MAX_ERROR_LOGS)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wasteid-system-error-logged', { detail: entry }))
  }
  return entry
}

export function installGlobalErrorLogging() {
  if (listenersInstalled || typeof window === 'undefined') return
  listenersInstalled = true

  window.addEventListener('error', (event) => {
    logSystemError(event?.error || new Error(event?.message || 'Unhandled error'), {
      source: 'window.error',
      filename: event?.filename || '',
      line: event?.lineno || null,
      column: event?.colno || null,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logSystemError(event?.reason || new Error('Unhandled promise rejection'), {
      source: 'window.unhandledrejection',
    })
  })

  if (typeof Storage !== 'undefined') {
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      try {
        return originalSetItem.call(this, key, value)
      } catch (error) {
        if (!isLogging) {
          const area = this === window.localStorage ? 'localStorage' : 'sessionStorage'
          logSystemError(error, { source: 'storage.setItem', storageArea: area, key })
        }
        throw error
      }
    }
  }
}
