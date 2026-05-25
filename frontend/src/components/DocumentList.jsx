import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDocuments, deleteDocument, getDocument } from '../lib/documentStore'
import { parseSdsPdf } from '../lib/sdsPdfParser'
import { sds } from '../api/client'
import FileUpload from './FileUpload'

export default function DocumentList({ profileId, transactionId, showUpload, onCompositionImported }) {
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [importing, setImporting] = useState(null)
  const [importSuccess, setImportSuccess] = useState(null)
  const [importError, setImportError] = useState('')

  const load = () => {
    if (!profileId) return
    setDocs(listDocuments(profileId))
  }

  useEffect(() => { load() }, [profileId])

  const handleView = (docId) => {
    const doc = getDocument(docId)
    if (!doc) return
    // Convert data URL to blob and open via object URL to avoid XSS
    try {
      const parts = doc.data.split(',')
      const mime = parts[0].match(/:(.*?);/)?.[1] || doc.mime_type
      const byteString = atob(parts[1])
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const blob = new Blob([ab], { type: mime })
      const url = URL.createObjectURL(blob)
      if (mime === 'application/pdf' || mime.startsWith('image/')) {
        window.open(url, '_blank')
      } else {
        // Trigger download for non-viewable types
        const a = document.createElement('a')
        a.href = url
        a.download = doc.file_name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      // Revoke after a delay to allow browser to use it
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      alert('Unable to open this document.')
    }
  }

  const handleDelete = (docId) => {
    deleteDocument(docId)
    setConfirmDelete(null)
    load()
  }

  const handleImportSds = async (docId) => {
    const doc = getDocument(docId)
    if (!doc) {
      setImportError('Document not found. It may have been deleted.')
      return
    }
    setImporting(docId)
    setImportError('')
    setImportSuccess(null)

    try {
      // Convert data URL to a File object for parsing
      const parts = doc.data.split(',')
      const mime = parts[0].match(/:(.*?);/)?.[1] || doc.mime_type
      const byteString = atob(parts[1])
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const blob = new Blob([ab], { type: mime })
      const file = new File([blob], doc.file_name, { type: mime })

      // Parse the PDF to extract SDS data
      let parsedData = {}
      if (mime === 'application/pdf') {
        try {
          parsedData = await parseSdsPdf(file)
        } catch {
          // If parsing fails, continue with empty data
        }
      }

      // Build import data (same as SDSAdd page logic)
      const importData = {
        product_name: parsedData.product_name || doc.file_name.replace(/\.pdf$/i, ''),
        cas_number: parsedData.cas_number || '',
        manufacturer_name: parsedData.manufacturer_name || '',
        original_filename: doc.file_name,
        import_status: 'complete',
        mixture_id: profileId,
        file_data: doc.data,
        sds_data: {
          ...parsedData,
          product_name: parsedData.product_name || doc.file_name.replace(/\.pdf$/i, ''),
          cas_number: parsedData.cas_number || '',
          manufacturer_name: parsedData.manufacturer_name || '',
          import_status: 'complete',
        },
        ...parsedData,
      }

      // Create the SDS record
      const res = await sds.import(importData)
      const sdsRecord = res.data

      setImportSuccess(sdsRecord)

      // If composition data was parsed, populate it into mixture components
      if (parsedData.composition && onCompositionImported) {
        try {
          const compositionEntries = JSON.parse(parsedData.composition)
          if (Array.isArray(compositionEntries) && compositionEntries.length > 0) {
            const newComponents = compositionEntries.map(entry => ({
              chemical: null,
              custom_name: entry.name || `CAS ${entry.cas_number}`,
              quantity: parseConcentration(entry.concentration),
              unit: 'pct_weight',
              _displayName: entry.name || `CAS ${entry.cas_number}`,
              _epaCode: '',
              _casNumber: entry.cas_number || '',
              _concentration: entry.concentration || '',
              _fromSds: sdsRecord.sds_id || sdsRecord.id,
            }))
            onCompositionImported(newComponents, sdsRecord)
          }
        } catch {
          // Non-critical - composition parsing failed
        }
      }
    } catch (err) {
      setImportError(err?.message || 'Failed to import SDS. Please try again.')
    } finally {
      setImporting(null)
    }
  }

  // Parse concentration string like "10-20%" or "15%" into a number
  function parseConcentration(str) {
    if (!str) return 0
    const match = str.match(/(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 0
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const typeLabel = (docType) => {
    if (docType === 'sds') return 'SDS'
    if (docType === 'analytical') return 'Analytical'
    return docType
  }

  const typeBadge = (docType) => {
    const styles = docType === 'sds'
      ? { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }
      : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
    return (
      <span style={{ ...styles, padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600 }}>
        {typeLabel(docType)}
      </span>
    )
  }

  return (
    <div>
      {showUpload && (
        <FileUpload profileId={profileId} transactionId={transactionId} onUploaded={load} />
      )}

      {importError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#b91c1c', fontSize: '0.88rem' }}>
          ⚠ {importError}
        </div>
      )}

      {importSuccess && (
        <div className="card" style={{ marginBottom: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <h3 style={{ color: '#166534', marginBottom: '0.5rem', fontSize: '1rem' }}>✓ SDS Imported Successfully</h3>
          <p style={{ fontSize: '0.88rem', color: '#374151', marginBottom: '0.5rem' }}>
            <strong>{importSuccess.product_name}</strong> ({importSuccess.sds_id || `SDS-${String(importSuccess.id).padStart(5, '0')}`})
          </p>
          {importSuccess.composition && importSuccess.composition !== '[]' && (
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.85rem', color: '#166534' }}>Section 3 – Composition / Information on Ingredients:</strong>
              <div style={{ background: '#fff', borderRadius: 6, padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #e5e7eb', fontSize: '0.85rem' }}>
                {(() => {
                  try {
                    const entries = JSON.parse(importSuccess.composition)
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
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}
            onClick={() => navigate(`/sds/${importSuccess.id}`)}
          >
            📋 View SDS Detail
          </button>
        </div>
      )}

      {docs.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '0.75rem', fontSize: '1rem' }}>
            📄 Documents ({docs.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {docs.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', flexWrap: 'wrap',
              }}>
                {typeBadge(doc.doc_type)}
                <span style={{ fontWeight: 500, fontSize: '0.9rem', flex: 1, minWidth: 120 }}>
                  {doc.file_name}
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  {formatSize(doc.file_size)}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                    onClick={() => handleView(doc.id)}
                  >
                    👁 View
                  </button>
                  {doc.doc_type === 'sds' && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                      onClick={() => handleImportSds(doc.id)}
                      disabled={importing === doc.id}
                    >
                      {importing === doc.id ? '⏳…' : '📥 Import'}
                    </button>
                  )}
                  {confirmDelete === doc.id ? (
                    <>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                        onClick={() => handleDelete(doc.id)}
                      >
                        Confirm
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem', color: '#dc2626', borderColor: '#fca5a5' }}
                      onClick={() => setConfirmDelete(doc.id)}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showUpload && docs.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>No documents uploaded for this profile.</p>
      )}
    </div>
  )
}
