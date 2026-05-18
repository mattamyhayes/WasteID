// localStorage-backed journey store for tracking items through
// Profile → Quote → Order → Shipping → Disposal phases.
// Mirrors the axios response shape used by the rest of the app.

const JOURNEY_STORAGE_KEY = 'wasteid_journey_v1'

export const JOURNEY_PHASES = ['Profile', 'Quote', 'Order', 'Shipping', 'Disposal']

function ok(data) { return Promise.resolve({ data }) }

function generatePrefixedId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
}

function generateProfileId() {
  return generatePrefixedId('PID')
}

function generateOrderId() {
  return generatePrefixedId('OID')
}

function emptyStore() {
  return { items: [], nextId: 1, seeded: false }
}

// Helper: create a date N days ago from a reference date
function daysAgo(days, from = new Date()) {
  const date = new Date(from)
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function daysAfter(days, fromIso) {
  const date = new Date(fromIso)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const SEED_ITEMS = [
  {
    name: 'Cascade Auto Body – Waste Paint Solvents',
    customer: 'Cascade Auto Body & Paint',
    phase: 'Disposal',
    profile_id: generateProfileId(),
    order_id: generateOrderId(),
    profile_date: daysAgo(45),
    quote_date: daysAgo(38),
    order_date: daysAgo(30),
    shipping_date: daysAgo(20),
    disposal_date: daysAgo(5),
    generation_date: daysAgo(44),
    pickup_by_date: daysAgo(14),
  },
  {
    name: 'Pacific NW Printing – Ink Waste',
    customer: 'Pacific Northwest Printing Co.',
    phase: 'Shipping',
    profile_id: generateProfileId(),
    order_id: generateOrderId(),
    profile_date: daysAgo(30),
    quote_date: daysAgo(24),
    order_date: daysAgo(18),
    shipping_date: daysAgo(7),
    disposal_date: null,
    generation_date: daysAgo(20),
    pickup_by_date: daysAgo(2),
  },
  {
    name: 'TechClean Labs – Acetone Residues',
    customer: 'TechClean Labs',
    phase: 'Shipping',
    profile_id: generateProfileId(),
    order_id: generateOrderId(),
    profile_date: daysAgo(28),
    quote_date: daysAgo(22),
    order_date: daysAgo(15),
    shipping_date: daysAgo(4),
    disposal_date: null,
    generation_date: daysAgo(17),
    pickup_by_date: daysAfter(13, daysAgo(17)),
  },
  {
    name: 'Columbia Steel – Pickling Acid',
    customer: 'Columbia Steel Fabricators',
    phase: 'Order',
    profile_id: generateProfileId(),
    order_id: generateOrderId(),
    profile_date: daysAgo(20),
    quote_date: daysAgo(14),
    order_date: daysAgo(6),
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(7),
    pickup_by_date: daysAfter(23, daysAgo(7)),
  },
  {
    name: 'Valley Medical – Xylene Waste',
    customer: 'Valley Medical Center',
    phase: 'Order',
    profile_id: generateProfileId(),
    order_id: generateOrderId(),
    profile_date: daysAgo(18),
    quote_date: daysAgo(12),
    order_date: daysAgo(3),
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(4),
    pickup_by_date: daysAfter(26, daysAgo(4)),
  },
  {
    name: 'Cascade Auto Body – Thinners Batch 2',
    customer: 'Cascade Auto Body & Paint',
    phase: 'Quote',
    profile_id: generateProfileId(),
    profile_date: daysAgo(12),
    quote_date: daysAgo(5),
    order_date: null,
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(9),
    pickup_by_date: daysAfter(21, daysAgo(9)),
  },
  {
    name: 'Summit Plating – Chrome Bath',
    customer: 'Summit Plating Works',
    phase: 'Quote',
    profile_id: generateProfileId(),
    profile_date: daysAgo(10),
    quote_date: daysAgo(3),
    order_date: null,
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(8),
    pickup_by_date: daysAfter(22, daysAgo(8)),
  },
  {
    name: 'Pacific NW Printing – Solvent Blend',
    customer: 'Pacific Northwest Printing Co.',
    phase: 'Quote',
    profile_id: generateProfileId(),
    profile_date: daysAgo(8),
    quote_date: daysAgo(2),
    order_date: null,
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(7),
    pickup_by_date: daysAfter(23, daysAgo(7)),
  },
  {
    name: 'Green Valley Farms – Pesticide Containers',
    customer: 'Green Valley Farms',
    phase: 'Profile',
    profile_id: generateProfileId(),
    profile_date: daysAgo(3),
    quote_date: null,
    order_date: null,
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(2),
    pickup_by_date: daysAfter(28, daysAgo(2)),
  },
  {
    name: 'Cascade Auto Body – Used Oil',
    customer: 'Cascade Auto Body & Paint',
    phase: 'Profile',
    profile_id: generateProfileId(),
    profile_date: daysAgo(1),
    quote_date: null,
    order_date: null,
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(1),
    pickup_by_date: daysAfter(29, daysAgo(1)),
  },
  {
    name: 'TechClean Labs – Methanol Rinse',
    customer: 'TechClean Labs',
    phase: 'Profile',
    profile_id: generateProfileId(),
    profile_date: daysAgo(2),
    quote_date: null,
    order_date: null,
    shipping_date: null,
    disposal_date: null,
    generation_date: daysAgo(2),
    pickup_by_date: daysAfter(28, daysAgo(2)),
  },
  {
    name: 'Columbia Steel – Degreaser Waste',
    customer: 'Columbia Steel Fabricators',
    phase: 'Disposal',
    profile_id: generateProfileId(),
    order_id: generateOrderId(),
    profile_date: daysAgo(60),
    quote_date: daysAgo(52),
    order_date: daysAgo(44),
    shipping_date: daysAgo(30),
    disposal_date: daysAgo(10),
    generation_date: daysAgo(59),
    pickup_by_date: daysAgo(29),
  },
]

function seedStore() {
  const store = emptyStore()
  const now = new Date().toISOString()
  for (const entry of SEED_ITEMS) {
    store.items.push({
      id: store.nextId++,
      profile_id: entry.profile_id,
      order_id: entry.order_id || null,
      name: entry.name,
      customer: entry.customer,
      phase: entry.phase,
      profile_date: entry.profile_date,
      quote_date: entry.quote_date,
      order_date: entry.order_date,
      shipping_date: entry.shipping_date,
      disposal_date: entry.disposal_date,
      generation_date: entry.generation_date || null,
      pickup_by_date: entry.pickup_by_date || null,
      created_at: entry.profile_date || now,
      updated_at: now,
    })
  }
  store.seeded = true
  saveStore(store)
  return store
}

function loadStore() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(JOURNEY_STORAGE_KEY) : null
    if (!raw) return seedStore()
    const parsed = JSON.parse(raw)
    const store = {
      items: parsed.items || [],
      nextId: parsed.nextId || 1,
      seeded: parsed.seeded || false,
    }
    if (!store.seeded) return seedStore()
    return store
  } catch {
    return seedStore()
  }
}

function saveStore(store) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(store))
    }
  } catch { /* ignore */ }
}

export const localJourney = {
  list() {
    const store = loadStore()
    return ok({ results: store.items })
  },

  get(id) {
    const store = loadStore()
    const item = store.items.find(x => x.id === Number(id))
    if (!item) {
      const err = new Error('Journey item not found.')
      err.response = { status: 404, data: { detail: 'Journey item not found.' } }
      return Promise.reject(err)
    }
    return ok(item)
  },

  create(payload) {
    const store = loadStore()
    const now = new Date().toISOString()
    const item = {
      id: store.nextId++,
      profile_id: payload.profile_id || generateProfileId(),
      order_id: payload.order_id || (['Order', 'Shipping', 'Disposal'].includes(payload.phase) ? generateOrderId() : null),
      name: payload.name || '',
      customer: payload.customer || '',
      phase: payload.phase || 'Profile',
      profile_date: payload.profile_date || now,
      quote_date: payload.quote_date || null,
      order_date: payload.order_date || null,
      shipping_date: payload.shipping_date || null,
      disposal_date: payload.disposal_date || null,
      generation_date: payload.generation_date || null,
      pickup_by_date: payload.pickup_by_date || null,
      created_at: now,
      updated_at: now,
    }
    store.items.push(item)
    saveStore(store)
    return ok(item)
  },

  update(id, payload) {
    const store = loadStore()
    const item = store.items.find(x => x.id === Number(id))
    if (!item) {
      const err = new Error('Journey item not found.')
      err.response = { status: 404, data: { detail: 'Journey item not found.' } }
      return Promise.reject(err)
    }
    Object.assign(item, payload, { updated_at: new Date().toISOString() })
    saveStore(store)
    return ok(item)
  },

  delete(id) {
    const store = loadStore()
    store.items = store.items.filter(x => x.id !== Number(id))
    saveStore(store)
    return ok({})
  },
}
