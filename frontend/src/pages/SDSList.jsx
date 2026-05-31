import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sds } from '../api/client'

export default function SDSList() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await sds.list()
      setRecords(res.data.results || res.data || [])
    } catch (err) {
      setError('Failed to load SDS records.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete SDS "${name}"? This cannot be undone.`)) return
    try {
      await sds.delete(id)
      await loadRecords()
    } catch {
      setError('Failed to delete SDS record.')
    }
  }

  const handleViewFile = async (record) => {
    const url = record.file_data || record.file_url
    if (url) {
      window.open(url, '_blank')
      return
    }
    // File data not inline (stored in IndexedDB in local mode). Fetch the full record.
    try {
      const res = await sds.get(record.id)
      const full = res?.data
      const fullUrl = full?.file_data || full?.file_url
      if (fullUrl) {
        window.open(fullUrl, '_blank')
        return
      }
    } catch { /* fall through */ }
    alert('No file available to view. The original PDF file data was not stored with this record.')
  }

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>📋 Safety Data Sheets</h1>
          <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>
            Manage imported SDS documents. All data elements are stored electronically for search, reports, and profile auto-population.
          </p>
        </div>
        <Link to="/sds/add" className="btn btn-primary">+ Add New SDS</Link>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading…</div>
      ) : records.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No SDS records imported yet.</p>
          <p style={{ fontSize: '0.9rem' }}>
            Click <strong>+ Add New SDS</strong> to import your first Safety Data Sheet.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ ...thStyle, width: 50 }}></th>
                <th style={thStyle}>SDS ID</th>
                <th style={thStyle}>Product Name</th>
                <th style={thStyle}>File Name</th>
                <th style={thStyle}>CAS #</th>
                <th style={thStyle}>Manufacturer</th>
                <th style={thStyle}>Date Imported</th>
                <th style={thStyle}>Associated Profile</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <Link to={`/sds/${record.id}/edit`} className="btn btn-secondary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.78rem' }} title="Edit record">
                      ✏️
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
                    {record.sds_id || `SDS-${String(record.id).padStart(5, '0')}`}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>
                    {record.product_name || '—'}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleViewFile(record) }}
                      style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                      title="Click to view original PDF"
                    >
                      {record.original_filename || record.product_name}
                    </a>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}>{record.cas_number || '—'}</td>
                  <td style={tdStyle}>{record.manufacturer_name || '—'}</td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>
                    {new Date(record.imported_at).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>
                    {record.profile_name ? (
                      <span style={{ fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>{record.profile_transaction_id}</span>
                        {' — '}{record.profile_name}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>None</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
                      background: record.import_status === 'complete' ? '#dcfce7' : record.import_status === 'error' ? '#fef2f2' : '#fef3c7',
                      color: record.import_status === 'complete' ? '#166534' : record.import_status === 'error' ? '#b91c1c' : '#92400e',
                    }}>
                      {record.import_status === 'complete' ? '✓ Complete' : record.import_status === 'error' ? '✗ Error' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link to={`/sds/${record.id}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.55rem', fontSize: '0.82rem' }}>
                        View
                      </Link>
                      <button className="btn btn-danger" style={{ padding: '0.2rem 0.55rem', fontSize: '0.82rem' }}
                        onClick={() => handleDelete(record.id, record.product_name)}>
                        Delete
                      </button>
                    </div>
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
