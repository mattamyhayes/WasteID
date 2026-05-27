import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { sds } from '../api/client'
import { renderPdfPage, getPdfPageCount } from '../lib/sdsPdfParser'

export default function SDSDetail() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageImages, setPageImages] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [determining, setDetermining] = useState(false)
  const [determinationResult, setDeterminationResult] = useState(null)

  useEffect(() => {
    loadRecord()
  }, [id])

  const loadRecord = async () => {
    setLoading(true)
    try {
      const res = await sds.get(id)
      setRecord(res.data)
      // Load existing determination if available
      if (res.data.hazardous_determination_data) {
        setDeterminationResult(res.data.hazardous_determination_data)
      } else if (res.data.hazardous_determination) {
        try {
          setDeterminationResult(JSON.parse(res.data.hazardous_determination))
        } catch { /* ignore parse error */ }
      }
      // Render PDF pages for comparison if file data is available
      if (res.data.file_data) {
        renderPdfPages(res.data.file_data)
      }
    } catch {
      setError('Failed to load SDS record.')
    } finally {
      setLoading(false)
    }
  }

  const handleRunDetermination = async () => {
    setDetermining(true)
    try {
      const res = await sds.determine(id)
      setDeterminationResult(res.data)
      // Reload record to get updated data
      const updated = await sds.get(id)
      setRecord(updated.data)
    } catch (err) {
      setError('Failed to run determination: ' + (err?.message || 'Unknown error'))
    } finally {
      setDetermining(false)
    }
  }

  const renderPdfPages = async (fileDataUrl) => {
    try {
      // Convert data URL to ArrayBuffer
      const response = await fetch(fileDataUrl)
      const arrayBuffer = await response.arrayBuffer()
      const numPages = await getPdfPageCount(arrayBuffer)
      setTotalPages(numPages)

      // Render all pages (up to reasonable limit)
      const maxPages = Math.min(numPages, 20)
      const images = []
      for (let i = 1; i <= maxPages; i++) {
        const img = await renderPdfPage(arrayBuffer, i, 1.2)
        if (img) images.push(img)
      }
      setPageImages(images)
    } catch (err) {
      // Non-critical - PDF viewing is optional
      console.warn('Could not render PDF pages:', err)
    }
  }

  const handleViewFile = () => {
    if (record.file_data) {
      window.open(record.file_data, '_blank')
    }
  }

  if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading…</div>
  if (error) return <div className="container" style={{ padding: '2rem' }}><div className="alert alert-danger">{error}</div></div>
  if (!record) return <div className="container" style={{ padding: '2rem' }}>SDS not found.</div>

  // Map sections to approximate PDF pages (heuristic: sections spread across pages)
  const getSectionPages = (sectionNum) => {
    if (totalPages === 0) return []
    // Rough estimate: sections 1-3 on pages 1-2, sections 4-8 on pages 2-4, etc.
    const pagesPerSection = totalPages / 16
    const startPage = Math.floor((sectionNum - 1) * pagesPerSection)
    const endPage = Math.min(Math.floor(sectionNum * pagesPerSection), pageImages.length - 1)
    return pageImages.slice(startPage, endPage + 1)
  }

  const Section = ({ title, sectionNum, children }) => {
    const sectionImages = getSectionPages(sectionNum)
    return (
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: '#166534', marginBottom: '0.75rem', fontSize: '1rem' }}>{title}</h3>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px', minWidth: 300 }}>
            {children}
          </div>
          {sectionImages.length > 0 && (
            <div style={{ flex: '0 0 300px', maxWidth: 350 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>
                  📄 Original PDF — Section {sectionNum}
                </p>
                {sectionImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`PDF page for section ${sectionNum}`}
                    style={{ width: '100%', borderRadius: 4, border: '1px solid #d1d5db', marginBottom: '0.25rem', cursor: 'pointer' }}
                    onClick={handleViewFile}
                    title="Click to view full PDF"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const Field = ({ label, value }) => {
    if (!value || value === '[]' || value === '{}') return null
    return (
      <div style={{ marginBottom: '0.4rem' }}>
        <strong style={{ fontSize: '0.85rem', color: '#374151' }}>{label}:</strong>{' '}
        <span style={{ fontSize: '0.9rem', color: '#1f2937' }}>{value}</span>
      </div>
    )
  }

  const sdsId = record.sds_id || `SDS-${String(record.id).padStart(5, '0')}`

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>
            📋 {record.product_name}
          </h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              background: '#dbeafe', color: '#1e40af', fontWeight: 700,
              fontSize: '0.85rem', padding: '0.2rem 0.6rem', borderRadius: 4,
              fontFamily: 'monospace'
            }}>
              {sdsId}
            </span>
            {record.profile_transaction_id && (
              <span style={{
                background: '#f0fdf4', color: '#166534', fontWeight: 600,
                fontSize: '0.85rem', padding: '0.2rem 0.6rem', borderRadius: 4,
                border: '1px solid #bbf7d0'
              }}>
                Profile: {record.profile_transaction_id}
              </span>
            )}
            <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Imported {new Date(record.imported_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {record.file_data && (
            <button onClick={handleViewFile} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              📄 View Original PDF
            </button>
          )}
          <Link to="/sds" className="btn btn-secondary">← Back to SDS List</Link>
        </div>
      </div>

      <Section title="Section 1: Identification" sectionNum={1}>
        <Field label="Product Name" value={record.product_name} />
        <Field label="Product Code" value={record.product_code} />
        <Field label="CAS Number" value={record.cas_number} />
        <Field label="Manufacturer" value={record.manufacturer_name} />
        <Field label="Manufacturer Address" value={record.manufacturer_address} />
        <Field label="Manufacturer Phone" value={record.manufacturer_phone} />
        <Field label="Emergency Phone" value={record.emergency_phone} />
        <Field label="Recommended Use" value={record.recommended_use} />
        <Field label="Restrictions on Use" value={record.restrictions_on_use} />
        <Field label="SDS Version" value={record.sds_version} />
        <Field label="Revision Date" value={record.sds_revision_date} />
      </Section>

      <Section title="Section 2: Hazard(s) Identification" sectionNum={2}>
        <Field label="Signal Word" value={record.signal_word} />
        <Field label="GHS Classification" value={record.ghs_classification !== '[]' ? record.ghs_classification : ''} />
        <Field label="Hazard Statements" value={record.hazard_statements !== '[]' ? record.hazard_statements : ''} />
        <Field label="Precautionary Statements" value={record.precautionary_statements !== '[]' ? record.precautionary_statements : ''} />
        <Field label="Other Hazards" value={record.other_hazards} />
      </Section>

      <Section title="Section 3: Composition / Information on Ingredients" sectionNum={3}>
        <Field label="Composition" value={record.composition !== '[]' ? record.composition : ''} />
      </Section>

      <Section title="Section 4: First-Aid Measures" sectionNum={4}>
        <Field label="Inhalation" value={record.first_aid_inhalation} />
        <Field label="Skin Contact" value={record.first_aid_skin} />
        <Field label="Eye Contact" value={record.first_aid_eye} />
        <Field label="Ingestion" value={record.first_aid_ingestion} />
        <Field label="Notes to Physician" value={record.first_aid_notes} />
      </Section>

      <Section title="Section 5: Fire-Fighting Measures" sectionNum={5}>
        <Field label="Extinguishing Media" value={record.extinguishing_media} />
        <Field label="Special Fire Hazards" value={record.special_fire_hazards} />
        <Field label="Firefighter Equipment" value={record.firefighter_equipment} />
      </Section>

      <Section title="Section 6: Accidental Release Measures" sectionNum={6}>
        <Field label="Personal Precautions" value={record.personal_precautions} />
        <Field label="Environmental Precautions" value={record.environmental_precautions} />
        <Field label="Containment / Cleanup" value={record.containment_cleanup} />
      </Section>

      <Section title="Section 7: Handling and Storage" sectionNum={7}>
        <Field label="Handling Precautions" value={record.handling_precautions} />
        <Field label="Storage Conditions" value={record.storage_conditions} />
        <Field label="Incompatible Materials" value={record.incompatible_materials} />
      </Section>

      <Section title="Section 8: Exposure Controls / Personal Protection" sectionNum={8}>
        <Field label="Exposure Limits" value={record.exposure_limits !== '[]' ? record.exposure_limits : ''} />
        <Field label="Engineering Controls" value={record.engineering_controls} />
        <Field label="Respiratory Protection" value={record.respiratory_protection} />
        <Field label="Hand Protection" value={record.hand_protection} />
        <Field label="Eye Protection" value={record.eye_protection} />
        <Field label="Skin Protection" value={record.skin_protection} />
      </Section>

      <Section title="Section 9: Physical and Chemical Properties" sectionNum={9}>
        <Field label="Physical State" value={record.physical_state} />
        <Field label="Color" value={record.color} />
        <Field label="Odor" value={record.odor} />
        <Field label="pH" value={record.ph} />
        <Field label="Flash Point" value={record.flash_point} />
        <Field label="Boiling Point" value={record.boiling_point} />
        <Field label="Melting Point" value={record.melting_point} />
        <Field label="Vapor Pressure" value={record.vapor_pressure} />
        <Field label="Relative Density" value={record.relative_density} />
        <Field label="Solubility" value={record.solubility} />
        <Field label="Molecular Weight" value={record.molecular_weight} />
        <Field label="Molecular Formula" value={record.molecular_formula} />
      </Section>

      <Section title="Section 10: Stability and Reactivity" sectionNum={10}>
        <Field label="Chemical Stability" value={record.chemical_stability} />
        <Field label="Conditions to Avoid" value={record.conditions_to_avoid} />
        <Field label="Incompatible Materials" value={record.incompatible_materials_sec10} />
        <Field label="Hazardous Decomposition" value={record.hazardous_decomposition} />
        <Field label="Possibility of Reactions" value={record.possibility_of_reactions} />
      </Section>

      <Section title="Section 11: Toxicological Information" sectionNum={11}>
        <Field label="Skin Corrosion/Irritation" value={record.skin_corrosion_irritation} />
        <Field label="Eye Damage/Irritation" value={record.eye_damage_irritation} />
        <Field label="Carcinogenicity" value={record.carcinogenicity} />
        <Field label="Reproductive Toxicity" value={record.reproductive_toxicity} />
        <Field label="Acute Toxicity" value={record.acute_toxicity !== '[]' ? record.acute_toxicity : ''} />
      </Section>

      <Section title="Section 12: Ecological Information" sectionNum={12}>
        <Field label="Persistence / Degradability" value={record.persistence_degradability} />
        <Field label="Bioaccumulative Potential" value={record.bioaccumulative_potential} />
        <Field label="Mobility in Soil" value={record.mobility_in_soil} />
        <Field label="Aquatic Toxicity" value={record.aquatic_toxicity !== '[]' ? record.aquatic_toxicity : ''} />
      </Section>

      <Section title="Section 13: Disposal Considerations" sectionNum={13}>
        <Field label="Waste Disposal Method" value={record.waste_disposal_method} />
        <Field label="EPA Waste Code" value={record.epa_waste_code} />
        <Field label="Contaminated Packaging" value={record.contaminated_packaging} />
      </Section>

      <Section title="Section 14: Transport Information" sectionNum={14}>
        <Field label="UN Number" value={record.un_number} />
        <Field label="Proper Shipping Name" value={record.un_proper_shipping_name} />
        <Field label="Hazard Class" value={record.transport_hazard_class} />
        <Field label="Packing Group" value={record.packing_group} />
        <Field label="DOT Description" value={record.dot_description} />
      </Section>

      <Section title="Section 15: Regulatory Information" sectionNum={15}>
        <Field label="RCRA Waste Code" value={record.rcra_waste_code} />
        <Field label="SARA 311/312" value={record.sara_311_312} />
        <Field label="SARA 313" value={record.sara_313} />
        <Field label="CERCLA RQ" value={record.cercla_rq} />
        <Field label="TSCA Status" value={record.tsca_status} />
        <Field label="California Prop 65" value={record.california_prop65} />
      </Section>

      <Section title="Section 16: Other Information" sectionNum={16}>
        <Field label="Revision Notes" value={record.revision_notes} />
        <Field label="Disclaimer" value={record.disclaimer} />
        <Field label="Other Information" value={record.other_information} />
      </Section>

      {/* Hazardous Characteristic Determination (40 CFR 261) */}
      <div className="card" style={{ marginBottom: '1rem', border: determinationResult?.is_characteristic_hazardous ? '2px solid #dc2626' : '2px solid #16a34a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ color: '#14532d', margin: 0, fontSize: '1.1rem' }}>
            🧪 Hazardous Characteristic Determination (40 CFR 261)
          </h3>
          <button
            className="btn btn-primary"
            onClick={handleRunDetermination}
            disabled={determining}
            style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
          >
            {determining ? '⏳ Analyzing…' : determinationResult ? '🔄 Re-Run Determination' : '▶ Run Determination'}
          </button>
        </div>

        {!determinationResult && !determining && (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            Click "Run Determination" to analyze this SDS for characteristic hazardous waste indicators
            using Section 9 (Physical/Chemical Properties) and Section 14 (Transport) data per 40 CFR 261 Subpart C.
          </p>
        )}

        {determinationResult && (
          <div>
            {/* Summary Banner */}
            {determinationResult.is_characteristic_hazardous ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <strong style={{ color: '#dc2626', fontSize: '1rem' }}>
                  ⚠️ CHARACTERISTIC HAZARDOUS WASTE IDENTIFIED
                </strong>
                <p style={{ margin: '0.3rem 0 0', color: '#991b1b', fontSize: '0.9rem' }}>
                  Waste Code(s): <strong>{determinationResult.waste_codes?.join(', ')}</strong>
                </p>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <strong style={{ color: '#166534', fontSize: '1rem' }}>
                  ✓ No Definitive Characteristic Hazardous Indicators Confirmed
                </strong>
                <p style={{ margin: '0.3rem 0 0', color: '#15803d', fontSize: '0.85rem' }}>
                  Based on available SDS data. Additional testing may be required.
                </p>
              </div>
            )}

            {/* DOT Status */}
            {determinationResult.dot_regulated && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem' }}>
                <strong style={{ color: '#92400e', fontSize: '0.9rem' }}>
                  🚛 DOT-Regulated Material (UN Number Present)
                </strong>
              </div>
            )}

            {/* Detailed Reasoning */}
            <h4 style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Determination Reasoning</h4>
            {determinationResult.reasoning?.map((item, idx) => (
              <div key={idx} style={{
                background: item.result === 'HAZARDOUS' || item.result === 'POTENTIALLY_HAZARDOUS'
                  ? '#fef2f2' : item.result === 'NOT_HAZARDOUS' || item.result === 'NOT_REGULATED'
                  ? '#f0fdf4' : '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: '0.6rem 0.8rem',
                marginBottom: '0.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.88rem', color: '#1f2937' }}>
                    {item.characteristic || item.section || 'Analysis'}
                  </strong>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 4,
                    background: item.result === 'HAZARDOUS' || item.result === 'POTENTIALLY_HAZARDOUS'
                      ? '#fee2e2' : item.result === 'NOT_HAZARDOUS' || item.result === 'NOT_REGULATED' || item.result === 'NOT_APPLICABLE_SOLID'
                      ? '#dcfce7' : '#e5e7eb',
                    color: item.result === 'HAZARDOUS' || item.result === 'POTENTIALLY_HAZARDOUS'
                      ? '#dc2626' : item.result === 'NOT_HAZARDOUS' || item.result === 'NOT_REGULATED' || item.result === 'NOT_APPLICABLE_SOLID'
                      ? '#16a34a' : '#6b7280',
                  }}>
                    {item.result || '—'}
                  </span>
                </div>
                {item.regulation && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
                    Ref: {item.regulation}
                  </div>
                )}
                {item.detail && (
                  <p style={{ fontSize: '0.85rem', color: '#374151', margin: '0.4rem 0 0' }}>
                    {item.detail}
                  </p>
                )}
                {item.raw_value && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                    SDS Value: "{item.raw_value}"
                    {item.parsed_value_c != null && ` → ${item.parsed_value_c.toFixed(1)}°C`}
                    {item.parsed_value != null && item.parsed_value_c == null && ` → ${item.parsed_value}`}
                  </div>
                )}
                {/* TCLP matches table */}
                {item.matches && item.matches.length > 0 && (
                  <div style={{ marginTop: '0.5rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>Chemical</th>
                          <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>D-Code</th>
                          <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #d1d5db' }}>Conc. %</th>
                          <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #d1d5db' }}>Est. TCLP (mg/L)</th>
                          <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #d1d5db' }}>Reg. Limit (mg/L)</th>
                          <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderBottom: '1px solid #d1d5db' }}>Exceeds?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.matches.map((m, mi) => (
                          <tr key={mi} style={{ background: m.exceeds_limit ? '#fef2f2' : 'transparent' }}>
                            <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #e5e7eb' }}>{m.chemical_name}</td>
                            <td style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{m.d_code}</td>
                            <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{m.concentration_pct != null ? m.concentration_pct : '—'}</td>
                            <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{m.tclp_estimate_mgl != null ? m.tclp_estimate_mgl.toLocaleString() : '—'}</td>
                            <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{m.regulatory_limit_mgl}</td>
                            <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 700, color: m.exceeds_limit ? '#dc2626' : m.exceeds_limit === false ? '#16a34a' : '#6b7280' }}>
                              {m.exceeds_limit === true ? '⚠️ YES' : m.exceeds_limit === false ? '✓ No' : '?'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Recommendations */}
            {determinationResult.recommendations && determinationResult.recommendations.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Recommendations</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#374151' }}>
                  {determinationResult.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '0.3rem' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regulatory References */}
            {determinationResult.regulatory_references && determinationResult.regulatory_references.length > 0 && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                <strong style={{ fontSize: '0.82rem', color: '#6b7280' }}>Regulatory References:</strong>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                  {determinationResult.regulatory_references.join(' • ')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
