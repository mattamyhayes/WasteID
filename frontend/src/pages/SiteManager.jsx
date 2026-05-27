import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSystemErrors, getSystemErrors } from '../lib/systemLog'

export default function SiteManager() {
  const [errors, setErrors] = useState(() => getSystemErrors())

  useEffect(() => {
    const onLogged = () => setErrors(getSystemErrors())
    window.addEventListener('wasteid-system-error-logged', onLogged)
    return () => window.removeEventListener('wasteid-system-error-logged', onLogged)
  }, [])

  const handleClear = () => {
    clearSystemErrors()
    setErrors([])
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#14532d', marginBottom: '0.4rem' }}>Site Manager</h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            System errors are logged here, including storage quota failures.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/admin" className="btn btn-secondary">Back to Admin</Link>
          <button className="btn btn-danger" onClick={handleClear}>Clear Logs</button>
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No system errors logged.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Time</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Error</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Source</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db' }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.82rem' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600, color: '#991b1b' }}>{entry.name}</div>
                    <div style={{ color: '#1f2937', fontSize: '0.9rem' }}>{entry.message}</div>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                    {entry.metadata?.source || 'system'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
                    {entry.metadata?.key || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
