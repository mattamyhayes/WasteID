import { useEffect, useState } from 'react'
import { shippers as shippersApi } from '../api/client'

const emptyShipper = {
  company_name: '',
  epa_id: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  emergency_phone: '',
  contact_name: '',
  site_address: '',
  site_city: '',
  site_state: '',
  site_zip_code: '',
  notes: '',
}

export default function Shippers() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null = list view, 'new' or id
  const [form, setForm] = useState(emptyShipper)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await shippersApi.list()
      setItems(res.data.results || res.data)
    } catch {
      setError('Could not load shippers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startNew = () => {
    setForm({ ...emptyShipper })
    setEditing('new')
    setError('')
  }

  const startEdit = (shipper) => {
    setForm({ ...shipper })
    setEditing(shipper.id)
    setError('')
  }

  const cancel = () => {
    setEditing(null)
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { setError('Company name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      if (editing === 'new') {
        await shippersApi.create(form)
      } else {
        await shippersApi.update(editing, form)
      }
      setEditing(null)
      await load()
    } catch (e) {
      const detail = e.response?.data
      setError(typeof detail === 'string' ? detail : (detail?.company_name?.[0] || 'Failed to save shipper.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this shipper profile?')) return
    try {
      await shippersApi.delete(id)
      setItems(prev => prev.filter(s => s.id !== id))
    } catch {
      setError('Failed to delete shipper.')
    }
  }

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const fieldStyle = { marginBottom: 0 }

  if (editing !== null) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 960 }}>
        <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>
          {editing === 'new' ? 'Add Shipper Profile' : 'Edit Shipper Profile'}
        </h1>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '0.75rem' }}>Company Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={fieldStyle}>
              <label>Company Name *</label>
              <input className="form-control" value={form.company_name} onChange={f('company_name')}
                placeholder="e.g., Acme Waste Services" />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>US EPA ID Number</label>
              <input className="form-control" value={form.epa_id} onChange={f('epa_id')}
                placeholder="e.g., OHD123456789" />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Contact Name</label>
              <input className="form-control" value={form.contact_name} onChange={f('contact_name')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={f('phone')}
                placeholder="(555) 555-0100" />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Emergency Response Phone</label>
              <input className="form-control" value={form.emergency_phone} onChange={f('emergency_phone')}
                placeholder="24-hour emergency number" />
            </div>
          </div>

          <h3 style={{ color: '#166534', margin: '1.25rem 0 0.75rem' }}>Mailing Address</h3>
          <div className="form-group" style={fieldStyle}>
            <label>Street Address</label>
            <input className="form-control" value={form.address} onChange={f('address')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <div className="form-group" style={fieldStyle}>
              <label>City</label>
              <input className="form-control" value={form.city} onChange={f('city')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>State</label>
              <input className="form-control" value={form.state} onChange={f('state')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>ZIP Code</label>
              <input className="form-control" value={form.zip_code} onChange={f('zip_code')} />
            </div>
          </div>

          <h3 style={{ color: '#166534', margin: '1.25rem 0 0.75rem' }}>Site Address (if different from mailing)</h3>
          <div className="form-group" style={fieldStyle}>
            <label>Site Street Address</label>
            <input className="form-control" value={form.site_address} onChange={f('site_address')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <div className="form-group" style={fieldStyle}>
              <label>Site City</label>
              <input className="form-control" value={form.site_city} onChange={f('site_city')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Site State</label>
              <input className="form-control" value={form.site_state} onChange={f('site_state')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Site ZIP Code</label>
              <input className="form-control" value={form.site_zip_code} onChange={f('site_zip_code')} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={f('notes')} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Shipper'}
            </button>
            <button className="btn btn-secondary" onClick={cancel}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: '#14532d' }}>Shippers</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage shipper/generator profiles that can be reused when completing EPA Hazardous Waste Manifests.
          </p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>+ Add Shipper</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No shipper profiles yet.</p>
          <button className="btn btn-primary" onClick={startNew}>+ Add Your First Shipper</button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Company Name</th>
                <th style={thStyle}>EPA ID</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>State</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={tdStyle}><strong>{s.company_name}</strong></td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.epa_id || '—'}</td>
                  <td style={tdStyle}>{s.city || '—'}</td>
                  <td style={tdStyle}>{s.state || '—'}</td>
                  <td style={tdStyle}>{s.phone || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => startEdit(s)}>Edit</button>
                      <button className="btn btn-danger" style={{ fontSize: '0.82rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => handleDelete(s.id)}>Delete</button>
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
