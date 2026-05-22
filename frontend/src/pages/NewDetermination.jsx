import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import MixtureBuilder from '../components/MixtureBuilder'
import FileUpload from '../components/FileUpload'
import DocumentList from '../components/DocumentList'
import { mixtures, customers as customersApi } from '../api/client'
import { EPA_STATUS_HOLD_DAYS, calcShipByInfo } from '../lib/shipByUtils'

const DISCARD_REASONS = [
  { value: 'spent', label: 'Spent material (used and no longer useful)' },
  { value: 'off-spec', label: 'Off-specification product' },
  { value: 'residue', label: 'Container/tank residue' },
  { value: 'unused_commercial', label: 'Unused commercial chemical product' },
  { value: 'byproduct', label: 'By-product of a process' },
  { value: 'recycled_product_exempt', label: 'Recycled/reclaimed material (may be exempt)' },
  { value: 'other', label: 'Other discarded material' },
]

const SHIPMENT_SIZE_UNITS = [
  { value: 'gallons', label: 'Drums' },
  { value: 'cyb', label: 'CYB' },
  { value: 'bulk', label: 'Bulk' },
]

const SHIPMENT_SIZE_QTYS = [5, 15, 30, 55, 85, 95]

const EPA_GENERATOR_STATUSES = [
  { value: 'VSQG', label: 'VSQG – Very Small Quantity Generator' },
  { value: 'SQG', label: 'SQG – Small Quantity Generator' },
  { value: 'LQG', label: 'LQG – Large Quantity Generator' },
]

const EPA_GENERATOR_STATUS_GUIDANCE = {
  LQG: [
    'Can hold waste for up to 90 days.',
  ],
  SQG: [
    'Can hold waste for up to 180 days.',
  ],
  VSQG: [
    'Non-acute waste: can be held for up to 180 days.',
    'Cannot generate more than 220 lbs (100 kg) monthly or hold more than 2,200 lbs (1,000 kg) on-site at any time.',
    'Acute waste: can hold up to 2.2 lbs (1 kg) for 90 days.',
  ],
}

export default function NewDetermination() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // State rules
  const [stateRulesModal, setStateRulesModal] = useState(false)
  const [stateQuestions, setStateQuestions] = useState([])
  const [stateAnswers, setStateAnswers] = useState({})
  const [stateValidating, setStateValidating] = useState(false)
  const [savedMixtureId, setSavedMixtureId] = useState(null)

  // Mixture record
  const [mixtureId, setMixtureId] = useState(null)
  const [transactionId, setTransactionId] = useState('')

  // Waste Profile
  const [name, setName] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [isDiscarded, setIsDiscarded] = useState(true)
  const [discardReason, setDiscardReason] = useState('spent')
  const [processDesc, setProcessDesc] = useState('')
  const [components, setComponents] = useState([])
  const [flashPoint, setFlashPoint] = useState('')
  const [ph, setPh] = useState('')
  const [isReactive, setIsReactive] = useState(false)
  const [notes, setNotes] = useState('')

  // Shipment & EPA fields
  const [shipmentSizeUnit, setShipmentSizeUnit] = useState('')
  const [shipmentSizeQty, setShipmentSizeQty] = useState('')
  const [epaGeneratorStatus, setEpaGeneratorStatus] = useState('')
  const [generationDate, setGenerationDate] = useState('')

  // Generator data
  const [customerList, setCustomerList] = useState([])
  const [docRefresh, setDocRefresh] = useState(0)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState('')

  // Compute ship-by date and days remaining
  const holdDays = EPA_STATUS_HOLD_DAYS[epaGeneratorStatus] ?? null
  const shipByInfo = useMemo(
    () => calcShipByInfo(epaGeneratorStatus, generationDate),
    [epaGeneratorStatus, generationDate]
  )

  // Reset all state on mount (or load existing profile in edit mode)
  useEffect(() => {
    setError('')
    setSubmitting(false)
    if (!editId) {
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
      setShipmentSizeUnit('')
      setShipmentSizeQty('')
      setEpaGeneratorStatus('')
      setGenerationDate('')
    }
  }, [editId])

  // Load existing profile when in edit mode
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    async function loadProfile() {
      try {
        const res = await mixtures.get(editId)
        if (cancelled) return
        const m = res.data
        setMixtureId(m.id)
        setTransactionId(m.transaction_id || '')
        setName(m.name || '')
        setCustomerId(m.customer ? String(m.customer) : '')
        setLocationId(m.customer_location ? String(m.customer_location) : '')
        setIsDiscarded(m.is_discarded !== false)
        setDiscardReason(m.discard_reason || 'spent')
        setProcessDesc(m.process_description || '')
        setNotes(m.notes || '')
        setShipmentSizeUnit(m.shipment_size_unit || '')
        setShipmentSizeQty(m.shipment_size_qty ? String(m.shipment_size_qty) : '')
        setEpaGeneratorStatus(m.epa_generator_status || '')
        setGenerationDate(m.generation_date || '')
          // Load components
        if (m.components && m.components.length > 0) {
          setComponents(m.components.map(c => ({
            chemical: c.chemical || null,
            custom_name: c.custom_name || '',
            quantity: c.quantity,
            unit: c.unit,
            component_name: c.component_name || c.custom_name || '',
          })))
        }
      } catch (e) {
        setError('Could not load profile for editing.')
      }
    }
    loadProfile()
    return () => { cancelled = true }
  }, [editId])

  // Load generators once
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
        setCustomersError('Could not load generators. You can still proceed by adding a generator first.')
      } finally {
        if (!cancelled) setCustomersLoading(false)
      }
    }
    loadCustomers()
    return () => { cancelled = true }
  }, [])

  // Location options come from the selected customer's nested `locations` payload.
  const selectedCustomer = customerList.find(c => String(c.id) === String(customerId))
  const locationsForCustomer = selectedCustomer?.locations || []

  useEffect(() => {
    if (!customerId) {
      setEpaGeneratorStatus('')
      return
    }
    setEpaGeneratorStatus(selectedCustomer?.epa_generator_status || '')
  }, [customerId, selectedCustomer?.epa_generator_status])

  const handleStateRulesSubmit = async () => {
    setStateValidating(true)
    try {
      const result = await mixtures.validateStateRules(savedMixtureId, stateAnswers)
      if (result.data.overall_result === 'needs_info' && result.data.questions.length > 0) {
        setStateQuestions(result.data.questions)
      } else {
        setStateRulesModal(false)
        navigate('/review')
      }
    } catch (e) {
      setError('State validation failed. Please try again.')
      setStateRulesModal(false)
    } finally {
      setStateValidating(false)
    }
  }

  const validate = () => {
    if (!name.trim()) { setError('Please enter a mixture name.'); return false }
    if (!customerId) { setError('Please select a generator.'); return false }
    if (locationsForCustomer.length > 0 && !locationId) {
      setError('Please select a generator location.'); return false
    }
    if (components.length === 0) { setError('Add at least one component to the mixture.'); return false }
    setError('')
    return true
  }

  // Helper to save profile and add components, returns the mixture id
  const saveProfile = async () => {
    const payload = {
      name: name.trim(),
      is_discarded: isDiscarded,
      discard_reason: isDiscarded ? discardReason : '',
      process_description: processDesc,
      notes,
      customer: customerId ? Number(customerId) : null,
      customer_location: locationId ? Number(locationId) : null,
      shipment_size_unit: shipmentSizeUnit,
      shipment_size_qty: shipmentSizeQty ? Number(shipmentSizeQty) : null,
      epa_generator_status: epaGeneratorStatus,
      generation_date: generationDate || null,
    }

    let id = mixtureId
    if (id) {
      await mixtures.update(id, payload)
    } else {
      const res = await mixtures.create(payload)
      id = res.data.id
      setMixtureId(id)
      setTransactionId(res.data.transaction_id || '')
    }

    // Add components
    for (const comp of components) {
      await mixtures.addComponent(id, {
        chemical: comp.chemical,
        custom_name: comp.custom_name,
        quantity: comp.quantity,
        unit: comp.unit,
      })
    }

    return id
  }

  // Save the profile and submit for review (no determination run yet)
  const handleSubmitForReview = async () => {
    if (!validate()) return
    setSubmitting(true)
    setError('')
    try {
      const id = await saveProfile()

      // Mark as pending review
      await mixtures.setReviewStatus(id, 'pending_review')

      // Run state rules validation (SR-FLOW-1)
      const stateResult = await mixtures.validateStateRules(id)
      if (stateResult.data.overall_result === 'needs_info' && stateResult.data.questions.length > 0) {
        setSavedMixtureId(id)
        setStateQuestions(stateResult.data.questions)
        setStateRulesModal(true)
        return // Don't navigate yet - wait for answers
      }
      // State rules passed - proceed
      navigate('/review')
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not save profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Save the profile and immediately run a determination
  const handleCreateDetermination = async () => {
    if (!validate()) return
    setSubmitting(true)
    setError('')
    try {
      const id = await saveProfile()

      // Build additional props from draft values
      const additionalProps = {}
      if (flashPoint !== '') additionalProps.flash_point_c = parseFloat(flashPoint)
      if (ph !== '') additionalProps.ph = parseFloat(ph)
      if (isReactive) additionalProps.is_reactive = true

      const detRes = await mixtures.determine(id, additionalProps, {})
      navigate(`/results/${detRes.data.determination_id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not create determination. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 780 }}>
      <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>New Profile</h1>

      {/* Days Remaining Banner */}
      {shipByInfo && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: 10,
          marginBottom: '1rem',
          background: shipByInfo.daysRemaining <= 0 ? '#fef2f2'
            : shipByInfo.daysRemaining <= 5 ? '#fffbeb'
            : '#f0fdf4',
          border: `2px solid ${shipByInfo.daysRemaining <= 0 ? '#dc2626'
            : shipByInfo.daysRemaining <= 5 ? '#f59e0b'
            : '#16a34a'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '2rem' }}>
            {shipByInfo.daysRemaining <= 0 ? '🚨' : shipByInfo.daysRemaining <= 5 ? '⏰' : '📅'}
          </span>
          <div>
            <div style={{
              fontSize: '1.3rem',
              fontWeight: 800,
              color: shipByInfo.daysRemaining <= 0 ? '#b91c1c'
                : shipByInfo.daysRemaining <= 5 ? '#92400e'
                : '#15803d',
            }}>
              {shipByInfo.daysRemaining <= 0
                ? `OVERDUE — shipment was due ${Math.abs(shipByInfo.daysRemaining)} day(s) ago`
                : `${shipByInfo.daysRemaining} day(s) remaining to ship`}
            </div>
            <div style={{ fontSize: '0.88rem', color: '#6b7280', marginTop: 2 }}>
              Ship by: <strong>{new Date(shipByInfo.shipByDate + 'T00:00:00').toLocaleDateString()}</strong>
              {' · '}{epaGeneratorStatus} allows {holdDays} days from generation
            </div>
          </div>
        </div>
      )}

      {/* Transaction ID banner once issued */}
      {transactionId && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <strong>Transaction ID:</strong> {transactionId}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Document Upload Section */}
      {mixtureId && (
        <div style={{ marginBottom: '1.25rem' }}>
          <FileUpload profileId={mixtureId} transactionId={transactionId} onUploaded={() => setDocRefresh(r => r + 1)} />
          <DocumentList profileId={mixtureId} transactionId={transactionId} key={docRefresh} />
        </div>
      )}
      {!mixtureId && (
        <div className="card" style={{ marginBottom: '1.25rem', background: '#f9fafb' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
            📎 <strong>Document upload</strong> will be available after the profile is saved for the first time.
          </p>
        </div>
      )}

      {/* Waste Profile */}
      <>
        <div className="card">
          <h2 style={{ marginBottom: '1.25rem', color: '#166534' }}>Generator Information</h2>

          <div className="form-group">
            <label>Generator *</label>
            {customersError && <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{customersError}</div>}
            <select className="form-control" value={customerId}
              onChange={e => { setCustomerId(e.target.value); setLocationId('') }}
              disabled={customersLoading}>
              <option value="">{customersLoading ? 'Loading generators…' : '-- Select a generator --'}</option>
              {customerList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <small style={{ color: '#6b7280' }}>
              Don't see your generator?{' '}
              <Link to="/generators/new" style={{ color: '#166534', fontWeight: 600 }}>Add a new generator</Link>
              {' '}first, then return here.
            </small>
          </div>

          <div className="form-group">
            <label>Generator Location {locationsForCustomer.length > 0 ? '*' : ''}</label>
            <select className="form-control" value={locationId}
              onChange={e => setLocationId(e.target.value)}
              disabled={!customerId || locationsForCustomer.length === 0}>
              <option value="">
                {!customerId ? '-- Select a generator first --'
                  : locationsForCustomer.length === 0 ? 'No locations on file for this generator'
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
                <Link to="/generators" style={{ color: '#166534', fontWeight: 600 }}>View generators</Link> to add a location.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Mixture / Sample Name *</label>
            <input className="form-control" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Waste Solvent Batch #12, Lab Cleanup Mixture" />
          </div>

          <div className="form-group">
            <label>Generation Date</label>
            <input className="form-control" type="date" value={generationDate}
              onChange={e => setGenerationDate(e.target.value)} />
            <small style={{ color: '#6b7280' }}>Date the waste was generated. Used to calculate the ship-by deadline.</small>
          </div>

          <div className="form-group">
            <label>Generator EPA Status</label>
            <select className="form-control" value={epaGeneratorStatus}
              onChange={e => setEpaGeneratorStatus(e.target.value)}>
              <option value="">-- Select EPA status --</option>
              {EPA_GENERATOR_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {epaGeneratorStatus && (
              <div style={{ marginTop: '0.45rem' }}>
                <small style={{ color: '#166534', fontWeight: 700, display: 'block' }}>
                  {epaGeneratorStatus} regulatory guidance
                </small>
                <ul style={{ margin: '0.35rem 0 0 1.1rem', padding: 0, color: '#166534', fontSize: '0.82rem' }}>
                  {(EPA_GENERATOR_STATUS_GUIDANCE[epaGeneratorStatus] || [`Can hold waste for up to ${EPA_STATUS_HOLD_DAYS[epaGeneratorStatus] ?? '—'} days.`]).map(item => (
                    <li key={item} style={{ marginBottom: '0.2rem' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <h3 style={{ color: '#166534', marginTop: '1.25rem', marginBottom: '0.75rem', fontSize: '1rem' }}>Shipment Size</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Size Unit</label>
              <select className="form-control" value={shipmentSizeUnit}
                onChange={e => { setShipmentSizeUnit(e.target.value); if (e.target.value === 'bulk') setShipmentSizeQty('') }}>
                <option value="">-- Select unit --</option>
                {SHIPMENT_SIZE_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Quantity</label>
              {shipmentSizeUnit === 'bulk' ? (
                <input className="form-control" type="number" min="0" step="any"
                  value={shipmentSizeQty}
                  onChange={e => setShipmentSizeQty(e.target.value)}
                  placeholder="Enter quantity" />
              ) : (
                <select className="form-control" value={shipmentSizeQty}
                  onChange={e => setShipmentSizeQty(e.target.value)}>
                  <option value="">-- Select quantity --</option>
                  {SHIPMENT_SIZE_QTYS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
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

        {/* Components section */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Mixture Components</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            Search the EPA chemical database or enter custom chemical names with quantities.
            You can edit component quantities and percentages after adding them.
          </p>
          <MixtureBuilder components={components} onChange={setComponents} editable />
        </div>

        {/* Notes */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional observations or context…" />
          </div>
        </div>
      </>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {error && <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, marginRight: 'auto' }}>⚠ {error}</span>}
        <button className="btn btn-primary" onClick={handleSubmitForReview} disabled={submitting}>
          {submitting ? 'Saving…' : '📋 Submit for Review'}
        </button>
        <button className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={handleCreateDetermination} disabled={submitting}>
          {submitting ? 'Saving…' : '🧪 Create Determination'}
        </button>
      </div>

      {/* State Rules Follow-up Questions Modal */}
      {stateRulesModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200,
        }}>
          <div className="card" style={{ maxWidth: 600, width: '90%', padding: '2rem', maxHeight: '80vh', overflow: 'auto' }}>
            <h2 style={{ color: '#14532d', marginBottom: '0.75rem' }}>
              📋 Additional State Requirements
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your generator's state requires additional information before this profile can proceed to review.
              Please answer the following questions.
            </p>
            {stateQuestions.map((q, idx) => (
              <div key={q.id || idx} className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, color: '#374151' }}>
                  {q.text || q.label || q.question || `Question ${idx + 1}`}
                </label>
                {q.type === 'boolean' || q.type === 'yes_no' ? (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input type="radio" name={`sq_${q.id || idx}`}
                        checked={stateAnswers[q.rule_id_code]?.[q.id] === 'yes'}
                        onChange={() => setStateAnswers(prev => ({
                          ...prev,
                          [q.rule_id_code]: { ...(prev[q.rule_id_code] || {}), [q.id]: 'yes' }
                        }))} />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input type="radio" name={`sq_${q.id || idx}`}
                        checked={stateAnswers[q.rule_id_code]?.[q.id] === 'no'}
                        onChange={() => setStateAnswers(prev => ({
                          ...prev,
                          [q.rule_id_code]: { ...(prev[q.rule_id_code] || {}), [q.id]: 'no' }
                        }))} />
                      No
                    </label>
                  </div>
                ) : (
                  <input className="form-control"
                    value={stateAnswers[q.rule_id_code]?.[q.id] || ''}
                    onChange={e => setStateAnswers(prev => ({
                      ...prev,
                      [q.rule_id_code]: { ...(prev[q.rule_id_code] || {}), [q.id]: e.target.value }
                    }))}
                    placeholder={q.placeholder || 'Enter your answer'} />
                )}
                {q.help_text && (
                  <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>{q.help_text}</small>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => { setStateRulesModal(false) }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleStateRulesSubmit} disabled={stateValidating}>
                {stateValidating ? 'Validating…' : 'Submit & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
