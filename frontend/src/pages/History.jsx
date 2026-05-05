import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mixtures } from '../api/client'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'customer_asc', label: 'Customer Name (A → Z)' },
  { value: 'customer_desc', label: 'Customer Name (Z → A)' },
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
    // tiebreak on location, then name
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

const groupByCustomerAndLocation = (items) => {
  // Returns: [{ customer, locations: [{ location, mixtures: [] }] }, ...]
  const customerMap = new Map()
  for (const m of items) {
    const cKey = m.customer || `__none_${m.customer_name || ''}`
    const cName = m.customer_name || '(No customer)'
    if (!customerMap.has(cKey)) customerMap.set(cKey, { key: cKey, name: cName, locations: new Map() })
    const cEntry = customerMap.get(cKey)

    const lKey = m.customer_location || `__none_${m.customer_location_name || ''}`
    const lName = m.customer_location_name || '(No location)'
    if (!cEntry.locations.has(lKey)) cEntry.locations.set(lKey, { key: lKey, name: lName, mixtures: [] })
    cEntry.locations.get(lKey).mixtures.push(m)
  }
  // Convert to arrays and sort customer & locations alphabetically
  const customers = Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  for (const c of customers) {
    c.locations = Array.from(c.locations.values()).sort((a, b) => a.name.localeCompare(b.name))
    for (const loc of c.locations) loc.mixtures.sort((a, b) => b.id - a.id)
  }
  return customers
}

function MixtureRow({ m, onDelete }) {
  const latestDet = m.determinations?.[m.determinations.length - 1]
  const isHazardous = latestDet?.is_hazardous_waste
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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
          {latestDet && (
            <>
              {' · '}
              Waste codes: {JSON.parse(latestDet.waste_codes || '[]').join(', ') || 'None'}
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
  const [groupByCustomer, setGroupByCustomer] = useState(false)

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

  const sorted = useMemo(() => sortMixtures(items, sort), [items, sort])
  const grouped = useMemo(() => groupByCustomerAndLocation(items), [items])

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Determination History</h1>
        <Link to="/determine" className="btn btn-primary">+ New Determination</Link>
      </div>

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>Sort:</span>
            <select className="form-control" style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
              value={sort} onChange={e => setSort(e.target.value)} disabled={groupByCustomer}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#374151' }}>
            <input type="checkbox" checked={groupByCustomer} onChange={e => setGroupByCustomer(e.target.checked)} />
            Group by Customer &amp; Location
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

      {!loading && items.length > 0 && !groupByCustomer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sorted.map(m => <MixtureRow key={m.id} m={m} onDelete={handleDelete} />)}
        </div>
      )}

      {!loading && items.length > 0 && groupByCustomer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {grouped.map(c => (
            <div key={c.key}>
              <h2 style={{ color: '#14532d', marginBottom: '0.75rem', fontSize: '1.2rem' }}>{c.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.5rem' }}>
                {c.locations.map(loc => (
                  <div key={loc.key}>
                    <h3 style={{ color: '#166534', fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>📍 {loc.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {loc.mixtures.map(m => <MixtureRow key={m.id} m={m} onDelete={handleDelete} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
