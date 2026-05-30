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

const CHARACTERISTIC_FIELDS = [
  ['is_ignitable', 'Ignitable'],
  ['is_corrosive', 'Corrosive'],
  ['is_reactive', 'Reactive'],
  ['is_toxic', 'Toxic'],
  ['is_acutely_hazardous', 'Acutely Hazardous'],
]

const CATEGORY_OPTIONS = [
  { value: 'P', label: 'P-list (Acutely Hazardous)' },
  { value: 'U', label: 'U-list (Toxic)' },
  { value: 'F', label: 'F-list (Non-specific source)' },
  { value: 'K', label: 'K-list (Specific source)' },
  { value: 'D_CHAR', label: 'Characteristic (D-code)' },
  { value: 'OTHER', label: 'Other' },
]

const EMPTY_FORM = {
  name: '',
  cas_number: '',
  epa_waste_code: '',
  category: 'OTHER',
  notes: '',
  is_ignitable: false,
  is_corrosive: false,
  is_reactive: false,
  is_toxic: false,
  is_acutely_hazardous: false,
  flash_point_c: '',
  ph_value: '',
  tclp_threshold_mgl: '',
}

const thStyle = {
  padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
  color: '#374151', fontWeight: 600, fontSize: '0.88rem',
}
const tdStyle = {
  padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
}

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modalStyle = {
  background: '#fff', borderRadius: 8, padding: '1.75rem',
  width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
}

function ChemicalFormModal({ initial, onSave, onClose, isNew }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        source: 'manual',
        added_by: 'Admin',
        flash_point_c: form.flash_point_c === '' ? null : Number(form.flash_point_c),
        ph_value: form.ph_value === '' ? null : Number(form.ph_value),
        tclp_threshold_mgl: form.tclp_threshold_mgl === '' ? null : Number(form.tclp_threshold_mgl),
      }
      await onSave(payload)
    } catch (err) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : 'Save failed.')
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <h2 style={{ color: '#14532d', marginBottom: '1.25rem', fontSize: '1.1rem' }}>
          {isNew ? '➕ Add New Chemical' : '✏️ Edit Chemical'}
        </h2>
        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>Name *</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>CAS Number</label>
              <input className="form-control" value={form.cas_number} onChange={e => set('cas_number', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>EPA Waste Code</label>
              <input className="form-control" value={form.epa_waste_code} onChange={e => set('epa_waste_code', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>Category</label>
            <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>Flash Point (°C)</label>
              <input className="form-control" type="number" step="any" value={form.flash_point_c} onChange={e => set('flash_point_c', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>pH Value</label>
              <input className="form-control" type="number" step="any" value={form.ph_value} onChange={e => set('ph_value', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>TCLP (mg/L)</label>
              <input className="form-control" type="number" step="any" value={form.tclp_threshold_mgl} onChange={e => set('tclp_threshold_mgl', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.88rem' }}>Characteristics</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[['is_ignitable','Ignitable'],['is_corrosive','Corrosive'],['is_reactive','Reactive'],['is_toxic','Toxic'],['is_acutely_hazardous','Acutely Hazardous']].map(([k, label]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.88rem' }}>Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem' }}>
            Source will be set to <strong>Manual (Admin)</strong>.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (isNew ? 'Add Chemical' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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

  // modal state
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)

  useEffect(() => {
    loadChemicals()
  // search and sourceFilter are applied client-side to already-loaded records;
  // only page and categoryFilter drive new API requests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleAdd = async (payload) => {
    await chemicals.create(payload)
    setShowAdd(false)
    await loadChemicals()
  }

  const handleEdit = async (payload) => {
    await chemicals.update(editItem.id, payload)
    setEditItem(null)
    await loadChemicals()
  }

  const openEdit = (c) => {
    setEditItem({
      ...c,
      flash_point_c: c.flash_point_c ?? '',
      ph_value: c.ph_value ?? '',
      tclp_threshold_mgl: c.tclp_threshold_mgl ?? '',
    })
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1200 }}>
      {showAdd && (
        <ChemicalFormModal isNew onSave={handleAdd} onClose={() => setShowAdd(false)} initial={{}} />
      )}
      {editItem && (
        <ChemicalFormModal onSave={handleEdit} onClose={() => setEditItem(null)} initial={editItem} />
      )}

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
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          ➕ Add New Chemical
        </button>
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
                  <th style={thStyle}>Characteristics</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Date Added</th>
                  <th style={thStyle}>Added By</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
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
                      {(() => {
                        const active = CHARACTERISTIC_FIELDS.filter(([k]) => c[k])
                        if (active.length === 0) return <span style={{ color: '#9ca3af' }}>—</span>
                        return (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {active.map(([k, label]) => (
                              <span key={k} style={{
                                fontSize: '0.72rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 4,
                                background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap',
                              }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
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
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => openEdit(c)}
                      >
                        ✏️ Edit
                      </button>
                    </td>
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
