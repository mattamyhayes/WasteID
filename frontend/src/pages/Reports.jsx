import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mixtures, orders as ordersApi } from '../api/client'
import { calcShipByInfo, parseLocalDate, holdTimeColor, daysRemainingFromDate } from '../lib/shipByUtils'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'customer_asc', label: 'Generator Name (A → Z)' },
  { value: 'customer_desc', label: 'Generator Name (Z → A)' },
]

function sortMixtures(items, sort) {
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

function formatDate(d) {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString()
}

// ─── Profiles tab ─────────────────────────────────────────────────────────────

function MixtureRow({ m, onDelete, onPdf }) {
  const latestDet = m.determinations?.[m.determinations.length - 1]
  const isHazardous = latestDet?.is_hazardous_waste
  const daysLeft = m.days_remaining_to_ship ?? calcShipByInfo(m.epa_generator_status, m.generation_date)?.daysRemaining ?? null
  const holdStyle = holdTimeColor(daysLeft)
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
          {daysLeft !== null && (
            <span style={{
              display: 'inline-block',
              padding: '0.2rem 0.6rem',
              borderRadius: 6,
              fontSize: '0.88rem',
              ...holdStyle,
            }}>
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} to ship
            </span>
          )}
        </div>
        <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          {m.customer_name && <span><strong>{m.customer_name}</strong>{m.customer_location_name ? ` · ${m.customer_location_name}` : ''} · </span>}
          {m.components?.length ?? 0} component{m.components?.length !== 1 ? 's' : ''} ·
          Created {new Date(m.created_at).toLocaleDateString()}
          {m.shipment_size_unit && m.shipment_size_qty && (
            <> · Shipment: {m.shipment_size_qty} {m.shipment_size_unit === 'gallons' ? 'Drums' : m.shipment_size_unit}</>
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

function ProfilesTab({ profileItems, loading, onDelete, onPdf }) {
  const [sort, setSort] = useState('newest')
  const [customerFilter, setCustomerFilter] = useState('')
  const [search, setSearch] = useState('')

  const customerOptions = useMemo(() => {
    const names = new Set()
    for (const m of profileItems) {
      if (m.customer_name) names.add(m.customer_name)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [profileItems])

  const filtered = useMemo(() => {
    let result = profileItems
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
  }, [profileItems, customerFilter, search])

  const sorted = useMemo(() => sortMixtures(filtered, sort), [filtered, sort])

  if (loading) return <p style={{ color: '#6b7280' }}>Loading…</p>

  if (profileItems.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
        <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>No profiles yet.</p>
        <Link to="/profile" className="btn btn-primary">Start Your First Profile</Link>
      </div>
    )
  }

  return (
    <>
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

      {sorted.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#6b7280' }}>No results match your filters.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sorted.map(m => <MixtureRow key={m.id} m={m} onDelete={onDelete} onPdf={onPdf} />)}
        </div>
      )}
    </>
  )
}

// ─── Orders tab ───────────────────────────────────────────────────────────────

function OrdersTab({ profileItems }) {
  const [orderList, setOrderList] = useState([])
  const [loading, setLoading] = useState(true)
  const [ownerFilter, setOwnerFilter] = useState('')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  const NO_DAYS_SORT_VALUE = 9999

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await ordersApi.list()
        const all = res.data.results || res.data
        setOrderList(all)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const profileMap = useMemo(
    () => Object.fromEntries((profileItems || []).map(p => [p.id, p])),
    [profileItems]
  )

  const getMinDaysRemaining = (o) => {
    const ids = Array.isArray(o.profile_ids) ? o.profile_ids : []
    const daysList = ids.map(id => {
      const p = profileMap[id]
      if (!p) return null
      return p.days_remaining_to_ship ?? calcShipByInfo(p.epa_generator_status, p.generation_date)?.daysRemaining ?? null
    }).filter(d => d !== null)
    return daysList.length > 0 ? Math.min(...daysList) : null
  }

  const owners = useMemo(() => {
    const s = new Set()
    orderList.forEach(o => { if (o.owner_name) s.add(o.owner_name) })
    return Array.from(s).sort()
  }, [orderList])

  const filtered = useMemo(() => {
    if (!ownerFilter) return orderList
    return orderList.filter(o => o.owner_name === ownerFilter)
  }, [orderList, ownerFilter])

  const sorted = useMemo(() => {
    const arr = filtered.slice()
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let av, bv
      switch (sortCol) {
        case 'order_id': av = a.order_id; bv = b.order_id; break
        case 'owner_name': av = (a.owner_name || '').toLowerCase(); bv = (b.owner_name || '').toLowerCase(); break
        case 'generator_name': av = (a.generator_name || '').toLowerCase(); bv = (b.generator_name || '').toLowerCase(); break
        case 'days_remaining':
          av = getMinDaysRemaining(a) ?? NO_DAYS_SORT_VALUE
          bv = getMinDaysRemaining(b) ?? NO_DAYS_SORT_VALUE
          break
        default: av = a.created_at; bv = b.created_at
      }
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return arr
  }, [filtered, sortCol, sortDir, profileMap])

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const renderArrow = (col) => {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap',
    cursor: 'pointer', userSelect: 'none',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  const STATUS_LABELS = {
    open: 'Open',
    in_quote: 'Waiting to Quote',
    waiting_signature: 'Waiting for Signature',
    rejected_transport: 'Rejected by Transport',
    rejected_tldr: 'Rejected by TSDF',
  }

  if (loading) return <p style={{ color: '#6b7280' }}>Loading…</p>

  if (orderList.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>No orders yet.</p>
        <Link to="/orders" className="btn btn-primary">Go to Orders</Link>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>Filter by Owner:</span>
          <select className="form-control" style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
            value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="">All Owners</option>
            {owners.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{sorted.length} order{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No orders match this filter.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle} onClick={() => handleSort('order_id')}>Order ID{renderArrow('order_id')}</th>
                <th style={thStyle} onClick={() => handleSort('created_at')}>Date Started{renderArrow('created_at')}</th>
                <th style={thStyle} onClick={() => handleSort('owner_name')}>Owner{renderArrow('owner_name')}</th>
                <th style={thStyle} onClick={() => handleSort('generator_name')}>Generator{renderArrow('generator_name')}</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Profiles</th>
                <th style={thStyle} onClick={() => handleSort('days_remaining')}>Days Remaining to Ship{renderArrow('days_remaining')}</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Status</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(o => {
                const minDays = getMinDaysRemaining(o)
                const holdStyle = holdTimeColor(minDays)
                return (
                  <tr key={o.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{o.order_id}</td>
                    <td style={tdStyle}>{formatDate(o.created_at)}</td>
                    <td style={tdStyle}>{o.owner_name || '—'}</td>
                    <td style={tdStyle}>{o.generator_name || '—'}</td>
                    <td style={tdStyle}>{(o.profile_names || []).join(', ') || '—'}</td>
                    <td style={tdStyle}>
                      {minDays !== null ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 6,
                          fontSize: '0.88rem',
                          ...holdStyle,
                        }}>
                          {minDays} day{minDays !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.88rem' }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 4, background: '#f3f4f6', color: '#374151' }}>
                        {STATUS_LABELS[o.status] || o.status || '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Shipments tab ────────────────────────────────────────────────────────────

function DaysRemainingBadge({ daysLeft }) {
  if (daysLeft === null || daysLeft === undefined) {
    return <span style={{ color: '#9ca3af', fontSize: '0.88rem' }}>—</span>
  }
  const style = holdTimeColor(daysLeft)
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.6rem',
      borderRadius: 6,
      fontSize: '0.88rem',
      ...style,
    }}>
      {daysLeft} day{daysLeft !== 1 ? 's' : ''}
    </span>
  )
}

function ShipmentsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await mixtures.list()
        const all = res.data.results || res.data
        setItems(all)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const signedOrders = useMemo(() => {
    const orders = []
    for (const m of items) {
      const latestDet = m.determinations?.[m.determinations.length - 1]
      if (!latestDet || !latestDet.reviewer_name) continue
      const shipByInfo = calcShipByInfo(m.epa_generator_status, m.generation_date)
      const shipByDate = shipByInfo?.shipByDate
        ? parseLocalDate(shipByInfo.shipByDate)
        : new Date(latestDet.created_at)
      const daysLeft = m.days_remaining_to_ship ?? shipByInfo?.daysRemaining ?? null
      orders.push({
        id: m.id,
        name: m.name,
        transactionId: m.transaction_id || '',
        customerName: m.customer_name || '—',
        locationName: m.customer_location_name || '',
        shipByDate,
        daysLeft,
        reviewerName: latestDet.reviewer_name || '—',
        reviewDate: latestDet.reviewer_sign_off_date || null,
        reviewComplete: !!(latestDet.reviewer_name && latestDet.reviewer_sign_off_date),
        isHazardous: latestDet.is_hazardous_waste,
      })
    }
    orders.sort((a, b) => a.shipByDate - b.shipByDate)
    return orders
  }, [items])

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  if (loading) return <p style={{ color: '#6b7280' }}>Loading…</p>

  if (signedOrders.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
        <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No signed orders ready for shipping.</p>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          Orders appear here once a determination has been reviewed and signed off.
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={thStyle}>Order #</th>
            <th style={thStyle}>Waste Profile</th>
            <th style={thStyle}>Generator</th>
            <th style={thStyle}>Ship By Date</th>
            <th style={thStyle}>Days Remaining to Ship</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Customer Approved</th>
            <th style={thStyle}>Reviewed By</th>
            <th style={thStyle}>Review Date</th>
          </tr>
        </thead>
        <tbody>
          {signedOrders.map(order => (
            <tr key={order.id}
              style={{ transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>#{order.id}</td>
              <td style={tdStyle}>
                <strong>{order.name}</strong>
                {order.transactionId && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>{order.transactionId}</div>
                )}
              </td>
              <td style={tdStyle}>
                {order.customerName}
                {order.locationName && <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{order.locationName}</div>}
              </td>
              <td style={tdStyle}>{formatDate(order.shipByDate)}</td>
              <td style={tdStyle}>
                <DaysRemainingBadge daysLeft={order.daysLeft} />
              </td>
              <td style={tdStyle}>
                <span className={`badge ${order.isHazardous ? 'badge-hazardous' : 'badge-safe'}`}>
                  {order.isHazardous ? '⚠️ Hazardous' : '✅ Non-Haz'}
                </span>
              </td>
              <td style={tdStyle}>
                {order.reviewComplete
                  ? <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, color: '#166534', background: '#dcfce7' }}>✅ Approved</span>
                  : <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, color: '#92400e', background: '#fef3c7' }}>⏳ Pending</span>
                }
              </td>
              <td style={tdStyle}>{order.reviewerName}</td>
              <td style={tdStyle}>{formatDate(order.reviewDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Reports page ────────────────────────────────────────────────────────

const TABS = [
  { key: 'profiles', label: '📂 Profiles' },
  { key: 'orders', label: '📋 Orders' },
  { key: 'shipments', label: '🚛 Shipments' },
]

export default function Reports() {
  const [activeTab, setActiveTab] = useState('profiles')
  const [profileItems, setProfileItems] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  const loadProfiles = async () => {
    setProfilesLoading(true)
    try {
      const res = await mixtures.list()
      const all = res.data.results || res.data
      setProfileItems(all)
    } finally {
      setProfilesLoading(false)
    }
  }

  useEffect(() => { loadProfiles() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this mixture and all its determinations?')) return
    await mixtures.delete(id)
    setProfileItems(prev => prev.filter(m => m.id !== id))
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

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Reports</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/journey" className="btn btn-secondary">🗺️ Journey</Link>
          {activeTab === 'profiles' && (
            <Link to="/profile" className="btn btn-primary">+ New Profile</Link>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              border: activeTab === tab.key ? '2px solid #14532d' : '2px solid #e5e7eb',
              background: activeTab === tab.key ? '#14532d' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#374151',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', marginBottom: '1.5rem' }} />

      {/* Tab content */}
      {activeTab === 'profiles' && (
        <ProfilesTab
          profileItems={profileItems}
          loading={profilesLoading}
          onDelete={handleDelete}
          onPdf={handlePdf}
        />
      )}
      {activeTab === 'orders' && <OrdersTab profileItems={profileItems} />}
      {activeTab === 'shipments' && <ShipmentsTab />}
    </div>
  )
}
