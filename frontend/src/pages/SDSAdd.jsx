import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sds, profileDocuments, mixtures } from '../api/client'
import { parseSdsPdf } from '../lib/sdsPdfParser'
import { getApiErrorMessage } from '../lib/apiErrors'

const ALLOWED_EXTENSIONS = ['.pdf', '.sds', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff']
const MAX_FILE_SIZE = 25 * 1024 * 1024

function validateFile(file) {
  if (!file) return 'Please select a file.'
  if (file.size > MAX_FILE_SIZE) return 'File too large. Maximum size is 25 MB.'
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type "${ext}" is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  return null
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function SDSAdd() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('upload') // 'upload' or 'existing'
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
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

  // Parsed SDS data
  const [parsedData, setParsedData] = useState(null)
  const [parseError, setParseError] = useState('')

  // SDS data fields for manual entry / override
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
      setExistingDocs(allDocs.filter(d => d.file_type === 'SDS'))
    } catch {
      // Non-critical
    } finally {
      setLoadingDocs(false)
    }
  }

  // Auto-parse PDF when file is selected
  const handleFileSelected = async (file) => {
    setSelectedFile(file)
    setParsedData(null)
    setParseError('')

    if (!file) return

    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : ''
    if (ext !== '.pdf') {
      setParseError('Auto-parsing is only available for PDF files. Please enter the data manually.')
      return
    }

    setParsing(true)
    try {
      const data = await parseSdsPdf(file)
      setParsedData(data)
      if (data.product_name) setProductName(data.product_name)
      if (data.cas_number) setCasNumber(data.cas_number)
      if (data.manufacturer_name) setManufacturerName(data.manufacturer_name)
    } catch (err) {
      setParseError(`PDF parsing: ${err.message || 'Could not extract data from PDF.'}`)
    } finally {
      setParsing(false)
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
        const doc = existingDocs.find(d => d.id === Number(existingDocId))
        if (doc && doc.mixture) {
          importData.mixture_id = doc.mixture
        } else if (mixtureId) {
          importData.mixture_id = mixtureId
        }
      }

      // Merge all parsed data into sds_data
      const sdsData = {
        ...parsedData,
        product_name: importData.product_name,
        cas_number: importData.cas_number,
        manufacturer_name: importData.manufacturer_name,
        import_status: 'complete',
      }

      importData.sds_data = sdsData

      // For local mode, spread parsed data to top level
      if (parsedData) {
        Object.assign(importData, parsedData)
        importData.product_name = sdsData.product_name
        importData.cas_number = sdsData.cas_number
        importData.manufacturer_name = sdsData.manufacturer_name
      }

      // Store the file data for viewing later (local mode)
      if (mode === 'upload' && selectedFile) {
        const fileDataUrl = await fileToDataUrl(selectedFile)
        importData.file_data = fileDataUrl
      }

      await sds.import(importData)
      setSuccess('SDS imported successfully!')
      setTimeout(() => navigate('/sds'), 1500)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Import failed. Please try again.'))
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
                onChange={e => handleFileSelected(e.target.files?.[0] || null)}
                accept={ALLOWED_EXTENSIONS.join(',')}
                className="form-control"
              />
              <small style={{ color: '#6b7280' }}>Accepted: PDF, SDS, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG, TIFF (max 25 MB)</small>
            </div>

            {parsing && (
              <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                ⏳ Parsing PDF... Extracting SDS data from all sections...
              </div>
            )}

            {parseError && (
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                ⚠️ {parseError}
              </div>
            )}

            {parsedData && (
              <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                ✓ PDF parsed successfully! Extracted {Object.keys(parsedData).filter(k => parsedData[k] && k !== 'import_status').length} data fields.
                Fields auto-populated below.
              </div>
            )}
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


      {/* Parsed Data Preview */}
      {parsedData && Object.keys(parsedData).filter(k => k !== 'import_status').length > 3 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>📄 Parsed Data Preview</h2>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            The following data was extracted from the PDF and will be stored electronically:
          </p>
          <div style={{ maxHeight: 300, overflow: 'auto', background: '#f9fafb', borderRadius: 6, padding: '0.75rem', border: '1px solid #e5e7eb' }}>
            {Object.entries(parsedData).filter(([k, v]) => v && k !== 'import_status').map(([key, value]) => (
              <div key={key} style={{ marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                <strong style={{ color: '#374151' }}>{key.replace(/_/g, ' ')}:</strong>{' '}
                <span style={{ color: '#4b5563' }}>{String(value).substring(0, 200)}{String(value).length > 200 ? '…' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Association */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>2. Associate with Profile (Optional)</h2>
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
          disabled={loading || parsing}
          style={{ fontSize: '1rem', padding: '0.6rem 2rem' }}
        >
          {loading ? '⏳ Importing…' : parsing ? '⏳ Parsing…' : '📥 Import SDS'}
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
