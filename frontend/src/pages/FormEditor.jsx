import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, createForm, updateForm, detectFormFields, DATA_ELEMENTS } from '../lib/formStore'

/**
 * Resolve a field's mapping to the display name of the WasteID data element.
 */
function getMappingDisplayName(mapping) {
  if (!mapping || mapping === '_form_specific') return ''
  const element = DATA_ELEMENTS.find(d => d.key === mapping)
  return element ? `{${element.label}}` : `{${mapping}}`
}

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
  const [showPreview, setShowPreview] = useState(false)
  const [placementMode, setPlacementMode] = useState(false)
  const [placingField, setPlacingField] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragCurrent, setDragCurrent] = useState(null)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const imageContainerRef = useRef(null)

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

  // --- Interactive Click-to-Place Field Logic ---
  const getRelativePosition = useCallback((e) => {
    if (!imageContainerRef.current) return null
    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }, [])

  const handleImageMouseDown = (e) => {
    if (!placementMode) return
    e.preventDefault()
    const pos = getRelativePosition(e)
    if (pos) {
      setDragStart(pos)
      setDragCurrent(pos)
    }
  }

  const handleImageMouseMove = (e) => {
    if (!placementMode || !dragStart) return
    e.preventDefault()
    const pos = getRelativePosition(e)
    if (pos) setDragCurrent(pos)
  }

  const handleImageMouseUp = (e) => {
    if (!placementMode || !dragStart) return
    e.preventDefault()
    const pos = getRelativePosition(e)
    if (!pos) { setDragStart(null); setDragCurrent(null); return }

    const x = Math.min(dragStart.x, pos.x)
    const y = Math.min(dragStart.y, pos.y)
    const width = Math.abs(pos.x - dragStart.x)
    const height = Math.abs(pos.y - dragStart.y)

    // Minimum size threshold to avoid accidental clicks
    if (width < 1 && height < 1) {
      setDragStart(null)
      setDragCurrent(null)
      return
    }

    const maxId = fields.length > 0 ? Math.max(...fields.map(f => f.id)) : 0
    const newField = {
      id: maxId + 1,
      label: '',
      fieldType: 'text',
      mapping: '',
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.max(2, Math.round(width * 10) / 10),
      height: Math.max(1.5, Math.round(height * 10) / 10),
    }

    setFields(prev => [...prev, newField])
    setPlacingField(newField)
    setSelectedFieldId(newField.id)
    setDragStart(null)
    setDragCurrent(null)
    setSaved(false)
  }

  const handlePlacingFieldDone = () => {
    setPlacingField(null)
  }

  const togglePlacementMode = () => {
    setPlacementMode(!placementMode)
    setPlacingField(null)
    setDragStart(null)
    setDragCurrent(null)
  }

  const renderFormImageWithOverlay = () => {
    if (!filePreview) return null
    // Only allow data: URLs for security
    if (!filePreview.startsWith('data:')) return null
    const isImage = filePreview.startsWith('data:image')
    const isPdf = filePreview.startsWith('data:application/pdf')

    if (!isImage && !isPdf) return null

    // Calculate drag rectangle
    let dragRect = null
    if (dragStart && dragCurrent) {
      dragRect = {
        left: `${Math.min(dragStart.x, dragCurrent.x)}%`,
        top: `${Math.min(dragStart.y, dragCurrent.y)}%`,
        width: `${Math.abs(dragCurrent.x - dragStart.x)}%`,
        height: `${Math.abs(dragCurrent.y - dragStart.y)}%`,
      }
    }

    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ color: '#166534', fontSize: '1rem', margin: 0 }}>
            {placementMode ? '🎯 Click & Drag on the Form to Place Fields' : '📋 Form Document'}
          </h3>
          {converted && (
            <button
              className={placementMode ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={togglePlacementMode}
              style={{ fontSize: '0.85rem' }}
            >
              {placementMode ? '✕ Exit Placement Mode' : '🖱️ Click to Place Fields'}
            </button>
          )}
        </div>

        {placementMode && (
          <div style={{
            background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6,
            padding: '0.6rem 1rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#92400e',
          }}>
            <strong>Placement Mode Active:</strong> Click and drag on the form image to draw a rectangle where a field should be.
            Each rectangle you draw will create a new field entry. After placing, set the label, type, and data mapping for each field.
            <br /><em>Tip: For checkboxes, draw small squares. For text fields, draw wider rectangles.</em>
          </div>
        )}

        <div
          ref={imageContainerRef}
          style={{
            position: 'relative',
            border: placementMode ? '3px solid #f59e0b' : '1px solid #d1d5db',
            borderRadius: 8,
            overflow: 'hidden',
            cursor: placementMode ? 'crosshair' : 'default',
            userSelect: 'none',
          }}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={() => { if (dragStart) { setDragStart(null); setDragCurrent(null) } }}
        >
          {isImage ? (
            <img src={filePreview} alt="Form" style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
          ) : (
            <embed src={filePreview} type="application/pdf" width="100%" height="600px" style={{ pointerEvents: placementMode ? 'none' : 'auto' }} />
          )}

          {/* Overlay existing fields */}
          {converted && fields.map(field => {
            if (field.fieldType === 'section_header') return null
            const isSelected = field.id === selectedFieldId
            const isCheckbox = field.fieldType === 'checkbox'
            return (
              <div
                key={field.id}
                onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id) }}
                style={{
                  position: 'absolute',
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                  border: isSelected ? '2px solid #2563eb' : (isCheckbox ? '2px solid #7c3aed' : '1.5px solid #16a34a'),
                  background: isSelected ? 'rgba(37, 99, 235, 0.15)' : (isCheckbox ? 'rgba(124, 58, 237, 0.1)' : 'rgba(22, 163, 98, 0.08)'),
                  borderRadius: isCheckbox ? 2 : 3,
                  pointerEvents: placementMode ? 'none' : 'auto',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  color: isSelected ? '#1d4ed8' : '#166534',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  padding: '0 2px',
                }}
                title={`${field.label || 'Unnamed'} (${field.fieldType})`}
              >
                {field.width > 5 ? (field.label || `Field ${field.id}`) : ''}
              </div>
            )
          })}

          {/* Drag rectangle while placing */}
          {dragRect && (
            <div style={{
              position: 'absolute',
              ...dragRect,
              border: '2px dashed #f59e0b',
              background: 'rgba(245, 158, 11, 0.2)',
              borderRadius: 3,
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
    )
  }

  // --- Inline field editor for the most recently placed field ---
  const renderPlacingFieldEditor = () => {
    if (!placingField) return null
    const field = fields.find(f => f.id === placingField.id)
    if (!field) return null

    return (
      <div style={{
        marginTop: '1rem', background: '#fffbeb', border: '1px solid #f59e0b',
        borderRadius: 8, padding: '1rem',
      }}>
        <h4 style={{ color: '#92400e', margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
          🏷️ Define Placed Field (#{field.id})
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: '0.82rem', display: 'block', marginBottom: '0.2rem' }}>Label</label>
            <input
              className="form-control"
              value={field.label}
              onChange={e => handleFieldChange(field.id, 'label', e.target.value)}
              placeholder="e.g. Generator Name"
              style={{ fontSize: '0.85rem' }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: '0.82rem', display: 'block', marginBottom: '0.2rem' }}>Field Type</label>
            <select
              className="form-control"
              value={field.fieldType}
              onChange={e => handleFieldChange(field.id, 'fieldType', e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="text">Text</option>
              <option value="textarea">Multi-line</option>
              <option value="date">Date</option>
              <option value="checkbox">Checkbox</option>
              <option value="number">Number</option>
              <option value="section_header">Section Header</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: '0.82rem', display: 'block', marginBottom: '0.2rem' }}>Data Mapping</label>
            <select
              className="form-control"
              value={field.mapping}
              onChange={e => handleFieldChange(field.id, 'mapping', e.target.value)}
              style={{ fontSize: '0.85rem' }}
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
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handlePlacingFieldDone} style={{ fontSize: '0.85rem' }}>
            ✓ Done – Place Another
          </button>
          <button className="btn btn-danger" onClick={() => { handleRemoveField(placingField.id); setPlacingField(null) }} style={{ fontSize: '0.85rem' }}>
            × Remove This Field
          </button>
        </div>
      </div>
    )
  }

  const renderPreview = () => {
    if (!filePreview) return null
    // Only allow data: URLs for security
    if (!filePreview.startsWith('data:')) return null
    const isImage = filePreview.startsWith('data:image')
    if (!isImage && !filePreview.startsWith('data:application/pdf')) return null

    // If converted, show the interactive overlay version
    if (converted) return null

    // Before conversion, just show a simple preview
    if (isImage) {
      return (
        <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', maxHeight: 400 }}>
          <img src={filePreview} alt="Form preview" style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
        </div>
      )
    }
    return (
      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
        <embed src={filePreview} type="application/pdf" width="100%" height="400px" />
      </div>
    )
  }

  // --- Visual Form Preview: shows original form with field data overlaid ---
  const renderOutputPreview = () => {
    if (!showPreview) return null

    return (
      <div style={{ marginTop: '1.5rem', border: '2px solid #86efac', borderRadius: 8, padding: '1.25rem', background: '#f0fdf4' }}>
        <h3 style={{ color: '#166534', fontSize: '1rem', marginBottom: '0.25rem' }}>📋 Form Output Preview</h3>
        <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1rem' }}>
          This preview shows what the form output will look like. The original form is displayed with WasteID data element names shown where data will be populated.
        </p>

        {/* Visual preview with form image background */}
        {filePreview && filePreview.startsWith('data:image') && (
          <div style={{ position: 'relative', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden', marginBottom: '1rem' }}>
            <img src={filePreview} alt="Form background" style={{ width: '100%', display: 'block', opacity: 0.85 }} />
            {/* Overlay fields with their mapped values */}
            {fields.map(field => {
              if (field.fieldType === 'section_header') return null
              const isCheckbox = field.fieldType === 'checkbox'
              const mappingDisplay = field.mapping === '_form_specific'
                ? '[Manual]'
                : field.mapping
                  ? getMappingDisplayName(field.mapping)
                  : '[Unmapped]'
              const color = field.mapping && field.mapping !== '_form_specific' ? '#1d4ed8' : field.mapping === '_form_specific' ? '#b45309' : '#dc2626'

              return (
                <div
                  key={field.id}
                  style={{
                    position: 'absolute',
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: `1.5px solid ${color}`,
                    borderRadius: isCheckbox ? 2 : 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCheckbox ? 'center' : 'flex-start',
                    padding: '0 3px',
                    fontSize: isCheckbox ? '0.6rem' : '0.55rem',
                    color: color,
                    fontWeight: 600,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    fontFamily: 'monospace',
                  }}
                  title={`${field.label}: ${mappingDisplay}`}
                >
                  {isCheckbox ? (field.mapping ? '☑' : '☐') : mappingDisplay}
                </div>
              )
            })}
          </div>
        )}

        {/* Text-based field list preview */}
        <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {fields.map((field) => {
            if (field.fieldType === 'section_header') {
              return (
                <div key={field.id} style={{ borderBottom: '2px solid #166534', marginTop: '1rem', marginBottom: '0.5rem', paddingBottom: '0.25rem' }}>
                  <strong style={{ color: '#166534', fontSize: '0.95rem' }}>{field.label}</strong>
                </div>
              )
            }
            const isCheckbox = field.fieldType === 'checkbox'
            const mappingDisplay = field.mapping === '_form_specific'
              ? '[Manual Entry]'
              : field.mapping
                ? getMappingDisplayName(field.mapping)
                : '[Unmapped]'
            return (
              <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', borderBottom: '1px dashed #e5e7eb' }}>
                <span style={{ color: '#374151' }}>
                  {isCheckbox ? '☐ ' : ''}{field.label}:
                </span>
                <span style={{
                  color: field.mapping && field.mapping !== '_form_specific' ? '#1d4ed8' : field.mapping === '_form_specific' ? '#b45309' : '#dc2626',
                  fontWeight: 500,
                }}>
                  {isCheckbox && field.mapping && field.mapping !== '_form_specific' ? `☑ ${mappingDisplay}` : mappingDisplay}
                </span>
              </div>
            )
          })}
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
          🔵 Blue = WasteID auto-populated data &nbsp;|&nbsp; 🟠 Orange = Manual entry required &nbsp;|&nbsp; 🔴 Red = Not yet mapped &nbsp;|&nbsp; ☑ = Checkbox checked by system
        </p>
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

      {/* Interactive Form Image with Field Overlays */}
      {converted && renderFormImageWithOverlay()}
      {placingField && renderPlacingFieldEditor()}

      {/* Field Editor Table */}
      {converted && fields.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ color: '#166534', fontSize: '1.1rem', marginBottom: '0.25rem' }}>🏷️ Form Fields ({fields.length})</h2>
              <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                Map each field to a data element from the site, or mark as "Form-Specific" for fields unique to this form.
                Use <strong>"Click to Place Fields"</strong> above to visually add any fields the auto-detection missed (especially checkboxes).
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
                  <tr key={field.id} style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: field.id === selectedFieldId ? '#dbeafe' : field.fieldType === 'section_header' ? '#f0fdf4' : field.fieldType === 'checkbox' ? '#faf5ff' : undefined,
                  }}
                  onClick={() => setSelectedFieldId(field.id)}
                  >
                    <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      {field.fieldType === 'section_header' ? (
                        <input
                          className="form-control"
                          value={field.label}
                          onChange={e => handleFieldChange(field.id, 'label', e.target.value)}
                          placeholder="Section header"
                          style={{ fontSize: '0.88rem', padding: '0.3rem 0.5rem', fontWeight: 700, color: '#166534' }}
                        />
                      ) : (
                        <input
                          className="form-control"
                          value={field.label}
                          onChange={e => handleFieldChange(field.id, 'label', e.target.value)}
                          placeholder="Field label"
                          style={{ fontSize: '0.88rem', padding: '0.3rem 0.5rem' }}
                        />
                      )}
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
                        <option value="section_header">Section Header</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem' }}>
                      {field.fieldType === 'section_header' ? (
                        <span style={{ fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic' }}>— Section Header (no mapping) —</span>
                      ) : (
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
                      )}
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveField(field.id) }}
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
            <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? '🔽 Hide Preview' : '👁️ Preview Output'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/forms')}>Back to Form List</button>
          </div>

          {/* Output Preview Panel */}
          {renderOutputPreview()}
        </div>
      )}

      {/* Instructions */}
      {!converted && !isEdit && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
          <h3 style={{ color: '#166534', fontSize: '1rem', marginBottom: '0.5rem' }}>How It Works</h3>
          <ol style={{ color: '#374151', fontSize: '0.9rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li><strong>Upload</strong> a PDF or image of a paper form (e.g. a manifest, LDR form, or any regulatory form).</li>
            <li>Click <strong>Convert</strong> to auto-detect fillable fields (text blanks, checkboxes, signature areas, etc.).</li>
            <li><strong>Review</strong> the detected fields. The system captures text fields, checkboxes, dates, and more.</li>
            <li>Use <strong>"Click to Place Fields"</strong> mode to visually click on any areas of the form that were missed — particularly useful for checkboxes and small entry areas.</li>
            <li><strong>Map</strong> each detected field to a data element from the site (generator name, waste codes, characteristics, etc.).</li>
            <li>For fields not in the system, mark them as <strong>Form-Specific</strong> — users will fill these during export.</li>
            <li>On the <strong>Review</strong> page, select a profile and export to any imported form. Data auto-populates and outputs as a filled PDF.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
