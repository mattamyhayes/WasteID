import { useEffect, useState } from 'react'
import { incinerators as incineratorsApi, chemicals } from '../api/client'

const emptyIncinerator = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  contact_name: '',
  contact_email: '',
  permit_number: '',
  notes: '',
  accepted_waste_codes: [],
}

const CODE_LETTERS = [
  { value: 'D', label: 'D – Characteristic Wastes' },
  { value: 'P', label: 'P – Acutely Hazardous' },
  { value: 'U', label: 'U – Toxic Wastes' },
  { value: 'F', label: 'F – Non-specific Source' },
  { value: 'K', label: 'K – Specific Source' },
]

export default function Incinerators() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyIncinerator)
  const [submitting, setSubmitting] = useState(false)

  // Waste code selection state
  const [allChemicals, setAllChemicals] = useState([])
  const [selectedLetter, setSelectedLetter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await incineratorsApi.list()
      setItems(res.data.results || res.data)
    } catch {
      setError('Could not load incinerators.')
    } finally {
      setLoading(false)
    }
  }

  const loadChemicals = async () => {
    try {
      const res = await chemicals.list()
      setAllChemicals(res.data.results || res.data || [])
    } catch { /* ignore */ }
  }

  useEffect(() => { load(); loadChemicals() }, [])

  const startNew = () => {
    setForm({ ...emptyIncinerator, accepted_waste_codes: [] })
    setEditing('new')
    setSelectedLetter('')
    setError('')
  }

  const startEdit = (incinerator) => {
    setForm({ ...incinerator, accepted_waste_codes: incinerator.accepted_waste_codes || [] })
    setEditing(incinerator.id)
    setSelectedLetter('')
    setError('')
  }

  const cancel = () => {
    setEditing(null)
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Incinerator name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      if (editing === 'new') {
        await incineratorsApi.create(form)
      } else {
        await incineratorsApi.update(editing, form)
      }
      setEditing(null)
      await load()
    } catch (e) {
      const detail = e.response?.data
      setError(typeof detail === 'string' ? detail : (detail?.name?.[0] || 'Failed to save incinerator.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this incinerator?')) return
    try {
      await incineratorsApi.delete(id)
      setItems(prev => prev.filter(s => s.id !== id))
    } catch {
      setError('Failed to delete incinerator.')
    }
  }

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  // Get unique waste codes for the selected letter
  const codesForLetter = allChemicals
    .filter(c => c.epa_waste_code && c.epa_waste_code.startsWith(selectedLetter))
    .map(c => c.epa_waste_code)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort()

  const toggleCode = (code) => {
    const current = form.accepted_waste_codes || []
    if (current.includes(code)) {
      setForm({ ...form, accepted_waste_codes: current.filter(c => c !== code) })
    } else {
      setForm({ ...form, accepted_waste_codes: [...current, code] })
    }
  }

  const selectAllForLetter = () => {
    const current = new Set(form.accepted_waste_codes || [])
    codesForLetter.forEach(c => current.add(c))
    setForm({ ...form, accepted_waste_codes: [...current] })
  }

  const deselectAllForLetter = () => {
    const toRemove = new Set(codesForLetter)
    setForm({ ...form, accepted_waste_codes: (form.accepted_waste_codes || []).filter(c => !toRemove.has(c)) })
  }

  const handleFileImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      // Parse codes from text file - one code per line, or comma/space separated
      const imported = text
        .split(/[\r\n,;]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => /^[DPUFK]\d{3}$/.test(s))

      if (imported.length === 0) {
        setError('No valid EPA waste codes found in the file. Codes should be in format like D001, P001, U001, etc.')
        return
      }

      const current = new Set(form.accepted_waste_codes || [])
      imported.forEach(c => current.add(c))
      setForm({ ...form, accepted_waste_codes: [...current] })
      setError('')
    }
    reader.readAsText(file)
    // Reset file input
    e.target.value = ''
  }

  const fieldStyle = { marginBottom: 0 }

  if (editing !== null) {
    const selectedCodes = form.accepted_waste_codes || []

    return (
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 960 }}>
        <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>
          {editing === 'new' ? 'Add Incinerator' : 'Edit Incinerator'}
        </h1>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '0.75rem' }}>Facility Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={fieldStyle}>
              <label>Incinerator Name *</label>
              <input className="form-control" value={form.name} onChange={f('name')}
                placeholder="e.g., Clean Burn Incineration Facility" />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Contact Name</label>
              <input className="form-control" value={form.contact_name} onChange={f('contact_name')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Contact Email</label>
              <input className="form-control" type="email" value={form.contact_email} onChange={f('contact_email')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={f('phone')}
                placeholder="(555) 555-0100" />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label>Permit Number</label>
              <input className="form-control" value={form.permit_number} onChange={f('permit_number')}
                placeholder="Operating permit #" />
            </div>
          </div>

          <h3 style={{ color: '#166534', margin: '1.25rem 0 0.75rem' }}>Address</h3>
          <div className="form-group" style={fieldStyle}>
            <label>Street Address</label>
            <input className="form-control" value={form.address} onChange={f('address')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
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

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={f('notes')} />
          </div>
        </div>

        {/* Waste Codes Section */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '0.75rem' }}>Accepted EPA Waste Codes</h3>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: '1rem' }}>
            Select the EPA waste codes that this incinerator is permitted to accept. These codes will be used
            to match waste profiles to eligible disposal facilities.
          </p>

          {/* Import from file */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
              📄 Import Waste Codes from File
            </label>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Upload a text file with EPA codes (one per line, or comma/space separated). Example: D001, D002, P001
            </p>
            <input
              type="file"
              accept=".txt,.csv,.text"
              onChange={handleFileImport}
              style={{ fontSize: '0.88rem' }}
            />
          </div>

          {/* Letter selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
              Select Code Category
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CODE_LETTERS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`btn ${selectedLetter === value ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                  onClick={() => setSelectedLetter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes for selected letter */}
          {selectedLetter && (
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem' }}>
                  {selectedLetter}-codes ({codesForLetter.length} available)
                </strong>
                <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
                  onClick={selectAllForLetter} type="button">Select All</button>
                <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}
                  onClick={deselectAllForLetter} type="button">Deselect All</button>
              </div>
              {codesForLetter.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>No EPA codes available for "{selectedLetter}" category.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.4rem', maxHeight: 300, overflowY: 'auto', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                  {codesForLetter.map(code => (
                    <label key={code} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(code)}
                        onChange={() => toggleCode(code)}
                      />
                      {code}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary of selected codes */}
          {selectedCodes.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
              <strong style={{ fontSize: '0.88rem' }}>Selected Codes ({selectedCodes.length}):</strong>
              <p style={{ fontSize: '0.82rem', color: '#374151', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                {[...selectedCodes].sort().join(', ')}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Incinerator'}
          </button>
          <button className="btn btn-secondary" onClick={cancel}>Cancel</button>
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
          <h1 style={{ color: '#14532d' }}>Incinerators</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage incinerator facilities and their accepted EPA waste codes for profile matching.
          </p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>+ New Incinerator</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔥</div>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No incinerators added yet.</p>
          <button className="btn btn-primary" onClick={startNew}>+ Add Your First Incinerator</button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>State</th>
                <th style={thStyle}>Waste Codes</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={tdStyle}><strong>{s.name}</strong></td>
                  <td style={tdStyle}>{s.city || '—'}</td>
                  <td style={tdStyle}>{s.state || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                      {(s.accepted_waste_codes || []).length} codes
                    </span>
                  </td>
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
