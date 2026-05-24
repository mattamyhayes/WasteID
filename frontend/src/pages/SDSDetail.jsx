import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { sds } from '../api/client'

export default function SDSDetail() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRecord()
  }, [id])

  const loadRecord = async () => {
    setLoading(true)
    try {
      const res = await sds.get(id)
      setRecord(res.data)
    } catch {
      setError('Failed to load SDS record.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading…</div>
  if (error) return <div className="container" style={{ padding: '2rem' }}><div className="alert alert-danger">{error}</div></div>
  if (!record) return <div className="container" style={{ padding: '2rem' }}>SDS not found.</div>

  const Section = ({ title, children }) => (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ color: '#166534', marginBottom: '0.75rem', fontSize: '1rem' }}>{title}</h3>
      {children}
    </div>
  )

  const Field = ({ label, value }) => {
    if (!value || value === '[]' || value === '{}') return null
    return (
      <div style={{ marginBottom: '0.4rem' }}>
        <strong style={{ fontSize: '0.85rem', color: '#374151' }}>{label}:</strong>{' '}
        <span style={{ fontSize: '0.9rem', color: '#1f2937' }}>{value}</span>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>📋 {record.product_name}</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            Imported {new Date(record.imported_at).toLocaleDateString()}
            {record.profile_transaction_id && ` • Profile: ${record.profile_transaction_id}`}
          </p>
        </div>
        <Link to="/sds" className="btn btn-secondary">← Back to SDS List</Link>
      </div>

      <Section title="Section 1: Identification">
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

      <Section title="Section 2: Hazard(s) Identification">
        <Field label="Signal Word" value={record.signal_word} />
        <Field label="Other Hazards" value={record.other_hazards} />
      </Section>

      <Section title="Section 9: Physical and Chemical Properties">
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

      <Section title="Section 13: Disposal Considerations">
        <Field label="Waste Disposal Method" value={record.waste_disposal_method} />
        <Field label="EPA Waste Code" value={record.epa_waste_code} />
        <Field label="Contaminated Packaging" value={record.contaminated_packaging} />
      </Section>

      <Section title="Section 14: Transport Information">
        <Field label="UN Number" value={record.un_number} />
        <Field label="Proper Shipping Name" value={record.un_proper_shipping_name} />
        <Field label="Hazard Class" value={record.transport_hazard_class} />
        <Field label="Packing Group" value={record.packing_group} />
        <Field label="DOT Description" value={record.dot_description} />
      </Section>

      <Section title="Section 15: Regulatory Information">
        <Field label="RCRA Waste Code" value={record.rcra_waste_code} />
        <Field label="SARA 311/312" value={record.sara_311_312} />
        <Field label="SARA 313" value={record.sara_313} />
        <Field label="CERCLA RQ" value={record.cercla_rq} />
        <Field label="TSCA Status" value={record.tsca_status} />
        <Field label="California Prop 65" value={record.california_prop65} />
      </Section>
    </div>
  )
}
