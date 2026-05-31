import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import MixtureBuilder from '../components/MixtureBuilder'
import FileUpload from '../components/FileUpload'
import DocumentList from '../components/DocumentList'
import DocumentsSection from '../components/DocumentsSection'
import AnalyticsUpload from '../components/AnalyticsUpload'
import axios from 'axios'
import { mixtures, customers as customersApi, sds, isStaticMode } from '../api/client'
import { EPA_STATUS_HOLD_DAYS, calcShipByInfo } from '../lib/shipByUtils'
import stateRulesData from '../data/stateRules.json'
import stateWasteCodesData from '../data/stateWasteCodes.json'

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

const SIDEBAR_ICON_STYLE = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 2px 6px rgba(20,83,45,0.15)',
}

const SIDEBAR_ICON_STYLE_BLUE = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #1e3a5f 0%, #4a90a4 100%)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 2px 6px rgba(30,58,95,0.15)',
}

const SIDEBAR_ICON_STYLE_AMBER = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 2px 6px rgba(146,64,14,0.15)',
}

const SIDEBAR_SVG_STYLE = { width: 12, height: 12, display: 'inline-flex' }

const STAGE_COLORS = {
  'Draft': { background: '#f3f4f6', color: '#4b5563' },
  'Pending Review': { background: '#fef3c7', color: '#92400e' },
  'Approved': { background: '#dcfce7', color: '#166534' },
  'Rejected': { background: '#fef2f2', color: '#991b1b' },
}

function getProfileStage(m) {
  if (m.profile_stage) return m.profile_stage
  if (!m.review_status || m.review_status === 'draft') return 'Draft'
  if (m.review_status === 'pending_review') return 'Pending Review'
  if (m.review_status === 'approved') return 'Approved'
  if (m.review_status === 'rejected') return 'Rejected'
  return 'Draft'
}

const STATUS_TILES = [
  { key: 'all', label: 'All', color: '#4a90a4', bg: '#f0f7fa', border: '#4a90a4' },
  { key: 'draft', label: 'Draft', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  { key: 'pending_review', label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', border: '#fbbf24' },
  { key: 'approved', label: 'Approved', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  { key: 'rejected', label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
]

export default function NewDetermination() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const editId = searchParams.get('edit')
  const newGeneratorParam = searchParams.get('newGenerator')
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
  const [profileName, setProfileName] = useState('')
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

  // Properties (Physical / Chemical / Other)
  const PROPERTIES_DEFAULTS = {
    // Physical
    color: '', ph_prop: '', odor: '', phases_layers: '',
    // Chemical
    btu_value: '', specific_gravity: '',
    // Other (booleans)
    pyrophoric: false, polymerizable_inhibited: false, dioxins: false,
    shock_sensitive: false, polymerizable_organic_peroxides: false,
    pesticides_herbicides: false, explosive_oxidizer: false,
    asbestos_friable: false, furans: false, reactive_prop: false,
    cyanides: false, radioactive: false, water_reactive: false,
    asbestos_non_friable: false, norm: false,
    thermally_unstable_air_reactive: false, metal_fines: false,
    biohazard_infectious: false, reactive_sulfides: false,
  }
  const [properties, setProperties] = useState({ ...PROPERTIES_DEFAULTS })
  // Track source per field: 'imported' | 'manual' | 'modified'
  const [propertiesSources, setPropertiesSources] = useState({})

  // Import from SDS via EPA SRS
  const [sdsImportLoading, setSdsImportLoading] = useState(false)
  const [sdsImportResults, setSdsImportResults] = useState(null)
  const [sdsImportError, setSdsImportError] = useState('')
  const [sdsImportProgress, setSdsImportProgress] = useState(null) // { current, total, currentName }

  const EPA_SRS_BASE_URL = 'https://cdxapps.epa.gov/oms-substance-registry-services/rest-api'

  const searchEpaSrs = async (searchType, query) => {
    if (isStaticMode) {
      const endpoint = searchType === 'cas' ? 'cas' : 'name'
      const param = searchType === 'cas' ? 'casList' : 'nameList'
      const url = `${EPA_SRS_BASE_URL}/substances/${endpoint}?${param}=${encodeURIComponent(query)}`
      const response = await axios.get(url)
      return Array.isArray(response.data) ? response.data : response.data ? [response.data] : []
    }
    const apiUrl = `${import.meta.env.VITE_API_URL}/api/epa-srs-lookup/`
    const response = await axios.get(apiUrl, { params: { search_type: searchType, query } })
    return response.data?.results || []
  }

  const handleImportFromSds = async () => {
    if (!components || components.length === 0) {
      setSdsImportError('No constituents found. Add chemicals in the Constituents section first.')
      return
    }

    setSdsImportLoading(true)
    setSdsImportError('')
    setSdsImportResults(null)
    setSdsImportProgress({ current: 0, total: components.length, currentName: '' })

    try {
      const results = []

      for (let i = 0; i < components.length; i++) {
        const comp = components[i]
        const chemName = comp._displayName || comp.custom_name || ''
        const casNumber = comp._casNumber || ''
        const entry = { name: chemName, cas: casNumber, status: 'pending', data: null, error: null }

        // Update progress indicator
        setSdsImportProgress({ current: i + 1, total: components.length, currentName: chemName || casNumber || `Component ${i + 1}` })

        try {
          let data
          if (casNumber) {
            data = await searchEpaSrs('cas', casNumber)
          } else if (chemName) {
            data = await searchEpaSrs('name', chemName)
          } else {
            entry.status = 'skipped'
            entry.error = 'No CAS number or name available'
            results.push(entry)
            // Show incremental results
            setSdsImportResults([...results])
            continue
          }

          if (data && data.length > 0) {
            entry.status = 'found'
            entry.data = data[0] // Use first match
          } else {
            entry.status = 'not_found'
            entry.error = 'No results found in EPA SRS'
          }
        } catch (err) {
          entry.status = 'error'
          entry.error = err.response?.data?.error || err.message || 'Request failed'
        }

        results.push(entry)
        // Show incremental results as each component completes
        setSdsImportResults([...results])
      }
    } catch (err) {
      setSdsImportError('Import process encountered an unexpected error: ' + (err.message || 'Unknown error. Please try again.'))
    } finally {
      setSdsImportLoading(false)
      setSdsImportProgress(null)
    }
  }

  const applyImportedSdsProperties = (substance) => {
    const characteristics = substance.characteristics || []
    const newProps = {}

    characteristics.forEach(item => {
      const label = (typeof item === 'string' ? item : (item.name || item.characteristicName || '')).toLowerCase()
      const value = typeof item === 'object' ? (item.value || item.characteristicValue || '') : ''

      if (label.includes('color')) newProps.color = value || 'Yes'
      else if (label.includes('ph')) newProps.ph_prop = value || ''
      else if (label.includes('odor')) newProps.odor = value || 'Yes'
      else if (label.includes('phase') || label.includes('layer')) newProps.phases_layers = value || ''
      else if (label.includes('btu')) newProps.btu_value = value || ''
      else if (label.includes('specific gravity') || label.includes('gravity')) newProps.specific_gravity = value || ''
      else if (label.includes('pyrophoric')) newProps.pyrophoric = true
      else if (label.includes('polymerizable') && label.includes('inhibited')) newProps.polymerizable_inhibited = true
      else if (label.includes('dioxin')) newProps.dioxins = true
      else if (label.includes('shock')) newProps.shock_sensitive = true
      else if (label.includes('organic peroxide') || (label.includes('polymerizable') && !label.includes('inhibited'))) newProps.polymerizable_organic_peroxides = true
      else if (label.includes('pesticide') || label.includes('herbicide')) newProps.pesticides_herbicides = true
      else if (label.includes('explosive') || label.includes('oxidizer')) newProps.explosive_oxidizer = true
      else if (label.includes('asbestos') && label.includes('friable') && !label.includes('non')) newProps.asbestos_friable = true
      else if (label.includes('furan')) newProps.furans = true
      else if (label.includes('reactive') && label.includes('water')) newProps.water_reactive = true
      else if (label.includes('reactive') && label.includes('sulfide')) newProps.reactive_sulfides = true
      else if (label.includes('reactive')) newProps.reactive_prop = true
      else if (label.includes('cyanide')) newProps.cyanides = true
      else if (label.includes('radioactive')) newProps.radioactive = true
      else if (label.includes('asbestos') && label.includes('non')) newProps.asbestos_non_friable = true
      else if (label.includes('norm')) newProps.norm = true
      else if (label.includes('thermally unstable') || label.includes('air reactive')) newProps.thermally_unstable_air_reactive = true
      else if (label.includes('metal fines') || label.includes('metal fine')) newProps.metal_fines = true
      else if (label.includes('biohazard') || label.includes('infectious')) newProps.biohazard_infectious = true
    })

    if (Object.keys(newProps).length > 0) {
      setProperties(prev => ({ ...prev, ...newProps }))
      setPropertiesSources(prev => {
        const newSources = { ...prev }
        Object.keys(newProps).forEach(k => { newSources[k] = 'imported' })
        return newSources
      })
    }

    return Object.keys(newProps).length
  }

  const updateProperty = (key, value) => {
    setProperties(prev => ({ ...prev, [key]: value }))
    setPropertiesSources(prev => {
      const prevSource = prev[key]
      if (prevSource === 'imported') return { ...prev, [key]: 'modified' }
      return { ...prev, [key]: prev[key] || 'manual' }
    })
  }

  // Shipping Name
  const [importedSdsRecord, setImportedSdsRecord] = useState(null)
  const [shippingNameVerified, setShippingNameVerified] = useState(false)
  const [shippingNameUserNote, setShippingNameUserNote] = useState('')

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

  // Derive Proper Shipping Name (PSN) from constituents
  const derivedPSN = useMemo(() => {
    if (!components || components.length === 0) return ''
    // Build PSN from constituent names: use primary component or mixture description
    const names = components
      .map(c => c._displayName || c.custom_name || '')
      .filter(Boolean)
    if (names.length === 0) return ''
    if (names.length === 1) return `Waste ${names[0]}`
    // For mixtures, list top constituents (up to 3)
    const top = names.slice(0, 3).join(', ')
    return `Waste ${top}${names.length > 3 ? ', et al.' : ''}`
  }, [components])

  // DOT Shipping Name from SDS Section 14
  const dotShippingName = useMemo(() => {
    return importedSdsRecord?.un_proper_shipping_name || ''
  }, [importedSdsRecord])

  // Compare PSN and DOT shipping name
  const shippingNameMatch = useMemo(() => {
    if (!derivedPSN || !dotShippingName) return null
    const normPsn = derivedPSN.toLowerCase().replace(/^waste\s+/i, '').trim()
    const normDot = dotShippingName.toLowerCase().replace(/^waste\s+/i, '').trim()
    if (normPsn === normDot) return 'exact'
    if (normDot.includes(normPsn) || normPsn.includes(normDot)) return 'partial'
    return 'mismatch'
  }, [derivedPSN, dotShippingName])

  // Load SDS records for the profile when mixtureId is set
  useEffect(() => {
    if (!mixtureId) return
    sds.list(mixtureId).then(res => {
      const records = res?.data?.results || res?.data || []
      if (records.length > 0) {
        // Use the most recent SDS record
        setImportedSdsRecord(records[records.length - 1])
      }
    }).catch(() => {})
  }, [mixtureId, docRefresh])

  // Reset all state on mount (or load existing profile in edit mode)
  useEffect(() => {
    setError('')
    setSubmitting(false)
    if (editId) {
      setActiveSection('upload')
    } else if (activeSection !== 'myProfiles') {
      setActiveSection('myProfiles')
    }
    if (!editId) {
      setMixtureId(null)
      setTransactionId('')
      setProfileName('')
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
      setProperties({ ...PROPERTIES_DEFAULTS })
      setPropertiesSources({})
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
        setProfileName(m.profile_name || '')
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
        if (m.properties) setProperties({ ...PROPERTIES_DEFAULTS, ...m.properties })
        if (m.properties_sources) setPropertiesSources(m.properties_sources)
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

  // Load generators (refresh when navigating back to this page)
  useEffect(() => {
    let cancelled = false
    async function loadCustomers() {
      setCustomersLoading(true)
      try {
        const res = await customersApi.list()
        if (cancelled) return
        const list = res.data.results || res.data
        setCustomerList(list)
        // Auto-select newly created generator if returning from add-generator flow
        if (newGeneratorParam && list.find(c => String(c.id) === String(newGeneratorParam))) {
          setCustomerId(String(newGeneratorParam))
          setLocationId('')
          // Clear the param from URL so it doesn't persist on refresh
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.delete('newGenerator')
            return next
          }, { replace: true })
        }
      } catch (e) {
        if (cancelled) return
        setCustomersError('Could not load generators. You can still proceed by adding a generator first.')
      } finally {
        if (!cancelled) setCustomersLoading(false)
      }
    }
    loadCustomers()
    return () => { cancelled = true }
  }, [location.key])

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
    if (!name.trim()) { setError('Please enter a sample name.'); return false }
    if (!customerId) { setError('Please select a generator.'); return false }
    if (locationsForCustomer.length > 0 && !locationId) {
      setError('Please select a generator location.'); return false
    }
    if (components.length === 0) { setError('Add at least one constituent.'); return false }
    setError('')
    return true
  }

  // Helper to save profile (minimal – skips required field validation), returns the mixture id
  const saveProfileMinimal = async () => {
    const payload = {
      name: name.trim() || 'Untitled Profile',
      profile_name: profileName.trim(),
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
      properties: properties,
      properties_sources: propertiesSources,
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
  const [activeSection, setActiveSection] = useState(editId || newGeneratorParam ? 'generator' : 'myProfiles')
  const autoSaveTimerRef = useRef(null)
  const isSavingRef = useRef(false)

  // Scroll to top and auto-save when changing tabs
  const navigateToSection = useCallback((section) => {
    // Auto-save current data before switching (if we have meaningful data)
    if (activeSection !== 'myProfiles' && !isSavingRef.current && (mixtureId || name.trim())) {
      isSavingRef.current = true
      saveProfileMinimal().catch(() => { /* auto-save is best-effort */ }).finally(() => { isSavingRef.current = false })
    }
    setActiveSection(section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSection, mixtureId, name])

  // Debounced auto-save: save profile data after user stops changing fields
  useEffect(() => {
    // Only auto-save if we have some data entered and we are editing a profile tab
    if (activeSection === 'myProfiles' || (!mixtureId && !name.trim())) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (!isSavingRef.current) {
        isSavingRef.current = true
        saveProfileMinimal().catch(() => { /* auto-save is best-effort */ }).finally(() => { isSavingRef.current = false })
      }
    }, 2000)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  }, [activeSection, mixtureId, profileName, name, customerId, locationId, isDiscarded, discardReason, processDesc, notes,
      shipmentSizeUnit, shipmentSizeQty, epaGeneratorStatus, generationDate, flashPoint, ph,
      isReactive, properties, shippingNameVerified, shippingNameUserNote])

  // My Profiles data
  const [myProfiles, setMyProfiles] = useState([])
  const [myProfilesLoading, setMyProfilesLoading] = useState(false)
  const [myProfilesTile, setMyProfilesTile] = useState('all')

  const loadMyProfiles = async () => {
    setMyProfilesLoading(true)
    try {
      const res = await mixtures.list()
      const all = res.data.results || res.data
      setMyProfiles(all)
    } finally {
      setMyProfilesLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'myProfiles') {
      loadMyProfiles()
    }
  }, [activeSection])

  const myProfilesTileCounts = useMemo(() => {
    return {
      all: myProfiles.length,
      draft: myProfiles.filter(m => !m.review_status || m.review_status === 'draft').length,
      pending_review: myProfiles.filter(m => m.review_status === 'pending_review').length,
      approved: myProfiles.filter(m => m.review_status === 'approved').length,
      rejected: myProfiles.filter(m => m.review_status === 'rejected').length,
    }
  }, [myProfiles])

  const filteredMyProfiles = useMemo(() => {
    if (myProfilesTile === 'all') return myProfiles
    if (myProfilesTile === 'draft') return myProfiles.filter(m => !m.review_status || m.review_status === 'draft')
    return myProfiles.filter(m => m.review_status === myProfilesTile)
  }, [myProfiles, myProfilesTile])

  const handleSelectProfile = (profile) => {
    navigate(`/profile?edit=${profile.id}`)
    setActiveSection('generator')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNewProfile = () => {
    navigate('/profile')
    // Reset state for a new profile
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
    setProperties({ ...PROPERTIES_DEFAULTS })
    setPropertiesSources({})
    setImportedSdsRecord(null)
    setShippingNameVerified(false)
    setShippingNameUserNote('')
    setActiveSection('generator')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const SIDEBAR_ITEMS = [
    { key: 'generator', label: 'Generator', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l5 3V6l4 2V4l5 4v11"/><path d="M9 21v-4h3v4"/></svg>
    )},
    { key: 'profileName', label: 'Profile Name', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
    )},
    { key: 'upload', label: 'SDS Upload', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
    )},
    { key: 'constituents', label: 'Constituents', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v4l4 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L9 7V3z"/><line x1="9" y1="3" x2="15" y2="3"/><path d="M8 14h8"/></svg>
    )},
    { key: 'shippingName', label: 'Shipping Name', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    )},
    { key: 'properties', label: 'Properties', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/><circle cx="12" cy="7" r="1"/></svg>
    )},
    { key: 'analytics', label: 'Analytics', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    )},
    { key: 'wasteCodes', label: 'Waste Codes', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>
    )},
    { key: 'stateRules', label: 'State Rules', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    )},
    { key: 'notes', label: 'Notes', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    )},
    { key: 'documents', label: 'Documents', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    )},
  ]

  return (
    <div className="profile-page" style={{ padding: '0.75rem 1.5rem' }}>
      <h1 style={{ color: '#14532d', marginBottom: '0.25rem', fontSize: '1.3rem' }}>{mixtureId ? `Profile: ${transactionId || mixtureId}` : 'Profile'}</h1>
      {mixtureId && profileName && (
        <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem', marginTop: '-0.25rem' }}>{profileName}</div>
      )}

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
          {/* My Profiles - earthy blue icon */}
          <button
            className={`profile-sidebar-btn${activeSection === 'myProfiles' ? ' active' : ''}`}
            onClick={() => navigateToSection('myProfiles')}
          >
            <span style={SIDEBAR_ICON_STYLE_BLUE}><span style={SIDEBAR_SVG_STYLE}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></span>
            My Profiles
          </button>
          {/* New Profile - earthy blue tone */}
          <button
            className="profile-sidebar-btn"
            onClick={handleNewProfile}
            style={{ borderLeft: '3px solid #4a90a4' }}
          >
            <span style={SIDEBAR_ICON_STYLE_BLUE}><span style={SIDEBAR_SVG_STYLE}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span></span>
            New Profile
          </button>
          <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.35rem 0' }} />
          {/* Profile PID label when editing */}
          {mixtureId && (
            <div style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', color: '#4a90a4', fontFamily: 'monospace', fontWeight: 600, marginBottom: '0.15rem' }}>
              PID: {transactionId || mixtureId}
            </div>
          )}
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              className={`profile-sidebar-btn${activeSection === item.key ? ' active' : ''}`}
              onClick={() => navigateToSection(item.key)}
            >
              <span style={SIDEBAR_ICON_STYLE}><span style={SIDEBAR_SVG_STYLE}>{item.icon}</span></span>
              {item.label}
            </button>
          ))}
          <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.35rem 0' }} />
          <button
            className="profile-sidebar-btn"
            onClick={handleSubmitForReview}
            disabled={submitting}
            style={{ borderLeft: '3px solid #d97706' }}
          >
            <span style={SIDEBAR_ICON_STYLE_AMBER}><span style={SIDEBAR_SVG_STYLE}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg></span></span>
            {submitting ? 'Saving…' : 'Submit for Review'}
          </button>
          <button
            className="profile-sidebar-btn"
            onClick={handleCreateDetermination}
            disabled={submitting}
            style={{ borderLeft: '3px solid #d97706' }}
          >
            <span style={SIDEBAR_ICON_STYLE_AMBER}><span style={SIDEBAR_SVG_STYLE}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v4l4 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L9 7V3z"/><line x1="9" y1="3" x2="15" y2="3"/><circle cx="12" cy="14" r="1"/></svg></span></span>
            {submitting ? 'Saving…' : 'New Determination'}
          </button>
        </div>

        {/* Main content area */}
        <div className="profile-main-content">
          {activeSection === 'myProfiles' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ color: '#1e3a5f', marginBottom: '1rem' }}>My Profiles</h3>

              {myProfilesLoading && <p style={{ color: '#6b7280' }}>Loading…</p>}

              {!myProfilesLoading && (
                <>
                  {/* Status tiles */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    {STATUS_TILES.map(tile => (
                      <button
                        key={tile.key}
                        onClick={() => setMyProfilesTile(myProfilesTile === tile.key ? 'all' : tile.key)}
                        style={{
                          background: myProfilesTile === tile.key ? tile.bg : '#fff',
                          border: `2px solid ${myProfilesTile === tile.key ? tile.border : '#e5e7eb'}`,
                          borderRadius: 8,
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.15s',
                          boxShadow: myProfilesTile === tile.key ? `0 2px 8px ${tile.border}40` : '0 1px 4px rgba(0,0,0,0.06)',
                        }}
                      >
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: tile.color, lineHeight: 1 }}>
                          {myProfilesTileCounts[tile.key]}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: tile.color }}>{tile.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Profiles table */}
                  {filteredMyProfiles.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                      No profiles found. Click "New Profile" to get started.
                    </p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>Profile Name</th>
                            <th style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>PID</th>
                            <th style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>Generator</th>
                            <th style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>Created</th>
                            <th style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMyProfiles.map(m => {
                            const stage = getProfileStage(m)
                            const stageStyle = STAGE_COLORS[stage] || STAGE_COLORS['Draft']
                            return (
                              <tr
                                key={m.id}
                                onClick={() => handleSelectProfile(m)}
                                style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f7fa'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                              >
                                <td style={{ fontWeight: 600, color: '#1e3a5f' }}>{m.name || 'Untitled'}</td>
                                <td style={{ fontSize: '0.82rem', color: '#6b7280', fontFamily: 'monospace' }}>
                                  {m.transaction_id || '—'}
                                </td>
                                <td style={{ fontSize: '0.9rem' }}>{m.customer_name || '—'}</td>
                                <td style={{ fontSize: '0.88rem', color: '#6b7280' }}>
                                  {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                                </td>
                                <td>
                                  <span style={{ ...stageStyle, padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600, fontSize: '0.8rem' }}>
                                    {stage}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeSection === 'profileName' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Profile Name</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                Enter a descriptive name for this profile. This name will be displayed alongside the Profile ID.
              </p>
              <div className="form-group">
                <label>Profile Name</label>
                <input className="form-control" value={profileName} onChange={e => setProfileName(e.target.value)}
                  placeholder="e.g., Main Lab Waste, Building A Solvents" />
              </div>
            </div>
          )}

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
                  if (sdsRecord) setImportedSdsRecord(sdsRecord)
                }} onPropertiesImported={(extractedProps) => {
                  setProperties(prev => ({ ...prev, ...extractedProps }))
                  setPropertiesSources(prev => {
                    const newSources = { ...prev }
                    Object.keys(extractedProps).forEach(k => { newSources[k] = 'imported' })
                    return newSources
                  })
                }} />}
              </FileUpload>
            </div>
          )}

          {activeSection === 'constituents' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Constituents</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                Search the EPA chemical database or enter custom chemical names with quantities.
                You can edit component quantities and percentages after adding them.
              </p>
              <div className="form-group">
                <label>Sample Name *</label>
                <input className="form-control" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g., Waste Solvent Batch #12, Lab Cleanup Mixture" />
              </div>
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
                  <Link to={`/generators/new?returnTo=${encodeURIComponent(editId ? `/profile?edit=${editId}` : '/profile')}`} style={{ color: '#166534', fontWeight: 600 }}>Add a new generator</Link>
                  {' '}and you'll be returned here.
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

          {activeSection === 'shippingName' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Proper Shipping Name (PSN)</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                The Proper Shipping Name is derived from the waste constituents and cross-referenced against the DOT Ship Name listed in Section 14 of the SDS.
                Please verify the results below.
              </p>

              {/* Derived PSN from Constituents */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>
                  🧪 Derived PSN (from Constituents)
                </label>
                {derivedPSN ? (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: 8,
                    fontWeight: 600,
                    color: '#166534',
                    fontSize: '1rem',
                  }}>
                    {derivedPSN}
                  </div>
                ) : (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    color: '#6b7280',
                    fontStyle: 'italic',
                  }}>
                    No constituents added yet. Add chemicals in the Constituents section to generate a PSN.
                  </div>
                )}
              </div>

              {/* DOT Ship Name from SDS Section 14 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>
                  🚛 DOT Ship Name (from SDS Section 14)
                </label>
                {dotShippingName ? (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#eff6ff',
                    border: '1px solid #93c5fd',
                    borderRadius: 8,
                    fontWeight: 600,
                    color: '#1e3a5f',
                    fontSize: '1rem',
                  }}>
                    {dotShippingName}
                  </div>
                ) : (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    color: '#6b7280',
                    fontStyle: 'italic',
                  }}>
                    No SDS imported yet. Upload and import an SDS to retrieve the DOT shipping name from Section 14.
                  </div>
                )}
                {importedSdsRecord && (
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '0.4rem' }}>
                    Source: {importedSdsRecord.product_name || importedSdsRecord.sds_id || `SDS #${importedSdsRecord.id}`}
                    {importedSdsRecord.un_number && ` · UN ${importedSdsRecord.un_number}`}
                    {importedSdsRecord.transport_hazard_class && ` · Class ${importedSdsRecord.transport_hazard_class}`}
                  </div>
                )}
              </div>

              {/* Comparison / Match Status */}
              {derivedPSN && dotShippingName && (
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 10,
                  marginBottom: '1.5rem',
                  background: shippingNameMatch === 'exact' ? '#f0fdf4'
                    : shippingNameMatch === 'partial' ? '#fffbeb'
                    : '#fef2f2',
                  border: `2px solid ${shippingNameMatch === 'exact' ? '#16a34a'
                    : shippingNameMatch === 'partial' ? '#f59e0b'
                    : '#dc2626'}`,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: shippingNameMatch === 'exact' ? '#166534' : shippingNameMatch === 'partial' ? '#92400e' : '#991b1b' }}>
                    {shippingNameMatch === 'exact' && '✅ Names Match'}
                    {shippingNameMatch === 'partial' && '⚠️ Partial Match — Please Verify'}
                    {shippingNameMatch === 'mismatch' && '❌ Names Do Not Match — Verification Required'}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#4b5563' }}>
                    {shippingNameMatch === 'exact' && 'The derived PSN matches the DOT shipping name from the SDS Section 14.'}
                    {shippingNameMatch === 'partial' && 'The names partially overlap. This may be due to analytical report changes or naming conventions. Please review and confirm the correct shipping name.'}
                    {shippingNameMatch === 'mismatch' && 'The derived PSN from constituents does not match the DOT shipping name in SDS Section 14. This may occur due to changes from the Analytical report. Please review both names and verify the correct shipping name below.'}
                  </div>
                </div>
              )}

              {/* User Verification */}
              <div style={{
                padding: '1.25rem',
                background: '#f9fafb',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
              }}>
                <label style={{ fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={shippingNameVerified}
                    onChange={e => setShippingNameVerified(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  I verify that the Proper Shipping Name is correct
                </label>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.88rem', color: '#6b7280' }}>Notes / Justification (optional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={shippingNameUserNote}
                    onChange={e => setShippingNameUserNote(e.target.value)}
                    placeholder="If the names differ, explain why the selected PSN is appropriate (e.g., analytical results indicate different primary hazard)."
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'properties' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Physical / Chemical / Other Properties</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                Properties imported from an SDS are marked with 📥. Manually entered values show ✍. Modified imported values show ✏️.
              </p>

              {/* ─── Import from SDS Button ─── */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleImportFromSds}
                    disabled={sdsImportLoading || !components || components.length === 0}
                    style={{
                      background: '#166534',
                      color: '#fff',
                      border: 'none',
                      padding: '0.55rem 1.2rem',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: (sdsImportLoading || !components || components.length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (sdsImportLoading || !components || components.length === 0) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {sdsImportLoading ? '⏳ Looking up…' : '📥 Import from SDS'}
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Looks up each constituent in the EPA SRS database to populate properties.
                  </span>
                </div>
               {/* Progress indicator during import */}
               {sdsImportLoading && sdsImportProgress && (
                 <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                     <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
                       Processing {sdsImportProgress.current} of {sdsImportProgress.total}
                     </span>
                     <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                       — {sdsImportProgress.currentName}
                     </span>
                   </div>
                   <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                     <div style={{
                       background: 'linear-gradient(90deg, #166534, #16a34a)',
                       height: '100%',
                       width: `${(sdsImportProgress.current / sdsImportProgress.total) * 100}%`,
                       transition: 'width 0.3s ease',
                       borderRadius: 4,
                     }} />
                   </div>
                   <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.35rem', marginBottom: 0 }}>
                     Looking up chemicals in the EPA SRS database. Please stay on this page.
                   </p>
                 </div>
               )}
               {(!components || components.length === 0) && (
                 <p style={{ fontSize: '0.83rem', color: '#9ca3af', marginTop: '0.5rem', marginBottom: 0 }}>
                   Add constituents first to enable this feature.
                 </p>
               )}
              </div>

              {/* ─── SDS Import Error ─── */}
              {sdsImportError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', color: '#991b1b', marginBottom: '1rem', fontSize: '0.88rem' }}>
                  ⚠️ {sdsImportError}
                </div>
              )}

              {/* ─── SDS Import Results Table ─── */}
              {sdsImportResults && (
                <div style={{ marginBottom: '1.5rem', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Chemical</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>CAS #</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>EPA Name</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Characteristics</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Apply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sdsImportResults.map((result, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{result.name || '—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>{result.cas || '—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            {result.status === 'found' && <span style={{ color: '#166534', fontWeight: 500 }}>✅ Found</span>}
                            {result.status === 'not_found' && <span style={{ color: '#9ca3af' }}>Not found</span>}
                            {result.status === 'error' && <span style={{ color: '#dc2626' }}>❌ Error</span>}
                            {result.status === 'skipped' && <span style={{ color: '#6b7280' }}>⏭ Skipped</span>}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.84rem' }}>
                            {result.data ? (result.data.epaName || result.data.systematicName || '—') : '—'}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
                            {result.data && result.data.characteristics
                              ? result.data.characteristics.slice(0, 3).map((c, i) => (
                                  <span key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '0.1rem 0.4rem', marginRight: '0.3rem', display: 'inline-block', marginBottom: '0.2rem' }}>
                                    {typeof c === 'string' ? c : (c.name || c.characteristicName || '')}
                                  </span>
                                ))
                              : '—'}
                            {result.data && result.data.characteristics && result.data.characteristics.length > 3 && (
                              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}> +{result.data.characteristics.length - 3} more</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            {result.status === 'found' && result.data && (
                              <button
                                type="button"
                                onClick={() => {
                                  const count = applyImportedSdsProperties(result.data)
                                  if (count === 0) {
                                    setSdsImportError(`No mappable properties found for ${result.name}.`)
                                  }
                                }}
                                style={{
                                  background: '#166534',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '0.3rem 0.7rem',
                                  borderRadius: 4,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                Apply
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ─── Physical ─── */}
              <h3 style={{ color: '#14532d', marginTop: '0.5rem', marginBottom: '0.75rem', fontSize: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>Physical</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
                {[
                  { key: 'color', label: 'Color' },
                  { key: 'ph_prop', label: 'pH' },
                  { key: 'odor', label: 'Odor' },
                  { key: 'phases_layers', label: 'Phases/Layers' },
                ].map(field => (
                  <div className="form-group" key={field.key} style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {field.label}
                      <span title={
                        propertiesSources[field.key] === 'imported' ? 'Imported from SDS'
                          : propertiesSources[field.key] === 'modified' ? 'Imported then modified'
                          : propertiesSources[field.key] === 'manual' ? 'Manually entered'
                          : ''
                      } style={{ fontSize: '0.85rem' }}>
                        {propertiesSources[field.key] === 'imported' ? '📥'
                          : propertiesSources[field.key] === 'modified' ? '✏️'
                          : propertiesSources[field.key] === 'manual' ? '✍' : ''}
                      </span>
                    </label>
                    <input className="form-control" value={properties[field.key]}
                      onChange={e => updateProperty(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`} />
                  </div>
                ))}
              </div>

              {/* ─── Chemical ─── */}
              <h3 style={{ color: '#14532d', marginTop: '1.25rem', marginBottom: '0.75rem', fontSize: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>Chemical</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
                {[
                  { key: 'btu_value', label: 'BTU Value' },
                  { key: 'specific_gravity', label: 'Specific Gravity (lbs/gal)' },
                ].map(field => (
                  <div className="form-group" key={field.key} style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {field.label}
                      <span title={
                        propertiesSources[field.key] === 'imported' ? 'Imported from SDS'
                          : propertiesSources[field.key] === 'modified' ? 'Imported then modified'
                          : propertiesSources[field.key] === 'manual' ? 'Manually entered'
                          : ''
                      } style={{ fontSize: '0.85rem' }}>
                        {propertiesSources[field.key] === 'imported' ? '📥'
                          : propertiesSources[field.key] === 'modified' ? '✏️'
                          : propertiesSources[field.key] === 'manual' ? '✍' : ''}
                      </span>
                    </label>
                    <input className="form-control" type="number" step="any" value={properties[field.key]}
                      onChange={e => updateProperty(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`} />
                  </div>
                ))}
              </div>

              {/* ─── Other ─── */}
              <h3 style={{ color: '#14532d', marginTop: '1.25rem', marginBottom: '0.75rem', fontSize: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>Other</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem' }}>
                {[
                  { key: 'pyrophoric', label: 'Pyrophoric' },
                  { key: 'polymerizable_inhibited', label: 'Polymerizable (Inhibited)' },
                  { key: 'dioxins', label: 'Dioxins' },
                  { key: 'shock_sensitive', label: 'Shock Sensitive' },
                  { key: 'polymerizable_organic_peroxides', label: 'Polymerizable Organic Peroxides' },
                  { key: 'pesticides_herbicides', label: 'Pesticides/Herbicides' },
                  { key: 'explosive_oxidizer', label: 'Explosive Oxidizer' },
                  { key: 'asbestos_friable', label: 'Asbestos Friable' },
                  { key: 'furans', label: 'Furans' },
                  { key: 'reactive_prop', label: 'Reactive' },
                  { key: 'cyanides', label: 'Cyanides' },
                  { key: 'radioactive', label: 'Radioactive' },
                  { key: 'water_reactive', label: 'Water Reactive' },
                  { key: 'asbestos_non_friable', label: 'Asbestos Non-Friable' },
                  { key: 'norm', label: 'NORM' },
                  { key: 'thermally_unstable_air_reactive', label: 'Thermally Unstable Air Reactive' },
                  { key: 'metal_fines', label: 'Metal Fines' },
                  { key: 'biohazard_infectious', label: 'Biohazard/Infectious Waste' },
                  { key: 'reactive_sulfides', label: 'Reactive Sulfides' },
                ].map(field => (
                  <label key={field.key} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                    padding: '0.35rem 0.5rem', borderRadius: 6,
                    background: properties[field.key] ? '#f0fdf4' : 'transparent',
                    border: properties[field.key] ? '1px solid #86efac' : '1px solid transparent',
                  }}>
                    <input type="checkbox" checked={!!properties[field.key]}
                      onChange={e => updateProperty(field.key, e.target.checked)} />
                    <span style={{ fontSize: '0.9rem' }}>{field.label}</span>
                    <span title={
                      propertiesSources[field.key] === 'imported' ? 'Imported from SDS'
                        : propertiesSources[field.key] === 'modified' ? 'Imported then modified'
                        : propertiesSources[field.key] === 'manual' ? 'Manually entered'
                        : ''
                    } style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
                      {propertiesSources[field.key] === 'imported' ? '📥'
                        : propertiesSources[field.key] === 'modified' ? '✏️'
                        : propertiesSources[field.key] === 'manual' ? '✍' : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div style={{ marginTop: 0 }}>
              <AnalyticsUpload
                profileId={mixtureId}
                onBeforeUpload={!mixtureId ? saveProfileMinimal : undefined}
                onUploaded={() => setDocRefresh(r => r + 1)}
                components={components}
              />
              {mixtureId && (
                <div className="card">
                  <DocumentList profileId={mixtureId} transactionId={transactionId} key={`analytics-${docRefresh}`} filterDocType="A" components={components} />
                </div>
              )}
            </div>
          )}

          {activeSection === 'wasteCodes' && (
            <div className="card" style={{ marginTop: 0 }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#166534' }}>Waste Codes</h2>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                EPA waste codes and state/territory waste codes associated with your profile constituents.
              </p>

              {/* EPA Waste Codes Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#14532d', fontSize: '1.05rem', marginBottom: '0.75rem', borderBottom: '2px solid #dcfce7', paddingBottom: '0.5rem' }}>
                  🏛️ EPA Waste Codes
                </h3>
                {components.filter(c => c._epaCode).length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No EPA waste codes found. Add constituents with EPA waste codes in the Constituents section.
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ fontSize: '0.85rem' }}>EPA Code</th>
                          <th style={{ fontSize: '0.85rem' }}>Chemical Name</th>
                          <th style={{ fontSize: '0.85rem' }}>CAS Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.filter(c => c._epaCode).map((c, idx) => (
                          <tr key={`epa-${idx}`}>
                            <td style={{ fontWeight: 700, color: '#14532d', fontFamily: 'monospace' }}>{c._epaCode}</td>
                            <td>{c._displayName || c.component_name || c.custom_name || '—'}</td>
                            <td style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: '0.88rem' }}>{c._casNumber || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* State & Territory Waste Codes Section */}
              <div>
                <h3 style={{ color: '#14532d', fontSize: '1.05rem', marginBottom: '0.75rem', borderBottom: '2px solid #e0e7ff', paddingBottom: '0.5rem' }}>
                  🗺️ State &amp; Territory Waste Codes
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Chemical constituents matched against state and territory hazardous waste code databases.
                </p>
                {(() => {
                  const casNumbers = components
                    .filter(c => c._casNumber)
                    .map(c => ({ cas: c._casNumber, name: c._displayName || c.component_name || c.custom_name || '' }))
                  const matches = []
                  casNumbers.forEach(({ cas, name }) => {
                    const stateMatches = stateWasteCodesData.filter(s => s.cas_number === cas)
                    stateMatches.forEach(m => {
                      matches.push({ chemical: name, cas, ...m })
                    })
                  })
                  if (matches.length === 0) {
                    return (
                      <p style={{ color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        {components.length === 0
                          ? 'No constituents added yet. Add chemicals in the Constituents section to see state/territory waste codes.'
                          : 'No state or territory waste code matches found for the current constituents.'}
                      </p>
                    )
                  }
                  return (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ fontSize: '0.85rem' }}>Chemical</th>
                            <th style={{ fontSize: '0.85rem' }}>CAS Number</th>
                            <th style={{ fontSize: '0.85rem' }}>State/Territory</th>
                            <th style={{ fontSize: '0.85rem' }}>State Waste Code</th>
                            <th style={{ fontSize: '0.85rem' }}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((m, idx) => (
                            <tr key={`state-${idx}`}>
                              <td style={{ fontWeight: 600 }}>{m.chemical}</td>
                              <td style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: '0.88rem' }}>{m.cas}</td>
                              <td style={{ fontWeight: 600, color: '#1e3a5f' }}>{m.state_name} ({m.state_code})</td>
                              <td style={{ fontWeight: 700, color: '#7c3aed', fontFamily: 'monospace' }}>{m.waste_code}</td>
                              <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{m.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
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

          {activeSection === 'documents' && (
            <DocumentsSection mixtureId={mixtureId} />
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
