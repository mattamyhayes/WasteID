export function getApiErrorMessage(err, fallbackMessage) {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    const details = Object.entries(data)
      .map(([field, value]) => {
        if (Array.isArray(value)) return `${field}: ${value.join(', ')}`
        if (value && typeof value === 'object') return `${field}: ${JSON.stringify(value)}`
        if (value !== null && value !== undefined && `${value}`.trim() !== '') return `${field}: ${value}`
        return ''
      })
      .filter(Boolean)
    if (details.length) return details.join(' | ')
  }
  const status = err?.response?.status
  if (status) return `${fallbackMessage} (HTTP ${status})`
  return err?.message || fallbackMessage
}
