import { useEffect, useState } from 'react'
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

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New customer form state (with multiple locations)
  const [form, setForm] = useState(emptyCustomer)
  const [pendingLocations, setPendingLocations] = useState([])
  const [locForm, setLocForm] = useState(emptyLocation)

  // For existing customers: per-customer "add location" form state
  const [openLocForms, setOpenLocForms] = useState({})

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

  const resetNewForm = () => {
    setForm(emptyCustomer)
    setPendingLocations([])
    setLocForm(emptyLocation)
    setError('')
  }

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
    if (!form.name.trim()) { setError('Customer name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await customersApi.create({ ...form, name: form.name.trim() })
      const newId = res.data.id
      for (const loc of pendingLocations) {
        await locationsApi.create({ ...loc, customer: newId })
      }
      await load()
      setShowForm(false)
      resetNewForm()
    } catch (e) {
      const detail = e.response?.data
      setError(typeof detail === 'string' ? detail : (detail?.name?.[0] || 'Failed to create customer.'))
    } finally {
      setSubmitting(false)
    }
  }

  const addLocationToExisting = async (customerId) => {
    const data = openLocForms[customerId]
    if (!data || !data.name?.trim()) { setError('Location name is required.'); return }
    try {
      await locationsApi.create({ ...data, name: data.name.trim(), customer: customerId })
      setOpenLocForms(prev => ({ ...prev, [customerId]: null }))
      await load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add location.')
    }
  }

  const removeLocation = async (locId) => {
    if (!confirm('Remove this location?')) return
    await locationsApi.delete(locId)
    await load()
  }

  const removeCustomer = async (id) => {
    if (!confirm('Delete this customer? Existing mixtures will keep their record but lose the customer link.')) return
    await customersApi.delete(id)
    await load()
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Customers</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => { resetNewForm(); setShowForm(true) }}>
            + Add New Customer
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', color: '#166534' }}>New Customer</h2>
          <div className="form-group">
            <label>Customer Name *</label>
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
            Add one or more locations for this customer. You can add more locations later.
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
              {submitting ? 'Saving…' : 'Save Customer'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); resetNewForm() }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && customers.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No customers yet.</p>
          <button className="btn btn-primary" onClick={() => { resetNewForm(); setShowForm(true) }}>
            + Add Your First Customer
          </button>
        </div>
      )}

      {!loading && customers.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ color: '#166534', marginBottom: '0.25rem' }}>{c.name}</h3>
              <div style={{ color: '#6b7280', fontSize: '0.88rem' }}>
                {c.contact_name && <span>{c.contact_name} · </span>}
                {c.contact_email && <span>{c.contact_email} · </span>}
                {c.contact_phone && <span>{c.contact_phone}</span>}
              </div>
              {c.billing_address && (
                <div style={{ color: '#6b7280', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                  {c.billing_address}
                </div>
              )}
            </div>
            <button className="btn btn-danger" style={{ fontSize: '0.85rem' }} onClick={() => removeCustomer(c.id)}>Delete</button>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <strong style={{ fontSize: '0.92rem', color: '#374151' }}>Locations ({c.locations?.length || 0}):</strong>
            {c.locations && c.locations.length > 0 ? (
              <ul style={{ marginTop: '0.4rem', paddingLeft: '1.25rem' }}>
                {c.locations.map(loc => (
                  <li key={loc.id} style={{ marginBottom: '0.25rem' }}>
                    <strong>{loc.name}</strong>
                    {(loc.city || loc.state) && ` — ${[loc.city, loc.state].filter(Boolean).join(', ')}`}
                    {loc.address && <span style={{ color: '#6b7280' }}> · {loc.address}</span>}
                    <button className="btn btn-danger" style={{ marginLeft: '0.75rem', padding: '0.1rem 0.5rem', fontSize: '0.78rem' }}
                      onClick={() => removeLocation(loc.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: '0.4rem 0' }}>No locations yet.</p>
            )}

            {openLocForms[c.id] ? (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input className="form-control" placeholder="Location name *"
                    value={openLocForms[c.id].name || ''}
                    onChange={e => setOpenLocForms(prev => ({ ...prev, [c.id]: { ...prev[c.id], name: e.target.value } }))} />
                  <input className="form-control" placeholder="City"
                    value={openLocForms[c.id].city || ''}
                    onChange={e => setOpenLocForms(prev => ({ ...prev, [c.id]: { ...prev[c.id], city: e.target.value } }))} />
                  <input className="form-control" placeholder="State"
                    value={openLocForms[c.id].state || ''}
                    onChange={e => setOpenLocForms(prev => ({ ...prev, [c.id]: { ...prev[c.id], state: e.target.value } }))} />
                </div>
                <input className="form-control" placeholder="Address"
                  style={{ marginBottom: '0.5rem' }}
                  value={openLocForms[c.id].address || ''}
                  onChange={e => setOpenLocForms(prev => ({ ...prev, [c.id]: { ...prev[c.id], address: e.target.value } }))} />
                <button className="btn btn-primary" style={{ fontSize: '0.85rem', marginRight: '0.5rem' }}
                  onClick={() => addLocationToExisting(c.id)}>Save Location</button>
                <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }}
                  onClick={() => setOpenLocForms(prev => ({ ...prev, [c.id]: null }))}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setOpenLocForms(prev => ({ ...prev, [c.id]: { ...emptyLocation } }))}>
                + Add Location
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
