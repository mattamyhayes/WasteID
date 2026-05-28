import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mixtures } from '../api/client'
import OutputFormPreview from '../components/OutputFormPreview'
import { listForms, getForm, populateFormFields } from '../lib/formStore'
import { jsPDF } from 'jspdf'

export default function OutputFormVisualization() {
  const [searchParams] = useSearchParams()
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState(searchParams.get('profile') || '')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await mixtures.list()
        const all = res.data.results || res.data
        setProfiles(all)
        if (selectedProfileId) {
          const found = all.find(m => String(m.id) === selectedProfileId)
          setSelectedProfile(found || null)
        }
      } catch {
        // If API fails, allow form-only preview with empty profile
        setProfiles([])
      } finally {
        setLoading(false)
      }
    }
    loadProfiles()
  }, [selectedProfileId])

  const handleProfileChange = (id) => {
    setSelectedProfileId(id)
    if (!id) {
      setSelectedProfile(null)
      return
    }
    const found = profiles.find(m => String(m.id) === id)
    setSelectedProfile(found || null)
  }

  const handleExport = ({ formId, filledFields }) => {
    const form = getForm(formId)
    if (!form) return

    const doc = new jsPDF('p', 'mm', 'letter')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Draw form background if available
    if (form.file_data && form.file_data.startsWith('data:image')) {
      try {
        doc.addImage(form.file_data, 'JPEG', 0, 0, pageWidth, pageHeight)
      } catch {
        drawFormStructure(doc, form, pageWidth, pageHeight)
      }
    } else {
      drawFormStructure(doc, form, pageWidth, pageHeight)
    }

    // Overlay field values
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 150)

    filledFields.forEach(field => {
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
      const xMm = (field.x / 100) * pageWidth
      const yMm = (field.y / 100) * pageHeight

      if (field.fieldType === 'checkbox') {
        const isChecked = field.value && field.value.toLowerCase() !== 'no' && field.value !== '0' && field.value !== 'false'
        if (isChecked) {
          const boxSize = Math.min((field.width / 100) * pageWidth, (field.height / 100) * pageHeight, 4)
          doc.setDrawColor(0, 0, 150)
          doc.setLineWidth(0.4)
          doc.rect(xMm + 0.5, yMm + 0.5, boxSize, boxSize)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(boxSize * 2.5)
          doc.text('✓', xMm + 0.8, yMm + boxSize)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
        }
        return
      }

      const text = String(field.value)
      if (field.fieldType === 'textarea') {
        const lines = doc.splitTextToSize(text, (field.width / 100) * pageWidth)
        doc.text(lines, xMm + 1, yMm + 3)
      } else {
        doc.text(text, xMm + 1, yMm + 3)
      }
    })

    // Footer
    const footerText = `Electronic form created by www.waste-id.com`
    doc.setFontSize(7)
    doc.setTextColor(90, 90, 90)
    doc.text(footerText, pageWidth / 2, pageHeight - 5, { align: 'center' })

    const filename = `${form.name.replace(/[^a-zA-Z0-9]/g, '_')}_preview.pdf`
    doc.save(filename)
  }

  if (loading) {
    return <div className="container" style={{ padding: '3rem' }}>Loading…</div>
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 1400 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>📋 Output Form Visualization</h1>
        <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>
          Preview how form templates will look when populated with profile data. Select a profile and form template to see a live preview.
        </p>
      </div>

      {/* Profile Selector */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
            Waste Profile
          </label>
          <select
            className="form-control"
            value={selectedProfileId}
            onChange={e => handleProfileChange(e.target.value)}
          >
            <option value="">— Select a waste profile —</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.customer_name ? `${p.customer_name} — ` : ''}{p.name} (ID: {p.id})
              </option>
            ))}
          </select>
          {profiles.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '0.4rem' }}>
              No profiles available. Create a waste profile first, or preview form layout without data.
            </p>
          )}
        </div>
      </div>

      {/* Form Preview */}
      <OutputFormPreview
        profile={selectedProfile || {}}
        formId={searchParams.get('form') ? Number(searchParams.get('form')) : undefined}
        onExport={handleExport}
      />
    </div>
  )
}

function drawFormStructure(doc, form, pageWidth, pageHeight) {
  doc.setFillColor(240, 253, 244)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setDrawColor(20, 83, 45)
  doc.setLineWidth(0.5)
  doc.line(0, 20, pageWidth, 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 83, 45)
  doc.text(form.name, pageWidth / 2, 12, { align: 'center' })

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
      doc.rect(x, y, w, h)
      doc.text(field.label, x + 0.5, y - 0.5)
    }
  })
}
