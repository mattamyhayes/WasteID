import { useState, useEffect, useRef } from 'react'
import { listForms, getForm, populateFormFields, getUnmappedFields } from '../lib/formStore'

/**
 * OutputFormPreview - Renders an interactive visual preview of a filled form template.
 * Shows how form fields will appear with populated data before PDF export.
 *
 * Props:
 *   profile   - The mixture/profile object with all data
 *   formId    - Optional: pre-select a specific form template
 *   onExport  - Optional: callback when user clicks export (receives { formId, filledFields })
 */
export default function OutputFormPreview({ profile, formId: initialFormId, onExport }) {
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState(initialFormId || '')
  const [selectedForm, setSelectedForm] = useState(null)
  const [filledFields, setFilledFields] = useState([])
  const [unmappedFields, setUnmappedFields] = useState([])
  const [extraData, setExtraData] = useState({})
  const [zoom, setZoom] = useState(100)
  const previewRef = useRef(null)

  useEffect(() => {
    setForms(listForms())
  }, [])

  useEffect(() => {
    if (initialFormId) {
      handleFormSelect(String(initialFormId))
    }
  }, [initialFormId])

  const handleFormSelect = (formId) => {
    setSelectedFormId(formId)
    if (!formId) {
      setSelectedForm(null)
      setFilledFields([])
      setUnmappedFields([])
      return
    }
    const form = getForm(Number(formId))
    setSelectedForm(form)
    if (form) {
      const unmapped = getUnmappedFields(form, profile)
      setUnmappedFields(unmapped)
      const filled = populateFormFields(profile, form, extraData)
      setFilledFields(filled)
    }
  }

  useEffect(() => {
    if (selectedForm) {
      const filled = populateFormFields(profile, selectedForm, extraData)
      setFilledFields(filled)
    }
  }, [extraData, profile, selectedForm])

  const handleExtraChange = (fieldId, value) => {
    setExtraData(prev => ({ ...prev, [fieldId]: value }))
  }

  const getFieldColor = (field) => {
    if (field.fieldType === 'section_header') return { bg: '#f0fdf4', border: '#166534', text: '#14532d' }
    if (field.value) return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }
    return { bg: '#fef2f2', border: '#fca5a5', text: '#9ca3af' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 250px' }}>
          <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.25rem', display: 'block' }}>
            Form Template
          </label>
          <select
            className="form-control"
            value={selectedFormId}
            onChange={e => handleFormSelect(e.target.value)}
          >
            <option value="">— Select a form —</option>
            {forms.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.fields.length} fields)</option>
            ))}
          </select>
        </div>

        {selectedForm && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                onClick={() => setZoom(z => Math.max(50, z - 10))}
              >−</button>
              <span style={{ fontSize: '0.82rem', color: '#6b7280', minWidth: 40, textAlign: 'center' }}>
                {zoom}%
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                onClick={() => setZoom(z => Math.min(150, z + 10))}
              >+</button>
            </div>
            {onExport && (
              <button
                className="btn btn-primary"
                onClick={() => onExport({ formId: selectedForm.id, filledFields })}
              >
                📄 Export PDF
              </button>
            )}
          </>
        )}
      </div>

      {forms.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No form templates available.</p>
          <p style={{ fontSize: '0.88rem' }}>Import form templates in the Form Manager to preview output.</p>
        </div>
      )}

      {selectedForm && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem', alignItems: 'start' }}>
          {/* Form Preview Canvas */}
          <div
            className="card"
            style={{ padding: '0', overflow: 'auto', position: 'relative', minHeight: 400 }}
            ref={previewRef}
          >
            <div style={{
              position: 'relative',
              width: `${(8.5 * 96 * zoom) / 100}px`,
              height: `${(11 * 96 * zoom) / 100}px`,
              background: '#ffffff',
              margin: '1rem auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              border: '1px solid #e5e7eb',
              transform: `scale(1)`,
              transformOrigin: 'top center',
            }}>
              {/* Form background image */}
              {selectedForm.file_data && selectedForm.file_data.startsWith('data:image') && (
                <img
                  src={selectedForm.file_data}
                  alt="Form background"
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    objectFit: 'fill', opacity: 0.3,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Form title overlay */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                background: 'linear-gradient(180deg, rgba(240,253,244,0.95) 0%, rgba(240,253,244,0) 100%)',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #dcfce7',
              }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#14532d' }}>
                  {selectedForm.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  {selectedForm.file_name} · {filledFields.length} fields
                </div>
              </div>

              {/* Rendered fields */}
              {filledFields.map((field) => {
                const colors = getFieldColor(field)
                const style = {
                  position: 'absolute',
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                  background: colors.bg,
                  border: `1.5px solid ${colors.border}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '2px 4px',
                  boxSizing: 'border-box',
                }

                if (field.fieldType === 'section_header') {
                  return (
                    <div key={field.id} style={{ ...style, justifyContent: 'flex-end', borderWidth: '0 0 2px 0' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.text }}>
                        {field.label}
                      </span>
                    </div>
                  )
                }

                if (field.fieldType === 'checkbox') {
                  const isChecked = field.value && field.value.toLowerCase() !== 'no' && field.value !== '0' && field.value !== 'false'
                  return (
                    <div key={field.id} style={{ ...style, alignItems: 'center', flexDirection: 'row', gap: 3 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 14, height: 14, border: `1.5px solid ${colors.border}`,
                        borderRadius: 2, fontSize: '0.7rem', fontWeight: 700,
                        background: isChecked ? colors.border : '#fff',
                        color: isChecked ? '#fff' : 'transparent',
                      }}>✓</span>
                      <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>{field.label}</span>
                    </div>
                  )
                }

                return (
                  <div key={field.id} style={style} title={`${field.label}: ${field.value || '(empty)'}`}>
                    <span style={{ fontSize: '0.55rem', color: '#6b7280', lineHeight: 1, marginBottom: 1 }}>
                      {field.label}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, color: colors.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {field.value || '—'}
                    </span>
                  </div>
                )
              })}

              {/* Footer */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '0.4rem 0.75rem',
                background: 'rgba(255,255,255,0.9)',
                borderTop: '1px solid #e5e7eb',
                fontSize: '0.65rem', color: '#9ca3af', textAlign: 'center',
              }}>
                Electronic form created by www.waste-id.com
              </div>
            </div>
          </div>

          {/* Sidebar: Legend + Unmapped Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Legend */}
            <div className="card" style={{ padding: '1rem' }}>
              <h4 style={{ color: '#14532d', fontSize: '0.88rem', marginBottom: '0.75rem' }}>Field Legend</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: '#eff6ff', border: '1.5px solid #3b82f6' }}></span>
                  <span style={{ fontSize: '0.8rem', color: '#374151' }}>Populated</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: '#fef2f2', border: '1.5px solid #fca5a5' }}></span>
                  <span style={{ fontSize: '0.8rem', color: '#374151' }}>Empty / Needs Input</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: '#f0fdf4', border: '1.5px solid #166534' }}></span>
                  <span style={{ fontSize: '0.8rem', color: '#374151' }}>Section Header</span>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  <strong>{filledFields.filter(f => f.value && f.fieldType !== 'section_header').length}</strong> of{' '}
                  <strong>{filledFields.filter(f => f.fieldType !== 'section_header').length}</strong> fields populated
                </div>
              </div>
            </div>

            {/* Unmapped Fields Form */}
            {unmappedFields.length > 0 && (
              <div className="card" style={{ padding: '1rem' }}>
                <h4 style={{ color: '#166534', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                  Fill Missing Fields ({unmappedFields.length})
                </h4>
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {unmappedFields.map(field => (
                    <div key={field.id} style={{ marginBottom: '0.6rem' }}>
                      <label style={{ fontWeight: 500, fontSize: '0.78rem', display: 'block', marginBottom: '0.15rem', color: '#374151' }}>
                        {field.label}
                      </label>
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          className="form-control"
                          value={extraData[field.id] || ''}
                          onChange={e => handleExtraChange(field.id, e.target.value)}
                          rows={2}
                          style={{ fontSize: '0.82rem' }}
                        />
                      ) : (
                        <input
                          className="form-control"
                          type={field.fieldType === 'date' ? 'date' : field.fieldType === 'number' ? 'number' : 'text'}
                          value={extraData[field.id] || ''}
                          onChange={e => handleExtraChange(field.id, e.target.value)}
                          style={{ fontSize: '0.82rem' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
