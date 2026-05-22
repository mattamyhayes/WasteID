import { useState, useEffect } from 'react'
import { profileDocuments } from '../api/client'

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

export default function ProfileDocuments({ mixtureId, profileName }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      await profileDocuments.upload(mixtureId, fileType, shortName.trim(), selectedFile)
      setSuccess('Document uploaded successfully.')
      setShortName('')
      setSelectedFile(null)
      setFileType('SDS')
      // Reset file input
      const fileInput = document.getElementById(`file-input-${mixtureId}`)
      if (fileInput) fileInput.value = ''
      await loadDocuments()
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
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
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end',
        padding: '1rem', background: '#f0fdf4', borderRadius: 8, marginBottom: '1rem',
        border: '1px solid #bbf7d0',
      }}>
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
            {uploading ? 'Uploading…' : '⬆ Upload'}
          </button>
        </div>
      </form>

      {error && <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: 6 }}>⚠️ {error}</div>}
      {success && <div style={{ color: '#166534', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: 6 }}>✓ {success}</div>}

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
