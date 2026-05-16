import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers as customersApi, customerLocations as locationsApi } from '../api/client'

const emptyCustomer = {
  name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  billing_address: '',
  notes: '',
}

const emptyLocation = {
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  notes: '',
}

export default function AddCustomer() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyCustomer)
  const [pendingLocations, setPendingLocations] = useState([])
  const [locForm, setLocForm] = useState(emptyLocation)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addPendingLocation = () => {
    if (!locForm.name.trim()) { setError('Location name is required.'); return }
    setPendingLocations(prev => [...prev, { ...locForm, name: locForm.name.trim() }])
    setLocForm(emptyLocation)
    setError('')
  }

  const removePendingLocation = (idx) => {
    setPendingLocations(prev => prev.filter((_, i) => i !== idx))
  }

  const submitNewCustomer = async () => {
    if (!form.name.trim()) { setError('Generator name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await customersApi.create({ ...form, name: form.name.trim() })
      const newId = res.data.id
      for (const loc of pendingLocations) {
        await locationsApi.create({ ...loc, customer: newId })
      }
      navigate('/generators')
    } catch (e) {
      const detail = e.response?.data
      setError(typeof detail === 'string' ? detail : (detail?.name?.[0] || 'Failed to create generator.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 960 }}>
      <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>Add New Generator</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label>Generator Name *</label>
          <input className="form-control" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Acme Manufacturing" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Contact Name</label>
            <input className="form-control" value={form.contact_name}
              onChange={e => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Contact Email</label>
            <input className="form-control" type="email" value={form.contact_email}
              onChange={e => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Contact Phone</label>
            <input className="form-control" value={form.contact_phone}
              onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Billing Address</label>
            <input className="form-control" value={form.billing_address}
              onChange={e => setForm({ ...form, billing_address: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea className="form-control" rows={2} value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <h3 style={{ color: '#166534', marginTop: '1rem', marginBottom: '0.5rem' }}>Locations</h3>
        <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
          Add one or more locations for this generator. You can add more locations later.
        </p>

        {pendingLocations.length > 0 && (
          <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
            {pendingLocations.map((loc, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>
                <strong>{loc.name}</strong>
                {(loc.city || loc.state) && ` — ${[loc.city, loc.state].filter(Boolean).join(', ')}`}
                <button type="button" className="btn btn-danger" style={{ marginLeft: '0.75rem', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => removePendingLocation(i)}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Location Name *</label>
            <input className="form-control" value={locForm.name}
              onChange={e => setLocForm({ ...locForm, name: e.target.value })}
              placeholder="e.g., Main Plant" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>City</label>
            <input className="form-control" value={locForm.city}
              onChange={e => setLocForm({ ...locForm, city: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>State</label>
            <input className="form-control" value={locForm.state}
              onChange={e => setLocForm({ ...locForm, state: e.target.value })} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label>Address</label>
          <input className="form-control" value={locForm.address}
            onChange={e => setLocForm({ ...locForm, address: e.target.value })} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={addPendingLocation}>+ Add Location</button>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={submitNewCustomer} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Generator'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/generators')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
