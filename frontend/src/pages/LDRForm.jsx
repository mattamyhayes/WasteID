import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mixtures as mixturesApi } from '../api/client'
import { jsPDF } from 'jspdf'

/**
 * Land Disposal Restrictions (LDR) Notification Form
 * Based on 40 CFR Part 268 — Generator must provide a one-time notification
 * to the TSDF with each shipment of hazardous waste subject to LDR.
 *
 * This form auto-populates from the selected profile's determination data
 * and asks the user to verify correctness before export.
 */

// Treatment standard subcategories per 40 CFR 268.40
const WASTE_SUBCATEGORIES = [
  { value: 'wastewater', label: 'Wastewater' },
  { value: 'nonwastewater', label: 'Nonwastewater' },
  { value: 'organic', label: 'Organic' },
  { value: 'inorganic', label: 'Inorganic' },
  { value: 'debris', label: 'Debris' },
  { value: 'soil', label: 'Contaminated Soil' },
  { value: 'lab_pack', label: 'Lab Pack' },
]

// Manifest type options
const MANIFEST_TYPES = [
  { value: 'initial', label: 'Initial Shipment' },
  { value: 'subsequent', label: 'Subsequent Shipment (same waste stream)' },
]

// LDR certification statements per 40 CFR 268.7
const CERTIFICATION_STATEMENTS = {
  meets_standards: 'I certify under penalty of law that I have personally examined and am familiar with the waste through analysis and testing or through knowledge of the waste to support this certification that the waste complies with the treatment standards specified in 40 CFR Part 268 Subpart D. I believe that the information I submitted is true, accurate, and complete. I am aware that there are significant penalties for submitting a false certification, including the possibility of a fine and imprisonment.',
  does_not_meet: 'I certify under penalty of law that I have personally examined and am familiar with the waste through analysis and testing or through knowledge of the waste to support this certification. This waste does not meet the applicable treatment standards and is being sent to a permitted treatment or storage facility. I believe that the information I submitted is true, accurate, and complete. I am aware that there are significant penalties for submitting a false certification, including the possibility of a fine and imprisonment.',
  soil: 'I certify under penalty of law that I have personally examined and am familiar with the waste through analysis and testing or through knowledge of the waste to support this certification that the contaminated soil [does/does not] contain listed hazardous waste for which the soil is subject to treatment. I believe that the information I submitted is true, accurate, and complete. I am aware that there are significant penalties for submitting a false certification, including the possibility of a fine and imprisonment.',
}

const emptyLDRForm = {
  // Generator info
  generator_name: '',
  generator_epa_id: '',
  generator_address: '',
  generator_city: '',
  generator_state: '',
  generator_zip: '',
  generator_phone: '',
  generator_contact: '',
  // TSDF info
  tsdf_name: '',
  tsdf_epa_id: '',
  tsdf_address: '',
  tsdf_city: '',
  tsdf_state: '',
  tsdf_zip: '',
  // Waste info
  waste_name: '',
  profile_number: '',
  epa_waste_codes: '',
  manifest_tracking_number: '',
  manifest_type: 'initial',
  subcategory: 'nonwastewater',
  // Treatment standards
  meets_treatment_standards: true,
  treatment_standard_description: '',
  underlying_hazardous_constituents: '',
  // Certification
  certified: false,
  certifier_name: '',
  certifier_title: '',
  certification_date: new Date().toISOString().split('T')[0],
}

export default function LDRForm() {
  const [searchParams] = useSearchParams()
  const preselectedProfileId = searchParams.get('profileId') || searchParams.get('mixtureId')
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState(preselectedProfileId || '')
  const [form, setForm] = useState({ ...emptyLDRForm })
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await mixturesApi.list()
        const all = res.data.results || res.data
        setProfiles(all)
      } catch {
        setProfiles([])
      } finally {
        setLoading(false)
      }
    }
    loadProfiles()
  }, [])

  // Filter to only profiles with hazardous waste determinations
  const hazardousProfiles = useMemo(() => {
    return profiles.filter(p => {
      const det = p.determinations?.[p.determinations.length - 1]
      return det?.is_hazardous_waste
    })
  }, [profiles])

  // Auto-populate form when profile is selected
  useEffect(() => {
    if (!selectedProfileId) return
    const profile = profiles.find(p => String(p.id) === String(selectedProfileId))
    if (!profile) return

    const det = profile.determinations?.[profile.determinations.length - 1]
    let wasteCodes = ''
    if (det) {
      try {
        const codes = det.waste_codes_list || JSON.parse(det.waste_codes || '[]')
        wasteCodes = codes.join(', ')
      } catch {
        wasteCodes = ''
      }
    }

    setForm(prev => ({
      ...prev,
      // Generator info from profile's customer data
      generator_name: profile.customer_name || '',
      generator_epa_id: profile.customer_epa_id || '',
      generator_address: profile.customer_address || '',
      generator_city: profile.customer_city || '',
      generator_state: profile.customer_state || '',
      generator_zip: profile.customer_zip || '',
      generator_phone: profile.customer_phone || '',
      generator_contact: profile.customer_contact || '',
      // Waste info from determination
      waste_name: profile.name || '',
      profile_number: profile.transaction_id || '',
      epa_waste_codes: wasteCodes,
      // Determine subcategory from physical state
      subcategory: inferSubcategory(profile),
    }))
    setVerified(false)
    setShowVerification(false)
  }, [selectedProfileId, profiles])

  function inferSubcategory(profile) {
    const state = (profile.physical_state || '').toLowerCase()
    if (state.includes('liquid') || (state.includes('waste') && state.includes('water'))) return 'wastewater'
    if (state.includes('soil')) return 'soil'
    if (state.includes('debris')) return 'debris'
    return 'nonwastewater'
  }

  const f = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setVerified(false)
  }
  const fCheck = (field) => (e) => {
    setForm({ ...form, [field]: e.target.checked })
    setVerified(false)
  }

  const handleVerify = () => {
    setShowVerification(true)
  }

  const handleConfirmVerification = () => {
    setVerified(true)
    setShowVerification(false)
  }

  const handleExportPdf = () => {
    if (!verified) {
      alert('Please verify the LDR information before exporting.')
      return
    }

    const doc = new jsPDF('p', 'mm', 'letter')
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 15

    // Title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('LAND DISPOSAL RESTRICTIONS NOTIFICATION', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('(40 CFR Part 268)', pageWidth / 2, y, { align: 'center' })
    y += 10

    // Section 1: Generator Information
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Section 1: Generator Information', 15, y)
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const genFields = [
      ['Generator Name:', form.generator_name],
      ['EPA ID Number:', form.generator_epa_id],
      ['Address:', `${form.generator_address}, ${form.generator_city}, ${form.generator_state} ${form.generator_zip}`],
      ['Phone:', form.generator_phone],
      ['Contact Person:', form.generator_contact],
    ]
    for (const [label, value] of genFields) {
      doc.setFont('helvetica', 'bold')
      doc.text(label, 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value || '—', 55, y)
      y += 5
    }
    y += 5

    // Section 2: TSDF Information
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Section 2: Receiving Facility (TSDF) Information', 15, y)
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const tsdfFields = [
      ['Facility Name:', form.tsdf_name],
      ['EPA ID Number:', form.tsdf_epa_id],
      ['Address:', `${form.tsdf_address}, ${form.tsdf_city}, ${form.tsdf_state} ${form.tsdf_zip}`],
    ]
    for (const [label, value] of tsdfFields) {
      doc.setFont('helvetica', 'bold')
      doc.text(label, 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value || '—', 55, y)
      y += 5
    }
    y += 5

    // Section 3: Waste Information
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Section 3: Waste Identification', 15, y)
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const wasteFields = [
      ['Waste Name/Description:', form.waste_name],
      ['Profile Number:', form.profile_number],
      ['EPA Waste Code(s):', form.epa_waste_codes],
      ['Manifest Tracking #:', form.manifest_tracking_number],
      ['Shipment Type:', MANIFEST_TYPES.find(t => t.value === form.manifest_type)?.label || ''],
      ['Waste Subcategory:', WASTE_SUBCATEGORIES.find(s => s.value === form.subcategory)?.label || ''],
    ]
    for (const [label, value] of wasteFields) {
      doc.setFont('helvetica', 'bold')
      doc.text(label, 15, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value || '—', 60, y)
      y += 5
    }
    y += 5

    // Section 4: Treatment Standards
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Section 4: Treatment Standards (40 CFR 268.40)', 15, y)
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    doc.setFont('helvetica', 'bold')
    doc.text('Meets Treatment Standards:', 15, y)
    doc.setFont('helvetica', 'normal')
    doc.text(form.meets_treatment_standards ? 'Yes' : 'No', 65, y)
    y += 5

    if (form.treatment_standard_description) {
      doc.setFont('helvetica', 'bold')
      doc.text('Treatment Method/Standard:', 15, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(form.treatment_standard_description, pageWidth - 30)
      doc.text(lines, 15, y)
      y += lines.length * 4 + 2
    }

    if (form.underlying_hazardous_constituents) {
      doc.setFont('helvetica', 'bold')
      doc.text('Underlying Hazardous Constituents (UHCs):', 15, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(form.underlying_hazardous_constituents, pageWidth - 30)
      doc.text(lines, 15, y)
      y += lines.length * 4 + 2
    }
    y += 5

    // Section 5: Certification
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Section 5: Generator Certification', 15, y)
    y += 7
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    const certText = form.meets_treatment_standards
      ? CERTIFICATION_STATEMENTS.meets_standards
      : CERTIFICATION_STATEMENTS.does_not_meet
    const certLines = doc.splitTextToSize(certText, pageWidth - 30)
    doc.text(certLines, 15, y)
    y += certLines.length * 3.5 + 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Signature:', 15, y)
    doc.line(40, y, 110, y)
    doc.text('Date:', 115, y)
    doc.setFont('helvetica', 'normal')
    doc.text(form.certification_date, 130, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Printed Name:', 15, y)
    doc.setFont('helvetica', 'normal')
    doc.text(form.certifier_name || '—', 50, y)
    doc.setFont('helvetica', 'bold')
    doc.text('Title:', 115, y)
    doc.setFont('helvetica', 'normal')
    doc.text(form.certifier_title || '—', 130, y)

    // Save PDF
    const fileName = `LDR_Notification_${form.profile_number || 'draft'}_${form.certification_date}.pdf`
    doc.save(fileName)
    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 3000)
  }

  // Styles
  const sectionStyle = { marginBottom: '1.5rem', padding: '1.25rem', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }
  const sectionTitleStyle = { color: '#14532d', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }
  const fieldGroupStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }
  const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }
  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem' }
  const selectStyle = { ...inputStyle }

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <p>Loading profiles...</p>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 900 }}>
      <h1 style={{ color: '#14532d', marginBottom: '0.5rem' }}>📋 Land Disposal Restrictions (LDR) Notification</h1>
      <p style={{ color: '#6b7280', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
        Complete the LDR notification per 40 CFR Part 268. Select a profile to auto-populate fields from the waste determination.
      </p>

      {/* Profile Selection */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Select Waste Profile</div>
        <select
          style={selectStyle}
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
        >
          <option value="">— Select a hazardous waste profile —</option>
          {hazardousProfiles.map(p => {
            const det = p.determinations?.[p.determinations.length - 1]
            let codes = ''
            try { codes = (det?.waste_codes_list || JSON.parse(det?.waste_codes || '[]')).join(', ') } catch { /* */ }
            return (
              <option key={p.id} value={p.id}>
                {p.name} {p.transaction_id ? `(${p.transaction_id})` : ''} — Codes: {codes || 'N/A'}
              </option>
            )
          })}
        </select>
        {profiles.length > 0 && hazardousProfiles.length === 0 && (
          <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            No profiles with hazardous waste determinations found. LDR notifications are only required for hazardous waste.
          </p>
        )}
      </div>

      {/* Section 1: Generator Information */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Section 1: Generator Information</div>
        <div style={fieldGroupStyle}>
          <div>
            <label style={labelStyle}>Generator Name</label>
            <input style={inputStyle} value={form.generator_name} onChange={f('generator_name')} />
          </div>
          <div>
            <label style={labelStyle}>EPA ID Number</label>
            <input style={inputStyle} value={form.generator_epa_id} onChange={f('generator_epa_id')} placeholder="e.g. TXD000000000" />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.generator_address} onChange={f('generator_address')} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.generator_city} onChange={f('generator_city')} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={form.generator_state} onChange={f('generator_state')} />
          </div>
          <div>
            <label style={labelStyle}>Zip Code</label>
            <input style={inputStyle} value={form.generator_zip} onChange={f('generator_zip')} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.generator_phone} onChange={f('generator_phone')} />
          </div>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.generator_contact} onChange={f('generator_contact')} />
          </div>
        </div>
      </div>

      {/* Section 2: TSDF Information */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Section 2: Receiving Facility (TSDF)</div>
        <div style={fieldGroupStyle}>
          <div>
            <label style={labelStyle}>Facility Name</label>
            <input style={inputStyle} value={form.tsdf_name} onChange={f('tsdf_name')} />
          </div>
          <div>
            <label style={labelStyle}>EPA ID Number</label>
            <input style={inputStyle} value={form.tsdf_epa_id} onChange={f('tsdf_epa_id')} placeholder="e.g. TXD000000000" />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.tsdf_address} onChange={f('tsdf_address')} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.tsdf_city} onChange={f('tsdf_city')} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={form.tsdf_state} onChange={f('tsdf_state')} />
          </div>
          <div>
            <label style={labelStyle}>Zip Code</label>
            <input style={inputStyle} value={form.tsdf_zip} onChange={f('tsdf_zip')} />
          </div>
        </div>
      </div>

      {/* Section 3: Waste Identification */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Section 3: Waste Identification</div>
        <div style={fieldGroupStyle}>
          <div>
            <label style={labelStyle}>Waste Name / Description</label>
            <input style={inputStyle} value={form.waste_name} onChange={f('waste_name')} />
          </div>
          <div>
            <label style={labelStyle}>Profile Number</label>
            <input style={{ ...inputStyle, background: '#f3f4f6' }} value={form.profile_number} readOnly />
          </div>
          <div>
            <label style={labelStyle}>EPA Waste Code(s)</label>
            <input style={inputStyle} value={form.epa_waste_codes} onChange={f('epa_waste_codes')} placeholder="e.g. D001, F003" />
          </div>
          <div>
            <label style={labelStyle}>Manifest Tracking Number</label>
            <input style={inputStyle} value={form.manifest_tracking_number} onChange={f('manifest_tracking_number')} placeholder="e.g. 123456789ELC" />
          </div>
          <div>
            <label style={labelStyle}>Shipment Type</label>
            <select style={selectStyle} value={form.manifest_type} onChange={f('manifest_type')}>
              {MANIFEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Waste Subcategory (per 268.40)</label>
            <select style={selectStyle} value={form.subcategory} onChange={f('subcategory')}>
              {WASTE_SUBCATEGORIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section 4: Treatment Standards */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Section 4: Treatment Standards (40 CFR 268.40)</div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form.meets_treatment_standards}
              onChange={fCheck('meets_treatment_standards')}
            />
            Waste meets applicable treatment standards prior to land disposal
          </label>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Treatment Standard / Method Description</label>
          <textarea
            style={{ ...inputStyle, height: 60 }}
            value={form.treatment_standard_description}
            onChange={f('treatment_standard_description')}
            placeholder="Describe the applicable treatment standard or technology-based standard (e.g., DEACT, CMBST, RORGS)"
          />
        </div>
        <div>
          <label style={labelStyle}>Underlying Hazardous Constituents (UHCs)</label>
          <textarea
            style={{ ...inputStyle, height: 60 }}
            value={form.underlying_hazardous_constituents}
            onChange={f('underlying_hazardous_constituents')}
            placeholder="For characteristic wastes (D001-D043): list all UHCs reasonably expected to be present above treatment levels"
          />
          <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Required for characteristic hazardous wastes (D001–D043) per 40 CFR 268.9(a). List constituents from 40 CFR 268.48 Table UTS.
          </p>
        </div>
      </div>

      {/* Section 5: Certification */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Section 5: Generator Certification (40 CFR 268.7(a))</div>
        <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e' }}>
          {form.meets_treatment_standards
            ? CERTIFICATION_STATEMENTS.meets_standards
            : CERTIFICATION_STATEMENTS.does_not_meet
          }
        </div>
        <div style={fieldGroupStyle}>
          <div>
            <label style={labelStyle}>Certifier Printed Name</label>
            <input style={inputStyle} value={form.certifier_name} onChange={f('certifier_name')} />
          </div>
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={form.certifier_title} onChange={f('certifier_title')} />
          </div>
          <div>
            <label style={labelStyle}>Certification Date</label>
            <input type="date" style={inputStyle} value={form.certification_date} onChange={f('certification_date')} />
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={form.certified} onChange={fCheck('certified')} />
            I certify that the above information is true, accurate, and complete.
          </label>
        </div>
      </div>

      {/* Verification Dialog */}
      {showVerification && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <h2 style={{ color: '#14532d', marginBottom: '1rem' }}>Verify LDR Information</h2>
            <p style={{ color: '#374151', marginBottom: '1rem', fontSize: '0.92rem' }}>
              Please review the following LDR notification details. Confirm that all information is correct before exporting.
            </p>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Generator', form.generator_name],
                  ['Generator EPA ID', form.generator_epa_id],
                  ['TSDF', form.tsdf_name || '(not provided)'],
                  ['TSDF EPA ID', form.tsdf_epa_id || '(not provided)'],
                  ['Waste Name', form.waste_name],
                  ['Profile #', form.profile_number],
                  ['EPA Waste Codes', form.epa_waste_codes],
                  ['Subcategory', WASTE_SUBCATEGORIES.find(s => s.value === form.subcategory)?.label],
                  ['Meets Treatment Standards', form.meets_treatment_standards ? 'Yes' : 'No'],
                  ['UHCs', form.underlying_hazardous_constituents || '(none listed)'],
                  ['Certifier', form.certifier_name || '(not provided)'],
                  ['Date', form.certification_date],
                ].map(([label, value], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600, color: '#374151' }}>{label}</td>
                    <td style={{ padding: '0.4rem 0.5rem', color: '#1f2937' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowVerification(false)}
              >
                Edit
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmVerification}
              >
                ✓ Confirm — Information is Correct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button
          className="btn btn-secondary"
          onClick={handleVerify}
          disabled={!form.epa_waste_codes || !form.generator_name || !form.generator_epa_id}
        >
          🔍 Verify LDR Information
        </button>
        <button
          className="btn btn-primary"
          onClick={handleExportPdf}
          disabled={!verified || !form.certified}
          title={!verified ? 'Please verify LDR info first' : !form.certified ? 'Please certify before exporting' : ''}
        >
          📄 Export LDR PDF
        </button>
        {verified && (
          <span style={{ display: 'flex', alignItems: 'center', color: '#16a34a', fontSize: '0.88rem', fontWeight: 600 }}>
            ✓ Verified
          </span>
        )}
        {exportSuccess && (
          <span style={{ display: 'flex', alignItems: 'center', color: '#16a34a', fontSize: '0.88rem', fontWeight: 600 }}>
            ✓ PDF Exported Successfully
          </span>
        )}
      </div>
    </div>
  )
}
