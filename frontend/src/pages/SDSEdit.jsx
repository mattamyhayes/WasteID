import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { sds, mixtures } from '../api/client'

export default function SDSEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    product_name: '',
    cas_number: '',
    manufacturer_name: '',
    mixture_id: '',
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sdsRes, profilesRes] = await Promise.all([
        sds.get(id),
        mixtures.list(),
      ])
      const rec = sdsRes.data
      setRecord(rec)
      setFormData({
        product_name: rec.product_name || '',
        cas_number: rec.cas_number || '',
        manufacturer_name: rec.manufacturer_name || '',
        mixture_id: rec.mixture || '',
      })
      setProfiles(profilesRes.data.results || profilesRes.data || [])
    } catch {
      setError('Failed to load SDS record.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await sds.update(id, {
        product_name: formData.product_name,
        cas_number: formData.cas_number,
        manufacturer_name: formData.manufacturer_name,
        mixture_id: formData.mixture_id || null,
      })
      setSuccess('SDS record updated successfully.')
    } catch {
      setError('Failed to update SDS record.')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
    borderRadius: 6, fontSize: '0.9rem',
  }
  const labelStyle = { display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.85rem', color: '#374151' }

  if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading…</div>
  if (!record && error) return <div className="container" style={{ padding: '2rem' }}><div className="alert alert-danger">{error}</div></div>

  const sdsId = record.sds_id || `SDS-${String(record.id).padStart(5, '0')}`

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>✏️ Edit SDS Record</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#166534' }}>{sdsId}</span>
            {' — '}{record.product_name}
          </p>
        </div>
        <Link to="/sds" className="btn btn-secondary">← Back to SDS List</Link>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle} htmlFor="product_name">Product Name</label>
            <input
              id="product_name"
              name="product_name"
              type="text"
              value={formData.product_name}
              onChange={handleChange}
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle} htmlFor="cas_number">CAS Number</label>
            <input
              id="cas_number"
              name="cas_number"
              type="text"
              value={formData.cas_number}
              onChange={handleChange}
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle} htmlFor="manufacturer_name">Manufacturer</label>
            <input
              id="manufacturer_name"
              name="manufacturer_name"
              type="text"
              value={formData.manufacturer_name}
              onChange={handleChange}
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle} htmlFor="mixture_id">Associated Profile</label>
            <select
              id="mixture_id"
              name="mixture_id"
              value={formData.mixture_id}
              onChange={handleChange}
              style={fieldStyle}
            >
              <option value="">— None —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.transaction_id ? `${p.transaction_id} — ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to="/sds" className="btn btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
