import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL != null && import.meta.env.VITE_API_URL !== ''
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  headers: { 'Content-Type': 'application/json' }
})

export const chemicals = {
  search: (q, category) => client.get('/chemicals/', { params: { q, category } }),
  list: () => client.get('/chemicals/'),
}

export const mixtures = {
  list: () => client.get('/mixtures/'),
  get: (id) => client.get(`/mixtures/${id}/`),
  create: (data) => client.post('/mixtures/', data),
  update: (id, data) => client.patch(`/mixtures/${id}/`, data),
  delete: (id) => client.delete(`/mixtures/${id}/`),
  determine: (id, props) => client.post(`/mixtures/${id}/determine/`, { additional_props: props }),
  reportPdf: (id) => client.get(`/mixtures/${id}/report_pdf/`, { responseType: 'blob' }),
  exportCsv: (id) => client.get(`/mixtures/${id}/export_csv/`, { responseType: 'blob' }),
  addComponent: (mixtureId, data) => client.post('/components/', { ...data, mixture: mixtureId }),
  removeComponent: (componentId) => client.delete(`/components/${componentId}/`),
}
