import { useEffect, useMemo, useState } from 'react'
import { orders as ordersApi, mixtures as mixturesApi, shippers as shippersApi } from '../api/client'

const STATUS_TILES = [
  { key: 'open', label: 'Open Orders', icon: '📂', color: '#2563eb' },
  { key: 'in_quote', label: 'Waiting for Bid', icon: '💰', color: '#d97706' },
  { key: 'waiting_signature', label: 'Waiting for Customer Signature', icon: '✍️', color: '#7c3aed' },
  { key: 'rejected_transport', label: 'Rejected by Transport', icon: '🚫', color: '#dc2626' },
  { key: 'rejected_tldr', label: 'Rejected by TLDR', icon: '❌', color: '#be123c' },
]

const WORKFLOW_STEPS = ['1. Select Profiles', '2. Add Shippers', '3. Review & Save']

function StatusTile({ tile, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 160px',
        minWidth: 160,
        padding: '1.25rem 1rem',
        border: active ? `2px solid ${tile.color}` : '2px solid #e5e7eb',
        borderRadius: 10,
        background: active ? `${tile.color}11` : '#fff',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s',
        boxShadow: active ? `0 2px 8px ${tile.color}33` : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{tile.icon}</div>
      <div style={{ fontWeight: 700, fontSize: '1.5rem', color: tile.color }}>{count}</div>
      <div style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600, marginTop: '0.2rem' }}>{tile.label}</div>
    </button>
  )
}

function OrderTable({ orderList, sortCol, sortDir, onSort, ownerFilter, setOwnerFilter }) {
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
        case 'created_at': av = a.created_at; bv = b.created_at; break
        case 'owner_name': av = (a.owner_name || '').toLowerCase(); bv = (b.owner_name || '').toLowerCase(); break
        case 'generator_name': av = (a.generator_name || '').toLowerCase(); bv = (b.generator_name || '').toLowerCase(); break
        default: av = a.created_at; bv = b.created_at
      }
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return arr
  }, [filtered, sortCol, sortDir])

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', cursor: 'pointer',
    userSelect: 'none',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  const renderSortArrow = (col) => {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>Filter by Owner:</span>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
          >
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
                <th style={thStyle} onClick={() => onSort('order_id')}>Order ID{renderSortArrow('order_id')}</th>
                <th style={thStyle} onClick={() => onSort('created_at')}>Date Started{renderSortArrow('created_at')}</th>
                <th style={thStyle} onClick={() => onSort('owner_name')}>Owner{renderSortArrow('owner_name')}</th>
                <th style={thStyle} onClick={() => onSort('generator_name')}>Generator{renderSortArrow('generator_name')}</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Profiles</th>
                <th style={{ ...thStyle, cursor: 'default' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(o => (
                <tr key={o.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{o.order_id}</td>
                  <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>{o.owner_name || '—'}</td>
                  <td style={tdStyle}>{o.generator_name || '—'}</td>
                  <td style={tdStyle}>{(o.profile_names || []).join(', ') || '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NewOrderWorkflow({ onCancel, onSave }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Profile selection
  const [allProfiles, setAllProfiles] = useState([])
  const [selectedProfileIds, setSelectedProfileIds] = useState([])
  const [profileSearch, setProfileSearch] = useState('')

  // Step 2: Shipper selection
  const [allShippers, setAllShippers] = useState([])
  const [selectedShipperIds, setSelectedShipperIds] = useState([])

  // Order metadata
  const [ownerName, setOwnerName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [profileRes, shipperRes] = await Promise.all([
        mixturesApi.list(),
        shippersApi.list(),
      ])
      const profiles = profileRes.data.results || profileRes.data
      setAllProfiles(profiles)
      const shippers = shipperRes.data.results || shipperRes.data
      setAllShippers(shippers)
    } catch {
      setError('Failed to load data.')
    }
  }

  // Filter profiles: show all except "closed" (we don't have a closed concept, so show all)
  const filteredProfiles = useMemo(() => {
    let list = allProfiles
    if (profileSearch.trim()) {
      const q = profileSearch.trim().toLowerCase()
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.transaction_id || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allProfiles, profileSearch])

  const toggleProfile = (id) => {
    setSelectedProfileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleShipper = (id) => {
    setSelectedShipperIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async (submitToBid = false) => {
    if (selectedProfileIds.length === 0) {
      setError('Please select at least one profile.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const selectedProfiles = allProfiles.filter(p => selectedProfileIds.includes(p.id))
      const selectedShippers = allShippers.filter(s => selectedShipperIds.includes(s.id))
      const payload = {
        owner_name: ownerName,
        profile_ids: selectedProfileIds,
        profile_names: selectedProfiles.map(p => p.name),
        shipper_ids: selectedShipperIds,
        shipper_names: selectedShippers.map(s => s.company_name),
        generator_name: selectedProfiles[0]?.customer_name || '',
        notes,
        status: submitToBid ? 'in_quote' : 'open',
      }
      const res = await ordersApi.create(payload)
      if (submitToBid && res.data && res.data.id) {
        await ordersApi.submitToBid(res.data.id)
      }
      onSave()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to create order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>New Order</h1>
        <button className="btn btn-secondary" onClick={onCancel}>← Back to Dashboard</button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {WORKFLOW_STEPS.map((label, i) => (
          <div key={i} style={{
            padding: '0.5rem 1rem',
            borderRadius: 8,
            background: i === step ? '#14532d' : i < step ? '#bbf7d0' : '#f3f4f6',
            color: i === step ? '#fff' : i < step ? '#14532d' : '#6b7280',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            {label}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Step 1: Select Profiles */}
      {step === 0 && (
        <div className="card">
          <h3 style={{ color: '#166534', marginBottom: '0.75rem' }}>Select Profiles to Add to Order</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Choose any profile regardless of phase (except closed). Selected profiles will be included in this work order.
          </p>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Order Owner Name</label>
            <input className="form-control" value={ownerName} onChange={e => setOwnerName(e.target.value)}
              placeholder="Enter your name" style={{ maxWidth: 400 }} />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Search Profiles</label>
            <input className="form-control" value={profileSearch} onChange={e => setProfileSearch(e.target.value)}
              placeholder="Search by name, ID, or generator…" style={{ maxWidth: 400 }} />
          </div>

          {filteredProfiles.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No profiles found. Create profiles first via the New Profile page.</p>
          ) : (
            <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              {filteredProfiles.map(p => {
                const selected = selectedProfileIds.includes(p.id)
                return (
                  <div key={p.id}
                    onClick={() => toggleProfile(p.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selected ? '#f0fdf4' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                    <input type="checkbox" checked={selected} readOnly style={{ accentColor: '#14532d' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                        {p.transaction_id && <span style={{ fontFamily: 'monospace' }}>{p.transaction_id}</span>}
                        {p.customer_name && <span> · {p.customer_name}</span>}
                        {p.components && <span> · {p.components.length} component{p.components.length !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => {
              if (selectedProfileIds.length === 0) { setError('Select at least one profile.'); return }
              setError(''); setStep(1)
            }}>
              Next: Add Shippers →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Shippers */}
      {step === 1 && (
        <div className="card">
          <h3 style={{ color: '#166534', marginBottom: '0.75rem' }}>Select Potential Shippers</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Choose shippers who may transport this order. You can skip this step if shippers are not yet known.
          </p>

          {allShippers.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No shippers available. Add shippers via the Shippers page.</p>
          ) : (
            <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              {allShippers.map(s => {
                const selected = selectedShipperIds.includes(s.id)
                return (
                  <div key={s.id}
                    onClick={() => toggleShipper(s.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selected ? '#f0fdf4' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                    <input type="checkbox" checked={selected} readOnly style={{ accentColor: '#14532d' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.company_name}</div>
                      <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                        {s.epa_id && <span style={{ fontFamily: 'monospace' }}>{s.epa_id}</span>}
                        {s.city && <span> · {s.city}, {s.state}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={() => { setError(''); setStep(2) }}>
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Save */}
      {step === 2 && (
        <div className="card">
          <h3 style={{ color: '#166534', marginBottom: '0.75rem' }}>Review & Save Order</h3>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Owner:</strong> {ownerName || '(not set)'}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Selected Profiles ({selectedProfileIds.length}):</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              {allProfiles.filter(p => selectedProfileIds.includes(p.id)).map(p => (
                <li key={p.id}>{p.name} <span style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '0.85rem' }}>({p.transaction_id})</span></li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Potential Shippers ({selectedShipperIds.length}):</strong>
            {selectedShipperIds.length === 0 ? (
              <p style={{ color: '#6b7280', margin: '0.25rem 0' }}>None selected</p>
            ) : (
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                {allShippers.filter(s => selectedShipperIds.includes(s.id)).map(s => (
                  <li key={s.id}>{s.company_name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Notes</label>
            <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes for this order…" />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={submitting}>
              {submitting ? 'Saving…' : '💾 Save Order (Open)'}
            </button>
            <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={submitting}
              style={{ background: '#d97706' }}>
              {submitting ? 'Submitting…' : '📤 Submit to Bid'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [ownerFilter, setOwnerFilter] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await ordersApi.list()
      setAllOrders(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  const counts = useMemo(() => {
    const c = {}
    for (const t of STATUS_TILES) c[t.key] = 0
    for (const o of allOrders) {
      if (c[o.status] !== undefined) c[o.status]++
    }
    return c
  }, [allOrders])

  const filteredOrders = useMemo(() => {
    if (!activeStatus) return []
    return allOrders.filter(o => o.status === activeStatus)
  }, [allOrders, activeStatus])

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const handleTileClick = (key) => {
    setShowNewOrder(false)
    setActiveStatus(prev => prev === key ? null : key)
    setOwnerFilter('')
  }

  if (showNewOrder) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 960 }}>
        <NewOrderWorkflow
          onCancel={() => setShowNewOrder(false)}
          onSave={() => { setShowNewOrder(false); loadOrders() }}
        />
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Orders Dashboard</h1>
        <button className="btn btn-primary" onClick={() => { setShowNewOrder(true); setActiveStatus(null) }}>
          + Create New Order
        </button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && (
        <>
          {/* Status tiles */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {STATUS_TILES.map(tile => (
              <StatusTile
                key={tile.key}
                tile={tile}
                count={counts[tile.key]}
                active={activeStatus === tile.key}
                onClick={() => handleTileClick(tile.key)}
              />
            ))}
          </div>

          {/* Orders table when a tile is selected */}
          {activeStatus && (
            <OrderTable
              orderList={filteredOrders}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              ownerFilter={ownerFilter}
              setOwnerFilter={setOwnerFilter}
            />
          )}

          {!activeStatus && allOrders.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No orders yet.</p>
              <button className="btn btn-primary" onClick={() => setShowNewOrder(true)}>
                + Create Your First Order
              </button>
            </div>
          )}

          {!activeStatus && allOrders.length > 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              Click a status tile above to view orders in that category.
            </div>
          )}
        </>
      )}
    </div>
  )
}
