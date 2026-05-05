import axios from 'axios'
import localChemicals from '../data/chemicals.json'
import { localMixtures } from '../lib/localStore.js'

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
  determine: (id, props) => useLocalMixtures
    ? localMixtures.determine(id, props)
    : client.post(`/mixtures/${id}/determine/`, { additional_props: props }),
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
