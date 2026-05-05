import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers as customersApi } from '../api/client'

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  const load = async () => {
    setLoading(true)
    try {
      const res = await customersApi.list()
      const all = res.data.results || res.data
      setCustomers(all)
    } catch (e) {
      setError('Could not load customers. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIndicator = (column) => {
    if (sortColumn !== column) return ' ↕'
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  // Flatten customers with their locations for searching and display
  const rows = useMemo(() => {
    const flat = []
    for (const c of customers) {
      if (c.locations && c.locations.length > 0) {
        for (const loc of c.locations) {
          flat.push({
            id: `${c.id}-${loc.id}`,
            customerId: c.id,
            customerName: c.name,
            contactName: c.contact_name || '',
            contactEmail: c.contact_email || '',
            contactPhone: c.contact_phone || '',
            locationName: loc.name || '',
            locationCity: loc.city || '',
            locationState: loc.state || '',
          })
        }
      } else {
        flat.push({
          id: `${c.id}-no-loc`,
          customerId: c.id,
          customerName: c.name,
          contactName: c.contact_name || '',
          contactEmail: c.contact_email || '',
          contactPhone: c.contact_phone || '',
          locationName: '',
          locationCity: '',
          locationState: '',
        })
      }
    }
    return flat
  }, [customers])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const term = search.toLowerCase()
    return rows.filter(r =>
      r.customerName.toLowerCase().includes(term) ||
      r.locationName.toLowerCase().includes(term) ||
      r.locationCity.toLowerCase().includes(term) ||
      r.locationState.toLowerCase().includes(term)
    )
  }, [rows, search])

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows]
    sorted.sort((a, b) => {
      let aVal = '', bVal = ''
      switch (sortColumn) {
        case 'name': aVal = a.customerName; bVal = b.customerName; break
        case 'contact': aVal = a.contactName; bVal = b.contactName; break
        case 'email': aVal = a.contactEmail; bVal = b.contactEmail; break
        case 'phone': aVal = a.contactPhone; bVal = b.contactPhone; break
        case 'location': aVal = a.locationName; bVal = b.locationName; break
        case 'city': aVal = a.locationCity; bVal = b.locationCity; break
        case 'state': aVal = a.locationState; bVal = b.locationState; break
        default: aVal = a.customerName; bVal = b.customerName;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredRows, sortColumn, sortDirection])

  const thStyle = {
    cursor: 'pointer',
    userSelect: 'none',
    padding: '0.75rem 0.5rem',
    textAlign: 'left',
    borderBottom: '2px solid #d1d5db',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.88rem',
    whiteSpace: 'nowrap',
  }

  const tdStyle = {
    padding: '0.6rem 0.5rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.9rem',
    color: '#1f2937',
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Customers</h1>
        <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>
          + Add Customer
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ marginBottom: '1rem' }}>
        <input
          className="form-control"
          type="text"
          placeholder="Search by customer or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && customers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No customers yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>
            + Add Your First Customer
          </button>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle} onClick={() => handleSort('name')}>Customer{getSortIndicator('name')}</th>
                <th style={thStyle} onClick={() => handleSort('contact')}>Contact{getSortIndicator('contact')}</th>
                <th style={thStyle} onClick={() => handleSort('email')}>Email{getSortIndicator('email')}</th>
                <th style={thStyle} onClick={() => handleSort('phone')}>Phone{getSortIndicator('phone')}</th>
                <th style={thStyle} onClick={() => handleSort('location')}>Location{getSortIndicator('location')}</th>
                <th style={thStyle} onClick={() => handleSort('city')}>City{getSortIndicator('city')}</th>
                <th style={thStyle} onClick={() => handleSort('state')}>State{getSortIndicator('state')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                    No results match your search.
                  </td>
                </tr>
              ) : (
                sortedRows.map(row => (
                  <tr key={row.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={tdStyle}><strong>{row.customerName}</strong></td>
                    <td style={tdStyle}>{row.contactName}</td>
                    <td style={tdStyle}>{row.contactEmail}</td>
                    <td style={tdStyle}>{row.contactPhone}</td>
                    <td style={tdStyle}>{row.locationName}</td>
                    <td style={tdStyle}>{row.locationCity}</td>
                    <td style={tdStyle}>{row.locationState}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
