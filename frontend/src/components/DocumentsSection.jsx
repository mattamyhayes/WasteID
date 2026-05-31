import { useState, useEffect, useCallback } from 'react'
import { profileDocuments } from '../api/client'

const FILE_TYPE_LABELS = {
  SDS: 'SDS',
  A: 'Analytical',
  OTHER: 'Other',
}

const FILE_TYPE_STYLES = {
  SDS: { background: '#dbeafe', color: '#1e40af' },
  A: { background: '#fef3c7', color: '#92400e' },
  OTHER: { background: '#e5e7eb', color: '#374151' },
}

export default function DocumentsSection({ mixtureId }) {
  const [associatedDocs, setAssociatedDocs] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAssociatedDocs = useCallback(async () => {
    if (!mixtureId) return
    setLoading(true)
    try {
      const res = await profileDocuments.listForProfile(mixtureId)
      setAssociatedDocs(res.data.results || res.data || [])
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [mixtureId])

  useEffect(() => {
    loadAssociatedDocs()
  }, [loadAssociatedDocs])

  const handleSearch = async (e) => {
    e && e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    setError('')
    try {
      const res = await profileDocuments.listAll(searchQuery.trim())
      const allDocs = res.data.results || res.data || []
      // Filter out docs already associated with this profile
      const associatedIds = new Set(associatedDocs.map(d => d.id))
      setSearchResults(allDocs.filter(d => !associatedIds.has(d.id)))
    } catch {
      setError('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleAssociate = async (doc) => {
    setError('')
    setSuccess('')
    try {
      await profileDocuments.associate(doc.id, mixtureId)
      setSuccess(`"${doc.short_name}" associated with this profile.`)
      // Remove from search results and add to associated
      setSearchResults(prev => prev.filter(d => d.id !== doc.id))
      await loadAssociatedDocs()
    } catch {
      setError('Failed to associate document.')
    }
  }

  const handleDisassociate = async (doc) => {
    // Don't allow disassociating docs that are owned by this profile
    if (doc.mixture === Number(mixtureId)) {
      setError('Cannot disassociate a document uploaded directly to this profile. Use the SDS Upload or Analytics section to delete it.')
      return
    }
    setError('')
    setSuccess('')
    try {
      await profileDocuments.disassociate(doc.id, mixtureId)
      setSuccess(`"${doc.short_name}" removed from this profile.`)
      await loadAssociatedDocs()
    } catch {
      setError('Failed to disassociate document.')
    }
  }

  const handleView = async (doc) => {
    const url = doc.file_data || doc.file_url
    if (url) {
      window.open(url, '_blank')
      return
    }
    if (doc.file) {
      window.open(doc.file, '_blank')
      return
    }
    try {
      const res = await profileDocuments.get(doc.id)
      const full = res?.data
      const fullUrl = full?.file_data || full?.file_url || full?.file
      if (fullUrl) {
        window.open(fullUrl, '_blank')
      }
    } catch { /* ignore */ }
  }

  if (!mixtureId) {
    return (
      <div className="card" style={{ marginTop: 0, background: '#f9fafb', border: '1px dashed #d1d5db', padding: '1.5rem' }}>
        <h2 style={{ color: '#166534', marginBottom: '0.75rem' }}>📁 Documents</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Save the profile first to manage documents.
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: 0 }}>
      <h2 style={{ marginBottom: '1rem', color: '#166534' }}>📁 Documents</h2>
      <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: '1rem' }}>
        All documents associated with this profile (SDS, Analytical, Other). You can also search and link documents from other profiles.
      </p>

      {error && <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: 6 }}>⚠️ {error}</div>}
      {success && <div style={{ color: '#166534', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: 6 }}>✓ {success}</div>}

      {/* Associated Documents */}
      <h3 style={{ fontSize: '0.95rem', color: '#374151', marginBottom: '0.5rem' }}>
        Profile Documents ({associatedDocs.length})
      </h3>
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading…</p>
      ) : associatedDocs.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.88rem', padding: '0.75rem', textAlign: 'center' }}>
          No documents associated with this profile yet.
        </p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
          <table style={{ fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Short Name</th>
                <th>Filename</th>
                <th>Uploaded</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {associatedDocs.map(doc => {
                const isOwned = doc.mixture === Number(mixtureId)
                const typeStyle = FILE_TYPE_STYLES[doc.file_type] || FILE_TYPE_STYLES.OTHER
                return (
                  <tr key={doc.id}>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: 4,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        ...typeStyle,
                      }}>
                        {FILE_TYPE_LABELS[doc.file_type] || doc.file_type}
                      </span>
                    </td>
                    <td>{doc.short_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
                      {doc.stored_filename || doc.original_filename}
                    </td>
                    <td style={{ color: '#6b7280' }}>
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.1rem 0.35rem',
                        borderRadius: 4,
                        background: isOwned ? '#dcfce7' : '#ede9fe',
                        color: isOwned ? '#166534' : '#5b21b6',
                      }}>
                        {isOwned ? 'Uploaded' : 'Linked'}
                      </span>
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
                        {!isOwned && (
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}
                            onClick={() => handleDisassociate(doc)}
                          >
                            ✕ Unlink
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Search & Associate */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
        <h3 style={{ fontSize: '0.95rem', color: '#374151', marginBottom: '0.5rem' }}>
          🔍 Search & Link Documents
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          Search for documents across all profiles to link them to this profile.
        </p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            className="form-control"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, filename, or type…"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={searching}
            style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
          >
            {searching ? 'Searching…' : '🔍 Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
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
                {searchResults.map(doc => {
                  const typeStyle = FILE_TYPE_STYLES[doc.file_type] || FILE_TYPE_STYLES.OTHER
                  return (
                    <tr key={doc.id}>
                      <td>
                        <span style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: 4,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          ...typeStyle,
                        }}>
                          {FILE_TYPE_LABELS[doc.file_type] || doc.file_type}
                        </span>
                      </td>
                      <td>{doc.short_name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
                        {doc.stored_filename || doc.original_filename}
                      </td>
                      <td style={{ color: '#6b7280' }}>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleAssociate(doc)}
                        >
                          + Link
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {searchQuery && !searching && searchResults.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem' }}>
            No matching documents found.
          </p>
        )}
      </div>
    </div>
  )
}
