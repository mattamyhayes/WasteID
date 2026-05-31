import { useState, useRef } from 'react'
import { validateFile } from '../lib/documentStore'
import { profileDocuments } from '../api/client'

const DOC_TYPES = [
  { value: 'SDS', label: 'SDS (Safety Data Sheet)' },
  { value: 'A', label: 'Analytical Report' },
]

export default function FileUpload({ profileId, transactionId, onBeforeUpload, onUploaded, children, fixedDocType, title, description }) {
  const [docType, setDocType] = useState(fixedDocType || '')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const effectiveDocType = fixedDocType || docType

  const handleFileChange = (e) => {
    setError('')
    setSuccess('')
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
    if (!effectiveDocType) {
      setError('Please select a document type (SDS or Analytical).')
      return
    }
    if (!file) {
      setError('Please select a file to upload.')
      return
    }
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      // If profile hasn't been saved yet, auto-save it first
      let resolvedProfileId = profileId
      if (!resolvedProfileId && onBeforeUpload) {
        resolvedProfileId = await onBeforeUpload()
      }
      if (!resolvedProfileId) {
        setError('Failed to auto-save profile before upload. Please ensure required fields are valid and try again.')
        setUploading(false)
        return
      }
      const shortName = file.name.replace(/\.[^.]+$/, '') || `${effectiveDocType === 'SDS' ? 'SDS' : 'Analytical'} Document`
      await profileDocuments.upload(resolvedProfileId, effectiveDocType, shortName, file)
      setFile(null)
      setDocType(fixedDocType || '')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSuccess(`✓ "${shortName}" uploaded successfully.`)
      if (onUploaded) onUploaded()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to upload document. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ marginBottom: '0.75rem', color: '#166534' }}>{title || 'Upload Documents'}</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {description || 'Upload SDS (Safety Data Sheet) or Analytical files for this profile. Accepted formats: PDF, images, Word, Excel.'}
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#b91c1c', fontSize: '0.88rem' }}>
          ⚠ {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#166534', fontSize: '0.88rem' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {!fixedDocType && (
          <div className="form-group" style={{ flex: '0 0 200px', marginBottom: 0 }}>
            <label>Document Type *</label>
            <select className="form-control" value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">-- Select type --</option>
              {DOC_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 180 }}>
          <label>File *</label>
          <input
            ref={fileInputRef}
            type="file"
            className="form-control"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.tif,.tiff,.csv,.txt,.rtf"
          />
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file || !effectiveDocType}
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.9rem' }}
        >
          {uploading ? 'Uploading…' : '⬆ Upload'}
        </button>
        <small style={{ color: '#6b7280' }}>
          Max file size: 25 MB. Executable files (.exe, .bat, .sh, etc.) are blocked for security.
        </small>
      </div>

      {children}
    </div>
  )
}
