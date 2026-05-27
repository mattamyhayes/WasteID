import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chemicals } from '../api/client'

const CATEGORY_LABELS = {
  P: 'P-list',
  U: 'U-list',
  F: 'F-list',
  K: 'K-list',
  D_CHAR: 'D-code',
  OTHER: 'Other',
}

const SOURCE_LABELS = {
  epa_import: 'EPA Import',
  manual: 'Manual (Admin)',
}

const thStyle = {
  padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
  color: '#374151', fontWeight: 600, fontSize: '0.88rem',
}
const tdStyle = {
  padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
}

export default function ChemicalDatabase() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 100

  useEffect(() => {
    loadChemicals()
  }, [page, categoryFilter])

  const loadChemicals = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      params.page = page
      const res = await chemicals.listAdmin(params)
      const data = res.data
      if (data && Array.isArray(data.results)) {
        setRecords(data.results)
        setTotalCount(data.count || data.results.length)
      } else if (Array.isArray(data)) {
        setRecords(data)
        setTotalCount(data.length)
      } else {
        setRecords([])
        setTotalCount(0)
      }
    } catch (err) {
      setError('Failed to load chemical database.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = records.filter(c => {
    const q = search.toLowerCase()
    const matchesSearch = !q || (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.cas_number && c.cas_number.toLowerCase().includes(q)) ||
      (c.epa_waste_code && c.epa_waste_code.toLowerCase().includes(q))
    )
    const matchesSource = !sourceFilter || (c.source || 'epa_import') === sourceFilter
    return matchesSearch && matchesSource
  })

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const formatDate = (val) => {
    if (!val) return '—'
    try {
      return new Date(val).toLocaleDateString()
    } catch {
      return '—'
    }
  }

  const sourceLabel = (c) => {
    if (c.source_display) return c.source_display
    if (c.source && SOURCE_LABELS[c.source]) return SOURCE_LABELS[c.source]
    return 'EPA Import'
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link to="/admin" style={{ color: '#6b7280', fontSize: '0.9rem', textDecoration: 'none' }}>← Admin</Link>
          </div>
          <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>🧪 Chemical Database</h1>
          <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>
            All chemical records in the database. Includes EPA-imported and manually added entries.
            {totalCount > 0 && <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>{totalCount.toLocaleString()} records total.</span>}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="Search name, CAS #, EPA code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          style={{ maxWidth: 180 }}
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Categories</option>
          <option value="P">P-list (Acutely Hazardous)</option>
          <option value="U">U-list (Toxic)</option>
          <option value="F">F-list (Non-specific source)</option>
          <option value="K">K-list (Specific source)</option>
          <option value="D_CHAR">Characteristic (D-code)</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          className="form-control"
          style={{ maxWidth: 180 }}
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="epa_import">EPA Import</option>
          <option value="manual">Manual (Admin)</option>
        </select>
        {(search || categoryFilter || sourceFilter) && (
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setCategoryFilter(''); setSourceFilter(''); setPage(1) }}>
            Clear Filters
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No chemicals found.</p>
          {(search || categoryFilter || sourceFilter) && (
            <p style={{ fontSize: '0.9rem' }}>Try adjusting your filters.</p>
          )}
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>CAS #</th>
                  <th style={thStyle}>EPA Code</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Date Added</th>
                  <th style={thStyle}>Added By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.cas_number || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
                      {c.epa_waste_code || '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 4,
                        background: '#f3f4f6', color: '#374151',
                      }}>
                        {c.category_display || CATEGORY_LABELS[c.category] || c.category || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 4,
                        background: (c.source || 'epa_import') === 'epa_import' ? '#dbeafe' : '#dcfce7',
                        color: (c.source || 'epa_import') === 'epa_import' ? '#1e40af' : '#166534',
                      }}>
                        {sourceLabel(c)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{formatDate(c.created_at)}</td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{c.added_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </button>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Page {page} of {totalPages} ({totalCount.toLocaleString()} records)
              </span>
              <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
