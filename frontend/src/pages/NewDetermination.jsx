import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import MixtureBuilder from '../components/MixtureBuilder'
import { mixtures, customers as customersApi, customerLocations as locationsApi } from '../api/client'

const DISCARD_REASONS = [
  { value: 'spent', label: 'Spent material (used and no longer useful)' },
  { value: 'off-spec', label: 'Off-specification product' },
  { value: 'residue', label: 'Container/tank residue' },
  { value: 'unused_commercial', label: 'Unused commercial chemical product' },
  { value: 'byproduct', label: 'By-product of a process' },
  { value: 'recycled_product_exempt', label: 'Recycled/reclaimed material (may be exempt)' },
  { value: 'other', label: 'Other discarded material' },
]

const STEPS = ['1. Mixture Info', '2. Components', '3. Properties', '4. Review & Sign-Off']

export default function NewDetermination() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mixture record (created after Step 1)
  const [mixtureId, setMixtureId] = useState(null)
  const [transactionId, setTransactionId] = useState('')

  // Step 1
  const [name, setName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [locationId, setLocationId] = useState('')
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

  // Step 4: Reviewer sign-off
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerDate, setReviewerDate] = useState('')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)

  // Customer data
  const [customerList, setCustomerList] = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState('')

  // Reset all in-progress mixture state when starting a new profile so the
  // user always begins with a fresh slate.
  useEffect(() => {
    setStep(0)
    setError('')
    setSubmitting(false)
    setMixtureId(null)
    setTransactionId('')
    setName('')
    setCustomerId('')
    setLocationId('')
    setIsDiscarded(true)
    setDiscardReason('spent')
    setProcessDesc('')
    setComponents([])
    setFlashPoint('')
    setPh('')
    setIsReactive(false)
    setNotes('')
    setReviewerName('')
    setReviewerDate('')
    setDisclaimerAccepted(false)
  }, [])

  // Load customers (and their locations) once
  useEffect(() => {
    let cancelled = false
    async function loadCustomers() {
      setCustomersLoading(true)
      try {
        const res = await customersApi.list()
        if (cancelled) return
        setCustomerList(res.data.results || res.data)
      } catch (e) {
        if (cancelled) return
        setCustomersError('Could not load customers. You can still proceed by adding a customer first.')
      } finally {
        if (!cancelled) setCustomersLoading(false)
      }
    }
    loadCustomers()
    return () => { cancelled = true }
  }, [])

  const selectedCustomer = customerList.find(c => String(c.id) === String(customerId))
  const locationsForCustomer = selectedCustomer?.locations || []

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) { setError('Please enter a mixture name.'); return false }
      if (!customerId) { setError('Please select a customer.'); return false }
      if (locationsForCustomer.length > 0 && !locationId) {
        setError('Please select a customer location.'); return false
      }
    }
    if (step === 1 && components.length === 0) { setError('Add at least one component to the mixture.'); return false }
    if (step === 3) {
      if (!disclaimerAccepted) { setError('You must accept the legal disclaimer before proceeding.'); return false }
      if (!reviewerName.trim()) { setError('Please enter your full name to sign off on this profile.'); return false }
      if (!reviewerDate) { setError('Please enter the sign-off date.'); return false }
      const today = new Date().toISOString().split('T')[0]
      if (reviewerDate > today) { setError('Sign-off date cannot be in the future.'); return false }
    }
    setError('')
    return true
  }

  // After step 1 is validated, persist the mixture and obtain a transaction ID.
  const completeStep1 = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        is_discarded: isDiscarded,
        discard_reason: isDiscarded ? discardReason : '',
        process_description: processDesc,
        customer: customerId ? Number(customerId) : null,
        customer_location: locationId ? Number(locationId) : null,
      }
      if (mixtureId) {
        // Step 1 already submitted earlier; just update it on edits.
        const res = await mixtures.update(mixtureId, payload)
        setTransactionId(res.data.transaction_id || transactionId)
      } else {
        const res = await mixtures.create(payload)
        setMixtureId(res.data.id)
        setTransactionId(res.data.transaction_id || '')
      }
      setStep(1)
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not save mixture. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const next = () => {
    if (step === 0) { completeStep1(); return }
    if (validateStep()) setStep(s => s + 1)
  }
  const back = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    if (!validateStep()) return
    if (!mixtureId) { setError('Mixture has not been initialized.'); return }
    setSubmitting(true)
    setError('')
    try {
      // Update notes on the existing mixture record
      await mixtures.update(mixtureId, { notes })

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

      const detRes = await mixtures.determine(mixtureId, additionalProps, {
        reviewer_name: reviewerName.trim(),
        reviewer_sign_off_date: reviewerDate,
      })
      navigate(`/results/${detRes.data.determination_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 780 }}>
      <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>Profiles</h1>

      {/* Transaction ID banner once issued */}
      {transactionId && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <strong>Transaction ID:</strong> {transactionId}
        </div>
      )}

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
            <label>Customer *</label>
            {customersError && <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{customersError}</div>}
            <select className="form-control" value={customerId}
              onChange={e => { setCustomerId(e.target.value); setLocationId('') }}
              disabled={customersLoading}>
              <option value="">{customersLoading ? 'Loading customers…' : '-- Select a customer --'}</option>
              {customerList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <small style={{ color: '#6b7280' }}>
              Don’t see your customer?{' '}
              <Link to="/customers" style={{ color: '#166534', fontWeight: 600 }}>Add a new customer</Link>
              {' '}first, then return here.
            </small>
          </div>

          <div className="form-group">
            <label>Customer Location {locationsForCustomer.length > 0 ? '*' : ''}</label>
            <select className="form-control" value={locationId}
              onChange={e => setLocationId(e.target.value)}
              disabled={!customerId || locationsForCustomer.length === 0}>
              <option value="">
                {!customerId ? '-- Select a customer first --'
                  : locationsForCustomer.length === 0 ? 'No locations on file for this customer'
                  : '-- Select a location --'}
              </option>
              {locationsForCustomer.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}{(loc.city || loc.state) ? ` — ${[loc.city, loc.state].filter(Boolean).join(', ')}` : ''}
                </option>
              ))}
            </select>
            {customerId && locationsForCustomer.length === 0 && (
              <small style={{ color: '#6b7280' }}>
                <Link to="/customers" style={{ color: '#166534', fontWeight: 600 }}>Manage this customer</Link> to add a location.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Mixture / Sample Name *</label>
            <input className="form-control" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Waste Solvent Batch #12, Lab Cleanup Mixture" />
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

      {/* Step 4: Review & Sign-Off */}
      {step === 3 && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem', color: '#166534' }}>Review & Sign-Off</h2>
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: 8 }}>
            {transactionId && <><strong>Transaction ID:</strong> {transactionId}<br /></>}
            <strong>Customer:</strong> {selectedCustomer?.name || '—'}<br />
            <strong>Location:</strong> {locationsForCustomer.find(l => String(l.id) === String(locationId))?.name || '—'}<br />
            <strong>Mixture:</strong> {name}<br />
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

          {/* Legal Disclaimer & Sign-Off */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: 10,
          }}>
            <h3 style={{ color: '#92400e', marginBottom: '0.75rem', fontSize: '1.05rem' }}>⚖️ Legal Disclaimer & Sign-Off</h3>
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
                By signing below, I certify that I have fully reviewed all inputs and outputs of this waste profile report,
                including but not limited to the mixture composition, chemical components, measured properties, and all profile
                results and recommendations generated by this system.
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                I understand that this tool provides a preliminary hazardous waste profile based on the information provided
                and applicable RCRA regulations. I acknowledge that the accuracy of the profile depends on the completeness
                and accuracy of the data entered.
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                I accept full responsibility for verifying the accuracy of this profile and for ensuring compliance with all
                applicable federal, state, and local environmental regulations. I understand that this profile does not
                constitute legal advice and that I should consult with qualified environmental professionals and applicable
                laboratory testing as needed.
              </p>
              <p style={{ marginBottom: 0 }}>
                I further certify that I am authorized to make this profile on behalf of the generator and that all
                information provided is true, accurate, and complete to the best of my knowledge.
              </p>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <input type="checkbox" id="disclaimerAccept" checked={disclaimerAccepted}
                onChange={e => setDisclaimerAccepted(e.target.checked)}
                style={{ width: 20, height: 20, flexShrink: 0 }} />
              <label htmlFor="disclaimerAccept" style={{ marginBottom: 0, fontWeight: 600, color: '#92400e', fontSize: '0.92rem' }}>
                I have read and agree to the above disclaimer. I accept full responsibility for the inputs and outputs of this profile.
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            Clicking <strong>Run Profile</strong> will analyze this mixture against all applicable RCRA criteria and generate a full profile report.
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={back} disabled={step === 0 || submitting}>← Back</button>
        {step < 3
          ? <button className="btn btn-primary" onClick={next} disabled={submitting}>
              {submitting && step === 0 ? 'Saving…' : 'Next →'}
            </button>
          : <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Running…' : '🔬 Run Profile'}
            </button>}
      </div>
    </div>
  )
}
