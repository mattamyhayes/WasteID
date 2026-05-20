import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { shippers as shippersApi, manifests as manifestsApi, mixtures as mixturesApi } from '../api/client'
import { generateEpaFormPdf } from '../lib/epaFormPdf'
import { buildDotDescription, validateManifestForm, validateManifestTrackingNumber, getCertificationText, computePageCount } from '../lib/manifestUtils'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
]

const CONTAINER_TYPES = [
  { value: 'DM', label: 'Metal drums, barrels, kegs' },
  { value: 'DW', label: 'Wooden drums, barrels, kegs' },
  { value: 'DF', label: 'Fiberboard or plastic drums' },
  { value: 'TP', label: 'Tanks portable' },
  { value: 'TT', label: 'Cargo tanks (tank trucks)' },
  { value: 'TC', label: 'Tank cars' },
  { value: 'CY', label: 'Cylinders' },
  { value: 'CM', label: 'Metal boxes, cartons, cases' },
  { value: 'CF', label: 'Fiber or plastic boxes, cartons' },
  { value: 'CW', label: 'Wooden boxes, cartons, cases' },
  { value: 'BA', label: 'Burlap, cloth, paper, or plastic bags' },
]

const QUANTITY_UNITS = [
  { value: 'G', label: 'Gallons' },
  { value: 'P', label: 'Pounds' },
  { value: 'T', label: 'Tons (2000 lbs)' },
  { value: 'K', label: 'Kilograms' },
  { value: 'M', label: 'Metric Tons (1000 kg)' },
  { value: 'N', label: 'Cubic Yards' },
  { value: 'L', label: 'Liters' },
]

const emptyWasteItem = {
  dot_description: '',
  containers_no: '',
  container_type: '',
  quantity: '',
  unit: '',
  waste_codes: '',
  hazard_class: '',
}

const emptyForm = {
  manifest_tracking_number: '',
  generator_name: '',
  generator_epa_id: '',
  generator_address: '',
  generator_city: '',
  generator_state: '',
  generator_zip: '',
  generator_phone: '',
  generator_site_address: '',
  emergency_response_phone: '',
  transporter1_name: '',
  transporter1_epa_id: '',
  transporter2_name: '',
  transporter2_epa_id: '',
  designated_facility_name: '',
  designated_facility_address: '',
  designated_facility_city: '',
  designated_facility_state: '',
  designated_facility_zip: '',
  designated_facility_epa_id: '',
  designated_facility_phone: '',
  special_handling_instructions: '',
  additional_info: '',
  generator_certification: false,
  generator_printed_name: '',
  generator_signature_date: '',
  international_shipment: false,
  import_to_us: false,
  port_of_entry_exit: '',
  date_leaving_us: '',
}

export default function EPAForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedMixtureId = searchParams.get('mixtureId')
  const [form, setForm] = useState({ ...emptyForm })
  const [wasteItems, setWasteItems] = useState([{ ...emptyWasteItem }])
  const [selectedShipper, setSelectedShipper] = useState('')
  const [shippers, setShippers] = useState([])
  const [allMixtures, setAllMixtures] = useState([])
  const [selectedDeterminations, setSelectedDeterminations] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savedManifests, setSavedManifests] = useState([])
  const [exportingId, setExportingId] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])
  const [showValidation, setShowValidation] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [shipRes, mixRes, manRes] = await Promise.all([
          shippersApi.list(),
          mixturesApi.list(),
          manifestsApi.list(),
        ])
        setShippers(shipRes.data.results || shipRes.data)
        const mixes = mixRes.data.results || mixRes.data
        setAllMixtures(mixes)
        setSavedManifests(manRes.data.results || manRes.data || [])
      } catch {
        // Data loading errors are non-fatal
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Gather all determinations from mixtures
  const availableDeterminations = useMemo(() => {
    const dets = []
    for (const m of allMixtures) {
      if (m.determinations && m.determinations.length > 0) {
        for (const d of m.determinations) {
          dets.push({
            id: d.id,
            mixtureName: m.name,
            mixtureId: m.id,
            isHazardous: d.is_hazardous_waste,
            wasteCodes: d.waste_codes_list || JSON.parse(d.waste_codes || '[]'),
            createdAt: d.created_at,
            daysRemainingToShip: m.days_remaining_to_ship,
            shipByDate: m.ship_by_date,
            epaGeneratorStatus: m.epa_generator_status,
            shipmentSizeUnit: m.shipment_size_unit,
            shipmentSizeQty: m.shipment_size_qty,
          })
        }
      }
    }
    return dets
  }, [allMixtures])

  // Auto-select determination from pre-selected mixture (from Shipping page link)
  useEffect(() => {
    if (!preselectedMixtureId || loading || availableDeterminations.length === 0) return
    const mixtureIdNum = Number(preselectedMixtureId)
    const detsForMixture = availableDeterminations.filter(d => d.mixtureId === mixtureIdNum)
    if (detsForMixture.length > 0) {
      const latestDet = detsForMixture[detsForMixture.length - 1]
      if (!selectedDeterminations.includes(latestDet.id)) {
        setSelectedDeterminations([latestDet.id])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedMixtureId, loading, availableDeterminations])

  const handleShipperSelect = (shipperId) => {
    setSelectedShipper(shipperId)
    if (!shipperId) return
    const s = shippers.find(x => x.id === Number(shipperId))
    if (!s) return
    setForm(prev => ({
      ...prev,
      generator_name: s.company_name,
      generator_epa_id: s.epa_id,
      generator_address: s.address,
      generator_city: s.city,
      generator_state: s.state,
      generator_zip: s.zip_code,
      generator_phone: s.phone,
      generator_site_address: s.site_address || s.address,
      emergency_response_phone: s.emergency_phone,
    }))
  }

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const fCheck = (field) => (e) => setForm({ ...form, [field]: e.target.checked })

  const updateWasteItem = (idx, field, value) => {
    setWasteItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const addWasteItem = () => {
    setWasteItems(prev => [...prev, { ...emptyWasteItem }])
  }

  const removeWasteItem = (idx) => {
    if (wasteItems.length <= 1) return
    setWasteItems(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleDetermination = (detId) => {
    setSelectedDeterminations(prev => {
      if (prev.includes(detId)) {
        return prev.filter(id => id !== detId)
      }
      return [...prev, detId]
    })
  }

  // Auto-populate waste codes from selected determinations
  const populateFromDeterminations = () => {
    const selected = availableDeterminations.filter(d => selectedDeterminations.includes(d.id))
    if (selected.length === 0) return

    const newItems = selected.map(det => {
      // Apply "Waste" prefix rule (R-9.2) based on generator status
      const { description } = buildDotDescription({
        unNumber: '',
        properShippingName: `Hazardous waste from ${det.mixtureName}`,
        hazardClass: '',
        packingGroup: '',
        epaGeneratorStatus: det.epaGeneratorStatus || '',
      })
      return {
        dot_description: description,
        containers_no: '1',
        container_type: 'DM',
        quantity: '',
        unit: 'P',
        waste_codes: det.wasteCodes.join(', '),
        hazard_class: '',
      }
    })

    setWasteItems(prev => {
      // Replace empty first item or append
      if (prev.length === 1 && !prev[0].dot_description && !prev[0].waste_codes) {
        return newItems
      }
      return [...prev, ...newItems]
    })
  }

  const handleExportPdf = async (manifestId) => {
    setExportingId(manifestId)
    try {
      const res = await manifestsApi.exportPdf(manifestId)
      // If backend returns a blob, trigger download
      if (res.data instanceof Blob) {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `EPA_8700-22_manifest_${manifestId}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
      // In local mode, the PDF is saved directly via jsPDF
    } catch (e) {
      setError('Failed to export PDF. ' + (e.message || ''))
    } finally {
      setExportingId(null)
    }
  }

  const handleExportCurrentForm = () => {
    // Validate before PDF generation (R-UX-6: PDF gated on passing validation + certification)
    const errors = validateManifestForm(form, wasteItems)
    if (errors.length > 0 || !form.generator_certification) {
      setValidationErrors(errors.length > 0 ? errors : [{ field: 'generator_certification', box: '15', message: 'Generator certification is required before generating PDF.' }])
      setShowValidation(true)
      setError('Please fix validation errors before generating PDF.')
      return
    }
    // Build a manifest-like object from the current form state and export as PDF
    const manifestObj = {
      ...form,
      id: 'draft',
      waste_items: JSON.stringify(wasteItems),
      status: 'draft',
      created_at: new Date().toISOString(),
    }
    generateEpaFormPdf(manifestObj)
  }

  // R-UX-6: Validate action
  const handleValidate = () => {
    const errors = validateManifestForm(form, wasteItems)
    setValidationErrors(errors)
    setShowValidation(true)
    if (errors.length === 0) {
      setError('')
      setSuccess('✅ Manifest validation passed — all required fields are complete.')
    } else {
      setSuccess('')
      setError(`Found ${errors.length} validation issue(s). See details below.`)
    }
  }

  const handleSubmit = async () => {
    if (!form.generator_name.trim()) { setError('Generator name is required.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        ...form,
        generator_shipper: selectedShipper ? Number(selectedShipper) : null,
        waste_items: JSON.stringify(wasteItems),
        determination_ids: JSON.stringify(selectedDeterminations),
      }
      await manifestsApi.create(payload)
      setSuccess('EPA Manifest saved successfully!')
      setForm({ ...emptyForm })
      setWasteItems([{ ...emptyWasteItem }])
      setSelectedShipper('')
      setSelectedDeterminations([])
      // Reload saved manifests
      try {
        const manRes = await manifestsApi.list()
        setSavedManifests(manRes.data.results || manRes.data || [])
      } catch { /* non-fatal */ }
    } catch (e) {
      const detail = e.response?.data
      setError(typeof detail === 'string' ? detail : 'Failed to save manifest.')
    } finally {
      setSubmitting(false)
    }
  }

  const sectionStyle = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const sectionTitleStyle = {
    color: '#14532d',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #bbf7d0',
  }

  const fieldStyle = { marginBottom: '0.5rem' }
  const labelStyle = { fontSize: '0.85rem', color: '#374151', fontWeight: 600, marginBottom: '0.2rem' }

  if (loading) {
    return <div className="container" style={{ padding: '3rem' }}>Loading…</div>
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 1000 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d' }}>EPA Uniform Hazardous Waste Manifest</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          EPA Form 8700-22 — Complete this form to document the shipment of hazardous waste from generator to designated treatment, storage, or disposal facility.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 8, color: '#15803d', marginBottom: '1rem', fontWeight: 600 }}>{success}</div>}

      {/* Shipper Selection */}
      {shippers.length > 0 && (
        <div style={{ ...sectionStyle, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={sectionTitleStyle}>📋 Auto-fill from Shipper Profile</div>
          <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Select a saved shipper profile to auto-populate the generator section.
          </p>
          <select className="form-control" value={selectedShipper}
            onChange={e => handleShipperSelect(e.target.value)}
            style={{ maxWidth: 400 }}>
            <option value="">— Select a shipper —</option>
            {shippers.map(s => (
              <option key={s.id} value={s.id}>{s.company_name} {s.epa_id ? `(${s.epa_id})` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Section 1: Manifest Tracking */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>1. Manifest Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Manifest Tracking Number</label>
            <input className="form-control" value={form.manifest_tracking_number} onChange={f('manifest_tracking_number')}
              placeholder="e.g., 012345678 ELC" />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Emergency Response Phone *</label>
            <input className="form-control" value={form.emergency_response_phone} onChange={f('emergency_response_phone')}
              placeholder="24-hour emergency number" />
          </div>
        </div>
      </div>

      {/* Section 2: Generator Information */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>2. Generator Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Generator Name *</label>
            <input className="form-control" value={form.generator_name} onChange={f('generator_name')}
              placeholder="Company or facility name" />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Generator US EPA ID Number</label>
            <input className="form-control" value={form.generator_epa_id} onChange={f('generator_epa_id')}
              placeholder="e.g., OHD123456789" />
          </div>
        </div>
        <div className="form-group" style={fieldStyle}>
          <label style={labelStyle}>Mailing Address</label>
          <input className="form-control" value={form.generator_address} onChange={f('generator_address')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>City</label>
            <input className="form-control" value={form.generator_city} onChange={f('generator_city')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>State</label>
            <select className="form-control" value={form.generator_state} onChange={f('generator_state')}>
              <option value="">Select</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>ZIP Code</label>
            <input className="form-control" value={form.generator_zip} onChange={f('generator_zip')} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Generator Phone</label>
            <input className="form-control" value={form.generator_phone} onChange={f('generator_phone')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Generator Site Address (if different)</label>
            <input className="form-control" value={form.generator_site_address} onChange={f('generator_site_address')}
              placeholder="Site address if different from mailing" />
          </div>
        </div>
      </div>

      {/* Section 3: Transporters */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>3. Transporters</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Transporter 1 Company Name</label>
            <input className="form-control" value={form.transporter1_name} onChange={f('transporter1_name')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Transporter 1 US EPA ID</label>
            <input className="form-control" value={form.transporter1_epa_id} onChange={f('transporter1_epa_id')} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Transporter 2 Company Name</label>
            <input className="form-control" value={form.transporter2_name} onChange={f('transporter2_name')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Transporter 2 US EPA ID</label>
            <input className="form-control" value={form.transporter2_epa_id} onChange={f('transporter2_epa_id')} />
          </div>
        </div>
      </div>

      {/* Section 4: Designated Facility */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>4. Designated Facility</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Facility Name</label>
            <input className="form-control" value={form.designated_facility_name} onChange={f('designated_facility_name')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Facility US EPA ID</label>
            <input className="form-control" value={form.designated_facility_epa_id} onChange={f('designated_facility_epa_id')} />
          </div>
        </div>
        <div className="form-group" style={fieldStyle}>
          <label style={labelStyle}>Facility Address</label>
          <input className="form-control" value={form.designated_facility_address} onChange={f('designated_facility_address')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>City</label>
            <input className="form-control" value={form.designated_facility_city} onChange={f('designated_facility_city')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>State</label>
            <select className="form-control" value={form.designated_facility_state} onChange={f('designated_facility_state')}>
              <option value="">Select</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>ZIP</label>
            <input className="form-control" value={form.designated_facility_zip} onChange={f('designated_facility_zip')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Phone</label>
            <input className="form-control" value={form.designated_facility_phone} onChange={f('designated_facility_phone')} />
          </div>
        </div>
      </div>

      {/* Section 5: Link Determinations */}
      {availableDeterminations.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>5. Link Waste Determinations</div>
          <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Select one or more determinations to include waste code information in this manifest.
          </p>
          <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem' }}>
            {availableDeterminations.map(det => (
              <label key={det.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem',
                borderRadius: 6, cursor: 'pointer', marginBottom: '0.25rem',
                background: selectedDeterminations.includes(det.id) ? '#f0fdf4' : 'transparent',
                border: selectedDeterminations.includes(det.id) ? '1px solid #bbf7d0' : '1px solid transparent',
              }}>
                <input type="checkbox"
                  checked={selectedDeterminations.includes(det.id)}
                  onChange={() => toggleDetermination(det.id)}
                  style={{ width: 18, height: 18 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {det.mixtureName}
                    <span style={{
                      marginLeft: '0.5rem', fontSize: '0.78rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                      background: det.isHazardous ? '#fef2f2' : '#f0fdf4',
                      color: det.isHazardous ? '#b91c1c' : '#15803d',
                    }}>
                      {det.isHazardous ? '⚠️ Hazardous' : '✅ Not Hazardous'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                    Waste Codes: {det.wasteCodes.length > 0 ? det.wasteCodes.join(', ') : 'None'} · {new Date(det.createdAt).toLocaleDateString()}
                    {det.daysRemainingToShip != null && (
                      <span style={{
                        marginLeft: '0.5rem', fontWeight: 700,
                        color: det.daysRemainingToShip <= 0 ? '#dc2626'
                          : det.daysRemainingToShip <= 5 ? '#d97706'
                          : '#16a34a',
                      }}>
                        {det.daysRemainingToShip <= 0
                          ? `⚠️ OVERDUE by ${Math.abs(det.daysRemainingToShip)}d`
                          : `📅 ${det.daysRemainingToShip}d to ship`}
                      </span>
                    )}
                    {det.shipmentSizeUnit && det.shipmentSizeQty && (
                      <> · {det.shipmentSizeQty} {det.shipmentSizeUnit}</>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {selectedDeterminations.length > 0 && (
            <button className="btn btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}
              onClick={populateFromDeterminations}>
              📥 Populate Waste Items from Selected Determinations
            </button>
          )}
        </div>
      )}

      {/* Section 6: Waste Description */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>6. US DOT Description &amp; Waste Details</div>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
          Enter hazardous materials description including proper shipping name, hazard class, ID number, and packing group. Add waste codes for each line item.
        </p>

        {wasteItems.map((item, idx) => (
          <div key={idx} style={{
            background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '1rem', marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#374151', fontSize: '0.9rem' }}>Waste Item #{idx + 1}</strong>
              {wasteItems.length > 1 && (
                <button className="btn btn-danger" style={{ fontSize: '0.78rem', padding: '0.15rem 0.5rem' }}
                  onClick={() => removeWasteItem(idx)}>Remove</button>
              )}
            </div>
            <div className="form-group" style={fieldStyle}>
              <label style={labelStyle}>US DOT Description (proper shipping name, hazard class, ID number, packing group)</label>
              <input className="form-control" value={item.dot_description}
                onChange={e => updateWasteItem(idx, 'dot_description', e.target.value)}
                placeholder="e.g., Waste Flammable Liquid, N.O.S., 3, UN1993, PG II" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={fieldStyle}>
                <label style={labelStyle}>No. of Containers</label>
                <input className="form-control" type="number" min="1" value={item.containers_no}
                  onChange={e => updateWasteItem(idx, 'containers_no', e.target.value)} />
              </div>
              <div className="form-group" style={fieldStyle}>
                <label style={labelStyle}>Container Type</label>
                <select className="form-control" value={item.container_type}
                  onChange={e => updateWasteItem(idx, 'container_type', e.target.value)}>
                  <option value="">Select</option>
                  {CONTAINER_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={fieldStyle}>
                <label style={labelStyle}>Total Quantity</label>
                <input className="form-control" type="number" min="0" value={item.quantity}
                  onChange={e => updateWasteItem(idx, 'quantity', e.target.value)} />
              </div>
              <div className="form-group" style={fieldStyle}>
                <label style={labelStyle}>Unit (Wt/Vol)</label>
                <select className="form-control" value={item.unit}
                  onChange={e => updateWasteItem(idx, 'unit', e.target.value)}>
                  <option value="">Select</option>
                  {QUANTITY_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={fieldStyle}>
              <label style={labelStyle}>EPA Waste Codes (comma-separated)</label>
              <input className="form-control" value={item.waste_codes}
                onChange={e => updateWasteItem(idx, 'waste_codes', e.target.value)}
                placeholder="e.g., D001, D018, F003" />
            </div>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={addWasteItem} style={{ fontSize: '0.88rem' }}>
          + Add Another Waste Item
        </button>
      </div>

      {/* Section 7: Special Handling */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>7. Special Handling Instructions &amp; Additional Information</div>
        <div className="form-group" style={fieldStyle}>
          <label style={labelStyle}>Special Handling Instructions</label>
          <textarea className="form-control" rows={3} value={form.special_handling_instructions}
            onChange={f('special_handling_instructions')}
            placeholder="Any special handling requirements, emergency procedures, or additional information…" />
        </div>
        <div className="form-group" style={fieldStyle}>
          <label style={labelStyle}>Additional Information</label>
          <textarea className="form-control" rows={2} value={form.additional_info}
            onChange={f('additional_info')} />
        </div>
      </div>

      {/* Section 8: International Shipments */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>8. International Shipments</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.international_shipment} onChange={fCheck('international_shipment')}
            style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: '0.9rem' }}>This is an international shipment</span>
        </label>
        {form.international_shipment && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.import_to_us} onChange={fCheck('import_to_us')}
                style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: '0.88rem' }}>Import to US</span>
            </label>
            <div className="form-group" style={fieldStyle}>
              <label style={labelStyle}>Port of Entry/Exit</label>
              <input className="form-control" value={form.port_of_entry_exit} onChange={f('port_of_entry_exit')} />
            </div>
            <div className="form-group" style={fieldStyle}>
              <label style={labelStyle}>Date Leaving US</label>
              <input className="form-control" type="date" value={form.date_leaving_us} onChange={f('date_leaving_us')} />
            </div>
          </div>
        )}
      </div>

      {/* Section 9: Generator Certification */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>9. Generator/Offeror Certification</div>
        <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem', lineHeight: 1.6, color: '#4b5563' }}>
          {getCertificationText(
            availableDeterminations.find(d => selectedDeterminations.includes(d.id))?.epaGeneratorStatus || ''
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.generator_certification} onChange={fCheck('generator_certification')}
            style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>I certify the above statement</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Printed/Typed Name</label>
            <input className="form-control" value={form.generator_printed_name} onChange={f('generator_printed_name')} />
          </div>
          <div className="form-group" style={fieldStyle}>
            <label style={labelStyle}>Date</label>
            <input className="form-control" type="date" value={form.generator_signature_date} onChange={f('generator_signature_date')} />
          </div>
        </div>
      </div>

      {/* Validation Errors Display */}
      {showValidation && validationErrors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
          <h4 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>⚠️ Validation Issues ({validationErrors.length})</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {validationErrors.map((err, i) => (
              <li key={i} style={{ color: '#7f1d1d', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                <strong>[Box {err.box}]</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showValidation && validationErrors.length === 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
          <p style={{ color: '#15803d', fontWeight: 600, margin: 0 }}>✅ All manifest fields pass validation.</p>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
          style={{ padding: '0.6rem 2rem', fontSize: '1rem' }}>
          {submitting ? 'Saving…' : '💾 Save Draft'}
        </button>
        <button className="btn btn-secondary" onClick={handleValidate}
          style={{ padding: '0.6rem 1.5rem', fontSize: '1rem' }}>
          ✓ Validate
        </button>
        <button className="btn btn-secondary" onClick={handleExportCurrentForm}
          style={{ padding: '0.6rem 1.5rem', fontSize: '1rem' }}>
          📄 Generate PDF
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
      </div>

      {/* Saved Manifests */}
      {savedManifests.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Saved Manifests</div>
          <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Previously saved manifests can be exported as PDF in the official EPA Form 8700-22 format.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '2px solid #e5e7eb' }}>Tracking #</th>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '2px solid #e5e7eb' }}>Generator</th>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '2px solid #e5e7eb' }}>Created</th>
                  <th style={{ padding: '0.5rem 0.75rem', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedManifests.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {m.manifest_tracking_number || <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{m.generator_name || '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                        background: m.status === 'draft' ? '#fef3c7' : m.status === 'signed' ? '#dbeafe' : '#d1fae5',
                        color: m.status === 'draft' ? '#92400e' : m.status === 'signed' ? '#1e40af' : '#065f46',
                      }}>
                        {m.status || 'draft'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.82rem', padding: '0.25rem 0.75rem' }}
                        disabled={exportingId === m.id}
                        onClick={() => handleExportPdf(m.id)}
                      >
                        {exportingId === m.id ? 'Exporting…' : '📄 Export PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
