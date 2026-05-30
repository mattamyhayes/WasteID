import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import MixtureBuilder from '../components/MixtureBuilder'
import FileUpload from '../components/FileUpload'
import DocumentList from '../components/DocumentList'
import { mixtures, customers as customersApi } from '../api/client'
import { EPA_STATUS_HOLD_DAYS, calcShipByInfo } from '../lib/shipByUtils'
import stateRulesData from '../data/stateRules.json'

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
            _displayName: c.component_name || c.custom_name || '',
            _epaCode: c.chemical_detail?.epa_waste_code || '',
            _casNumber: c.component_cas_number || c.cas_number || c.chemical_detail?.cas_number || '',
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

  // Resolve selected location state for state eval section
  const selectedLocation = locationsForCustomer.find(l => String(l.id) === String(locationId))
  const selectedState = selectedLocation?.state?.toUpperCase()?.trim()?.slice(0, 2) || ''
  const applicableStateRules = useMemo(() => {
    if (!selectedState) return []
    return stateRulesData.filter(r => r.state_code === selectedState && r.is_active)
  }, [selectedState])
  const stateRulesWithQuestions = useMemo(() => applicableStateRules.filter(r => r.questions && r.questions.length > 0), [applicableStateRules])

  // State eval status
  const [stateEvalResult, setStateEvalResult] = useState(null) // 'pass' | 'needs_info' | null

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

  // Helper to save profile (minimal – skips required field validation), returns the mixture id
  const saveProfileMinimal = async () => {
    const payload = {
      name: name.trim() || 'Untitled Profile',
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
    return id
  }

  // Helper to save profile and add components, returns the mixture id
  const saveProfile = async () => {
    const id = await saveProfileMinimal()

    // Add components
    for (const comp of components) {
      await mixtures.addComponent(id, {
        chemical: comp.chemical,
        custom_name: comp.custom_name,
        cas_number: comp._casNumber || comp.cas_number || '',
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

  // Sidebar navigation state
  const [activeSection, setActiveSection] = useState('upload')

  const SIDEBAR_ITEMS = [
    { key: 'upload', label: '📄 SDS Upload' },
    { key: 'mixture', label: '🧪 Mixture' },
    { key: 'generator', label: '🏭 Generator' },
    { key: 'analytics', label: '📊 Analytics' },
    { key: 'stateRules', label: '📜 State Rules' },
    { key: 'notes', label: '📝 Notes' },
  ]

  return (
    <div className="profile-page" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ color: '#14532d', marginBottom: '0.5rem' }}>{mixtureId ? `Profile: ${transactionId || mixtureId}` : 'New Profile'}</h1>

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

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Sidebar + main content layout */}
      <div className="profile-sidebar-layout">
        {/* Left sidebar navigation */}
        <div className="profile-sidebar">
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              className={`profile-sidebar-btn${activeSection === item.key ? ' active' : ''}`}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
          <button
            className="profile-sidebar-btn"
            onClick={handleSubmitForReview}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : '📋 Submit for Review'}
          </button>
          <button
            className="profile-sidebar-btn"
            onClick={handleCreateDetermination}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : '🧪 Create Determination'}
          </button>
        </div>

        {/* Main content area */}
        <div className="profile-main-content">
          {activeSection === 'upload' && (
            <div className="card" style={{ marginTop: 0 }}>
              <FileUpload
                profileId={mixtureId}
                transactionId={transactionId}
                fixedDocType="SDS"
                title="SDS Upload"
                description="Upload Safety Data Sheet (SDS) files for this profile. Accepted formats: PDF, images, Word, Excel."
                onBeforeUpload={!mixtureId ? saveProfileMinimal : undefined}
                onUploaded={() => setDocRefresh(r => r + 1)}
              >
                {mixtureId && <DocumentList profileId={mixtureId} transactionId={transactionId} key={docRefresh} filterDocType="SDS" components={components} onCompositionImported={(newComponents, sdsRecord) => {
                  setComponents(prev => [...prev, ...newComponents])
                }} />}
              </FileUpload>
            </div>
          )}

          {activeSection === 'mixture' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Mixture Components</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                Search the EPA chemical database or enter custom chemical names with quantities.
                You can edit component quantities and percentages after adding them.
              </p>
              <MixtureBuilder components={components} onChange={setComponents} editable />
            </div>
          )}

          {activeSection === 'generator' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '1rem', color: '#166534' }}>Generator Information</h2>

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
                  onChange={e => setGenerationDate(e.target.value)}
                  style={{ maxWidth: '220px' }} />
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
          )}

          {activeSection === 'analytics' && (
            <div className="card" style={{ marginTop: 0 }}>
              <FileUpload
                profileId={mixtureId}
                transactionId={transactionId}
                fixedDocType="A"
                title="Analytic Upload"
                description="Upload analytical files for this profile. Uploaded files are automatically treated as Analytic."
                onBeforeUpload={!mixtureId ? saveProfileMinimal : undefined}
                onUploaded={() => setDocRefresh(r => r + 1)}
              >
                {mixtureId && <DocumentList profileId={mixtureId} transactionId={transactionId} key={`analytics-${docRefresh}`} filterDocType="A" components={components} />}
              </FileUpload>
            </div>
          )}

          {activeSection === 'stateRules' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>State Specific Rules</h2>
              {!selectedState && (
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.92rem' }}>
                  Select a generator location to evaluate state specific rules.
                </p>
              )}

              {selectedState && applicableStateRules.length > 0 && (
                <div style={{ marginTop: '0.5rem', border: '2px solid #c4b5fd', background: '#faf5ff', borderRadius: 10, padding: '1.25rem' }}>
                  <h3 style={{ color: '#7c3aed', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
                    📜 State Evaluation Criteria
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    The selected generator location is in <strong>{selectedState}</strong>, which has{' '}
                    <strong>{applicableStateRules.length}</strong> unique state rule{applicableStateRules.length !== 1 ? 's' : ''} beyond federal RCRA.
                    {stateRulesWithQuestions.length > 0 && (
                      <> Click on a state rule below to view details and provide required information.</>
                    )}
                  </p>

                  {stateEvalResult === 'pass' && (
                    <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem', color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
                      ✅ All state rules have been satisfied.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {applicableStateRules.map(rule => {
                      const hasQuestions = rule.questions && rule.questions.length > 0
                      const returnPath = editId ? `/profile?edit=${editId}` : '/profile'
                      return (
                        <Link
                          key={rule.id}
                          to={`/state-rules?state=${selectedState}&mixture=${mixtureId || ''}&return=${encodeURIComponent(returnPath)}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: '#fff',
                            border: `1px solid ${hasQuestions ? '#fde68a' : '#d1d5db'}`,
                            borderRadius: 8,
                            textDecoration: 'none',
                            color: '#374151',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{hasQuestions ? '⚠️' : '✅'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#14532d' }}>
                              {rule.id} — {rule.rule_category.charAt(0).toUpperCase() + rule.rule_category.slice(1)}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.15rem' }}>
                              {rule.description.length > 120 ? rule.description.slice(0, 120) + '…' : rule.description}
                            </div>
                          </div>
                          {hasQuestions && (
                            <span style={{ fontSize: '0.78rem', background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {rule.questions.length} question{rule.questions.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          <span style={{ color: '#9ca3af' }}>→</span>
                        </Link>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #c4b5fd' }}
                      onClick={async () => {
                        if (!mixtureId) return
                        try {
                          const res = await mixtures.validateStateRules(mixtureId, stateAnswers)
                          setStateEvalResult(res.data.overall_result)
                          if (res.data.overall_result === 'needs_info' && res.data.questions.length > 0) {
                            setStateQuestions(res.data.questions)
                            setSavedMixtureId(mixtureId)
                            setStateRulesModal(true)
                          }
                        } catch { /* ignore */ }
                      }}
                      disabled={!mixtureId}
                    >
                      🔄 Evaluate State Rules
                    </button>
                  </div>
                </div>
              )}

              {selectedState && applicableStateRules.length === 0 && (
                <div style={{ marginTop: '0.5rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '1.25rem' }}>
                  <p style={{ color: '#166534', margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>
                    ✅ No unique state rules for {selectedState}. Federal RCRA rules are sufficient.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'notes' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '1rem', color: '#166534' }}>Notes</h2>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Notes</label>
                <textarea className="form-control" rows={5} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional observations or context…" />
              </div>
            </div>
          )}
        </div>
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
