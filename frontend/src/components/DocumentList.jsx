import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseSdsPdf } from '../lib/sdsPdfParser'
import { profileDocuments, sds } from '../api/client'
import FileUpload from './FileUpload'

const canonicalType = (docType) => {
  const type = String(docType || '').toLowerCase()
  if (type === 'sds') return 'sds'
  if (type === 'analytical' || type === 'a') return 'analytical'
  return type
}

export default function DocumentList({ profileId, transactionId, showUpload, onCompositionImported, components, filterDocType }) {
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [importing, setImporting] = useState(null)
  const [importSuccess, setImportSuccess] = useState(null)
  const [importError, setImportError] = useState('')
  // Map of profile document id -> completed SDS record, used to prevent
  // re-importing the same file and to surface an "SDS Import Detail" link.
  const [sdsByDoc, setSdsByDoc] = useState({})
  const getDocFilename = (doc) => doc.original_filename || doc.file_name || doc.stored_filename || 'document'

  const load = async () => {
    if (!profileId) return
    try {
      const res = await profileDocuments.list(profileId)
      setDocs(res?.data?.results || res?.data || [])
    } catch {
      setDocs([])
    }
    try {
      const sdsRes = await sds.list(profileId)
      const records = sdsRes?.data?.results || sdsRes?.data || []
      const map = {}
      for (const rec of records) {
        const docRef = rec.profile_document
        if (docRef != null && rec.import_status === 'complete') {
          map[docRef] = rec
        }
      }
      setSdsByDoc(map)
    } catch {
      setSdsByDoc({})
    }
  }

  useEffect(() => { load() }, [profileId])

  async function resolveDocumentFile(doc) {
    if (doc?.file_data || doc?.data) {
      const dataUrl = doc.file_data || doc.data
      const parts = dataUrl.split(',')
      if (parts.length < 2 || !parts[1]) {
        throw new Error('Invalid file data.')
      }
      const mime = parts[0].match(/:(.*?);/)?.[1] || doc.mime_type || 'application/octet-stream'
      let byteString = ''
      try {
        byteString = atob(parts[1])
      } catch {
        throw new Error('Invalid file data.')
      }
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      return {
        blob: new Blob([ab], { type: mime }),
        mime,
        filename: getDocFilename(doc),
      }
    }

    const fileUrl = doc?.file_url || doc?.file
    if (!fileUrl) throw new Error('File is not available.')

    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error('Unable to fetch document file.')
    const blob = await res.blob()
    return {
      blob,
      mime: blob.type || 'application/octet-stream',
      filename: getDocFilename(doc),
    }
  }

  const handleView = async (docId) => {
    const doc = docs.find(d => d.id === docId)
    if (!doc) return
    try {
      const { blob, mime, filename } = await resolveDocumentFile(doc)
      const url = URL.createObjectURL(blob)
      if (mime === 'application/pdf' || mime.startsWith('image/')) {
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      alert('Unable to open this document.')
    }
  }

  const handleDelete = async (docId) => {
    try {
      await profileDocuments.delete(docId)
      setConfirmDelete(null)
      await load()
    } catch {
      setImportError('Failed to delete document.')
    }
  }

  const handleImportSds = async (docId) => {
    const doc = docs.find(d => d.id === docId)
    if (!doc) {
      setImportError('Document not found. It may have been deleted.')
      return
    }
    setImporting(docId)
    setImportError('')
    setImportSuccess(null)

    try {
      const { blob, mime, filename } = await resolveDocumentFile(doc)
      const file = new File([blob], filename, { type: mime })
      if (!doc.id) throw new Error('Document ID is missing.')

      // Parse the PDF to extract SDS data
      let parsedData = {}
      const isPdf = mime?.toLowerCase().includes('pdf') || /\.pdf$/i.test(filename)
      if (isPdf) {
        try {
          parsedData = await parseSdsPdf(file)
        } catch {
          // If parsing fails, continue with empty data
        }
      }

      // Build import data (same as SDSAdd page logic)
      const importData = {
        product_name: parsedData.product_name || filename.replace(/\.pdf$/i, ''),
        cas_number: parsedData.cas_number || '',
        manufacturer_name: parsedData.manufacturer_name || '',
        original_filename: filename,
        import_status: 'complete',
        mixture_id: profileId,
        profile_document_id: doc.id,
        sds_data: {
          ...parsedData,
          product_name: parsedData.product_name || filename.replace(/\.pdf$/i, ''),
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
      // Track this document as imported so it cannot be imported again.
      setSdsByDoc(prev => ({ ...prev, [doc.id]: sdsRecord }))

      // If composition data was parsed, populate it into mixture components
      if (parsedData.composition && onCompositionImported) {
        try {
          const compositionEntries = normalizeCompositionEntries(parsedData.composition)
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
              _source: 'imported',
              _sourceDocId: doc.id,
            }))
            onCompositionImported(newComponents, sdsRecord)
          }
        } catch {
          // Non-critical - composition parsing failed
        }
      }
    } catch (err) {
      // Save an error record to the SDS store so the admin can see and troubleshoot it
      try {
        if (!doc.id) throw new Error('Document ID is missing.')
        const errorImportData = {
          product_name: getDocFilename(doc).replace(/\.[^.]+$/i, ''),
          original_filename: getDocFilename(doc),
          import_status: 'error',
          mixture_id: profileId,
          profile_document_id: doc.id,
        }
        await sds.import(errorImportData)
      } catch {
        // Non-critical – if the error record itself can't be created, just continue
      }
      setImportError('Unable to upload or import file due to incorrect format or poorly defined file')
    } finally {
      setImporting(null)
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

  // Check if a document has related imported components
  const docHasImportedData = (docId) => {
    if (!components || !Array.isArray(components)) return false
    return components.some(c => c._sourceDocId === docId)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const typeLabel = (docType) => {
    if (docType === 'sds' || docType === 'SDS') return 'SDS'
    if (docType === 'analytical' || docType === 'A') return 'Analytical'
    return docType
  }

  const typeBadge = (docType) => {
    const isSds = docType === 'sds' || docType === 'SDS'
    const styles = isSds
      ? { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }
      : { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
    return (
      <span style={{ ...styles, padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600 }}>
        {typeLabel(docType)}
      </span>
    )
  }

  const normalizedFilter = canonicalType(filterDocType)
  const filteredDocs = normalizedFilter
    ? docs.filter(doc => canonicalType(doc.file_type || doc.doc_type) === normalizedFilter)
    : docs

  return (
    <div>
      {showUpload && (
        <FileUpload profileId={profileId} transactionId={transactionId} onUploaded={load} />
      )}

      {importError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.6rem 0.9rem', marginBottom: '0.75rem', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠ {importError}
        </div>
      )}

      {importSuccess && (
        <div className="card" style={{ marginBottom: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', position: 'relative' }}>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setImportSuccess(null)}
            style={{
              position: 'absolute', top: '0.5rem', right: '0.5rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#166534', fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem 0.4rem',
            }}
          >
            ✕
          </button>
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
            📋 SDS Import Detail
          </button>
        </div>
      )}

      {filteredDocs.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '0.75rem', fontSize: '1rem' }}>
            📄 Documents ({filteredDocs.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredDocs.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb', flexWrap: 'wrap',
              }}>
                {typeBadge(doc.file_type || doc.doc_type)}
                <span style={{ fontWeight: 500, fontSize: '0.9rem', flex: 1, minWidth: 120 }}>
                  {doc.original_filename || doc.file_name || doc.stored_filename}
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  {formatSize(doc.file_size || 0)}
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
                  {sdsByDoc[doc.id] && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                      onClick={() => navigate(`/sds/${sdsByDoc[doc.id].id}`)}
                    >
                      📋 SDS Import Detail
                    </button>
                  )}
                  {(doc.file_type === 'SDS' || doc.doc_type === 'sds') && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                      onClick={() => handleImportSds(doc.id)}
                      disabled={importing === doc.id || !!sdsByDoc[doc.id]}
                      title={sdsByDoc[doc.id] ? 'This SDS file has already been imported' : 'Import SDS data from this file'}
                    >
                      {importing === doc.id ? '⏳…' : sdsByDoc[doc.id] ? '✓ Imported' : '📥 Import'}
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
                      disabled={docHasImportedData(doc.id)}
                      title={docHasImportedData(doc.id) ? 'Remove imported composition data before deleting this document' : 'Delete document'}
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

      {!showUpload && filteredDocs.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>No documents uploaded for this profile.</p>
      )}
    </div>
  )
}
