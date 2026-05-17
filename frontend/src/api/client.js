import axios from 'axios'
import localChemicals from '../data/chemicals.json'
import { localMixtures, localCustomers, localCustomerLocations, localShippers, localManifests, localOrders } from '../lib/localStore.js'

const apiUrlConfigured = import.meta.env.VITE_API_URL != null && import.meta.env.VITE_API_URL !== ''
const apiBaseUrl = apiUrlConfigured ? `${import.meta.env.VITE_API_URL}/api` : '/api'

// When no backend URL is configured (e.g. static GitHub Pages deploy), fall back
// to bundled data and a localStorage-backed mixture store. All API call paths
// below are preserved so the app works unchanged once a backend is deployed
// and `VITE_API_URL` is set at build time.
const useLocalChemicals = !apiUrlConfigured
const useLocalMixtures = !apiUrlConfigured

// Exposed for diagnostics / UI (e.g. to surface an "offline mode" banner).
export const isStaticMode = !apiUrlConfigured

const MAX_SEARCH_RESULTS = 100

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' }
})

function searchLocalChemicals(q, category) {
  const query = (q || '').trim().toLowerCase()
  let results = localChemicals
  if (query) {
    results = results.filter(c => {
      return (
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.cas_number && c.cas_number.toLowerCase().includes(query)) ||
        (c.epa_waste_code && c.epa_waste_code.toLowerCase().includes(query)) ||
        (c.synonyms && String(c.synonyms).toLowerCase().includes(query))
      )
    })
  }
  if (category) {
    results = results.filter(c => c.category === category)
  }
  return results.slice(0, MAX_SEARCH_RESULTS)
}

export const chemicals = {
  search: async (q, category) => {
    if (useLocalChemicals) {
      return { data: { results: searchLocalChemicals(q, category) } }
    }
    try {
      return await client.get('/chemicals/', { params: { q, category } })
    } catch (err) {
      // Backend unreachable – fall back to bundled dataset so search still works.
      return { data: { results: searchLocalChemicals(q, category) } }
    }
  },
  list: async () => {
    if (useLocalChemicals) {
      return { data: { results: localChemicals } }
    }
    try {
      return await client.get('/chemicals/')
    } catch (err) {
      return { data: { results: localChemicals } }
    }
  },
}

export const mixtures = {
  list: () => useLocalMixtures ? localMixtures.list() : client.get('/mixtures/'),
  get: (id) => useLocalMixtures ? localMixtures.get(id) : client.get(`/mixtures/${id}/`),
  create: (data) => useLocalMixtures ? localMixtures.create(data) : client.post('/mixtures/', data),
  update: (id, data) => useLocalMixtures ? localMixtures.update(id, data) : client.patch(`/mixtures/${id}/`, data),
  delete: (id) => useLocalMixtures ? localMixtures.delete(id) : client.delete(`/mixtures/${id}/`),
  determine: (id, props, reviewerInfo) => useLocalMixtures
    ? localMixtures.determine(id, props, reviewerInfo)
    : client.post(`/mixtures/${id}/determine/`, { additional_props: props, ...reviewerInfo }),
  reportPdf: (id) => useLocalMixtures
    ? localMixtures.reportPdf(id)
    : client.get(`/mixtures/${id}/report_pdf/`, { responseType: 'blob' }),
  exportCsv: (id) => useLocalMixtures
    ? localMixtures.exportCsv(id)
    : client.get(`/mixtures/${id}/export_csv/`, { responseType: 'blob' }),
  addComponent: (mixtureId, data) => useLocalMixtures
    ? localMixtures.addComponent(mixtureId, data)
    : client.post('/components/', { ...data, mixture: mixtureId }),
  removeComponent: (componentId) => useLocalMixtures
    ? localMixtures.removeComponent(componentId)
    : client.delete(`/components/${componentId}/`),
}

export const customers = {
  list: () => useLocalMixtures
    ? localCustomers.list()
    : client.get('/customers/'),
  get: (id) => useLocalMixtures
    ? localCustomers.get(id)
    : client.get(`/customers/${id}/`),
  create: (data) => useLocalMixtures
    ? localCustomers.create(data)
    : client.post('/customers/', data),
  update: (id, data) => useLocalMixtures
    ? localCustomers.update(id, data)
    : client.patch(`/customers/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localCustomers.delete(id)
    : client.delete(`/customers/${id}/`),
}

export const customerLocations = {
  list: (customerId) => useLocalMixtures
    ? localCustomerLocations.list(customerId)
    : client.get('/customer-locations/', { params: customerId ? { customer: customerId } : {} }),
  create: (data) => useLocalMixtures
    ? localCustomerLocations.create(data)
    : client.post('/customer-locations/', data),
  update: (id, data) => useLocalMixtures
    ? localCustomerLocations.update(id, data)
    : client.patch(`/customer-locations/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localCustomerLocations.delete(id)
    : client.delete(`/customer-locations/${id}/`),
}

export const shippers = {
  list: () => useLocalMixtures
    ? localShippers.list()
    : client.get('/shippers/'),
  get: (id) => useLocalMixtures
    ? localShippers.get(id)
    : client.get(`/shippers/${id}/`),
  create: (data) => useLocalMixtures
    ? localShippers.create(data)
    : client.post('/shippers/', data),
  update: (id, data) => useLocalMixtures
    ? localShippers.update(id, data)
    : client.patch(`/shippers/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localShippers.delete(id)
    : client.delete(`/shippers/${id}/`),
}

export const manifests = {
  list: () => useLocalMixtures
    ? localManifests.list()
    : client.get('/manifests/'),
  get: (id) => useLocalMixtures
    ? localManifests.get(id)
    : client.get(`/manifests/${id}/`),
  create: (data) => useLocalMixtures
    ? localManifests.create(data)
    : client.post('/manifests/', data),
  update: (id, data) => useLocalMixtures
    ? localManifests.update(id, data)
    : client.patch(`/manifests/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localManifests.delete(id)
    : client.delete(`/manifests/${id}/`),
  exportPdf: (id) => useLocalMixtures
    ? localManifests.exportPdf(id)
    : client.get(`/manifests/${id}/export_pdf/`, { responseType: 'blob' }),
}

export const orders = {
  list: (status) => useLocalMixtures
    ? localOrders.list(status)
    : client.get('/orders/', { params: status ? { status } : {} }),
  get: (id) => useLocalMixtures
    ? localOrders.get(id)
    : client.get(`/orders/${id}/`),
  create: (data) => useLocalMixtures
    ? localOrders.create(data)
    : client.post('/orders/', data),
  update: (id, data) => useLocalMixtures
    ? localOrders.update(id, data)
    : client.patch(`/orders/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localOrders.delete(id)
    : client.delete(`/orders/${id}/`),
  submitToBid: (id) => useLocalMixtures
    ? localOrders.submitToBid(id)
    : client.post(`/orders/${id}/submit_to_bid/`),
}
