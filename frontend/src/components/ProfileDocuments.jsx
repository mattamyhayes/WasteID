import { useState, useEffect } from 'react'
import { profileDocuments, sds } from '../api/client'
import { parseSdsPdf } from '../lib/sdsPdfParser'

// Allowed extensions (mirrors backend validation)
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff']
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.js', '.vbs',
  '.wsf', '.ps1', '.sh', '.bash', '.php', '.py', '.rb', '.pl', '.jar',
  '.dll', '.sys', '.htm', '.html', '.svg', '.swf']
const MAX_FILE_SIZE = 25 * 1024 * 1024

function validateFileClient(file) {
  if (!file) return 'Please select a file.'
  if (file.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 25 MB.'
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : ''
  if (BLOCKED_EXTENSIONS.includes(ext)) return `File type "${ext}" is not allowed for security reasons.`
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type "${ext}" is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  return null
}

function getApiErrorMessage(err, fallbackMessage) {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    const details = Object.entries(data)
      .map(([field, value]) => {
        if (Array.isArray(value)) return `${field}: ${value.join(', ')}`
        if (value && typeof value === 'object') return `${field}: ${JSON.stringify(value)}`
        if (value !== null && value !== undefined && `${value}`.trim() !== '') return `${field}: ${value}`
        return ''
      })
      .filter(Boolean)
    if (details.length) return details.join(' | ')
  }
  const status = err?.response?.status
  if (status) return `${fallbackMessage} (HTTP ${status})`
  return err?.message || fallbackMessage
}

export default function ProfileDocuments({ mixtureId, profileName, onCompositionImported }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importResult, setImportResult] = useState(null)

  // Upload form state
  const [fileType, setFileType] = useState('SDS')
  const [shortName, setShortName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  const loadDocuments = async () => {
    if (!mixtureId) return
    setLoading(true)
    try {
      const res = await profileDocuments.list(mixtureId)
      setDocuments(res.data.results || res.data || [])
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [mixtureId])

  const handleUpload = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setImportResult(null)

    if (!selectedFile) {
      setError('Please select a file.')
      return
    }

    const clientError = validateFileClient(selectedFile)
    if (clientError) {
      setError(clientError)
      return
    }

    if (!shortName.trim()) {
      setError('Please enter a short name for the document.')
      return
    }

    setUploading(true)
    try {
      const uploadRes = await profileDocuments.upload(mixtureId, fileType, shortName.trim(), selectedFile)

      // Auto-import if the file type is SDS
      if (fileType === 'SDS') {
        try {
          let parsedData = {}
          const ext = selectedFile.name.split('.').pop().toLowerCase()
          if (ext === 'pdf') {
            try {
              parsedData = await parseSdsPdf(selectedFile)
            } catch {
              // If parsing fails, continue with empty data
            }
          }

          const importData = {
            product_name: parsedData.product_name || shortName.trim(),
            cas_number: parsedData.cas_number || '',
            manufacturer_name: parsedData.manufacturer_name || '',
            original_filename: selectedFile.name,
            import_status: 'complete',
            mixture_id: mixtureId,
            profile_document_id: uploadRes?.data?.id,
            sds_data: {
              ...parsedData,
              product_name: parsedData.product_name || shortName.trim(),
              cas_number: parsedData.cas_number || '',
              manufacturer_name: parsedData.manufacturer_name || '',
              import_status: 'complete',
            },
            ...parsedData,
          }

          const res = await sds.import(importData)
          const sdsRecord = res.data
          setImportResult(sdsRecord)

          // If composition data was parsed, notify parent
          if (parsedData.composition && onCompositionImported) {
            try {
              const compositionEntries = normalizeCompositionEntries(parsedData.composition)
              if (Array.isArray(compositionEntries) && compositionEntries.length > 0) {
                const newComponents = compositionEntries.map(entry => ({
                  chemical: null,
                  custom_name: entry.name || (entry.cas_number ? `CAS ${entry.cas_number}` : 'Unknown Component'),
                  quantity: parseConcentration(entry.concentration),
                  unit: 'pct_weight',
                  _displayName: entry.name || (entry.cas_number ? `CAS ${entry.cas_number}` : 'Unknown Component'),
                  _epaCode: '',
                  _casNumber: entry.cas_number || '',
                  _concentration: entry.concentration || '',
                  _fromSds: sdsRecord.sds_id || sdsRecord.id,
                  _source: 'imported',
                }))
                onCompositionImported(newComponents, sdsRecord)
              }
            } catch {
              // Non-critical - composition parsing failed
            }
          }

          setSuccess('Document uploaded and SDS imported successfully.')
        } catch (importErr) {
          // Upload succeeded but import failed
          setSuccess('Document uploaded.')
          setError(`SDS import failed: ${getApiErrorMessage(importErr, 'Unknown error')}`)
        }
      } else {
        setSuccess('Document uploaded successfully.')
      }

      setShortName('')
      setSelectedFile(null)
      setFileType('SDS')
      // Reset file input
      const fileInput = document.getElementById(`file-input-${mixtureId}`)
      if (fileInput) fileInput.value = ''
      await loadDocuments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Upload failed.'))
    } finally {
      setUploading(false)
    }
  }

  // Parse concentration string like "10-20%" or "15%" into a number
  function parseConcentration(str) {
    if (str === null || str === undefined) return 0
    const text = String(str)
    const range = text.match(/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/)
    if (range) {
      const low = parseFloat(range[1])
      const high = parseFloat(range[2])
      if (!isNaN(low) && !isNaN(high)) return (low + high) / 2
    }
    const match = text.match(/(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 0
  }

  function normalizeCompositionEntries(composition) {
    if (!composition) return []
    if (Array.isArray(composition)) return composition
    if (typeof composition === 'string') {
      const trimmed = composition.trim()
      if (!trimmed) return []
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Delete document "${docName}"?`)) return
    try {
      await profileDocuments.delete(docId)
      setSuccess('Document deleted.')
      await loadDocuments()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete document.')
    }
  }

  const handleView = (doc) => {
    // For local mode, file_data contains a data URL
    if (doc.file_data || doc.file_url) {
      const url = doc.file_data || doc.file_url
      window.open(url, '_blank')
    } else if (doc.file) {
      // Backend mode - file field contains the URL
      window.open(doc.file, '_blank')
    }
  }

  if (!mixtureId) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem', background: '#f9fafb', border: '1px dashed #d1d5db', padding: '1.5rem' }}>
        <h3 style={{ color: '#166534', marginBottom: '0.75rem', fontSize: '1rem' }}>📎 Documents</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Save the profile first to upload documents.
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ color: '#166534', marginBottom: '0.75rem', fontSize: '1rem' }}>
        📎 Documents {profileName ? `— ${profileName}` : ''}
      </h3>

      {/* Upload Form */}
      <form onSubmit={handleUpload} style={{
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        padding: '1rem', background: '#f0fdf4', borderRadius: 8, marginBottom: '1rem',
        border: '1px solid #bbf7d0',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Type *</label>
            <select
              className="form-control"
              value={fileType}
              onChange={e => setFileType(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="SDS">SDS</option>
              <option value="A">Analytical</option>
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Short Name *</label>
            <input
              className="form-control"
              value={shortName}
              onChange={e => setShortName(e.target.value)}
              placeholder="e.g., Acetone SDS, Lab Analysis #3"
              style={{ minWidth: 150 }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>File *</label>
            <input
              id={`file-input-${mixtureId}`}
              type="file"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              accept={ALLOWED_EXTENSIONS.join(',')}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
            >
              {uploading ? (fileType === 'SDS' ? 'Uploading & Importing…' : 'Uploading…') : '⬆ Upload'}
            </button>
          </div>
        </div>
        {fileType === 'SDS' && (
          <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
            SDS files will be automatically imported and parsed upon upload.
          </p>
        )}
      </form>

      {error && <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: 6 }}>⚠️ {error}</div>}
      {success && <div style={{ color: '#166534', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: 6 }}>✓ {success}</div>}

      {importResult && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
          <h4 style={{ color: '#166534', marginBottom: '0.5rem', fontSize: '0.95rem' }}>📋 SDS Import Results</h4>
          <p style={{ fontSize: '0.88rem', color: '#374151', marginBottom: '0.25rem' }}>
            <strong>{importResult.product_name}</strong>
            {importResult.manufacturer_name && ` — ${importResult.manufacturer_name}`}
          </p>
          {importResult.cas_number && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              CAS: {importResult.cas_number}
            </p>
          )}
          {importResult.composition && importResult.composition !== '[]' && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong style={{ fontSize: '0.82rem', color: '#166534' }}>Composition:</strong>
              <div style={{ background: '#fff', borderRadius: 6, padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #e5e7eb', fontSize: '0.82rem' }}>
                {(() => {
                  try {
                    const entries = JSON.parse(importResult.composition)
                    return entries.map((entry, i) => (
                      <div key={i} style={{ marginBottom: '0.2rem' }}>
                        {entry.name || 'Unknown'} — CAS: {entry.cas_number || 'N/A'} — {entry.concentration || 'N/A'}
                      </div>
                    ))
                  } catch { return <span>No composition data</span> }
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading documents…</p>
      ) : documents.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', textAlign: 'center', padding: '0.75rem' }}>
          No documents uploaded yet.
        </p>
      ) : (
        <div className="table-wrap">
          <table style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Short Name</th>
                <th>Filename</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <span style={{
                      padding: '0.15rem 0.4rem',
                      borderRadius: 4,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: doc.file_type === 'SDS' ? '#dbeafe' : '#fef3c7',
                      color: doc.file_type === 'SDS' ? '#1e40af' : '#92400e',
                    }}>
                      {doc.file_type === 'SDS' ? 'SDS' : 'Analytical'}
                    </span>
                  </td>
                  <td>{doc.short_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
                    {doc.stored_filename}
                  </td>
                  <td style={{ color: '#6b7280' }}>
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}
                        onClick={() => handleView(doc)}
                      >
                        👁 View
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}
                        onClick={() => handleDelete(doc.id, doc.short_name)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
