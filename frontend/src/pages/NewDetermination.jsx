import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MixtureBuilder from '../components/MixtureBuilder'
import { mixtures } from '../api/client'

const DISCARD_REASONS = [
  { value: 'spent', label: 'Spent material (used and no longer useful)' },
  { value: 'off-spec', label: 'Off-specification product' },
  { value: 'residue', label: 'Container/tank residue' },
  { value: 'unused_commercial', label: 'Unused commercial chemical product' },
  { value: 'byproduct', label: 'By-product of a process' },
  { value: 'recycled_product_exempt', label: 'Recycled/reclaimed material (may be exempt)' },
  { value: 'other', label: 'Other discarded material' },
]

const STEPS = ['1. Mixture Info', '2. Components', '3. Properties', '4. Review']

export default function NewDetermination() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerLocation, setCustomerLocation] = useState('')
  const [isDiscarded, setIsDiscarded] = useState(true)
  const [discardReason, setDiscardReason] = useState('spent')
  const [processDesc, setProcessDesc] = useState('')

  // Step 2
  const [components, setComponents] = useState([])

  // Step 3
  const [flashPoint, setFlashPoint] = useState('')
  const [ph, setPh] = useState('')
  const [isReactive, setIsReactive] = useState(false)
  const [notes, setNotes] = useState('')

  const validateStep = () => {
    if (step === 0 && !name.trim()) { setError('Please enter a mixture name.'); return false }
    if (step === 1 && components.length === 0) { setError('Add at least one component to the mixture.'); return false }
    setError('')
    return true
  }

  const next = () => { if (validateStep()) setStep(s => s + 1) }
  const back = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      // Create mixture
      const mixturePayload = {
        name: name.trim(),
        customer_name: customerName.trim(),
        customer_location: customerLocation.trim(),
        is_discarded: isDiscarded,
        discard_reason: isDiscarded ? discardReason : '',
        process_description: processDesc,
        notes,
      }
      const res = await mixtures.create(mixturePayload)
      const mixtureId = res.data.id

      // Add components
      for (const comp of components) {
        await mixtures.addComponent(mixtureId, {
          chemical: comp.chemical,
          custom_name: comp.custom_name,
          quantity: comp.quantity,
          unit: comp.unit,
          override_flash_point_c: comp.override_flash_point_c,
          override_ph: comp.override_ph,
          override_is_reactive: comp.override_is_reactive,
        })
      }

      // Run determination
      const additionalProps = {}
      if (flashPoint !== '') additionalProps.flash_point_c = parseFloat(flashPoint)
      if (ph !== '') additionalProps.ph = parseFloat(ph)
      if (isReactive) additionalProps.is_reactive = true

      const detRes = await mixtures.determine(mixtureId, additionalProps)
      navigate(`/results/${detRes.data.determination_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 780 }}>
      <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>New Waste Determination</h1>

      {/* Progress */}
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            {i < step ? '✓ ' : ''}{label}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Step 1: Mixture Info */}
      {step === 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '1.25rem', color: '#166534' }}>Mixture Information</h2>
          <div className="form-group">
            <label>Mixture / Sample Name *</label>
            <input className="form-control" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Waste Solvent Batch #12, Lab Cleanup Mixture" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Customer</label>
              <input className="form-control" value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g., Acme Manufacturing" />
            </div>
            <div className="form-group">
              <label>Customer Location</label>
              <input className="form-control" value={customerLocation} onChange={e => setCustomerLocation(e.target.value)}
                placeholder="e.g., 123 Industrial Pkwy, Springfield, IL" />
            </div>
          </div>
          <div className="form-group">
            <label>Is this material being discarded?</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
              {[true, false].map(val => (
                <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="discarded" checked={isDiscarded === val}
                    onChange={() => setIsDiscarded(val)} />
                  {val ? 'Yes – it is being discarded' : 'No – it is still in use / being managed for reuse'}
                </label>
              ))}
            </div>
          </div>
          {isDiscarded && (
            <div className="form-group">
              <label>Reason for Disposal</label>
              <select className="form-control" value={discardReason} onChange={e => setDiscardReason(e.target.value)}>
                {DISCARD_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Process Description (optional)</label>
            <textarea className="form-control" rows={3} value={processDesc}
              onChange={e => setProcessDesc(e.target.value)}
              placeholder="Describe the process that generated this waste…" />
          </div>
        </div>
      )}

      {/* Step 2: Components */}
      {step === 1 && (
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Mixture Components</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            Search the EPA chemical database or enter custom chemical names with quantities.
          </p>
          <MixtureBuilder components={components} onChange={setComponents} />
        </div>
      )}

      {/* Step 3: Additional Properties */}
      {step === 2 && (
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Additional Properties</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            Provide measured mixture properties to improve accuracy. Leave blank if unknown.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional observations or context…" />
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#166534' }}>Review & Submit</h2>
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: 8 }}>
            <strong>Mixture:</strong> {name}<br />
            {customerName && <><strong>Customer:</strong> {customerName}<br /></>}
            {customerLocation && <><strong>Location:</strong> {customerLocation}<br /></>}
            <strong>Discarded:</strong> {isDiscarded ? `Yes (${discardReason})` : 'No'}<br />
            {processDesc && <><strong>Process:</strong> {processDesc}<br /></>}
            {notes && <><strong>Notes:</strong> {notes}<br /></>}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Components ({components.length}):</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              {components.map((c, i) => (
                <li key={i}>{c._displayName || c.custom_name}: {c.quantity} {c.unit}</li>
              ))}
            </ul>
          </div>
          {(flashPoint !== '' || ph !== '' || isReactive) && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Measured Properties:</strong>
              {flashPoint !== '' && <div>Flash point: {flashPoint}°C</div>}
              {ph !== '' && <div>pH: {ph}</div>}
              {isReactive && <div>Reactive: Yes</div>}
            </div>
          )}
          <div className="alert alert-info" style={{ fontSize: '0.88rem' }}>
            Clicking <strong>Run Determination</strong> will analyze this mixture against all applicable RCRA criteria and generate a full determination report.
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={back} disabled={step === 0}>← Back</button>
        {step < 3
          ? <button className="btn btn-primary" onClick={next}>Next →</button>
          : <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Running…' : '🔬 Run Determination'}
            </button>}
      </div>
    </div>
  )
}
