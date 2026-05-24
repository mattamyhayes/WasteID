import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sds, profileDocuments, mixtures } from '../api/client'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff']
const MAX_FILE_SIZE = 25 * 1024 * 1024

function validateFile(file) {
  if (!file) return 'Please select a file.'
  if (file.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 25 MB.'
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type "${ext}" is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  return null
}

export default function SDSAdd() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('upload') // 'upload' or 'existing'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Upload mode state
  const [selectedFile, setSelectedFile] = useState(null)
  const [mixtureId, setMixtureId] = useState('')

  // Existing document mode state
  const [existingDocId, setExistingDocId] = useState('')
  const [existingDocs, setExistingDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  // Profile list for association
  const [profiles, setProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  // SDS data fields for manual entry (used when parsing isn't automated)
  const [productName, setProductName] = useState('')
  const [casNumber, setCasNumber] = useState('')
  const [manufacturerName, setManufacturerName] = useState('')

  useEffect(() => {
    loadProfiles()
    loadExistingDocs()
  }, [])

  const loadProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const res = await mixtures.list()
      const data = res.data.results || res.data || []
      setProfiles(data)
    } catch {
      // Non-critical
    } finally {
      setLoadingProfiles(false)
    }
  }

  const loadExistingDocs = async () => {
    setLoadingDocs(true)
    try {
      const res = await profileDocuments.list()
      const allDocs = res.data.results || res.data || []
      // Filter to only SDS documents
      setExistingDocs(allDocs.filter(d => d.file_type === 'SDS'))
    } catch {
      // Non-critical
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleImport = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'upload') {
      if (!selectedFile) {
        setError('Please select a file to upload.')
        return
      }
      const fileErr = validateFile(selectedFile)
      if (fileErr) {
        setError(fileErr)
        return
      }
    } else {
      if (!existingDocId) {
        setError('Please select an existing SDS document.')
        return
      }
    }

    setLoading(true)
    try {
      const importData = {
        product_name: productName.trim() || (mode === 'upload' ? selectedFile?.name : (existingDocs.find(d => d.id === Number(existingDocId))?.short_name || '')),
        cas_number: casNumber.trim(),
        manufacturer_name: manufacturerName.trim(),
        original_filename: mode === 'upload' ? selectedFile.name : existingDocs.find(d => d.id === Number(existingDocId))?.stored_filename || '',
        import_status: 'complete',
      }

      if (mode === 'upload') {
        importData.file = selectedFile
        if (mixtureId) importData.mixture_id = mixtureId
      } else {
        importData.profile_document_id = existingDocId
        // Find the mixture associated with the selected doc
        const doc = existingDocs.find(d => d.id === Number(existingDocId))
        if (doc && doc.mixture) {
          importData.mixture_id = doc.mixture
        } else if (mixtureId) {
          importData.mixture_id = mixtureId
        }
      }

      // Include sds_data for structured import
      importData.sds_data = {
        product_name: importData.product_name,
        cas_number: importData.cas_number,
        manufacturer_name: importData.manufacturer_name,
        import_status: 'complete',
      }

      await sds.import(importData)
      setSuccess('SDS imported successfully!')
      setTimeout(() => navigate('/sds'), 1500)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Import failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 800 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>📋 Import Safety Data Sheet</h1>
        <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>
          Upload a new SDS document or select an existing one from a profile. The system will parse and store all 16 sections
          of the SDS electronically for use in searches, reports, and profile auto-population.
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
      {success && <div style={{ color: '#166534', fontSize: '0.95rem', marginBottom: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>✓ {success}</div>}

      {/* Source Selection */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>1. Select Source</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.75rem 1rem', border: mode === 'upload' ? '2px solid #16a34a' : '2px solid #e5e7eb', borderRadius: 8, background: mode === 'upload' ? '#f0fdf4' : '#fff', flex: 1 }}>
            <input type="radio" name="mode" value="upload" checked={mode === 'upload'} onChange={() => setMode('upload')} />
            <div>
              <strong style={{ color: '#14532d' }}>⬆ Upload New File</strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Upload a new SDS PDF or document</p>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.75rem 1rem', border: mode === 'existing' ? '2px solid #16a34a' : '2px solid #e5e7eb', borderRadius: 8, background: mode === 'existing' ? '#f0fdf4' : '#fff', flex: 1 }}>
            <input type="radio" name="mode" value="existing" checked={mode === 'existing'} onChange={() => setMode('existing')} />
            <div>
              <strong style={{ color: '#14532d' }}>📂 Select Existing</strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Choose from SDS already uploaded to a profile</p>
            </div>
          </label>
        </div>

        {mode === 'upload' && (
          <div>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>SDS File *</label>
              <input
                type="file"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                accept={ALLOWED_EXTENSIONS.join(',')}
                className="form-control"
              />
              <small style={{ color: '#6b7280' }}>Accepted: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG, TIFF (max 25 MB)</small>
            </div>
          </div>
        )}

        {mode === 'existing' && (
          <div>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Select SDS Document *</label>
              {loadingDocs ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading documents…</p>
              ) : existingDocs.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>No SDS documents found on any profile. Upload one to a profile first, or use the Upload New File option.</p>
              ) : (
                <select className="form-control" value={existingDocId} onChange={e => setExistingDocId(e.target.value)}>
                  <option value="">— Select a document —</option>
                  {existingDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.short_name} — {doc.stored_filename} (uploaded {new Date(doc.uploaded_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SDS Information */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>2. SDS Information</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Enter key identifying information. After import, the system will parse all 16 sections of the SDS and store them electronically.
        </p>
        <div className="form-group">
          <label style={{ fontWeight: 600 }}>Product Name *</label>
          <input
            className="form-control"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            placeholder="e.g., Acetone, Hydrochloric Acid 37%"
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label style={{ fontWeight: 600 }}>CAS Number</label>
            <input
              className="form-control"
              value={casNumber}
              onChange={e => setCasNumber(e.target.value)}
              placeholder="e.g., 67-64-1"
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label style={{ fontWeight: 600 }}>Manufacturer</label>
            <input
              className="form-control"
              value={manufacturerName}
              onChange={e => setManufacturerName(e.target.value)}
              placeholder="e.g., Fisher Scientific"
            />
          </div>
        </div>
      </div>

      {/* Profile Association */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>3. Associate with Profile (Optional)</h2>
        <div className="form-group">
          <label style={{ fontWeight: 600 }}>Profile</label>
          {loadingProfiles ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading profiles…</p>
          ) : (
            <select className="form-control" value={mixtureId} onChange={e => setMixtureId(e.target.value)}>
              <option value="">— No profile association —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.transaction_id} — {p.name}
                </option>
              ))}
            </select>
          )}
          <small style={{ color: '#6b7280' }}>
            Associating with a profile allows the SDS data to auto-populate profile fields.
          </small>
        </div>
      </div>

      {/* Import Button */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={loading}
          style={{ fontSize: '1rem', padding: '0.6rem 2rem' }}
        >
          {loading ? '⏳ Importing…' : '📥 Import SDS'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/sds')}
          style={{ fontSize: '1rem', padding: '0.6rem 1.5rem' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
