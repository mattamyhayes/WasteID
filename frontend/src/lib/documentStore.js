// localStorage-backed document store for file uploads (SDS / Analytical).
// Files are stored as base64-encoded data keyed by profile (mixture) ID.
// This mirrors the local-first pattern used by localStore.js.

const DOCS_STORAGE_KEY = 'wasteid_documents_v1'

// File extensions considered potentially harmful / not allowed
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'vbs', 'vbe',
  'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'ps2', 'psc1',
  'psc2', 'msh', 'msh1', 'msh2', 'inf', 'reg', 'rgs', 'sct', 'shb',
  'shs', 'lnk', 'dll', 'sys', 'cpl', 'hta', 'htm', 'html', 'jar',
  'app', 'action', 'command', 'sh', 'csh', 'bash', 'php', 'py', 'rb',
  'pl', 'asp', 'aspx', 'swf',
])

// Allowed MIME type prefixes for uploaded documents
const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'image/',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/csv',
  'application/rtf',
]

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

/**
 * Validate a file before upload.
 * Returns { valid: true } or { valid: false, reason: string }
 */
export function validateFile(file) {
  if (!file) return { valid: false, reason: 'No file selected.' }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: `File exceeds the 25 MB size limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).` }
  }

  // Check extension
  const nameParts = file.name.split('.')
  const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : ''
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `File type ".${ext}" is not allowed for security reasons.` }
  }

  // Check MIME type
  const mime = (file.type || '').toLowerCase()
  if (mime && !ALLOWED_MIME_PREFIXES.some(prefix => mime.startsWith(prefix))) {
    return { valid: false, reason: `File MIME type "${mime}" is not supported. Please upload PDF, image, or office document files.` }
  }

  // Double-check: no extension at all on a non-empty file is suspicious
  if (!ext && file.size > 0) {
    return { valid: false, reason: 'File has no extension. Please use a standard file format.' }
  }

  return { valid: true }
}

function loadDocs() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DOCS_STORAGE_KEY) : null
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveDocs(docs) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docs))
    }
  } catch {
    // Storage unavailable
  }
}

let nextDocId = (() => {
  const docs = loadDocs()
  return docs.length > 0 ? Math.max(...docs.map(d => d.id)) + 1 : 1
})()

/**
 * Store a document for a given profile (mixture) ID.
 * @param {number|string} profileId - The mixture id
 * @param {string} transactionId - The profile number (PID-XXXXX)
 * @param {File} file - The File object
 * @param {'sds'|'analytical'} docType - Document category
 * @returns {Promise<object>} The stored document record
 */
export async function addDocument(profileId, transactionId, file, docType) {
  const base64 = await fileToBase64(file)
  const doc = {
    id: nextDocId++,
    profile_id: profileId,
    transaction_id: transactionId || '',
    doc_type: docType,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
    data: base64,
    uploaded_at: new Date().toISOString(),
  }
  const docs = loadDocs()
  docs.push(doc)
  saveDocs(docs)
  return doc
}

/**
 * List documents for a given profile.
 */
export function listDocuments(profileId) {
  const docs = loadDocs()
  return docs.filter(d => String(d.profile_id) === String(profileId))
}

/**
 * Delete a document by id.
 */
export function deleteDocument(docId) {
  let docs = loadDocs()
  docs = docs.filter(d => d.id !== docId)
  saveDocs(docs)
}

/**
 * Get a single document by id (includes data for viewing/downloading).
 */
export function getDocument(docId) {
  const docs = loadDocs()
  return docs.find(d => d.id === docId) || null
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}
