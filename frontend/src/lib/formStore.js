// localStorage-backed form template store for the Form Manager feature.
// Stores imported form templates with their field definitions and original
// document image/PDF so they can be used to generate filled PDFs from profiles.

const FORMS_STORAGE_KEY = 'wasteid_forms_v1'

// Data elements available from profiles/site that can map to form fields
export const DATA_ELEMENTS = [
  { key: 'generator_name', label: 'Generator Name', source: 'customer' },
  { key: 'generator_epa_id', label: 'Generator EPA ID', source: 'customer' },
  { key: 'generator_address', label: 'Generator Address', source: 'customer' },
  { key: 'generator_city', label: 'Generator City', source: 'customer' },
  { key: 'generator_state', label: 'Generator State', source: 'customer' },
  { key: 'generator_zip', label: 'Generator Zip', source: 'customer' },
  { key: 'generator_phone', label: 'Generator Phone', source: 'customer' },
  { key: 'generator_contact', label: 'Generator Contact Name', source: 'customer' },
  { key: 'generator_email', label: 'Generator Email', source: 'customer' },
  { key: 'epa_generator_status', label: 'EPA Generator Status', source: 'profile' },
  { key: 'profile_name', label: 'Profile/Waste Name', source: 'profile' },
  { key: 'profile_id', label: 'Profile ID (Transaction ID)', source: 'profile' },
  { key: 'waste_codes', label: 'Waste Codes', source: 'determination' },
  { key: 'is_hazardous', label: 'Is Hazardous Waste', source: 'determination' },
  { key: 'process_description', label: 'Process Description', source: 'profile' },
  { key: 'shipment_size_unit', label: 'Container Type', source: 'profile' },
  { key: 'shipment_size_qty', label: 'Container Quantity', source: 'profile' },
  { key: 'generation_date', label: 'Generation Date', source: 'profile' },
  { key: 'pickup_by_date', label: 'Pickup By Date', source: 'profile' },
  { key: 'dot_description', label: 'DOT Description', source: 'manifest' },
  { key: 'manifest_tracking_number', label: 'Manifest Tracking Number', source: 'manifest' },
  { key: 'transporter_name', label: 'Transporter Name', source: 'manifest' },
  { key: 'transporter_epa_id', label: 'Transporter EPA ID', source: 'manifest' },
  { key: 'designated_facility_name', label: 'Designated Facility Name', source: 'manifest' },
  { key: 'designated_facility_epa_id', label: 'Designated Facility EPA ID', source: 'manifest' },
  { key: 'special_handling', label: 'Special Handling Instructions', source: 'manifest' },
  { key: 'notes', label: 'Notes', source: 'profile' },
]

function loadForms() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(FORMS_STORAGE_KEY) : null
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveForms(forms) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(forms))
    }
  } catch {
    // Storage unavailable
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * List all form templates
 */
export function listForms() {
  return loadForms()
}

/**
 * Get a single form template by id
 */
export function getForm(id) {
  const forms = loadForms()
  return forms.find(f => f.id === id) || null
}

/**
 * Create a new form template from an uploaded file.
 * @param {string} name - Form name
 * @param {File} file - The uploaded PDF/image file
 * @returns {Promise<object>} The created form record
 */
export async function createForm(name, file) {
  const base64 = await fileToBase64(file)
  const forms = loadForms()
  const nextId = forms.length > 0 ? Math.max(...forms.map(f => f.id)) + 1 : 1
  const form = {
    id: nextId,
    name: name,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
    file_data: base64,
    fields: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  forms.push(form)
  saveForms(forms)
  return form
}

/**
 * Update a form template (name, fields, etc.)
 * @param {number} id - Form ID
 * @param {object} updates - Partial updates to apply
 * @returns {object|null} Updated form or null if not found
 */
export function updateForm(id, updates) {
  const forms = loadForms()
  const idx = forms.findIndex(f => f.id === id)
  if (idx === -1) return null
  forms[idx] = { ...forms[idx], ...updates, updated_at: new Date().toISOString() }
  saveForms(forms)
  return forms[idx]
}

/**
 * Delete a form template by id
 */
export function deleteForm(id) {
  let forms = loadForms()
  forms = forms.filter(f => f.id !== id)
  saveForms(forms)
}

/**
 * Analyze an uploaded document and detect form fields (blank lines, boxes, etc.)
 * This simulates OCR/field detection. In production, this would call an AI service.
 * For now it generates a set of common form fields based on the document name/type.
 * @param {object} form - The form object with file_data
 * @returns {Array} Array of detected field objects
 */
export function detectFormFields(form) {
  // In a production system, this would use OCR + AI to detect blank fields.
  // For the MVP, we generate a reasonable set of fields that the user can customize.
  const commonFields = [
    { id: 1, label: 'Company/Facility Name', fieldType: 'text', mapping: '', x: 5, y: 8, width: 40, height: 3 },
    { id: 2, label: 'Address', fieldType: 'text', mapping: '', x: 5, y: 12, width: 40, height: 3 },
    { id: 3, label: 'City', fieldType: 'text', mapping: '', x: 5, y: 16, width: 20, height: 3 },
    { id: 4, label: 'State', fieldType: 'text', mapping: '', x: 26, y: 16, width: 10, height: 3 },
    { id: 5, label: 'Zip Code', fieldType: 'text', mapping: '', x: 37, y: 16, width: 10, height: 3 },
    { id: 6, label: 'Phone', fieldType: 'text', mapping: '', x: 50, y: 8, width: 20, height: 3 },
    { id: 7, label: 'EPA ID Number', fieldType: 'text', mapping: '', x: 50, y: 12, width: 20, height: 3 },
    { id: 8, label: 'Contact Name', fieldType: 'text', mapping: '', x: 50, y: 16, width: 20, height: 3 },
    { id: 9, label: 'Waste Description', fieldType: 'textarea', mapping: '', x: 5, y: 22, width: 65, height: 6 },
    { id: 10, label: 'Waste Codes', fieldType: 'text', mapping: '', x: 5, y: 30, width: 30, height: 3 },
    { id: 11, label: 'Container Type', fieldType: 'text', mapping: '', x: 36, y: 30, width: 15, height: 3 },
    { id: 12, label: 'Quantity', fieldType: 'text', mapping: '', x: 52, y: 30, width: 10, height: 3 },
    { id: 13, label: 'Special Handling Instructions', fieldType: 'textarea', mapping: '', x: 5, y: 35, width: 65, height: 5 },
    { id: 14, label: 'Date', fieldType: 'date', mapping: '', x: 5, y: 42, width: 15, height: 3 },
    { id: 15, label: 'Signature/Printed Name', fieldType: 'text', mapping: '', x: 25, y: 42, width: 30, height: 3 },
  ]
  return commonFields
}

/**
 * Extract data from a profile (mixture) to fill a form's mapped fields.
 * @param {object} profile - The mixture/profile object
 * @param {object} form - The form template with fields
 * @param {object} extraData - Additional data provided by user for unmapped fields
 * @returns {Array} Fields with values populated
 */
export function populateFormFields(profile, form, extraData = {}) {
  const fields = form.fields || []
  return fields.map(field => {
    let value = ''
    if (field.mapping && field.mapping !== '_form_specific') {
      value = resolveDataElement(field.mapping, profile) || ''
    }
    if (!value && extraData[field.id] != null) {
      value = extraData[field.id]
    }
    return { ...field, value }
  })
}

function getWasteCodesFromProfile(profile) {
  const det = profile.determinations?.[profile.determinations.length - 1]
  if (!det) return ''
  try { return JSON.parse(det.waste_codes || '[]').join(', ') } catch { return '' }
}

function getHazardousStatusFromProfile(profile) {
  const det = profile.determinations?.[profile.determinations.length - 1]
  return det ? (det.is_hazardous_waste ? 'Yes' : 'No') : ''
}

/**
 * Resolve a data element key to a value from the profile data.
 */
function resolveDataElement(key, profile) {
  if (!profile) return ''
  const map = {
    generator_name: profile.customer_name || '',
    generator_epa_id: profile.customer_epa_id || '',
    generator_address: profile.customer_address || '',
    generator_city: profile.customer_city || '',
    generator_state: profile.customer_state || '',
    generator_zip: profile.customer_zip || '',
    generator_phone: profile.customer_phone || '',
    generator_contact: profile.customer_contact || '',
    generator_email: profile.customer_email || '',
    epa_generator_status: profile.epa_generator_status || '',
    profile_name: profile.name || '',
    profile_id: profile.transaction_id || '',
    waste_codes: getWasteCodesFromProfile(profile),
    is_hazardous: getHazardousStatusFromProfile(profile),
    process_description: profile.process_description || '',
    shipment_size_unit: profile.shipment_size_unit || '',
    shipment_size_qty: profile.shipment_size_qty ? String(profile.shipment_size_qty) : '',
    generation_date: profile.generation_date || '',
    pickup_by_date: profile.pickup_by_date || '',
    notes: profile.notes || '',
    dot_description: '',
    manifest_tracking_number: '',
    transporter_name: '',
    transporter_epa_id: '',
    designated_facility_name: '',
    designated_facility_epa_id: '',
    special_handling: '',
  }
  return map[key] !== undefined ? map[key] : ''
}

/**
 * Get fields that are unmapped or form-specific (need user input during export).
 */
export function getUnmappedFields(form, profile) {
  const fields = form.fields || []
  return fields.filter(field => {
    if (!field.mapping || field.mapping === '_form_specific') return true
    const value = resolveDataElement(field.mapping, profile)
    return !value
  })
}
