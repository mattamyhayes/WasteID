// localStorage-backed form template store for the Form Manager feature.
// Stores imported form templates with their field definitions and original
// document image/PDF so they can be used to generate filled PDFs from profiles.
// Large file data (base64) is kept in IndexedDB to avoid localStorage quota limits.

import { setFileData, getFileData, deleteFileData } from './idbFileStore.js'

const FORMS_STORAGE_KEY = 'wasteid_forms_v1'

// Data elements available from profiles/site that can map to form fields
export const DATA_ELEMENTS = [
  // Generator/Customer
  { key: 'generator_name', label: 'Generator Name', source: 'customer' },
  { key: 'generator_epa_id', label: 'Generator EPA ID', source: 'customer' },
  { key: 'generator_address', label: 'Generator Address', source: 'customer' },
  { key: 'generator_city', label: 'Generator City', source: 'customer' },
  { key: 'generator_state', label: 'Generator State', source: 'customer' },
  { key: 'generator_zip', label: 'Generator Zip', source: 'customer' },
  { key: 'generator_phone', label: 'Generator Phone', source: 'customer' },
  { key: 'generator_contact', label: 'Generator Contact Name', source: 'customer' },
  { key: 'generator_email', label: 'Generator Email', source: 'customer' },
  { key: 'generator_title', label: 'Generator Title/Role', source: 'customer' },
  { key: 'emergency_contact', label: 'Emergency Contact Name', source: 'customer' },
  { key: 'emergency_phone', label: 'Emergency Phone Number', source: 'customer' },

  // Profile/Waste
  { key: 'epa_generator_status', label: 'EPA Generator Status', source: 'profile' },
  { key: 'profile_name', label: 'Profile/Waste Name', source: 'profile' },
  { key: 'profile_id', label: 'Profile ID (Transaction ID)', source: 'profile' },
  { key: 'process_description', label: 'Process Description', source: 'profile' },
  { key: 'shipment_size_unit', label: 'Container Type', source: 'profile' },
  { key: 'shipment_size_qty', label: 'Container Quantity', source: 'profile' },
  { key: 'generation_date', label: 'Generation Date', source: 'profile' },
  { key: 'pickup_by_date', label: 'Pickup By Date', source: 'profile' },
  { key: 'notes', label: 'Notes', source: 'profile' },
  { key: 'physical_state', label: 'Physical State', source: 'profile' },

  // Determination
  { key: 'waste_codes', label: 'Waste Codes', source: 'determination' },
  { key: 'is_hazardous', label: 'Is Hazardous Waste', source: 'determination' },
  { key: 'is_ignitable', label: 'Ignitable (D001)', source: 'determination' },
  { key: 'is_corrosive', label: 'Corrosive (D002)', source: 'determination' },
  { key: 'is_reactive', label: 'Reactive (D003)', source: 'determination' },
  { key: 'is_toxic', label: 'Toxic (D004-D043)', source: 'determination' },
  { key: 'is_listed', label: 'Listed Waste (F/K/P/U)', source: 'determination' },
  { key: 'is_pcb', label: 'Contains PCBs', source: 'determination' },
  { key: 'is_used_oil', label: 'Used Oil', source: 'determination' },
  { key: 'is_universal_waste', label: 'Universal Waste', source: 'determination' },
  { key: 'hazard_class', label: 'DOT Hazard Class', source: 'determination' },
  { key: 'physical_state_solid', label: 'Physical State: Solid', source: 'determination' },
  { key: 'physical_state_liquid', label: 'Physical State: Liquid', source: 'determination' },
  { key: 'physical_state_semisolid', label: 'Physical State: Semi-Solid/Sludge', source: 'determination' },
  { key: 'physical_state_gas', label: 'Physical State: Gas', source: 'determination' },

  // Manifest/Shipping
  { key: 'dot_description', label: 'DOT Description', source: 'manifest' },
  { key: 'manifest_tracking_number', label: 'Manifest Tracking Number', source: 'manifest' },
  { key: 'transporter_name', label: 'Transporter 1 Name', source: 'manifest' },
  { key: 'transporter_epa_id', label: 'Transporter 1 EPA ID', source: 'manifest' },
  { key: 'transporter2_name', label: 'Transporter 2 Name', source: 'manifest' },
  { key: 'transporter2_epa_id', label: 'Transporter 2 EPA ID', source: 'manifest' },
  { key: 'designated_facility_name', label: 'Designated Facility Name', source: 'manifest' },
  { key: 'designated_facility_epa_id', label: 'Designated Facility EPA ID', source: 'manifest' },
  { key: 'designated_facility_address', label: 'Designated Facility Address', source: 'manifest' },
  { key: 'designated_facility_city', label: 'Designated Facility City', source: 'manifest' },
  { key: 'designated_facility_state', label: 'Designated Facility State', source: 'manifest' },
  { key: 'designated_facility_zip', label: 'Designated Facility Zip', source: 'manifest' },
  { key: 'designated_facility_phone', label: 'Designated Facility Phone', source: 'manifest' },
  { key: 'special_handling', label: 'Special Handling Instructions', source: 'manifest' },
  { key: 'quantity_unit', label: 'Unit of Measure', source: 'manifest' },
  { key: 'total_quantity', label: 'Total Quantity', source: 'manifest' },
  { key: 'number_of_containers', label: 'Number of Containers', source: 'manifest' },
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
      // Strip large binary fields before writing to localStorage.
      const slim = forms.map(({ file_data, ...rest }) => rest)
      localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(slim))
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
 * Get a single form template by id (includes file_data from IndexedDB)
 */
export async function getForm(id) {
  const forms = loadForms()
  const form = forms.find(f => f.id === id)
  if (!form) return null
  const fileData = await getFileData(`form_${id}`).catch(() => null)
  if (fileData) return { ...form, file_data: fileData }
  return form
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
    // File content is stored in IndexedDB, not localStorage.
    file_data: null,
    fields: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  forms.push(form)
  saveForms(forms)
  await setFileData(`form_${nextId}`, base64).catch(() => {})
  return { ...form, file_data: base64 }
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
  // Don't persist file_data back to localStorage via this path.
  const { file_data, ...safeUpdates } = updates
  forms[idx] = { ...forms[idx], ...safeUpdates, updated_at: new Date().toISOString() }
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
  deleteFileData(`form_${id}`).catch(() => {})
}

/**
 * Analyze an uploaded document and detect form fields (blank lines, boxes, etc.)
 * This simulates OCR/field detection. In production, this would call an AI service.
 * For now it generates a comprehensive set of common form fields based on the document
 * name/type, including checkboxes and all typical entry areas found on hazardous waste forms.
 * Section headers (fieldType: 'section_header') are included to preserve form structure.
 *
 * NOTE: Automated detection cannot capture every field on every form. After detection,
 * the user should use the interactive "Click to Place Field" mode to visually click on
 * any areas of the form image that were not automatically detected, and define the field
 * type and mapping for each one.
 *
 * @param {object} form - The form object with file_data
 * @returns {Array} Array of detected field objects
 */
export function detectFormFields(form) {
  // In a production system, this would use OCR + AI to detect blank fields and section headers.
  // For the MVP, we generate a comprehensive set of fields for common hazardous waste forms.
  // The user can then use interactive click-to-place to add any missed fields on the form image.
  const commonFields = [
    // Section 1: Generator Information
    { id: 1, label: 'Generator Information', fieldType: 'section_header', mapping: '', x: 2, y: 4, width: 96, height: 2 },
    { id: 2, label: 'Generator Name', fieldType: 'text', mapping: '', x: 2, y: 7, width: 45, height: 2.5 },
    { id: 3, label: 'Generator Mailing Address', fieldType: 'text', mapping: '', x: 2, y: 10, width: 45, height: 2.5 },
    { id: 4, label: 'City', fieldType: 'text', mapping: '', x: 2, y: 13, width: 20, height: 2.5 },
    { id: 5, label: 'State', fieldType: 'text', mapping: '', x: 23, y: 13, width: 10, height: 2.5 },
    { id: 6, label: 'Zip Code', fieldType: 'text', mapping: '', x: 34, y: 13, width: 13, height: 2.5 },
    { id: 7, label: 'Generator Phone Number', fieldType: 'text', mapping: '', x: 50, y: 7, width: 22, height: 2.5 },
    { id: 8, label: 'Generator EPA ID Number', fieldType: 'text', mapping: '', x: 50, y: 10, width: 22, height: 2.5 },
    { id: 9, label: 'Emergency Contact Name', fieldType: 'text', mapping: '', x: 50, y: 13, width: 22, height: 2.5 },
    { id: 10, label: 'Emergency Phone Number', fieldType: 'text', mapping: '', x: 74, y: 13, width: 22, height: 2.5 },
    { id: 11, label: 'Manifest Tracking Number', fieldType: 'text', mapping: '', x: 74, y: 4, width: 22, height: 2.5 },

    // Section 2: Transporter Information
    { id: 12, label: 'Transporter Information', fieldType: 'section_header', mapping: '', x: 2, y: 17, width: 96, height: 2 },
    { id: 13, label: 'Transporter 1 Company Name', fieldType: 'text', mapping: '', x: 2, y: 20, width: 45, height: 2.5 },
    { id: 14, label: 'Transporter 1 EPA ID Number', fieldType: 'text', mapping: '', x: 50, y: 20, width: 22, height: 2.5 },
    { id: 15, label: 'Transporter 2 Company Name', fieldType: 'text', mapping: '', x: 2, y: 23, width: 45, height: 2.5 },
    { id: 16, label: 'Transporter 2 EPA ID Number', fieldType: 'text', mapping: '', x: 50, y: 23, width: 22, height: 2.5 },

    // Section 3: Designated Facility
    { id: 17, label: 'Designated Facility', fieldType: 'section_header', mapping: '', x: 2, y: 27, width: 96, height: 2 },
    { id: 18, label: 'Designated Facility Name', fieldType: 'text', mapping: '', x: 2, y: 30, width: 45, height: 2.5 },
    { id: 19, label: 'Designated Facility Address', fieldType: 'text', mapping: '', x: 2, y: 33, width: 45, height: 2.5 },
    { id: 20, label: 'Designated Facility City', fieldType: 'text', mapping: '', x: 2, y: 36, width: 20, height: 2.5 },
    { id: 21, label: 'Designated Facility State', fieldType: 'text', mapping: '', x: 23, y: 36, width: 10, height: 2.5 },
    { id: 22, label: 'Designated Facility Zip', fieldType: 'text', mapping: '', x: 34, y: 36, width: 13, height: 2.5 },
    { id: 23, label: 'Designated Facility EPA ID Number', fieldType: 'text', mapping: '', x: 50, y: 30, width: 22, height: 2.5 },
    { id: 24, label: 'Designated Facility Phone', fieldType: 'text', mapping: '', x: 50, y: 33, width: 22, height: 2.5 },

    // Section 4: Waste Description
    { id: 25, label: 'Waste Description', fieldType: 'section_header', mapping: '', x: 2, y: 40, width: 96, height: 2 },
    { id: 26, label: 'DOT Proper Shipping Name', fieldType: 'textarea', mapping: '', x: 2, y: 43, width: 40, height: 4 },
    { id: 27, label: 'EPA Waste Codes', fieldType: 'text', mapping: '', x: 44, y: 43, width: 20, height: 2.5 },
    { id: 28, label: 'Number of Containers', fieldType: 'number', mapping: '', x: 66, y: 43, width: 10, height: 2.5 },
    { id: 29, label: 'Container Type', fieldType: 'text', mapping: '', x: 77, y: 43, width: 10, height: 2.5 },
    { id: 30, label: 'Total Quantity', fieldType: 'number', mapping: '', x: 88, y: 43, width: 10, height: 2.5 },
    { id: 31, label: 'Unit of Measure (G/P/T/K/M/N/L)', fieldType: 'text', mapping: '', x: 66, y: 46, width: 10, height: 2.5 },
    { id: 32, label: 'Hazard Class', fieldType: 'text', mapping: '', x: 77, y: 46, width: 20, height: 2.5 },

    // Checkboxes - waste characteristics
    { id: 33, label: 'Waste Characteristics', fieldType: 'section_header', mapping: '', x: 2, y: 50, width: 96, height: 2 },
    { id: 34, label: 'Ignitable (D001)', fieldType: 'checkbox', mapping: '', x: 2, y: 53, width: 3, height: 2 },
    { id: 35, label: 'Corrosive (D002)', fieldType: 'checkbox', mapping: '', x: 22, y: 53, width: 3, height: 2 },
    { id: 36, label: 'Reactive (D003)', fieldType: 'checkbox', mapping: '', x: 42, y: 53, width: 3, height: 2 },
    { id: 37, label: 'Toxic', fieldType: 'checkbox', mapping: '', x: 62, y: 53, width: 3, height: 2 },
    { id: 38, label: 'Listed Waste', fieldType: 'checkbox', mapping: '', x: 82, y: 53, width: 3, height: 2 },
    { id: 39, label: 'PCBs', fieldType: 'checkbox', mapping: '', x: 2, y: 56, width: 3, height: 2 },
    { id: 40, label: 'Used Oil', fieldType: 'checkbox', mapping: '', x: 22, y: 56, width: 3, height: 2 },
    { id: 41, label: 'Universal Waste', fieldType: 'checkbox', mapping: '', x: 42, y: 56, width: 3, height: 2 },

    // Physical state checkboxes
    { id: 42, label: 'Physical State', fieldType: 'section_header', mapping: '', x: 2, y: 59, width: 96, height: 2 },
    { id: 43, label: 'Solid', fieldType: 'checkbox', mapping: '', x: 2, y: 62, width: 3, height: 2 },
    { id: 44, label: 'Liquid', fieldType: 'checkbox', mapping: '', x: 22, y: 62, width: 3, height: 2 },
    { id: 45, label: 'Semi-Solid / Sludge', fieldType: 'checkbox', mapping: '', x: 42, y: 62, width: 3, height: 2 },
    { id: 46, label: 'Gas', fieldType: 'checkbox', mapping: '', x: 62, y: 62, width: 3, height: 2 },
    { id: 47, label: 'Powder / Dust', fieldType: 'checkbox', mapping: '', x: 82, y: 62, width: 3, height: 2 },

    // Section 5: Special Handling & Additional Info
    { id: 48, label: 'Special Handling & Additional Info', fieldType: 'section_header', mapping: '', x: 2, y: 66, width: 96, height: 2 },
    { id: 49, label: 'Special Handling Instructions', fieldType: 'textarea', mapping: '', x: 2, y: 69, width: 96, height: 5 },
    { id: 50, label: 'Additional Descriptions / Waste Profile Number', fieldType: 'text', mapping: '', x: 2, y: 75, width: 50, height: 2.5 },

    // Section 6: Generator Certification
    { id: 51, label: 'Generator Certification', fieldType: 'section_header', mapping: '', x: 2, y: 79, width: 96, height: 2 },
    { id: 52, label: 'Generator Certification - Waste Minimization (LQG)', fieldType: 'checkbox', mapping: '', x: 2, y: 82, width: 3, height: 2 },
    { id: 53, label: 'Generator Certification - Waste Minimization (SQG)', fieldType: 'checkbox', mapping: '', x: 50, y: 82, width: 3, height: 2 },
    { id: 54, label: 'Generator Printed Name', fieldType: 'text', mapping: '', x: 2, y: 85, width: 30, height: 2.5 },
    { id: 55, label: 'Generator Signature Date', fieldType: 'date', mapping: '', x: 34, y: 85, width: 15, height: 2.5 },
    { id: 56, label: 'Generator Title', fieldType: 'text', mapping: '', x: 50, y: 85, width: 25, height: 2.5 },

    // Section 7: Transporter Acknowledgement
    { id: 57, label: 'Transporter Acknowledgement', fieldType: 'section_header', mapping: '', x: 2, y: 88, width: 96, height: 2 },
    { id: 58, label: 'Transporter Printed Name', fieldType: 'text', mapping: '', x: 2, y: 91, width: 30, height: 2.5 },
    { id: 59, label: 'Transporter Signature Date', fieldType: 'date', mapping: '', x: 34, y: 91, width: 15, height: 2.5 },

    // Section 8: Facility Owner/Operator
    { id: 60, label: 'Facility Owner/Operator Certification', fieldType: 'section_header', mapping: '', x: 2, y: 94, width: 96, height: 2 },
    { id: 61, label: 'Facility Printed Name', fieldType: 'text', mapping: '', x: 2, y: 97, width: 30, height: 2.5 },
    { id: 62, label: 'Facility Signature Date', fieldType: 'date', mapping: '', x: 34, y: 97, width: 15, height: 2.5 },
    { id: 63, label: 'Discrepancy Indication', fieldType: 'checkbox', mapping: '', x: 50, y: 97, width: 3, height: 2 },
    { id: 64, label: 'Discrepancy Description', fieldType: 'text', mapping: '', x: 55, y: 97, width: 40, height: 2.5 },
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
    generator_title: profile.customer_title || '',
    emergency_contact: profile.emergency_contact || profile.customer_contact || '',
    emergency_phone: profile.emergency_phone || profile.customer_phone || '',
    epa_generator_status: profile.epa_generator_status || '',
    profile_name: profile.name || '',
    profile_id: profile.transaction_id || '',
    waste_codes: getWasteCodesFromProfile(profile),
    is_hazardous: getHazardousStatusFromProfile(profile),
    is_ignitable: getCharacteristicFromProfile(profile, 'D001'),
    is_corrosive: getCharacteristicFromProfile(profile, 'D002'),
    is_reactive: getCharacteristicFromProfile(profile, 'D003'),
    is_toxic: getCharacteristicFromProfile(profile, 'toxic'),
    is_listed: getCharacteristicFromProfile(profile, 'listed'),
    is_pcb: profile.contains_pcbs ? 'Yes' : '',
    is_used_oil: profile.is_used_oil ? 'Yes' : '',
    is_universal_waste: profile.is_universal_waste ? 'Yes' : '',
    hazard_class: profile.hazard_class || '',
    physical_state: profile.physical_state || '',
    physical_state_solid: (profile.physical_state || '').toLowerCase() === 'solid' ? 'Yes' : '',
    physical_state_liquid: (profile.physical_state || '').toLowerCase() === 'liquid' ? 'Yes' : '',
    physical_state_semisolid: (profile.physical_state || '').toLowerCase().includes('semi') || (profile.physical_state || '').toLowerCase().includes('sludge') ? 'Yes' : '',
    physical_state_gas: (profile.physical_state || '').toLowerCase() === 'gas' ? 'Yes' : '',
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
    transporter2_name: '',
    transporter2_epa_id: '',
    designated_facility_name: '',
    designated_facility_epa_id: '',
    designated_facility_address: '',
    designated_facility_city: '',
    designated_facility_state: '',
    designated_facility_zip: '',
    designated_facility_phone: '',
    special_handling: '',
    quantity_unit: profile.shipment_size_unit || '',
    total_quantity: profile.shipment_size_qty ? String(profile.shipment_size_qty) : '',
    number_of_containers: profile.number_of_containers ? String(profile.number_of_containers) : '',
  }
  return map[key] !== undefined ? map[key] : ''
}

/**
 * Check if a waste characteristic code is present in the profile's determination.
 */
function getCharacteristicFromProfile(profile, codeOrType) {
  const det = profile.determinations?.[profile.determinations.length - 1]
  if (!det) return ''
  try {
    const codes = JSON.parse(det.waste_codes || '[]')
    if (codeOrType === 'toxic') {
      // D004-D043 are toxic characteristics
      return codes.some(c => c.startsWith('D') && parseInt(c.slice(1)) >= 4 && parseInt(c.slice(1)) <= 43) ? 'Yes' : ''
    }
    if (codeOrType === 'listed') {
      // F, K, P, U codes are listed wastes
      return codes.some(c => /^[FKPU]\d/.test(c)) ? 'Yes' : ''
    }
    return codes.includes(codeOrType) ? 'Yes' : ''
  } catch {
    return ''
  }
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
