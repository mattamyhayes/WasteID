import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, createForm, updateForm, detectFormFields, DATA_ELEMENTS } from '../lib/formStore'

export default function FormEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(null)
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [converted, setConverted] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isEdit) {
      const existing = getForm(Number(id))
      if (existing) {
        setForm(existing)
        setName(existing.name)
        setFields(existing.fields || [])
        setFilePreview(existing.file_data)
        setConverted(existing.fields && existing.fields.length > 0)
      } else {
        setError('Form not found.')
      }
    }
  }, [id, isEdit])

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/tiff', 'image/bmp']
    if (!allowedTypes.some(t => selected.type.startsWith(t.split('/')[0]) || selected.type === t)) {
      setError('Please upload a PDF or image file (PNG, JPEG, GIF, TIFF, BMP).')
      return
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25 MB limit.')
      return
    }
    setError('')
    setFile(selected)
    setConverted(false)
    setFields([])
    // Generate preview
    const reader = new FileReader()
    reader.onload = () => setFilePreview(reader.result)
    reader.readAsDataURL(selected)
  }

  const handleConvert = async () => {
    setLoading(true)
    setError('')
    try {
      let targetForm = form
      if (!isEdit && file) {
        const formName = name.trim() || file.name.replace(/\.[^/.]+$/, '')
        targetForm = await createForm(formName, file)
        setForm(targetForm)
        setName(targetForm.name)
      }
      if (!targetForm) {
        setError('Please upload a file first.')
        setLoading(false)
        return
      }
      // Detect fields from the document
      const detected = detectFormFields(targetForm)
      setFields(detected)
      // Save fields to the form
      updateForm(targetForm.id, { fields: detected })
      setConverted(true)
    } catch (err) {
      setError('Failed to convert form: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (fieldId, key, value) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, [key]: value } : f))
    setSaved(false)
  }

  const handleAddField = () => {
    const maxId = fields.length > 0 ? Math.max(...fields.map(f => f.id)) : 0
    setFields(prev => [...prev, {
      id: maxId + 1,
      label: '',
      fieldType: 'text',
      mapping: '',
      x: 5,
      y: 50,
      width: 30,
      height: 3,
    }])
    setSaved(false)
  }

  const handleRemoveField = (fieldId) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    setSaved(false)
  }

  const handleSave = () => {
    if (!form) return
    const formName = name.trim() || form.name
    updateForm(form.id, { name: formName, fields })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const renderPreview = () => {
    if (!filePreview) return null
    // Only allow data: URLs for security (prevents injection of arbitrary URLs)
    if (!filePreview.startsWith('data:')) return null
    const isImage = filePreview.startsWith('data:image')
    if (isImage) {
      return (
        <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', maxHeight: 400 }}>
          <img src={filePreview} alt="Form preview" style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
        </div>
      )
    }
    // PDF preview - only allow data:application/pdf
    if (!filePreview.startsWith('data:application/pdf')) return null
    return (
      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
        <embed src={filePreview} type="application/pdf" width="100%" height="400px" />
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>{isEdit ? 'Edit Form Template' : 'Import New Form'}</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/forms')}>← Back to Forms</button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Form Name & Upload */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>
          {isEdit ? '📄 Form Details' : '📤 Upload Form Document'}
        </h2>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Form Name</label>
          <input
            className="form-control"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Hazardous Waste Manifest, Land Disposal Restriction Form"
          />
        </div>
        {!isEdit && (
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Upload PDF or Image</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.tiff,.bmp"
              onChange={handleFileChange}
              style={{ display: 'block', marginTop: '0.5rem' }}
            />
            <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Upload a scanned paper form (PDF or image). The system will detect fillable fields.
            </p>
          </div>
        )}

        {renderPreview()}

        {(file || isEdit) && !converted && (
          <button
            className="btn btn-primary"
            onClick={handleConvert}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? '⏳ Analyzing Form...' : '🔍 Convert – Detect Fields'}
          </button>
        )}
      </div>

      {/* Field Editor */}
      {converted && fields.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ color: '#166534', fontSize: '1.1rem', marginBottom: '0.25rem' }}>🏷️ Form Fields ({fields.length})</h2>
              <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                Map each field to a data element from the site, or mark as "Form-Specific" for fields unique to this form.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handleAddField}>+ Add Field</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {saved ? '✓ Saved' : '💾 Save Fields'}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, borderBottom: '2px solid #d1d5db' }}>#</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, borderBottom: '2px solid #d1d5db' }}>Field Label</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, borderBottom: '2px solid #d1d5db' }}>Type</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, borderBottom: '2px solid #d1d5db', minWidth: 220 }}>Data Mapping</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, borderBottom: '2px solid #d1d5db', width: 60 }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={field.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      <input
                        className="form-control"
                        value={field.label}
                        onChange={e => handleFieldChange(field.id, 'label', e.target.value)}
                        placeholder="Field label"
                        style={{ fontSize: '0.88rem', padding: '0.3rem 0.5rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      <select
                        className="form-control"
                        value={field.fieldType}
                        onChange={e => handleFieldChange(field.id, 'fieldType', e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.3rem 0.4rem' }}
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Multi-line</option>
                        <option value="date">Date</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="number">Number</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      <select
                        className="form-control"
                        value={field.mapping}
                        onChange={e => handleFieldChange(field.id, 'mapping', e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.3rem 0.4rem' }}
                      >
                        <option value="">— Select data element —</option>
                        <option value="_form_specific">⚡ Form-Specific (manual entry)</option>
                        <optgroup label="Generator/Customer">
                          {DATA_ELEMENTS.filter(d => d.source === 'customer').map(d => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Profile/Waste">
                          {DATA_ELEMENTS.filter(d => d.source === 'profile').map(d => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Determination">
                          {DATA_ELEMENTS.filter(d => d.source === 'determination').map(d => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Manifest/Shipping">
                          {DATA_ELEMENTS.filter(d => d.source === 'manifest').map(d => (
                            <option key={d.key} value={d.key}>{d.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveField(field.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                        title="Remove field"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? '✓ Saved' : '💾 Save Fields'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/forms')}>Back to Form List</button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!converted && !isEdit && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
          <h3 style={{ color: '#166534', fontSize: '1rem', marginBottom: '0.5rem' }}>How It Works</h3>
          <ol style={{ color: '#374151', fontSize: '0.9rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li><strong>Upload</strong> a PDF or image of a paper form (e.g. a manifest, LDR form, or any regulatory form).</li>
            <li>Click <strong>Convert</strong> to detect fillable blanks on the form.</li>
            <li><strong>Map</strong> each detected field to a data element from the site (generator name, waste codes, etc.).</li>
            <li>For fields not in the system, mark them as <strong>Form-Specific</strong> — users will fill these during export.</li>
            <li>On the <strong>Review</strong> page, select a profile and export to any imported form. Data auto-populates and outputs as a filled PDF.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
