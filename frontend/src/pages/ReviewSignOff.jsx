import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { mixtures } from '../api/client'

export default function ReviewSignOff() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [mixture, setMixture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Sign-off fields
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerDate, setReviewerDate] = useState('')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)

  // Additional properties (pre-populated from draft values saved on submit)
  const [flashPoint, setFlashPoint] = useState('')
  const [ph, setPh] = useState('')
  const [isReactive, setIsReactive] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const res = await mixtures.get(id)
        const m = res.data
        setMixture(m)
        if (m.draft_flash_point_c != null) setFlashPoint(String(m.draft_flash_point_c))
        if (m.draft_ph != null) setPh(String(m.draft_ph))
        if (m.draft_is_reactive) setIsReactive(true)
      } catch (e) {
        setLoadError(e?.response?.data?.detail || 'Could not load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSubmit = async () => {
    if (!disclaimerAccepted) { setError('You must accept the legal disclaimer before proceeding.'); return }
    if (!reviewerName.trim()) { setError('Please enter your full name to sign off on this determination.'); return }
    if (!reviewerDate) { setError('Please enter the sign-off date.'); return }
    const today = new Date().toISOString().split('T')[0]
    if (reviewerDate > today) { setError('Sign-off date cannot be in the future.'); return }

    setSubmitting(true)
    setError('')
    try {
      const additionalProps = {}
      if (flashPoint !== '') additionalProps.flash_point_c = parseFloat(flashPoint)
      if (ph !== '') additionalProps.ph = parseFloat(ph)
      if (isReactive) additionalProps.is_reactive = true

      const detRes = await mixtures.determine(Number(id), additionalProps, {
        reviewer_name: reviewerName.trim(),
        reviewer_sign_off_date: reviewerDate,
      })
      navigate(`/results/${detRes.data.determination_id}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <p style={{ color: '#6b7280' }}>Loading profile…</p>
      </div>
    )
  }

  if (loadError || !mixture) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="alert alert-danger">{loadError || 'Profile not found.'}</div>
        <Link to="/review" className="btn btn-secondary">← Back to Review</Link>
      </div>
    )
  }

  const holdDays = mixture.hold_days ?? null
  const shipByDate = mixture.ship_by_date
  const daysRemaining = mixture.days_remaining_to_ship
  const shipmentSizeUnitLabel = mixture.shipment_size_unit === 'gallons' ? 'Drums' : mixture.shipment_size_unit

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 780 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link to="/review" style={{ color: '#166534', fontWeight: 600, fontSize: '0.92rem' }}>← Back to Review</Link>
        <h1 style={{ color: '#14532d', margin: 0 }}>Review &amp; Sign-Off</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Profile summary */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '1rem' }}>Profile Summary</h2>

        <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: 8, marginBottom: '1rem' }}>
          {mixture.transaction_id && <><strong>Transaction ID:</strong> {mixture.transaction_id}<br /></>}
          <strong>Generator:</strong> {mixture.customer_name || '—'}<br />
          {mixture.customer_location_name && <><strong>Location:</strong> {mixture.customer_location_name}<br /></>}
          <strong>Profile Name:</strong> {mixture.name}<br />
          <strong>Discarded:</strong> {mixture.is_discarded ? `Yes (${mixture.discard_reason || '—'})` : 'No'}<br />
          {mixture.generation_date && (
            <><strong>Generation Date:</strong> {new Date(mixture.generation_date + 'T00:00:00').toLocaleDateString()}<br /></>
          )}
          {mixture.epa_generator_status && (
            <><strong>EPA Status:</strong> {mixture.epa_generator_status}{holdDays != null ? ` (${holdDays}-day hold)` : ''}<br /></>
          )}
          {shipByDate && (
            <><strong>Ship By:</strong> {new Date(shipByDate + 'T00:00:00').toLocaleDateString()}
              {daysRemaining != null && ` (${daysRemaining} days remaining)`}<br /></>
          )}
          {mixture.shipment_size_unit && (
            <><strong>Shipment Size:</strong> {mixture.shipment_size_qty} {shipmentSizeUnitLabel}<br /></>
          )}
          {mixture.process_description && <><strong>Process:</strong> {mixture.process_description}<br /></>}
          {mixture.notes && <><strong>Notes:</strong> {mixture.notes}<br /></>}
        </div>

        {mixture.components && mixture.components.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>Components ({mixture.components.length}):</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              {mixture.components.map((c, i) => (
                <li key={i}>{c.component_name || c.custom_name || `Component ${i + 1}`}: {c.quantity} {c.unit}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Additional Properties */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '0.75rem' }}>Measured Properties</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.92rem' }}>
          Confirm or adjust the measured mixture properties before running the determination.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label>Overall Flash Point (°C)</label>
            <input className="form-control" type="number" step="any" placeholder="e.g., 25"
              value={flashPoint} onChange={e => setFlashPoint(e.target.value)} />
            <small style={{ color: '#9ca3af' }}>D001 threshold: &lt;60°C</small>
          </div>
          <div className="form-group">
            <label>Overall pH</label>
            <input className="form-control" type="number" min="0" max="14" step="0.1" placeholder="e.g., 1.5"
              value={ph} onChange={e => setPh(e.target.value)} />
            <small style={{ color: '#9ca3af' }}>D002 thresholds: ≤2.0 or ≥12.5</small>
          </div>
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input type="checkbox" id="reactive" checked={isReactive} onChange={e => setIsReactive(e.target.checked)}
            style={{ width: 18, height: 18 }} />
          <label htmlFor="reactive" style={{ marginBottom: 0 }}>
            Mixture is reactive (unstable, water-reactive, cyanide/sulfide bearing, or explosive potential) – D003
          </label>
        </div>
      </div>

      {/* Legal Disclaimer & Sign-Off */}
      <div className="card">
        <div style={{
          padding: '1.25rem',
          background: '#fffbeb',
          border: '2px solid #f59e0b',
          borderRadius: 10,
        }}>
          <h3 style={{ color: '#92400e', marginBottom: '0.75rem', fontSize: '1.05rem' }}>⚖️ Legal Disclaimer &amp; Sign-Off</h3>
          <div style={{
            padding: '1rem',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: '0.88rem',
            lineHeight: 1.6,
            color: '#374151',
            marginBottom: '1rem',
            maxHeight: '180px',
            overflowY: 'auto',
          }}>
            <p style={{ marginBottom: '0.5rem' }}>
              By signing below, I certify that I have fully reviewed all inputs and outputs of this waste determination report,
              including but not limited to the mixture composition, chemical components, measured properties, and all determination
              results and recommendations generated by this system.
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              I understand that this tool provides a preliminary hazardous waste determination based on the information provided
              and applicable RCRA regulations. I acknowledge that the accuracy of the determination depends on the completeness
              and accuracy of the data entered.
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              I accept full responsibility for verifying the accuracy of this determination and for ensuring compliance with all
              applicable federal, state, and local environmental regulations. I understand that this determination does not
              constitute legal advice and that I should consult with qualified environmental professionals and applicable
              laboratory testing as needed.
            </p>
            <p style={{ marginBottom: 0 }}>
              I further certify that I am authorized to make this determination on behalf of the generator and that all
              information provided is true, accurate, and complete to the best of my knowledge.
            </p>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <input type="checkbox" id="disclaimerAccept" checked={disclaimerAccepted}
              onChange={e => setDisclaimerAccepted(e.target.checked)}
              style={{ width: 20, height: 20, flexShrink: 0 }} />
            <label htmlFor="disclaimerAccept" style={{ marginBottom: 0, fontWeight: 600, color: '#92400e', fontSize: '0.92rem' }}>
              I have read and agree to the above disclaimer. I accept full responsibility for the inputs and outputs of this determination.
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Full Name *</label>
              <input className="form-control" value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                placeholder="Enter your full name"
                disabled={!disclaimerAccepted} />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Date *</label>
              <input className="form-control" type="date" value={reviewerDate}
                onChange={e => setReviewerDate(e.target.value)}
                disabled={!disclaimerAccepted} />
            </div>
          </div>
        </div>

        <div className="alert alert-info" style={{ fontSize: '0.88rem', marginTop: '1rem' }}>
          Clicking <strong>Run Determination</strong> will analyze this mixture against all applicable RCRA criteria and generate a full determination report.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Running…' : '🔬 Run Determination'}
          </button>
        </div>
      </div>
    </div>
  )
}
