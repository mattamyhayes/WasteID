import { useState } from 'react'
import { validateFile, addDocument } from '../lib/documentStore'

const DOC_TYPES = [
  { value: 'sds', label: 'SDS (Safety Data Sheet)' },
  { value: 'analytical', label: 'Analytical Report' },
]

export default function FileUpload({ profileId, transactionId, onUploaded }) {
  const [docType, setDocType] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    setError('')
    const selected = e.target.files?.[0] || null
    if (!selected) {
      setFile(null)
      return
    }
    const validation = validateFile(selected)
    if (!validation.valid) {
      setError(validation.reason)
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(selected)
  }

  const handleUpload = async () => {
    if (!docType) {
      setError('Please select a document type (SDS or Analytical).')
      return
    }
    if (!file) {
      setError('Please select a file to upload.')
      return
    }
    setUploading(true)
    setError('')
    try {
      await addDocument(profileId, transactionId, file, docType)
      setFile(null)
      setDocType('')
      // Reset file input
      const input = document.getElementById('doc-upload-input')
      if (input) input.value = ''
      if (onUploaded) onUploaded()
    } catch (e) {
      setError('Failed to upload document. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ marginBottom: '0.75rem', color: '#166534' }}>📎 Upload Documents</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Upload SDS (Safety Data Sheet) or Analytical files for this profile. Accepted formats: PDF, images, Word, Excel.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#b91c1c', fontSize: '0.88rem' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: '0 0 200px', marginBottom: 0 }}>
          <label>Document Type *</label>
          <select className="form-control" value={docType} onChange={e => setDocType(e.target.value)}>
            <option value="">-- Select type --</option>
            {DOC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 200 }}>
          <label>File *</label>
          <input
            id="doc-upload-input"
            type="file"
            className="form-control"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.tif,.tiff,.csv,.txt,.rtf"
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file || !docType}
          style={{ whiteSpace: 'nowrap' }}
        >
          {uploading ? 'Uploading…' : '⬆ Upload'}
        </button>
      </div>

      <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
        Max file size: 25 MB. Executable files (.exe, .bat, .sh, etc.) are blocked for security.
      </small>
    </div>
  )
}
