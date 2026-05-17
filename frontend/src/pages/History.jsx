import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mixtures } from '../api/client'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'customer_asc', label: 'Generator Name (A → Z)' },
  { value: 'customer_desc', label: 'Generator Name (Z → A)' },
]

const sortMixtures = (items, sort) => {
  const arr = items.slice()
  const cmpCustomer = (a, b) => {
    const an = (a.customer_name || '').toLowerCase()
    const bn = (b.customer_name || '').toLowerCase()
    if (an && !bn) return -1
    if (!an && bn) return 1
    if (an < bn) return -1
    if (an > bn) return 1
    const al = (a.customer_location_name || '').toLowerCase()
    const bl = (b.customer_location_name || '').toLowerCase()
    if (al < bl) return -1
    if (al > bl) return 1
    return b.id - a.id
  }
  switch (sort) {
    case 'oldest': return arr.sort((a, b) => a.id - b.id)
    case 'customer_asc': return arr.sort(cmpCustomer)
    case 'customer_desc': return arr.sort((a, b) => -cmpCustomer(a, b))
    case 'newest':
    default: return arr.sort((a, b) => b.id - a.id)
  }
}

function MixtureRow({ m, onDelete, onPdf }) {
  const latestDet = m.determinations?.[m.determinations.length - 1]
  const isHazardous = latestDet?.is_hazardous_waste
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 600, background: '#f3f4f6', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
            #{m.id}
          </span>
          <strong style={{ fontSize: '1.05rem' }}>{m.name}</strong>
          {m.transaction_id && (
            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>
              {m.transaction_id}
            </span>
          )}
          {latestDet && (
            <span className={`badge ${isHazardous ? 'badge-hazardous' : 'badge-safe'}`}>
              {isHazardous ? '⚠️ Hazardous' : '✅ Not Hazardous'}
            </span>
          )}
          {!latestDet && <span className="badge badge-warning">No determination yet</span>}
        </div>
        <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          {m.customer_name && <span><strong>{m.customer_name}</strong>{m.customer_location_name ? ` · ${m.customer_location_name}` : ''} · </span>}
          {m.components?.length ?? 0} component{m.components?.length !== 1 ? 's' : ''} ·
          Created {new Date(m.created_at).toLocaleDateString()}
          {m.days_remaining_to_ship != null && (
            <>
              {' · '}
              <span style={{
                fontWeight: 700,
                color: m.days_remaining_to_ship <= 0 ? '#dc2626'
                  : m.days_remaining_to_ship <= 5 ? '#d97706'
                  : '#16a34a',
              }}>
                {m.days_remaining_to_ship <= 0
                  ? `⚠️ OVERDUE by ${Math.abs(m.days_remaining_to_ship)}d`
                  : `📅 ${m.days_remaining_to_ship}d to ship`}
              </span>
            </>
          )}
          {m.shipment_size_unit && m.shipment_size_qty && (
            <> · Shipment: {m.shipment_size_qty} {m.shipment_size_unit}</>
          )}
          {latestDet && (
            <>
              {' · '}
              Waste codes: {JSON.parse(latestDet.waste_codes || '[]').join(', ') || 'None'}
            </>
          )}
          {latestDet?.reviewer_name && (
            <>
              {' · '}
              Reviewed by: {latestDet.reviewer_name}
              {latestDet.reviewer_sign_off_date && ` (${new Date(latestDet.reviewer_sign_off_date + 'T00:00:00').toLocaleDateString()})`}
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {latestDet && (
          <Link to={`/results/${latestDet.id}`} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
            View Results
          </Link>
        )}
        {latestDet && (
          <button className="btn btn-secondary" style={{ fontSize: '0.9rem' }} onClick={() => onPdf(m.id)}>
            📄 PDF
          </button>
        )}
        <button className="btn btn-danger" style={{ fontSize: '0.9rem' }} onClick={() => onDelete(m.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

export default function History() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [customerFilter, setCustomerFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await mixtures.list()
      const all = res.data.results || res.data
      setItems(all)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this mixture and all its determinations?')) return
    await mixtures.delete(id)
    setItems(prev => prev.filter(m => m.id !== id))
  }

  const handlePdf = async (mixtureId) => {
    try {
      const res = await mixtures.reportPdf(mixtureId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `wasteid_report_${mixtureId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF generation failed.')
    }
  }

  const customerOptions = useMemo(() => {
    const names = new Set()
    for (const m of items) {
      if (m.customer_name) names.add(m.customer_name)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    let result = items
    if (customerFilter) {
      result = result.filter(m => m.customer_name === customerFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(m => {
        const latestDet = m.determinations?.[m.determinations.length - 1]
        let wasteCodes = ''
        if (latestDet) {
          try { wasteCodes = JSON.parse(latestDet.waste_codes || '[]').join(' ') } catch { /* ignore */ }
        }
        const searchable = [
          String(m.id),
          m.name,
          m.transaction_id,
          m.customer_name,
          m.customer_location_name,
          new Date(m.created_at).toLocaleDateString(),
          wasteCodes,
        ].filter(Boolean).join(' ').toLowerCase()
        return searchable.includes(q)
      })
    }
    return result
  }, [items, customerFilter, search])

  const sorted = useMemo(() => sortMixtures(filtered, sort), [filtered, sort])

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Determination History</h1>
        <Link to="/determine" className="btn btn-primary">+ New Determination</Link>
      </div>

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>Generator:</span>
            <select className="form-control" style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
              value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
              <option value="">All Generators</option>
              {customerOptions.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>Search:</span>
            <input
              type="text"
              className="form-control"
              style={{ width: '220px', padding: '0.35rem 0.6rem' }}
              placeholder="Search by ID, name, code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>Sort:</span>
            <select className="form-control" style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
              value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>No determinations yet.</p>
          <Link to="/determine" className="btn btn-primary">Start Your First Determination</Link>
        </div>
      )}

      {!loading && items.length > 0 && sorted.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#6b7280' }}>No results match your filters.</p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sorted.map(m => <MixtureRow key={m.id} m={m} onDelete={handleDelete} onPdf={handlePdf} />)}
        </div>
      )}
    </div>
  )
}
