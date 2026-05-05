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

function emptyStore() {
  return {
    mixtures: [],
    components: [],
    determinations: [],
    nextId: { mixture: 1, component: 1, determination: 1 },
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
    const mixture = {
      id,
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

  determine(mixtureId, additionalProps = {}) {
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

export default localMixtures
