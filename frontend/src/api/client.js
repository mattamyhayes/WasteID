import axios from 'axios'
import localChemicals from '../data/chemicals.json'
import { localJourney } from '../lib/journeyStore.js'
import { localMixtures, localCustomers, localCustomerLocations, localShippers, localIncinerators, localManifests, localOrders, localMarketplace, localDocuments, localSds } from '../lib/localStore.js'

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
  listAdmin: async (params = {}) => {
    if (useLocalChemicals) {
      const results = localChemicals.map(c => ({ ...c, source: c.source || 'epa_import', source_display: c.source === 'manual' ? 'Manual (Admin)' : 'EPA Import', added_by: c.added_by || 'Admin' }))
      return { data: { results, count: results.length } }
    }
    try {
      return await client.get('/chemicals/', { params })
    } catch (err) {
      const results = localChemicals.map(c => ({ ...c, source: c.source || 'epa_import', source_display: c.source === 'manual' ? 'Manual (Admin)' : 'EPA Import', added_by: c.added_by || 'Admin' }))
      return { data: { results, count: results.length } }
    }
  },
  create: async (data) => {
    if (useLocalChemicals) {
      // In static mode, return a stub response
      const newItem = { ...data, id: Date.now(), source: 'manual', source_display: 'Manual (Admin)', added_by: 'Admin', created_at: new Date().toISOString() }
      return { data: newItem }
    }
    return await client.post('/chemicals/', data)
  },
  update: async (id, data) => {
    if (useLocalChemicals) {
      return { data: { ...data, id } }
    }
    return await client.patch(`/chemicals/${id}/`, data)
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
  setReviewStatus: (mixtureId, reviewStatus) => useLocalMixtures
    ? localMixtures.setReviewStatus(mixtureId, reviewStatus)
    : client.post(`/mixtures/${mixtureId}/set_review_status/`, { review_status: reviewStatus }),
  validateStateRules: (mixtureId, additionalAnswers = {}) => useLocalMixtures
    ? localMixtures.validateStateRules(mixtureId, additionalAnswers)
    : client.post(`/mixtures/${mixtureId}/validate_state_rules/`, { additional_answers: additionalAnswers }),
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

export const incinerators = {
  list: () => useLocalMixtures
    ? localIncinerators.list()
    : client.get('/incinerators/'),
  get: (id) => useLocalMixtures
    ? localIncinerators.get(id)
    : client.get(`/incinerators/${id}/`),
  create: (data) => useLocalMixtures
    ? localIncinerators.create(data)
    : client.post('/incinerators/', data),
  update: (id, data) => useLocalMixtures
    ? localIncinerators.update(id, data)
    : client.patch(`/incinerators/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localIncinerators.delete(id)
    : client.delete(`/incinerators/${id}/`),
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

export const journey = {
  list: () => useLocalMixtures
    ? localJourney.list()
    : client.get('/journey/'),
  get: (id) => useLocalMixtures
    ? localJourney.get(id)
    : client.get(`/journey/${id}/`),
  create: (data) => useLocalMixtures
    ? localJourney.create(data)
    : client.post('/journey/', data),
  update: (id, data) => useLocalMixtures
    ? localJourney.update(id, data)
    : client.patch(`/journey/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localJourney.delete(id)
    : client.delete(`/journey/${id}/`),
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

export const marketplace = {
  listListings: (params = {}) => useLocalMixtures
    ? localMarketplace.listListings(params)
    : client.get('/marketplace-listings/', { params }),
  getListing: (id) => useLocalMixtures
    ? localMarketplace.getListing(id)
    : client.get(`/marketplace-listings/${id}/`),
  createListing: (data) => useLocalMixtures
    ? localMarketplace.createListing(data)
    : client.post('/marketplace-listings/', data),
  withdrawListing: (id) => useLocalMixtures
    ? localMarketplace.withdrawListing(id)
    : client.post(`/marketplace-listings/${id}/withdraw/`),
  acceptBid: (listingId, bidId) => useLocalMixtures
    ? localMarketplace.acceptBid(listingId, bidId)
    : client.post(`/marketplace-listings/${listingId}/accept_bid/`, { bid_id: bidId }),
  completeListing: (id) => useLocalMixtures
    ? localMarketplace.completeListing(id)
    : client.post(`/marketplace-listings/${id}/complete/`),
  submitBid: (data) => useLocalMixtures
    ? localMarketplace.submitBid(data)
    : client.post('/bids/', data),
  withdrawBid: (bidId) => useLocalMixtures
    ? localMarketplace.withdrawBid(bidId)
    : client.post(`/bids/${bidId}/withdraw/`),
  listBids: (params = {}) => useLocalMixtures
    ? localMarketplace.listBids(params)
    : client.get('/bids/', { params }),
}

export const profileDocuments = {
  list: (mixtureId) => useLocalMixtures
    ? localDocuments.list(mixtureId)
    : client.get('/profile-documents/', { params: mixtureId ? { mixture: mixtureId } : {} }),
  upload: (mixtureId, fileType, shortName, file) => {
    if (useLocalMixtures) {
      return localDocuments.upload(mixtureId, fileType, shortName, file)
    }
    const formData = new FormData()
    formData.append('mixture', mixtureId)
    formData.append('file_type', fileType)
    formData.append('short_name', shortName)
    formData.append('file', file)
    return client.post('/profile-documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (docId) => useLocalMixtures
    ? localDocuments.delete(docId)
    : client.delete(`/profile-documents/${docId}/`),
  get: (docId) => useLocalMixtures
    ? localDocuments.get(docId)
    : client.get(`/profile-documents/${docId}/`),
}

export const sds = {  list: (mixtureId) => useLocalMixtures
    ? localSds.list(mixtureId)
    : client.get('/sds/', { params: mixtureId ? { mixture: mixtureId } : {} }),
  get: (id) => useLocalMixtures
    ? localSds.get(id)
    : client.get(`/sds/${id}/`),
  update: (id, data) => useLocalMixtures
    ? localSds.update(id, data)
    : client.patch(`/sds/${id}/`, data),
  delete: (id) => useLocalMixtures
    ? localSds.delete(id)
    : client.delete(`/sds/${id}/`),
  determine: (id) => useLocalMixtures
    ? localSds.determine(id)
    : client.post(`/sds/${id}/determine/`),
  import: (data) => {
    if (useLocalMixtures) {
      return localSds.importSds(data)
    }
    // If there's a file, use FormData
    if (data.file) {
      const formData = new FormData()
      formData.append('file', data.file)
      if (data.mixture_id) formData.append('mixture_id', data.mixture_id)
      if (data.profile_document_id) formData.append('profile_document_id', data.profile_document_id)
      if (data.sds_data) formData.append('sds_data', JSON.stringify(data.sds_data))
      return client.post('/sds/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return client.post('/sds/import/', data)
  },
}

export const contactSubmissions = {
  list: () => {
    if (!apiUrlConfigured) return Promise.resolve({ data: [] })
    return client.get('/contact-us-submissions/')
  },
}
