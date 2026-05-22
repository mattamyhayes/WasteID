import { useState, useEffect } from 'react'
import { listDocuments, deleteDocument, getDocument } from '../lib/documentStore'
import FileUpload from './FileUpload'

export default function DocumentList({ profileId, transactionId, showUpload }) {
  const [docs, setDocs] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = () => {
    if (!profileId) return
    setDocs(listDocuments(profileId))
  }

  useEffect(() => { load() }, [profileId])

  const handleView = (docId) => {
    const doc = getDocument(docId)
    if (!doc) return
    // Open in a new tab
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow popups to view documents.')
      return
    }
    if (doc.mime_type.startsWith('image/')) {
      win.document.write(`<html><head><title>${doc.file_name}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6"><img src="${doc.data}" style="max-width:100%;max-height:100vh" alt="${doc.file_name}" /></body></html>`)
    } else if (doc.mime_type === 'application/pdf') {
      win.document.write(`<html><head><title>${doc.file_name}</title></head><body style="margin:0"><iframe src="${doc.data}" style="width:100%;height:100vh;border:none"></iframe></body></html>`)
    } else {
      // Download as blob
      const link = win.document.createElement('a')
      link.href = doc.data
      link.download = doc.file_name
      win.document.body.appendChild(link)
      link.click()
      setTimeout(() => win.close(), 500)
    }
  }

  const handleDelete = (docId) => {
    deleteDocument(docId)
    setConfirmDelete(null)
    load()
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
