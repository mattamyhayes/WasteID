import { useState, useEffect } from 'react'
import { listForms, getForm, populateFormFields, getUnmappedFields } from '../lib/formStore'
import { jsPDF } from 'jspdf'

const EXPORT_FOOTER_HEIGHT_MM = 8

/**
 * ExportFormModal - Allows user to select a form template, fill missing fields,
 * and export a PDF that looks like the original form with data populated.
 *
 * Props:
 *   profile - The mixture/profile object with all data
 *   onClose - Callback to close the modal
 */
export default function ExportFormModal({ profile, onClose }) {
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [selectedForm, setSelectedForm] = useState(null)
  const [unmappedFields, setUnmappedFields] = useState([])
  const [extraData, setExtraData] = useState({})
  const [step, setStep] = useState('select') // 'select' | 'fill' | 'exporting'
  const [error, setError] = useState('')

  useEffect(() => {
    const allForms = listForms()
    setForms(allForms)
  }, [])

  const handleFormSelect = (formId) => {
    setSelectedFormId(formId)
    if (!formId) {
      setSelectedForm(null)
      setUnmappedFields([])
      return
    }
    const form = getForm(Number(formId))
    setSelectedForm(form)
    if (form) {
      const unmapped = getUnmappedFields(form, profile)
      setUnmappedFields(unmapped)
      setExtraData({})
      if (unmapped.length > 0) {
        setStep('fill')
      }
    }
  }

  const handleExtraChange = (fieldId, value) => {
    setExtraData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleExport = () => {
    if (!selectedForm) return
    setStep('exporting')
    setError('')

    try {
      const filledFields = populateFormFields(profile, selectedForm, extraData)

      // Generate PDF that replicates the form with filled data
      const doc = new jsPDF('p', 'mm', 'letter')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // If the original form is an image, draw it as background
      if (selectedForm.file_data && selectedForm.file_data.startsWith('data:image')) {
        try {
          doc.addImage(selectedForm.file_data, 'JPEG', 0, 0, pageWidth, pageHeight)
        } catch {
          // If image can't be added, draw form structure instead
          drawFormStructure(doc, selectedForm, pageWidth, pageHeight)
        }
      } else {
        // For PDFs or when image fails, draw a structured form
        drawFormStructure(doc, selectedForm, pageWidth, pageHeight)
      }

      // Overlay field values on top of the form
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 150)

      filledFields.forEach(field => {
        // Section headers are rendered as bold labels, not as data fields
        if (field.fieldType === 'section_header') {
          const xMm = (field.x / 100) * pageWidth
          const yMm = (field.y / 100) * pageHeight
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(11)
          doc.setTextColor(20, 83, 45)
          doc.text(field.label, xMm + 1, yMm + 3)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(0, 0, 150)
          return
        }
        if (!field.value) return
        // Convert percentage-based positions to mm
        const xMm = (field.x / 100) * pageWidth
        const yMm = (field.y / 100) * pageHeight
        const text = String(field.value)

        if (field.fieldType === 'textarea') {
          const lines = doc.splitTextToSize(text, (field.width / 100) * pageWidth)
          doc.text(lines, xMm + 1, yMm + 3)
        } else {
          doc.text(text, xMm + 1, yMm + 3)
        }
      })

      addMirroredFormFooter(doc, pageWidth, pageHeight, profile)

      // Save the PDF
      const filename = `${selectedForm.name.replace(/[^a-zA-Z0-9]/g, '_')}_${profile.transaction_id || profile.name || 'export'}.pdf`
      doc.save(filename)

      onClose()
    } catch (err) {
      setError('Failed to generate PDF: ' + (err.message || 'Unknown error'))
      setStep('fill')
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div className="card" style={{
        maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto',
        position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: '#14532d', margin: 0 }}>📤 Export to Form</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#6b7280', cursor: 'pointer' }}>×</button>
        </div>

        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Select an imported form template. Profile data will auto-populate mapped fields. You'll be prompted for any unmapped fields.
        </p>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Step 1: Select Form */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Form Template</label>
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
          {forms.length === 0 && (
            <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              No form templates available. Go to Admin → Form Manager to import forms first.
            </p>
          )}
        </div>

        {/* Step 2: Fill unmapped fields */}
        {step === 'fill' && selectedForm && unmappedFields.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <h3 style={{ color: '#166534', fontSize: '1rem', marginBottom: '0.5rem' }}>
              Additional Information Needed ({unmappedFields.length} fields)
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1rem' }}>
              These fields are not mapped to profile data or don't have values. Please fill them in.
            </p>
            {unmappedFields.map(field => (
              <div key={field.id} className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.88rem', display: 'block', marginBottom: '0.2rem' }}>
                  {field.label}
                  {field.mapping === '_form_specific' && (
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>(form-specific)</span>
                  )}
                </label>
                {field.fieldType === 'textarea' ? (
                  <textarea
                    className="form-control"
                    value={extraData[field.id] || ''}
                    onChange={e => handleExtraChange(field.id, e.target.value)}
                    rows={2}
                    style={{ fontSize: '0.88rem' }}
                  />
                ) : (
                  <input
                    className="form-control"
                    type={field.fieldType === 'date' ? 'date' : field.fieldType === 'number' ? 'number' : 'text'}
                    value={extraData[field.id] || ''}
                    onChange={e => handleExtraChange(field.id, e.target.value)}
                    style={{ fontSize: '0.88rem' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Export button */}
        {selectedForm && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={step === 'exporting'}
            >
              {step === 'exporting' ? '⏳ Generating PDF...' : '📄 Export PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Draw a structured form layout when the original image can't be used as background.
 * This creates a form that visually resembles the original paper form.
 */
function drawFormStructure(doc, form, pageWidth, pageHeight) {
  // Draw a form-like header
  doc.setFillColor(240, 253, 244)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setDrawColor(20, 83, 45)
  doc.setLineWidth(0.5)
  doc.line(0, 20, pageWidth, 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 83, 45)
  doc.text(form.name, pageWidth / 2, 12, { align: 'center' })

  // Draw field boxes
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)

  const fields = form.fields || []
  fields.forEach(field => {
    const x = (field.x / 100) * pageWidth
    const y = (field.y / 100) * pageHeight
    const w = (field.width / 100) * pageWidth
    const h = (field.height / 100) * pageHeight

    if (field.fieldType === 'section_header') {
      // Draw section header as bold text with underline
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(20, 83, 45)
      doc.text(field.label, x + 0.5, y + 2.5)
      doc.setDrawColor(20, 83, 45)
      doc.setLineWidth(0.4)
      doc.line(x, y + h, x + w, y + h)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
    } else {
      // Draw field box
      doc.rect(x, y, w, h)
      // Draw field label above the box
      doc.text(field.label, x + 0.5, y - 0.5)
    }
  })

  // Footer
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated from template: ${form.file_name}`, 5, pageHeight - 5)
}

function getContentProducerName(profile) {
  const determinations = Array.isArray(profile?.determinations) ? profile.determinations : []
  const latestDetermination = determinations[determinations.length - 1]
  return latestDetermination?.reviewer_name?.trim()
    || profile?.customer_contact?.trim()
    || profile?.contact_name?.trim()
    || profile?.customer_name?.trim()
    || profile?.name?.trim()
    || 'Unknown'
}

function addMirroredFormFooter(doc, pageWidth, pageHeight, profile) {
  const footerText = `Electronic form created by www.waste-id.com, content produced by ${getContentProducerName(profile)}`
  const footerY = pageHeight - EXPORT_FOOTER_HEIGHT_MM
  const footerLines = doc.splitTextToSize(footerText, pageWidth - 12)

  doc.setFillColor(255, 255, 255)
  doc.rect(0, footerY, pageWidth, EXPORT_FOOTER_HEIGHT_MM, 'F')

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.2)
  doc.line(0, footerY, pageWidth, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(90, 90, 90)
  doc.text(footerLines, pageWidth / 2, footerY + 3.1, { align: 'center', baseline: 'middle' })
}
