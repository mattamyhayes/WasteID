// localStorage-backed mixture store used when the frontend is deployed
// without a Django backend (e.g. the static GitHub Pages build). It mirrors
// the response shapes returned by the DRF backend so the rest of the app
// (NewDetermination, DeterminationResults, History, MixtureBuilder) can
// remain backend-agnostic.
//
// All methods return `{ data: ... }` mimicking axios responses so call sites
// don't need to branch on local vs remote mode.

import localChemicals from '../data/chemicals.json'
import { determineHazardousWaste } from './determination.js'

const STORAGE_KEY = 'wasteid_local_store_v2'
const CUSTOMERS_STORAGE_KEY = 'wasteid_customers_v2'
const LEGACY_STORAGE_KEY = 'wasteid_local_store_v1'
const LEGACY_CUSTOMERS_STORAGE_KEY = 'wasteid_customers_v1'

function randomHex(length = 8) {
  const alphabet = '0123456789ABCDEF'
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, b => alphabet[b % 16]).join('')
  }
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * 16)]
  }
  return out
}

function generatePrefixedId(prefix, existingValues = new Set()) {
  let candidate = `${prefix}-${randomHex(8)}`
  while (existingValues.has(candidate)) {
    candidate = `${prefix}-${randomHex(8)}`
  }
  return candidate
}

function emptyStore() {
  return {
    mixtures: [],
    components: [],
    determinations: [],
    nextId: { mixture: 1, component: 1, determination: 1 },
    seeded: false,
  }
}

function emptyCustomerStore() {
  return {
    customers: [],
    locations: [],
    nextId: { customer: 1, location: 1 },
    seeded: false,
  }
}

function loadStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) {
      const legacyRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        const migrated = {
          mixtures: legacy.mixtures || [],
          components: legacy.components || [],
          determinations: legacy.determinations || [],
          nextId: legacy.nextId || { mixture: 1, component: 1, determination: 1 },
          seeded: true,
        }
        saveStore(migrated)
        return migrated
      }
      return seedMixtureStore()
    }
    const parsed = JSON.parse(raw)
    const store = {
      mixtures: parsed.mixtures || [],
      components: parsed.components || [],
      determinations: parsed.determinations || [],
      nextId: parsed.nextId || { mixture: 1, component: 1, determination: 1 },
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) return seedMixtureStore()
    return store
  } catch {
    return seedMixtureStore()
  }
}

function saveStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }
  } catch {
    // Storage may be unavailable (private mode, quota). Operations remain
    // in-memory for the lifetime of the page.
  }
}

// Seed data matching the backend seed_customers management command
const SEED_CUSTOMERS = [
  {
    name: 'Cascade Auto Body & Paint',
    contact_name: 'Marcus Reilly',
    contact_email: 'marcus.reilly@cascadeautobody.com',
    contact_phone: '(503) 555-0142',
    epa_generator_status: 'SQG',
    billing_address: '1820 NW Industrial St, Portland, OR 97209',
    notes: 'Auto body shop chain. Generates waste paint, solvents, thinners, and used oil from collision repair operations.',
    locations: [
      { name: 'Portland - NW Industrial', address: '1820 NW Industrial St', city: 'Portland', state: 'OR', postal_code: '97209', notes: 'Main shop and corporate office.' },
      { name: 'Beaverton Collision Center', address: '4455 SW Murray Blvd', city: 'Beaverton', state: 'OR', postal_code: '97005', notes: 'High-volume collision repair location.' },
      { name: 'Vancouver Service Bay', address: '7820 NE Hwy 99', city: 'Vancouver', state: 'WA', postal_code: '98665', notes: 'Smaller satellite shop.' },
    ],
  },
  {
    name: 'Pacific Northwest Printing Co.',
    contact_name: 'Jenna Whitcomb',
    contact_email: 'jwhitcomb@pnwprinting.com',
    contact_phone: '(206) 555-0188',
    epa_generator_status: 'LQG',
    billing_address: '900 4th Ave, Seattle, WA 98104',
    notes: 'Commercial printer. Generates waste inks, photographic fixers, isopropyl alcohol, and press-cleaning solvents.',
    locations: [
      { name: 'Seattle Headquarters Press', address: '900 4th Ave', city: 'Seattle', state: 'WA', postal_code: '98104', notes: 'Headquarters and main press.' },
      { name: 'Tacoma Print Facility', address: '3120 S 38th St', city: 'Tacoma', state: 'WA', postal_code: '98409', notes: 'Large-format and packaging printing.' },
      { name: 'Spokane Quick Print', address: '511 W Riverside Ave', city: 'Spokane', state: 'WA', postal_code: '99201', notes: 'Eastern Washington branch.' },
    ],
  },
  {
    name: 'Evergreen Pharmaceuticals',
    contact_name: 'Dr. Priya Natarajan',
    contact_email: 'p.natarajan@evergreenpharma.com',
    contact_phone: '(425) 555-0117',
    epa_generator_status: 'LQG',
    billing_address: '15500 NE 38th St, Redmond, WA 98052',
    notes: 'Pharmaceutical research and manufacturing. Generates P-listed and U-listed pharmaceutical waste, lab solvents, and reactive intermediates.',
    locations: [
      { name: 'Redmond R&D Campus', address: '15500 NE 38th St', city: 'Redmond', state: 'WA', postal_code: '98052', notes: 'Primary research labs.' },
      { name: 'Bothell Manufacturing Plant', address: '22130 17th Ave SE', city: 'Bothell', state: 'WA', postal_code: '98021', notes: 'GMP manufacturing facility.' },
      { name: 'Hillsboro Bio Lab', address: '2701 NW 229th Ave', city: 'Hillsboro', state: 'OR', postal_code: '97124', notes: 'Biologics development laboratory.' },
    ],
  },
  {
    name: 'Sawtooth Mining & Metals',
    contact_name: 'Hank Brennan',
    contact_email: 'hbrennan@sawtoothmining.com',
    contact_phone: '(208) 555-0163',
    epa_generator_status: 'SQG',
    billing_address: '500 W Bannock St, Boise, ID 83702',
    notes: 'Mining and ore processing. Generates corrosive acids, cyanide solutions, heavy-metal sludges, and reactive reagents.',
    locations: [
      { name: 'Boise Corporate & Assay Lab', address: '500 W Bannock St', city: 'Boise', state: 'ID', postal_code: '83702', notes: 'Corporate office and assay laboratory.' },
      { name: "Coeur d'Alene Mill Site", address: '8200 Silver Valley Rd', city: "Coeur d'Alene", state: 'ID', postal_code: '83814', notes: 'Active ore milling.' },
      { name: 'Fairbanks Operations', address: '3501 Airport Way', city: 'Fairbanks', state: 'AK', postal_code: '99709', notes: 'Alaska placer and hard-rock operations.' },
    ],
  },
  {
    name: 'Northern Lights Hospital Network',
    contact_name: 'Sarah Kowalski, RN',
    contact_email: 'skowalski@nlhospitals.org',
    contact_phone: '(907) 555-0199',
    epa_generator_status: 'VSQG',
    billing_address: '3260 Providence Dr, Anchorage, AK 99508',
    notes: 'Regional hospital network. Generates chemotherapy waste, formaldehyde, xylene, mercury-containing devices, and expired pharmaceuticals.',
    locations: [
      { name: 'Anchorage Regional Medical Center', address: '3260 Providence Dr', city: 'Anchorage', state: 'AK', postal_code: '99508', notes: 'Flagship hospital.' },
      { name: 'Juneau Community Hospital', address: '3260 Hospital Dr', city: 'Juneau', state: 'AK', postal_code: '99801', notes: 'Smaller community hospital.' },
      { name: 'Eugene Outpatient Clinic', address: '1255 Hilyard St', city: 'Eugene', state: 'OR', postal_code: '97401', notes: 'Outpatient and infusion services.' },
    ],
  },
]

function loadCustomerStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOMERS_STORAGE_KEY) : null
    if (!raw) {
      const legacyRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_CUSTOMERS_STORAGE_KEY) : null
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        const migrated = {
          customers: (legacy.customers || []).map(c => ({
            ...c,
            epa_generator_status: c.epa_generator_status || '',
          })),
          locations: legacy.locations || [],
          nextId: legacy.nextId || { customer: 1, location: 1 },
          seeded: true,
        }
        saveCustomerStore(migrated)
        return migrated
      }
      const store = seedCustomerStore()
      return store
    }
    const parsed = JSON.parse(raw)
    const store = {
      customers: parsed.customers || [],
      locations: parsed.locations || [],
      nextId: parsed.nextId || { customer: 1, location: 1 },
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) {
      return seedCustomerStore()
    }
    return store
  } catch {
    return seedCustomerStore()
  }
}

function seedCustomerStore() {
  const store = emptyCustomerStore()
  for (const entry of SEED_CUSTOMERS) {
    const customerId = store.nextId.customer++
    const now = new Date().toISOString()
    store.customers.push({
      id: customerId,
      name: entry.name,
      contact_name: entry.contact_name,
      contact_email: entry.contact_email,
      contact_phone: entry.contact_phone,
      epa_generator_status: entry.epa_generator_status || '',
      billing_address: entry.billing_address,
      notes: entry.notes,
      created_at: now,
      updated_at: now,
    })
    for (const loc of entry.locations) {
      store.locations.push({
        id: store.nextId.location++,
        customer: customerId,
        name: loc.name,
        address: loc.address || '',
        city: loc.city || '',
        state: loc.state || '',
        postal_code: loc.postal_code || '',
        notes: loc.notes || '',
        created_at: now,
      })
    }
  }
  store.seeded = true
  saveCustomerStore(store)
  return store
}

function saveCustomerStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(store))
    }
  } catch {
    // Storage may be unavailable
  }
}

function hydrateCustomer(customer, store) {
  const locations = store.locations
    .filter(l => l.customer === customer.id)
    .map(l => ({ ...l }))
  return { ...customer, locations }
}

function seedMixtureStore() {
  const store = emptyStore()
  const customerStore = loadCustomerStore()
  const now = new Date()
  const seededProfiles = Array.from({ length: 20 }, (_, i) => ({
    name: `Demo Profile ${i + 1}`,
    review_status: i % 5 === 0 ? 'rejected' : i % 3 === 0 ? 'approved' : i % 7 === 0 ? 'draft' : 'pending_review',
    customer: customerStore.customers[i % customerStore.customers.length],
    generation_offset_days: 55 - (i * 2),
    component_count: 5 + (i % 6),
  }))
  const profileIdSet = new Set()

  for (const profile of seededProfiles) {
    const id = store.nextId.mixture++
    const transaction_id = generatePrefixedId('PID', profileIdSet)
    profileIdSet.add(transaction_id)
    const location = customerStore.locations.find(l => l.customer === profile.customer.id) || null
    const generatedAt = new Date(now.getTime() - profile.generation_offset_days * 86400000)
    const dateOnly = generatedAt.toISOString().slice(0, 10)
    const createdAt = generatedAt.toISOString()
    const epaStatus = profile.customer.epa_generator_status || 'SQG'

    store.mixtures.push({
      id,
      transaction_id,
      name: profile.name,
      customer: profile.customer.id,
      customer_location: location?.id || null,
      is_discarded: true,
      discard_reason: 'spent',
      process_description: `Demo waste stream for ${profile.customer.name}`,
      notes: 'Prepopulated demo profile',
      review_status: profile.review_status,
      profile_stage: profile.review_status === 'approved' ? 'Approved' : profile.review_status === 'pending_review' ? 'Pending Review' : 'Draft',
      pickup_by_date: null,
      hold_time_days: null,
      produced_date: null,
      profile_started_at: createdAt,
      shipment_size_unit: 'gallons',
      shipment_size_qty: [5, 15, 30, 55, 85, 95][id % 6],
      epa_generator_status: epaStatus,
      generation_date: dateOnly,
      created_at: createdAt,
      updated_at: createdAt,
    })

    const start = (id * 7) % localChemicals.length
    const selectedChemicals = []
    for (let c = 0; c < profile.component_count; c++) {
      selectedChemicals.push(localChemicals[(start + c) % localChemicals.length])
    }
    const wasteCodes = []
    for (const chem of selectedChemicals) {
      const compId = store.nextId.component++
      store.components.push({
        id: compId,
        mixture: id,
        chemical: chem?.id || null,
        custom_name: '',
        quantity: Number((5 + ((compId % 8) * 2.5)).toFixed(2)),
        unit: 'pct_weight',
        override_flash_point_c: null,
        override_ph: null,
        override_is_reactive: false,
        notes: '',
      })
      if (chem?.epa_waste_code && wasteCodes.length < 4) {
        wasteCodes.push(chem.epa_waste_code)
      }
    }

    const determinationId = store.nextId.determination++
    // Demo spread: force alternating hazardous/non-hazardous outcomes so tiles
    // and review workflows always have mixed data even when waste codes are sparse.
    const isHazardous = wasteCodes.length > 0 || (id % 2 === 0) // alternate profiles as hazardous for demo-state coverage
    store.determinations.push({
      id: determinationId,
      mixture: id,
      created_at: createdAt,
      is_solid_waste: true,
      is_excluded: false,
      is_listed_hazardous: wasteCodes.some(c => /^[PFKU]/.test(c)),
      has_ignitability: wasteCodes.includes('D001'),
      has_corrosivity: wasteCodes.includes('D002'),
      has_reactivity: wasteCodes.includes('D003'),
      has_toxicity: wasteCodes.some(c => /^D0/.test(c) && !['D001', 'D002', 'D003'].includes(c)),
      is_hazardous_waste: isHazardous,
      waste_codes: JSON.stringify(wasteCodes),
      reasoning: JSON.stringify([
        { step: 1, title: 'Solid Waste', result: 'Material is discarded', details: ['Generator indicated discarded material.'] },
        { step: 2, title: 'Exclusions', result: 'No exclusion identified', details: ['No exclusion selected in demo profile.'] },
        { step: 3, title: 'Listed Waste', result: wasteCodes.length ? 'Listed/characteristic codes present' : 'No listed codes identified', details: [`Codes: ${wasteCodes.join(', ') || 'None'}`] },
        { step: 4, title: 'Characteristics', result: isHazardous ? 'Hazardous characteristics found' : 'No characteristic thresholds exceeded', details: ['Demo-generated profile result.'] },
      ]),
      recommendations: isHazardous
        ? 'Manage as hazardous waste; use approved transport and manifesting.'
        : 'Continue routine characterization; verify with lab data if needed.',
      reviewer_name: `Demo Reviewer ${(id % 6) + 1}`,
      reviewer_sign_off_date: dateOnly,
    })
  }

  store.seeded = true
  saveStore(store)
  return store
}

function findChemical(chemicalId) {
  if (chemicalId == null) return null
  return localChemicals.find(c => c.id === chemicalId) || null
}

function buildComponentName(comp) {
  if (comp.chemical_detail && comp.chemical_detail.name) return comp.chemical_detail.name
  return comp.custom_name || 'Unknown Chemical'
}

function hydrateComponent(rawComp) {
  const chemDetail = findChemical(rawComp.chemical)
  const comp = {
    id: rawComp.id,
    mixture: rawComp.mixture,
    chemical: rawComp.chemical,
    chemical_detail: chemDetail,
    custom_name: rawComp.custom_name || '',
    quantity: rawComp.quantity,
    unit: rawComp.unit,
    override_flash_point_c: rawComp.override_flash_point_c ?? null,
    override_ph: rawComp.override_ph ?? null,
    override_is_reactive: !!rawComp.override_is_reactive,
    notes: rawComp.notes || '',
  }
  comp.component_name = buildComponentName(comp)
  return comp
}

function hydrateDetermination(rawDet) {
  // The backend stores waste_codes/reasoning as JSON strings and the
  // serializer adds *_list fields. Mirror both so consumers work either way.
  const wasteCodesArr = Array.isArray(rawDet.waste_codes_list)
    ? rawDet.waste_codes_list
    : safeParseJsonArray(rawDet.waste_codes)
  const reasoningArr = Array.isArray(rawDet.reasoning_list)
    ? rawDet.reasoning_list
    : safeParseJsonArray(rawDet.reasoning)
  return {
    id: rawDet.id,
    mixture: rawDet.mixture,
    created_at: rawDet.created_at,
    is_solid_waste: !!rawDet.is_solid_waste,
    is_excluded: !!rawDet.is_excluded,
    is_listed_hazardous: !!rawDet.is_listed_hazardous,
    has_ignitability: !!rawDet.has_ignitability,
    has_corrosivity: !!rawDet.has_corrosivity,
    has_reactivity: !!rawDet.has_reactivity,
    has_toxicity: !!rawDet.has_toxicity,
    is_hazardous_waste: !!rawDet.is_hazardous_waste,
    waste_codes: rawDet.waste_codes || JSON.stringify(wasteCodesArr),
    reasoning: rawDet.reasoning || JSON.stringify(reasoningArr),
    recommendations: rawDet.recommendations || '',
    waste_codes_list: wasteCodesArr,
    reasoning_list: reasoningArr,
    reviewer_name: rawDet.reviewer_name || '',
    reviewer_sign_off_date: rawDet.reviewer_sign_off_date || null,
  }
}

function safeParseJsonArray(s) {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

import { EPA_STATUS_HOLD_DAYS, calcShipByInfo } from './shipByUtils.js'

function hydrateMixture(rawMixture, store) {
  const components = store.components
    .filter(c => c.mixture === rawMixture.id)
    .map(hydrateComponent)
  const determinations = store.determinations
    .filter(d => d.mixture === rawMixture.id)
    .map(hydrateDetermination)
  const holdDays = EPA_STATUS_HOLD_DAYS[rawMixture.epa_generator_status] ?? null
  const info = calcShipByInfo(rawMixture.epa_generator_status, rawMixture.generation_date)
  const customerStore = loadCustomerStore()
  const customer = customerStore.customers.find(c => c.id === rawMixture.customer)
  const location = customerStore.locations.find(l => l.id === rawMixture.customer_location)
  return {
    ...rawMixture,
    components,
    determinations,
    customer_name: customer?.name || '',
    customer_location_name: location?.name || '',
    hold_days: holdDays,
    ship_by_date: info?.shipByDate ?? null,
    days_remaining_to_ship: info?.daysRemaining ?? null,
  }
}

function ok(data) { return Promise.resolve({ data }) }
function reject(message, status = 400) {
  // Mimic an axios-style error so call sites that read err.response.data.detail
  // continue to work.
  const err = new Error(message)
  err.response = { status, data: { detail: message } }
  return Promise.reject(err)
}

// --------------------------------------------------------------- Public API
// Each function returns a Promise resolving to `{ data }` so callers can use
// the same shape as axios responses.

export const localMixtures = {
  list() {
    const store = loadStore()
    const results = store.mixtures.map(m => hydrateMixture(m, store))
    return ok({ results })
  },

  get(id) {
    const store = loadStore()
    const m = store.mixtures.find(x => x.id === Number(id))
    if (!m) return reject('Mixture not found.', 404)
    return ok(hydrateMixture(m, store))
  },

  create(payload) {
    const store = loadStore()
    const id = store.nextId.mixture++
    const usedIds = new Set(store.mixtures.map(m => m.transaction_id))
    const transactionId = generatePrefixedId('PID', usedIds)
    const mixture = {
      id,
      transaction_id: transactionId,
      name: payload.name,
      customer: payload.customer ?? null,
      customer_location: payload.customer_location ?? null,
      is_discarded: payload.is_discarded !== false,
      discard_reason: payload.discard_reason || '',
      process_description: payload.process_description || '',
      notes: payload.notes || '',
      review_status: payload.review_status || '',
      profile_stage: payload.profile_stage || 'Draft',
      pickup_by_date: payload.pickup_by_date || null,
      hold_time_days: payload.hold_time_days || null,
      produced_date: payload.produced_date || null,
      profile_started_at: payload.profile_started_at || new Date().toISOString(),
      shipment_size_unit: payload.shipment_size_unit || '',
      shipment_size_qty: payload.shipment_size_qty ?? null,
      epa_generator_status: payload.epa_generator_status || '',
      generation_date: payload.generation_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.mixtures.push(mixture)
    saveStore(store)
    return ok({ ...mixture, components: [], determinations: [] })
  },

  update(id, payload) {
    const store = loadStore()
    const m = store.mixtures.find(x => x.id === Number(id))
    if (!m) return reject('Mixture not found.', 404)
    Object.assign(m, payload, { updated_at: new Date().toISOString() })
    saveStore(store)
    return ok(hydrateMixture(m, store))
  },

  delete(id) {
    const store = loadStore()
    const numId = Number(id)
    store.mixtures = store.mixtures.filter(m => m.id !== numId)
    store.components = store.components.filter(c => c.mixture !== numId)
    store.determinations = store.determinations.filter(d => d.mixture !== numId)
    saveStore(store)
    return ok({})
  },

  addComponent(mixtureId, payload) {
    const store = loadStore()
    const numId = Number(mixtureId)
    const m = store.mixtures.find(x => x.id === numId)
    if (!m) return reject('Mixture not found.', 404)
    const comp = {
      id: store.nextId.component++,
      mixture: numId,
      chemical: payload.chemical ?? null,
      custom_name: payload.custom_name || '',
      quantity: Number(payload.quantity),
      unit: payload.unit,
      override_flash_point_c: payload.override_flash_point_c ?? null,
      override_ph: payload.override_ph ?? null,
      override_is_reactive: !!payload.override_is_reactive,
      notes: payload.notes || '',
    }
    store.components.push(comp)
    saveStore(store)
    return ok(hydrateComponent(comp))
  },

  removeComponent(componentId) {
    const store = loadStore()
    store.components = store.components.filter(c => c.id !== Number(componentId))
    saveStore(store)
    return ok({})
  },

  determine(mixtureId, additionalProps = {}, reviewerInfo = {}) {
    const store = loadStore()
    const numId = Number(mixtureId)
    const m = store.mixtures.find(x => x.id === numId)
    if (!m) return reject('Mixture not found.', 404)
    const hydrated = hydrateMixture(m, store)
    const result = determineHazardousWaste(hydrated, additionalProps || {})
    const det = {
      id: store.nextId.determination++,
      mixture: numId,
      created_at: new Date().toISOString(),
      is_solid_waste: result.is_solid_waste,
      is_excluded: result.is_excluded,
      is_listed_hazardous: result.is_listed_hazardous,
      has_ignitability: result.has_ignitability,
      has_corrosivity: result.has_corrosivity,
      has_reactivity: result.has_reactivity,
      has_toxicity: result.has_toxicity,
      is_hazardous_waste: result.is_hazardous_waste,
      waste_codes: JSON.stringify(result.waste_codes),
      reasoning: JSON.stringify(result.reasoning),
      recommendations: result.recommendations,
      reviewer_name: reviewerInfo.reviewer_name || '',
      reviewer_sign_off_date: reviewerInfo.reviewer_sign_off_date || null,
    }
    store.determinations.push(det)
    // Mark mixture as pending review after determination
    m.review_status = 'pending_review'
    m.profile_stage = 'Pending Review'
    saveStore(store)
    return ok({ determination_id: det.id, determination: hydrateDetermination(det) })
  },

  exportCsv(mixtureId) {
    const store = loadStore()
    const m = store.mixtures.find(x => x.id === Number(mixtureId))
    if (!m) return reject('Mixture not found.', 404)
    const hydrated = hydrateMixture(m, store)
    const lines = [
      ['Mixture', m.name],
      ['Discarded', m.is_discarded ? 'Yes' : 'No'],
      ['Discard Reason', m.discard_reason || ''],
      ['Process Description', m.process_description || ''],
      ['Created', m.created_at],
      [],
      ['Component', 'CAS', 'EPA Code', 'Quantity', 'Unit'],
    ]
    for (const c of hydrated.components) {
      lines.push([
        c.component_name,
        c.chemical_detail?.cas_number || '',
        c.chemical_detail?.epa_waste_code || '',
        c.quantity,
        c.unit,
      ])
    }
    const latest = hydrated.determinations[hydrated.determinations.length - 1]
    if (latest) {
      lines.push([])
      lines.push(['Determination', latest.is_hazardous_waste ? 'HAZARDOUS' : 'NOT HAZARDOUS'])
      lines.push(['Waste Codes', latest.waste_codes_list.join('; ')])
      if (latest.reviewer_name) {
        lines.push(['Reviewed By', latest.reviewer_name])
        lines.push(['Sign-Off Date', latest.reviewer_sign_off_date || ''])
      }
    }
    const csv = lines.map(row =>
      row.map(cell => {
        const s = String(cell ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')
    ).join('\n')
    return ok(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  },

  reportPdf() {
    // Generating PDFs in a static deploy would require pulling in a large
    // PDF library. For now, the static build directs users to the CSV
    // export and the on-screen report (which can be printed to PDF via
    // the browser).
    return reject('PDF report generation is only available when the backend is deployed. Use CSV export or print this page to PDF.', 501)
  },

  setReviewStatus(mixtureId, reviewStatus) {
    const store = loadStore()
    const m = store.mixtures.find(x => x.id === Number(mixtureId))
    if (!m) return reject('Mixture not found.', 404)
    if (!['draft', 'pending_review', 'approved', 'rejected'].includes(reviewStatus)) {
      return reject('Invalid review status.', 400)
    }
    m.review_status = reviewStatus
    // Sync profile_stage with review_status
    if (reviewStatus === 'approved') m.profile_stage = 'Approved'
    else if (reviewStatus === 'pending_review') m.profile_stage = 'Pending Review'
    else m.profile_stage = 'Draft'
    m.updated_at = new Date().toISOString()
    saveStore(store)
    return ok({ id: m.id, review_status: m.review_status, profile_stage: m.profile_stage })
  },

  validateStateRules(id, additionalAnswers = {}) {
    // In local mode, simulate state rules validation
    const store = loadStore()
    const m = store.mixtures.find(x => x.id === Number(id))
    if (!m) return Promise.reject({ response: { status: 404, data: { detail: 'Mixture not found.' } } })
    // Resolve state from customer location
    const customerStore = loadCustomerStore()
    const location = customerStore.locations.find(l => l.id === m.customer_location)
    const stateCode = location?.state?.toUpperCase()?.trim()?.slice(0, 2) || ''

    // In local mode, return pass (no state rules data loaded locally)
    return ok({
      overall_result: stateCode ? 'pass' : 'pass',
      rule_results: [],
      questions: [],
      state_code: stateCode,
    })
  },
}

// --------------------------------------------------------------- Local Customers
export const localCustomers = {
  list() {
    const store = loadCustomerStore()
    const results = store.customers.map(c => hydrateCustomer(c, store))
    return ok({ results })
  },

  get(id) {
    const store = loadCustomerStore()
    const c = store.customers.find(x => x.id === Number(id))
    if (!c) return reject('Customer not found.', 404)
    return ok(hydrateCustomer(c, store))
  },

  create(payload) {
    const store = loadCustomerStore()
    if (!payload.name || !payload.name.trim()) return reject('Customer name is required.')
    const existing = store.customers.find(c => c.name.toLowerCase() === payload.name.trim().toLowerCase())
    if (existing) return reject('A customer with this name already exists.')
    const now = new Date().toISOString()
    const customer = {
      id: store.nextId.customer++,
      name: payload.name.trim(),
      contact_name: payload.contact_name || '',
      contact_email: payload.contact_email || '',
      contact_phone: payload.contact_phone || '',
      epa_generator_status: payload.epa_generator_status || '',
      billing_address: payload.billing_address || '',
      notes: payload.notes || '',
      created_at: now,
      updated_at: now,
    }
    store.customers.push(customer)
    saveCustomerStore(store)
    return ok({ ...customer, locations: [] })
  },

  update(id, payload) {
    const store = loadCustomerStore()
    const c = store.customers.find(x => x.id === Number(id))
    if (!c) return reject('Customer not found.', 404)
    Object.assign(c, payload, { updated_at: new Date().toISOString() })
    saveCustomerStore(store)
    return ok(hydrateCustomer(c, store))
  },

  delete(id) {
    const store = loadCustomerStore()
    const numId = Number(id)
    store.customers = store.customers.filter(c => c.id !== numId)
    store.locations = store.locations.filter(l => l.customer !== numId)
    saveCustomerStore(store)
    return ok({})
  },
}

export const localCustomerLocations = {
  list(customerId) {
    const store = loadCustomerStore()
    let results = store.locations
    if (customerId) {
      results = results.filter(l => l.customer === Number(customerId))
    }
    return ok({ results })
  },

  create(payload) {
    const store = loadCustomerStore()
    if (!payload.customer) return reject('Customer ID is required.')
    if (!payload.name || !payload.name.trim()) return reject('Location name is required.')
    const now = new Date().toISOString()
    const location = {
      id: store.nextId.location++,
      customer: Number(payload.customer),
      name: payload.name.trim(),
      address: payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      postal_code: payload.postal_code || '',
      notes: payload.notes || '',
      created_at: now,
    }
    store.locations.push(location)
    saveCustomerStore(store)
    return ok(location)
  },

  update(id, payload) {
    const store = loadCustomerStore()
    const loc = store.locations.find(l => l.id === Number(id))
    if (!loc) return reject('Location not found.', 404)
    Object.assign(loc, payload)
    saveCustomerStore(store)
    return ok(loc)
  },

  delete(id) {
    const store = loadCustomerStore()
    store.locations = store.locations.filter(l => l.id !== Number(id))
    saveCustomerStore(store)
    return ok({})
  },
}

export default localMixtures

// --------------------------------------------------------------- Local Shippers
const SHIPPERS_STORAGE_KEY = 'wasteid_shippers_v1'

// Seed data matching the backend seed_shippers management command
const SEED_SHIPPERS = [
  {
    company_name: 'Clean Harbors Environmental Services',
    epa_id: 'MAD053452637',
    contact_name: 'David Patterson',
    address: '42 Longwater Dr',
    city: 'Norwell',
    state: 'MA',
    zip_code: '02061',
    phone: '(781) 792-5000',
    emergency_phone: '(800) 645-8265',
    site_address: '42 Longwater Dr',
    site_city: 'Norwell',
    site_state: 'MA',
    site_zip_code: '02061',
    notes: 'Full-service environmental services. Hazardous waste collection, transportation, treatment, and disposal.',
  },
  {
    company_name: 'Stericycle Environmental Solutions',
    epa_id: 'ILD000805937',
    contact_name: 'Michelle Torres',
    address: '2355 Waukegan Rd',
    city: 'Bannockburn',
    state: 'IL',
    zip_code: '60015',
    phone: '(866) 783-7422',
    emergency_phone: '(866) 783-7422',
    site_address: '2355 Waukegan Rd',
    site_city: 'Bannockburn',
    site_state: 'IL',
    site_zip_code: '60015',
    notes: 'Hazardous and non-hazardous waste management, lab-packing, pharmaceutical waste disposal.',
  },
  {
    company_name: 'US Ecology Holdings',
    epa_id: 'IDD073114654',
    contact_name: 'Robert Gould',
    address: '101 S Capitol Blvd, Ste 1000',
    city: 'Boise',
    state: 'ID',
    zip_code: '83702',
    phone: '(208) 331-8400',
    emergency_phone: '(800) 272-4729',
    site_address: '20400 Lemley Rd',
    site_city: 'Grand View',
    site_state: 'ID',
    site_zip_code: '83624',
    notes: 'Hazardous waste treatment, storage, and disposal facility (TSDF). Landfill and incineration services.',
  },
  {
    company_name: 'Veolia Environmental Services',
    epa_id: 'TXD000838896',
    contact_name: 'Anne-Marie Laurent',
    address: '3 Riverway, Ste 700',
    city: 'Houston',
    state: 'TX',
    zip_code: '77056',
    phone: '(713) 496-5000',
    emergency_phone: '(800) 832-7157',
    site_address: '14855 Almeda Rd',
    site_city: 'Houston',
    site_state: 'TX',
    site_zip_code: '77053',
    notes: 'Global environmental services provider. Industrial waste management, chemical treatment, and recycling.',
  },
  {
    company_name: 'Heritage Crystal Clean',
    epa_id: 'IND089783012',
    contact_name: 'Jason Wilkins',
    address: '2175 Point Blvd, Ste 375',
    city: 'Elgin',
    state: 'IL',
    zip_code: '60123',
    phone: '(847) 836-5670',
    emergency_phone: '(877) 938-7948',
    site_address: '2175 Point Blvd, Ste 375',
    site_city: 'Elgin',
    site_state: 'IL',
    site_zip_code: '60123',
    notes: 'Parts cleaning, used oil collection, vacuum truck services, and hazardous/non-hazardous waste disposal.',
  },
  {
    company_name: 'Tradebe Environmental Services',
    epa_id: 'CTD001455814',
    contact_name: 'Carlos Mendez',
    address: '200 Merritt 7, 3rd Floor',
    city: 'Norwalk',
    state: 'CT',
    zip_code: '06851',
    phone: '(203) 750-9800',
    emergency_phone: '(800) 388-7242',
    site_address: '68 Thermos Ave',
    site_city: 'East Bridgewater',
    site_state: 'MA',
    site_zip_code: '02333',
    notes: 'Hazardous waste incineration, fuel blending, and industrial cleaning services.',
  },
  {
    company_name: 'Republic Services Environmental Solutions',
    epa_id: 'AZD982441263',
    contact_name: 'Karen Mitchell',
    address: '18500 N Allied Way',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85054',
    phone: '(480) 627-2700',
    emergency_phone: '(800) 722-8529',
    site_address: '18500 N Allied Way',
    site_city: 'Phoenix',
    site_state: 'AZ',
    site_zip_code: '85054',
    notes: 'Hazardous and non-hazardous waste transportation, treatment, and landfill disposal services.',
  },
]

function emptyShipperStore() {
  return { shippers: [], nextId: 1, seeded: false }
}

function seedShipperStore() {
  const store = emptyShipperStore()
  const now = new Date().toISOString()
  for (const entry of SEED_SHIPPERS) {
    store.shippers.push({
      id: store.nextId++,
      company_name: entry.company_name,
      epa_id: entry.epa_id || '',
      contact_name: entry.contact_name || '',
      address: entry.address || '',
      city: entry.city || '',
      state: entry.state || '',
      zip_code: entry.zip_code || '',
      phone: entry.phone || '',
      emergency_phone: entry.emergency_phone || '',
      site_address: entry.site_address || '',
      site_city: entry.site_city || '',
      site_state: entry.site_state || '',
      site_zip_code: entry.site_zip_code || '',
      notes: entry.notes || '',
      created_at: now,
      updated_at: now,
    })
  }
  store.seeded = true
  saveShipperStore(store)
  return store
}

function loadShipperStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SHIPPERS_STORAGE_KEY) : null
    if (!raw) return seedShipperStore()
    const parsed = JSON.parse(raw)
    const store = {
      shippers: parsed.shippers || [],
      nextId: parsed.nextId || 1,
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) {
      return seedShipperStore()
    }
    return store
  } catch {
    return seedShipperStore()
  }
}

function saveShipperStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SHIPPERS_STORAGE_KEY, JSON.stringify(store))
    }
  } catch { /* ignore */ }
}

export const localShippers = {
  list() {
    const store = loadShipperStore()
    return ok({ results: store.shippers })
  },
  get(id) {
    const store = loadShipperStore()
    const s = store.shippers.find(x => x.id === Number(id))
    if (!s) return reject('Shipper not found.', 404)
    return ok(s)
  },
  create(payload) {
    const store = loadShipperStore()
    const now = new Date().toISOString()
    const shipper = {
      id: store.nextId++,
      company_name: payload.company_name || '',
      epa_id: payload.epa_id || '',
      address: payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      zip_code: payload.zip_code || '',
      phone: payload.phone || '',
      emergency_phone: payload.emergency_phone || '',
      contact_name: payload.contact_name || '',
      site_address: payload.site_address || '',
      site_city: payload.site_city || '',
      site_state: payload.site_state || '',
      site_zip_code: payload.site_zip_code || '',
      notes: payload.notes || '',
      created_at: now,
      updated_at: now,
    }
    store.shippers.push(shipper)
    saveShipperStore(store)
    return ok(shipper)
  },
  update(id, payload) {
    const store = loadShipperStore()
    const s = store.shippers.find(x => x.id === Number(id))
    if (!s) return reject('Shipper not found.', 404)
    Object.assign(s, payload, { updated_at: new Date().toISOString() })
    saveShipperStore(store)
    return ok(s)
  },
  delete(id) {
    const store = loadShipperStore()
    store.shippers = store.shippers.filter(s => s.id !== Number(id))
    saveShipperStore(store)
    return ok({})
  },
}

// --------------------------------------------------------------- Local Incinerators
const INCINERATORS_STORAGE_KEY = 'wasteid_incinerators_v1'

function emptyIncineratorStore() {
  return { incinerators: [], nextId: 1, seeded: false }
}

function seedIncineratorStore() {
  const store = emptyIncineratorStore()
  store.seeded = true
  saveIncineratorStore(store)
  return store
}

function loadIncineratorStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(INCINERATORS_STORAGE_KEY) : null
    if (!raw) return seedIncineratorStore()
    const parsed = JSON.parse(raw)
    const store = {
      incinerators: parsed.incinerators || [],
      nextId: parsed.nextId || 1,
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) {
      return seedIncineratorStore()
    }
    return store
  } catch {
    return seedIncineratorStore()
  }
}

function saveIncineratorStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(INCINERATORS_STORAGE_KEY, JSON.stringify(store))
    }
  } catch { /* ignore */ }
}

export const localIncinerators = {
  list() {
    const store = loadIncineratorStore()
    return ok({ results: store.incinerators })
  },
  get(id) {
    const store = loadIncineratorStore()
    const s = store.incinerators.find(x => x.id === Number(id))
    if (!s) return reject('Incinerator not found.', 404)
    return ok(s)
  },
  create(payload) {
    const store = loadIncineratorStore()
    const now = new Date().toISOString()
    const incinerator = {
      id: store.nextId++,
      name: payload.name || '',
      address: payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      zip_code: payload.zip_code || '',
      phone: payload.phone || '',
      contact_name: payload.contact_name || '',
      contact_email: payload.contact_email || '',
      permit_number: payload.permit_number || '',
      notes: payload.notes || '',
      accepted_waste_codes: payload.accepted_waste_codes || [],
      created_at: now,
      updated_at: now,
    }
    store.incinerators.push(incinerator)
    saveIncineratorStore(store)
    return ok(incinerator)
  },
  update(id, payload) {
    const store = loadIncineratorStore()
    const s = store.incinerators.find(x => x.id === Number(id))
    if (!s) return reject('Incinerator not found.', 404)
    Object.assign(s, payload, { updated_at: new Date().toISOString() })
    saveIncineratorStore(store)
    return ok(s)
  },
  delete(id) {
    const store = loadIncineratorStore()
    store.incinerators = store.incinerators.filter(s => s.id !== Number(id))
    saveIncineratorStore(store)
    return ok({})
  },
}

// --------------------------------------------------------------- Local Manifests
const MANIFESTS_STORAGE_KEY = 'wasteid_manifests_v1'

function emptyManifestStore() {
  return { manifests: [], nextId: 1 }
}

function loadManifestStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MANIFESTS_STORAGE_KEY) : null
    if (!raw) return emptyManifestStore()
    return JSON.parse(raw)
  } catch {
    return emptyManifestStore()
  }
}

function saveManifestStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MANIFESTS_STORAGE_KEY, JSON.stringify(store))
    }
  } catch { /* ignore */ }
}

export const localManifests = {
  list() {
    const store = loadManifestStore()
    return ok({ results: store.manifests })
  },
  get(id) {
    const store = loadManifestStore()
    const m = store.manifests.find(x => x.id === Number(id))
    if (!m) return reject('Manifest not found.', 404)
    return ok(m)
  },
  create(payload) {
    const store = loadManifestStore()
    const now = new Date().toISOString()
    const manifest = {
      id: store.nextId++,
      ...payload,
      waste_items: payload.waste_items || '[]',
      determination_ids: payload.determination_ids || '[]',
      status: payload.status || 'draft',
      created_at: now,
      updated_at: now,
    }
    store.manifests.push(manifest)
    saveManifestStore(store)
    return ok(manifest)
  },
  update(id, payload) {
    const store = loadManifestStore()
    const m = store.manifests.find(x => x.id === Number(id))
    if (!m) return reject('Manifest not found.', 404)
    Object.assign(m, payload, { updated_at: new Date().toISOString() })
    saveManifestStore(store)
    return ok(m)
  },
  delete(id) {
    const store = loadManifestStore()
    store.manifests = store.manifests.filter(m => m.id !== Number(id))
    saveManifestStore(store)
    return ok({})
  },
  async exportPdf(id) {
    const store = loadManifestStore()
    const m = store.manifests.find(x => x.id === Number(id))
    if (!m) return reject('Manifest not found.', 404)
    const { generateEpaFormPdf } = await import('./epaFormPdf.js')
    generateEpaFormPdf(m)
    return ok({})
  },
}

// Re-export journey store
export { localJourney } from './journeyStore.js'
// --------------------------------------------------------------- Local Orders
const ORDERS_STORAGE_KEY = 'wasteid_orders_v2'
const LEGACY_ORDERS_STORAGE_KEY = 'wasteid_orders_v1'

function emptyOrderStore() {
  return { orders: [], journeys: [], nextId: { order: 1, journey: 1 }, seeded: false }
}

function seedOrderStore() {
  const store = emptyOrderStore()
  const mixtureStore = loadStore()
  const customerStore = loadCustomerStore()
  const shipperStore = loadShipperStore()
  const profiles = mixtureStore.mixtures.slice(0, 20)
  const existingOrderIds = new Set()
  const seeds = [
    { owner_name: 'Marcus Reilly', status: 'open', note: 'Demo open order with multiple profiles.' },
    { owner_name: 'Jenna Whitcomb', status: 'in_quote', note: 'Demo order submitted for bidding.' },
    { owner_name: 'Dr. Priya Natarajan', status: 'waiting_signature', note: 'Demo order awaiting customer signature.' },
    { owner_name: 'Hank Brennan', status: 'rejected_transport', note: 'Demo order rejected by transport review.' },
    { owner_name: 'Sarah Kowalski, RN', status: 'rejected_tldr', note: 'Demo order rejected by TLDR.' },
  ]
  const baseDate = new Date()
  for (let i = 0; i < seeds.length; i++) {
    const entry = seeds[i]
    const profileSliceStart = i * 4
    const orderProfiles = profiles.slice(profileSliceStart, profileSliceStart + 4)
    const profileIds = orderProfiles.map(p => p.id)
    const profileNames = orderProfiles.map(p => p.name)
    const firstCustomerId = orderProfiles[0]?.customer
    const generatorName = customerStore.customers.find(c => c.id === firstCustomerId)?.name || '—'
    const orderShippers = shipperStore.shippers.slice(i % 2, (i % 2) + 2)
    const orderId = store.nextId.order++
    const orderIdStr = generatePrefixedId('OID', existingOrderIds)
    existingOrderIds.add(orderIdStr)
    const createdDate = new Date(baseDate.getTime() - (seeds.length - i) * 86400000)
    const now = createdDate.toISOString()
    store.orders.push({
      id: orderId,
      order_id: orderIdStr,
      owner_name: entry.owner_name,
      generator_name: generatorName,
      status: entry.status,
      profile_names: profileNames,
      shipper_names: orderShippers.map(s => s.company_name),
      profile_ids: profileIds,
      shipper_ids: orderShippers.map(s => s.id),
      notes: entry.note,
      created_at: now,
      updated_at: now,
    })
    // Create journey record for order creation
    store.journeys.push({
      id: store.nextId.journey++,
      order: orderId,
      stage: 'open',
      timestamp: now,
      notes: 'Order created',
    })
    // If status is not open, add journey for current stage
    if (entry.status !== 'open') {
      const stageDate = new Date(createdDate.getTime() + 3600000)
      store.journeys.push({
        id: store.nextId.journey++,
        order: orderId,
        stage: entry.status,
        timestamp: stageDate.toISOString(),
        notes: `Moved to ${entry.status}`,
      })
    }
  }
  store.seeded = true
  saveOrderStore(store)
  return store
}

function loadOrderStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ORDERS_STORAGE_KEY) : null
    if (!raw) {
      const legacyRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_ORDERS_STORAGE_KEY) : null
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw)
        const migrated = {
          orders: legacy.orders || [],
          journeys: legacy.journeys || [],
          nextId: legacy.nextId || { order: 1, journey: 1 },
          seeded: true,
        }
        saveOrderStore(migrated)
        return migrated
      }
      return seedOrderStore()
    }
    const parsed = JSON.parse(raw)
    const store = {
      orders: parsed.orders || [],
      journeys: parsed.journeys || [],
      nextId: parsed.nextId || { order: 1, journey: 1 },
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) return seedOrderStore()
    return store
  } catch {
    return seedOrderStore()
  }
}

function saveOrderStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(store))
    }
  } catch { /* ignore */ }
}

export const localOrders = {
  list(statusFilter) {
    const store = loadOrderStore()
    let results = store.orders
    if (statusFilter) {
      results = results.filter(o => o.status === statusFilter)
    }
    // Attach journey records
    results = results.map(o => ({
      ...o,
      journey_records: store.journeys.filter(j => j.order === o.id),
    }))
    return ok({ results })
  },

  get(id) {
    const store = loadOrderStore()
    const o = store.orders.find(x => x.id === Number(id))
    if (!o) return reject('Order not found.', 404)
    return ok({
      ...o,
      journey_records: store.journeys.filter(j => j.order === o.id),
    })
  },

  create(payload) {
    const store = loadOrderStore()
    const id = store.nextId.order++
    const usedIds = new Set(store.orders.map(o => o.order_id))
    const orderIdStr = generatePrefixedId('OID', usedIds)
    const now = new Date().toISOString()
    const order = {
      id,
      order_id: orderIdStr,
      owner_name: payload.owner_name || '',
      generator_name: payload.generator_name || '',
      generator: payload.generator || null,
      status: payload.status || 'open',
      profile_ids: payload.profile_ids || [],
      profile_names: payload.profile_names || [],
      shipper_ids: payload.shipper_ids || [],
      shipper_names: payload.shipper_names || [],
      notes: payload.notes || '',
      created_at: now,
      updated_at: now,
    }
    store.orders.push(order)
    // Journey record for creation
    store.journeys.push({
      id: store.nextId.journey++,
      order: id,
      stage: 'open',
      timestamp: now,
      notes: 'Order created',
    })
    saveOrderStore(store)
    return ok({
      ...order,
      journey_records: store.journeys.filter(j => j.order === id),
    })
  },

  update(id, payload) {
    const store = loadOrderStore()
    const o = store.orders.find(x => x.id === Number(id))
    if (!o) return reject('Order not found.', 404)
    Object.assign(o, payload, { updated_at: new Date().toISOString() })
    saveOrderStore(store)
    return ok({
      ...o,
      journey_records: store.journeys.filter(j => j.order === o.id),
    })
  },

  delete(id) {
    const store = loadOrderStore()
    const numId = Number(id)
    store.orders = store.orders.filter(o => o.id !== numId)
    store.journeys = store.journeys.filter(j => j.order !== numId)
    saveOrderStore(store)
    return ok({})
  },

  submitToBid(id) {
    const store = loadOrderStore()
    const o = store.orders.find(x => x.id === Number(id))
    if (!o) return reject('Order not found.', 404)
    o.status = 'in_quote'
    o.updated_at = new Date().toISOString()
    store.journeys.push({
      id: store.nextId.journey++,
      order: o.id,
      stage: 'in_quote',
      timestamp: new Date().toISOString(),
      notes: 'Submitted to bid',
    })
    saveOrderStore(store)
    return ok({
      ...o,
      journey_records: store.journeys.filter(j => j.order === o.id),
    })
  },
}

// --------------------------------------------------------------- Local Marketplace
const MARKETPLACE_STORAGE_KEY = 'wasteid_marketplace_v1'

function emptyMarketplaceStore() {
  return { listings: [], bids: [], nextId: { listing: 1, bid: 1 }, seeded: false }
}

function loadMarketplaceStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MARKETPLACE_STORAGE_KEY) : null
    if (!raw) return seedMarketplaceStore()
    const parsed = JSON.parse(raw)
    const store = {
      listings: parsed.listings || [],
      bids: parsed.bids || [],
      nextId: parsed.nextId || { listing: 1, bid: 1 },
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) return seedMarketplaceStore()
    return store
  } catch {
    return seedMarketplaceStore()
  }
}

function saveMarketplaceStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(store))
    }
  } catch { /* ignore */ }
}

function randomHex8() {
  const alphabet = '0123456789ABCDEF'
  let out = ''
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * 16)]
  return out
}

function seedMarketplaceStore() {
  const store = emptyMarketplaceStore()
  const mixtureStore = loadStore()
  // Seed with approved profiles
  const approvedMixtures = mixtureStore.mixtures.filter(m => m.review_status === 'approved').slice(0, 6)
  const bidTypes = ['shipping', 'disposal', 'both', 'either']
  const companies = [
    { name: 'Clean Harbors Environmental', contact: 'David Patterson', email: 'dpatterson@cleanharbors.com', phone: '(781) 792-5000', epa_id: 'MAD053452637', states: ['MA', 'NY', 'CT', 'NJ', 'PA'], certifications: 'RCRA Part B Permitted TSDF, DOT Certified Transporter, ISO 14001 Certified' },
    { name: 'Stericycle Environmental Solutions', contact: 'Michelle Torres', email: 'mtorres@stericycle.com', phone: '(866) 783-7422', epa_id: 'ILD000805937', states: ['IL', 'WI', 'IN', 'OH', 'MI'], certifications: 'Hazardous Waste Transporter, Lab Pack Specialist, Pharmaceutical Waste Disposal' },
    { name: 'US Ecology Holdings', contact: 'Robert Gould', email: 'rgould@usecology.com', phone: '(208) 331-8400', epa_id: 'IDD073114654', states: ['ID', 'OR', 'WA', 'MT', 'WY'], certifications: 'RCRA Permitted Landfill & Incinerator, TSDF, Hazardous Waste Transporter' },
    { name: 'Veolia Environmental Services', contact: 'Anne-Marie Laurent', email: 'alaurent@veolia.com', phone: '(713) 496-5000', epa_id: 'TXD000838896', states: ['TX', 'LA', 'OK', 'AR', 'NM'], certifications: 'Industrial Waste Management, Chemical Treatment, Incineration Facility, ISO 9001' },
    { name: 'Heritage Crystal Clean', contact: 'Jason Wilkins', email: 'jwilkins@heritagece.com', phone: '(847) 836-5670', epa_id: 'IND089783012', states: ['IL', 'IN', 'OH', 'MI', 'WI', 'MN'], certifications: 'Parts Cleaning, Used Oil Recycling, Hazardous Waste Transporter' },
  ]
  const bidTypeOptions = ['shipping', 'disposal', 'both']
  const now = new Date()

  for (let i = 0; i < approvedMixtures.length; i++) {
    const mixture = approvedMixtures[i]
    const listingId = `MKT-${randomHex8()}`
    const createdAt = new Date(now.getTime() - (approvedMixtures.length - i) * 2 * 86400000).toISOString()
    const listing = {
      id: store.nextId.listing++,
      listing_id: listingId,
      mixture: mixture.id,
      status: i === 2 ? 'bid_accepted' : 'open',
      bid_type_needed: bidTypes[i % bidTypes.length],
      description: `Approved waste profile available for bidding. Generator requires prompt service within EPA hold-time guidelines.`,
      preferred_completion_date: null,
      created_at: createdAt,
      updated_at: createdAt,
    }
    store.listings.push(listing)

    // Add 2-3 seed bids per open listing
    const numBids = i === 2 ? 3 : 2
    for (let b = 0; b < numBids; b++) {
      const company = companies[(i + b) % companies.length]
      const bidStatus = i === 2 ? (b === 0 ? 'accepted' : 'rejected') : 'pending'
      const submittedAt = new Date(new Date(createdAt).getTime() + (b + 1) * 3600000 * 4).toISOString()
      store.bids.push({
        id: store.nextId.bid++,
        bid_id: `BID-${randomHex8()}`,
        listing: listing.id,
        bidder_company_name: company.name,
        bidder_contact_name: company.contact,
        bidder_contact_email: company.email,
        bidder_contact_phone: company.phone,
        epa_id: company.epa_id,
        bid_type: bidTypeOptions[b % bidTypeOptions.length],
        amount: String(2500 + (i * 350) + (b * 250)),
        service_area_states: JSON.stringify(company.states),
        waste_codes_handled: JSON.stringify(['D001', 'D002', 'D003', 'F001', 'F002']),
        certifications: company.certifications,
        notes: `We have capacity for immediate pickup and have handled similar waste streams previously.`,
        status: bidStatus,
        submitted_at: submittedAt,
        updated_at: submittedAt,
      })
    }
  }

  store.seeded = true
  saveMarketplaceStore(store)
  return store
}

function hydrateListingWithMixture(listing, store) {
  const mixtureStore = loadStore()
  const mixture = mixtureStore.mixtures.find(m => m.id === listing.mixture)
  if (!mixture) return null
  const hydratedMixture = hydrateMixture(mixture, mixtureStore)
  const latestDet = hydratedMixture.determinations?.[hydratedMixture.determinations.length - 1] || null
  const bids = store.bids
    .filter(b => b.listing === listing.id)
    .map(b => ({
      ...b,
      service_area_states_list: safeParseJsonArray(b.service_area_states),
      waste_codes_handled_list: safeParseJsonArray(b.waste_codes_handled),
      bid_type_display: { shipping: 'Shipping Only', disposal: 'Disposal Only', both: 'Shipping and Disposal' }[b.bid_type] || b.bid_type,
      status_display: { pending: 'Pending Review', accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn' }[b.status] || b.status,
    }))
  const activeBids = bids.filter(b => ['pending', 'accepted'].includes(b.status))
  const customerStore = loadCustomerStore()
  const location = mixture.customer_location
    ? customerStore.locations.find(l => l.id === mixture.customer_location)
    : null
  return {
    ...listing,
    bids,
    bid_count: activeBids.length,
    mixture_name: mixture.name,
    mixture_transaction_id: mixture.transaction_id,
    customer_name: hydratedMixture.customer_name || '',
    epa_generator_status: mixture.epa_generator_status || '',
    shipment_size_qty: mixture.shipment_size_qty || null,
    shipment_size_unit: mixture.shipment_size_unit || '',
    days_remaining_to_ship: hydratedMixture.days_remaining_to_ship,
    is_hazardous: latestDet?.is_hazardous_waste ?? null,
    waste_codes: latestDet ? safeParseJsonArray(latestDet.waste_codes) : [],
    generator_state: location?.state || '',
    status_display: { open: 'Open for Bids', bid_accepted: 'Bid Accepted', completed: 'Completed', withdrawn: 'Withdrawn' }[listing.status] || listing.status,
    bid_type_needed_display: { shipping: 'Shipping Only', disposal: 'Disposal Only', both: 'Shipping and Disposal', either: 'Either Shipping or Disposal' }[listing.bid_type_needed] || listing.bid_type_needed,
  }
}

export const localMarketplace = {
  listListings(params = {}) {
    const store = loadMarketplaceStore()
    let listings = store.listings
      .map(l => hydrateListingWithMixture(l, store))
      .filter(Boolean)

    if (params.status) {
      const statuses = params.status.split(',')
      listings = listings.filter(l => statuses.includes(l.status))
    }
    if (params.bid_type_needed) {
      const types = params.bid_type_needed.split(',')
      listings = listings.filter(l => types.includes(l.bid_type_needed))
    }
    if (params.epa_generator_status) {
      const statuses = params.epa_generator_status.split(',')
      listings = listings.filter(l => statuses.includes(l.epa_generator_status))
    }
    if (params.is_hazardous === 'true') listings = listings.filter(l => l.is_hazardous === true)
    if (params.is_hazardous === 'false') listings = listings.filter(l => l.is_hazardous === false)
    if (params.waste_code) listings = listings.filter(l => l.waste_codes.some(c => c.includes(params.waste_code.toUpperCase())))

    return ok({ results: listings })
  },

  getListing(id) {
    const store = loadMarketplaceStore()
    const l = store.listings.find(x => x.id === Number(id))
    if (!l) return reject('Listing not found.', 404)
    const hydrated = hydrateListingWithMixture(l, store)
    if (!hydrated) return reject('Listing profile not found.', 404)
    return ok(hydrated)
  },

  createListing(payload) {
    const store = loadMarketplaceStore()
    const mixtureId = Number(payload.mixture)
    const mixtureStore = loadStore()
    const mixture = mixtureStore.mixtures.find(m => m.id === mixtureId)
    if (!mixture) return reject('Profile not found.', 404)
    if (mixture.review_status !== 'approved') return reject('Only approved profiles can be listed.', 400)
    // Check if already listed
    const existing = store.listings.find(l => l.mixture === mixtureId)
    if (existing) {
      if (['open', 'bid_accepted'].includes(existing.status)) {
        const hydrated = hydrateListingWithMixture(existing, store)
        return ok(hydrated)
      }
      // Re-list
      existing.status = 'open'
      existing.bid_type_needed = payload.bid_type_needed || existing.bid_type_needed
      existing.description = payload.description || existing.description
      existing.updated_at = new Date().toISOString()
      saveMarketplaceStore(store)
      return ok(hydrateListingWithMixture(existing, store))
    }
    const now = new Date().toISOString()
    const listing = {
      id: store.nextId.listing++,
      listing_id: `MKT-${randomHex8()}`,
      mixture: mixtureId,
      status: 'open',
      bid_type_needed: payload.bid_type_needed || 'either',
      description: payload.description || '',
      preferred_completion_date: payload.preferred_completion_date || null,
      created_at: now,
      updated_at: now,
    }
    store.listings.push(listing)
    saveMarketplaceStore(store)
    return ok(hydrateListingWithMixture(listing, store))
  },

  withdrawListing(id) {
    const store = loadMarketplaceStore()
    const l = store.listings.find(x => x.id === Number(id))
    if (!l) return reject('Listing not found.', 404)
    if (l.status !== 'open') return reject('Only open listings can be withdrawn.', 400)
    l.status = 'withdrawn'
    l.updated_at = new Date().toISOString()
    store.bids.filter(b => b.listing === l.id && b.status === 'pending').forEach(b => { b.status = 'rejected' })
    saveMarketplaceStore(store)
    return ok(hydrateListingWithMixture(l, store))
  },

  acceptBid(listingId, bidId) {
    const store = loadMarketplaceStore()
    const l = store.listings.find(x => x.id === Number(listingId))
    if (!l) return reject('Listing not found.', 404)
    const bid = store.bids.find(b => b.id === Number(bidId) && b.listing === l.id)
    if (!bid) return reject('Bid not found.', 404)
    if (bid.status !== 'pending') return reject('Only pending bids can be accepted.', 400)
    bid.status = 'accepted'
    bid.updated_at = new Date().toISOString()
    store.bids.filter(b => b.listing === l.id && b.status === 'pending' && b.id !== bid.id)
      .forEach(b => { b.status = 'rejected'; b.updated_at = new Date().toISOString() })
    l.status = 'bid_accepted'
    l.updated_at = new Date().toISOString()
    saveMarketplaceStore(store)
    return ok(hydrateListingWithMixture(l, store))
  },

  completeListing(id) {
    const store = loadMarketplaceStore()
    const l = store.listings.find(x => x.id === Number(id))
    if (!l) return reject('Listing not found.', 404)
    if (l.status !== 'bid_accepted') return reject('Only listings with an accepted bid can be completed.', 400)
    l.status = 'completed'
    l.updated_at = new Date().toISOString()
    saveMarketplaceStore(store)
    return ok(hydrateListingWithMixture(l, store))
  },

  submitBid(payload) {
    const store = loadMarketplaceStore()
    const listingId = Number(payload.listing)
    const l = store.listings.find(x => x.id === listingId)
    if (!l) return reject('Listing not found.', 404)
    if (l.status !== 'open') return reject('This listing is no longer accepting bids.', 400)
    const now = new Date().toISOString()
    const bid = {
      id: store.nextId.bid++,
      bid_id: `BID-${randomHex8()}`,
      listing: listingId,
      bidder_company_name: payload.bidder_company_name || '',
      bidder_contact_name: payload.bidder_contact_name || '',
      bidder_contact_email: payload.bidder_contact_email || '',
      bidder_contact_phone: payload.bidder_contact_phone || '',
      epa_id: payload.epa_id || '',
      bid_type: payload.bid_type || 'shipping',
      amount: payload.amount || null,
      service_area_states: Array.isArray(payload.service_area_states)
        ? JSON.stringify(payload.service_area_states)
        : (payload.service_area_states || '[]'),
      waste_codes_handled: Array.isArray(payload.waste_codes_handled)
        ? JSON.stringify(payload.waste_codes_handled)
        : (payload.waste_codes_handled || '[]'),
      certifications: payload.certifications || '',
      notes: payload.notes || '',
      status: 'pending',
      submitted_at: now,
      updated_at: now,
    }
    store.bids.push(bid)
    saveMarketplaceStore(store)
    return ok({
      ...bid,
      service_area_states_list: safeParseJsonArray(bid.service_area_states),
      waste_codes_handled_list: safeParseJsonArray(bid.waste_codes_handled),
    })
  },

  withdrawBid(bidId) {
    const store = loadMarketplaceStore()
    const bid = store.bids.find(b => b.id === Number(bidId))
    if (!bid) return reject('Bid not found.', 404)
    if (bid.status !== 'pending') return reject('Only pending bids can be withdrawn.', 400)
    bid.status = 'withdrawn'
    bid.updated_at = new Date().toISOString()
    saveMarketplaceStore(store)
    return ok(bid)
  },

  listBids(params = {}) {
    const store = loadMarketplaceStore()
    let bids = store.bids
    if (params.listing) bids = bids.filter(b => b.listing === Number(params.listing))
    if (params.status) bids = bids.filter(b => params.status.split(',').includes(b.status))
    return ok({
      results: bids.map(b => ({
        ...b,
        service_area_states_list: safeParseJsonArray(b.service_area_states),
        waste_codes_handled_list: safeParseJsonArray(b.waste_codes_handled),
      })),
    })
  },
}
