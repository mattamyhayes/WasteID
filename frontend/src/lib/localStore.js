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

const STORAGE_KEY = 'wasteid_local_store_v1'
const CUSTOMERS_STORAGE_KEY = 'wasteid_customers_v1'

function emptyStore() {
  return {
    mixtures: [],
    components: [],
    determinations: [],
    nextId: { mixture: 1, component: 1, determination: 1 },
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
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw)
    return {
      mixtures: parsed.mixtures || [],
      components: parsed.components || [],
      determinations: parsed.determinations || [],
      nextId: parsed.nextId || { mixture: 1, component: 1, determination: 1 },
    }
  } catch {
    return emptyStore()
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

function hydrateMixture(rawMixture, store) {
  const components = store.components
    .filter(c => c.mixture === rawMixture.id)
    .map(hydrateComponent)
  const determinations = store.determinations
    .filter(d => d.mixture === rawMixture.id)
    .map(hydrateDetermination)
  return {
    ...rawMixture,
    components,
    determinations,
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
    const transactionId = `PID-${id.toString().padStart(5, '0')}`
    const mixture = {
      id,
      transaction_id: transactionId,
      name: payload.name,
      is_discarded: payload.is_discarded !== false,
      discard_reason: payload.discard_reason || '',
      process_description: payload.process_description || '',
      notes: payload.notes || '',
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

// --------------------------------------------------------------- Local Orders
const ORDERS_STORAGE_KEY = 'wasteid_orders_v1'

function generateOrderId(num) {
  return `OID-${num.toString().padStart(5, '0')}`
}

function emptyOrderStore() {
  return { orders: [], journeys: [], nextId: { order: 1, journey: 1 }, seeded: false }
}

const SEED_ORDERS = [
  {
    owner_name: 'Marcus Reilly',
    generator_name: 'Cascade Auto Body & Paint',
    status: 'open',
    profile_names: ['Paint Waste Mixture'],
    shipper_names: [],
    notes: 'Initial order for paint waste pickup',
  },
  {
    owner_name: 'Jenna Whitcomb',
    generator_name: 'Pacific Northwest Printing Co.',
    status: 'in_quote',
    profile_names: ['Ink Solvent Mixture'],
    shipper_names: ['Clean Harbors Environmental Services'],
    notes: 'Submitted for bidding on ink waste',
  },
  {
    owner_name: 'Dr. Priya Natarajan',
    generator_name: 'Evergreen Pharmaceuticals',
    status: 'waiting_signature',
    profile_names: ['Lab Solvent Waste'],
    shipper_names: ['Stericycle Environmental Solutions'],
    notes: 'Awaiting customer signature for pharma waste',
  },
  {
    owner_name: 'Hank Brennan',
    generator_name: 'Sawtooth Mining & Metals',
    status: 'rejected_transport',
    profile_names: ['Acid Mine Drainage'],
    shipper_names: ['US Ecology Holdings'],
    notes: 'Rejected due to transport route issues',
  },
  {
    owner_name: 'Sarah Kowalski, RN',
    generator_name: 'Northern Lights Hospital Network',
    status: 'rejected_tldr',
    profile_names: ['Chemo Waste'],
    shipper_names: ['Veolia Environmental Services'],
    notes: 'Rejected by TLDR review',
  },
]

function seedOrderStore() {
  const store = emptyOrderStore()
  const baseDate = new Date()
  for (let i = 0; i < SEED_ORDERS.length; i++) {
    const entry = SEED_ORDERS[i]
    const orderId = store.nextId.order++
    const orderIdStr = generateOrderId(orderId)
    const createdDate = new Date(baseDate.getTime() - (SEED_ORDERS.length - i) * 86400000)
    const now = createdDate.toISOString()
    store.orders.push({
      id: orderId,
      order_id: orderIdStr,
      owner_name: entry.owner_name,
      generator_name: entry.generator_name,
      status: entry.status,
      profile_names: entry.profile_names,
      shipper_names: entry.shipper_names,
      profile_ids: [],
      shipper_ids: [],
      notes: entry.notes,
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
    if (!raw) return seedOrderStore()
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
    const orderIdStr = generateOrderId(id)
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
