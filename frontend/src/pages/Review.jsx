import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mixtures, marketplace, incinerators as incineratorsApi } from '../api/client'

const TILES = [
  { key: 'pending_review', label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', border: '#fbbf24' },
  { key: 'rejected', label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { key: 'approved', label: 'Approved (Last 20 Days)', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
]

const NO_PICKUP_SORT_VALUE = 999

function holdTimeColor(daysLeft) {
  if (daysLeft === null) return {}
  if (daysLeft <= 5) return { background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }
  if (daysLeft <= 10) return { background: '#fef9c3', color: '#854d0e', fontWeight: 700 }
  return { background: '#dcfce7', color: '#15803d', fontWeight: 600 }
}

export default function Review() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTile, setActiveTile] = useState('pending_review')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [actionLoading, setActionLoading] = useState(null)
  const [marketplaceLoading, setMarketplaceLoading] = useState(null)
  const [marketplaceListings, setMarketplaceListings] = useState({})
  const [compareModal, setCompareModal] = useState(null) // { profileName, wasteCodes, fullMatches, partialMatches }
  const [compareLoading, setCompareLoading] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await mixtures.list()
      const all = res.data.results || res.data
      setItems(all)
      // Load marketplace listings to know which profiles are already listed
      try {
        const mktRes = await marketplace.listListings()
        const listings = mktRes.data.results || mktRes.data
        const byMixture = {}
        listings.forEach(l => { byMixture[l.mixture] = l })
        setMarketplaceListings(byMixture)
      } catch {
        // Non-critical – marketplace listings may not be available
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Filter profiles that have at least one determination (for approved/rejected)
  const profilesWithDetermination = useMemo(() => {
    return items.filter(m => m.determinations && m.determinations.length > 0)
  }, [items])

  const tileCounts = useMemo(() => {
    const twentyDaysAgo = new Date()
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

    return {
      pending_review: items.filter(m => m.review_status === 'pending_review').length,
      rejected: profilesWithDetermination.filter(m => m.review_status === 'rejected').length,
      approved: profilesWithDetermination.filter(m => {
        if (m.review_status !== 'approved') return false
        const updatedAt = new Date(m.updated_at)
        return updatedAt >= twentyDaysAgo
      }).length,
    }
  }, [items, profilesWithDetermination])

  const filteredProfiles = useMemo(() => {
    if (!activeTile) return []
    const twentyDaysAgo = new Date()
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

    if (activeTile === 'pending_review') {
      return items.filter(m => m.review_status === 'pending_review')
    }

    return profilesWithDetermination.filter(m => {
      if (activeTile === 'approved') {
        if (m.review_status !== 'approved') return false
        const updatedAt = new Date(m.updated_at)
        return updatedAt >= twentyDaysAgo
      }
      return m.review_status === activeTile
    })
  }, [items, profilesWithDetermination, activeTile])

  const sortedProfiles = useMemo(() => {
    const arr = [...filteredProfiles]
    arr.sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'name':
          va = (a.name || '').toLowerCase()
          vb = (b.name || '').toLowerCase()
          break
        case 'customer_name':
          va = (a.customer_name || '').toLowerCase()
          vb = (b.customer_name || '').toLowerCase()
          break
        case 'created_at':
          va = a.created_at || ''
          vb = b.created_at || ''
          break
        case 'hold_time':
          va = a.days_remaining_to_ship ?? NO_PICKUP_SORT_VALUE
          vb = b.days_remaining_to_ship ?? NO_PICKUP_SORT_VALUE
          break
        case 'hazardous':
          va = a.determinations?.[a.determinations.length - 1]?.is_hazardous_waste ? 1 : 0
          vb = b.determinations?.[b.determinations.length - 1]?.is_hazardous_waste ? 1 : 0
          break
        case 'waste_codes': {
          const parseWasteCodes = (det) => {
            try { return JSON.parse(det?.waste_codes || '[]').join(', ') } catch { return '' }
          }
          va = parseWasteCodes(a.determinations?.[a.determinations.length - 1])
          vb = parseWasteCodes(b.determinations?.[b.determinations.length - 1])
          break
        }
        default:
          va = a.id
          vb = b.id
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filteredProfiles, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const handleSetStatus = async (mixtureId, newStatus) => {
    setActionLoading(mixtureId)
    try {
      await mixtures.setReviewStatus(mixtureId, newStatus)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to update review status.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendToMarketplace = async (mixtureId) => {
    setMarketplaceLoading(mixtureId)
    try {
      await marketplace.createListing({ mixture: mixtureId })
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to send profile to marketplace.')
    } finally {
      setMarketplaceLoading(null)
    }
  }

  const handleCompare = async (mixture) => {
    const latestDet = mixture.determinations?.[mixture.determinations.length - 1]
    let wasteCodes = latestDet?.waste_codes_list || []
    if (wasteCodes.length === 0 && latestDet?.waste_codes) {
      try { wasteCodes = JSON.parse(latestDet.waste_codes) } catch { wasteCodes = [] }
    }
    if (wasteCodes.length === 0) {
      alert('No waste codes found for this profile.')
      return
    }

    setCompareLoading(mixture.id)
    try {
      const res = await incineratorsApi.list()
      const allIncinerators = res.data.results || res.data
      const profileCodes = new Set(wasteCodes)

      const fullMatches = []
      const partialMatches = []

      allIncinerators.forEach(inc => {
        const acceptedCodes = inc.accepted_waste_codes || []
        if (acceptedCodes.length === 0) return

        const acceptedSet = new Set(acceptedCodes)
        const matchingCodes = wasteCodes.filter(code => acceptedSet.has(code))

        if (matchingCodes.length === wasteCodes.length) {
          fullMatches.push({ ...inc, matchingCodes })
        } else if (matchingCodes.length > 0) {
          partialMatches.push({ ...inc, matchingCodes, missingCodes: wasteCodes.filter(code => !acceptedSet.has(code)) })
        }
      })

      setCompareModal({
        profileName: mixture.name,
        wasteCodes,
        fullMatches,
        partialMatches,
      })
    } catch {
      alert('Failed to load incinerators for comparison.')
    } finally {
      setCompareLoading(null)
    }
  }

  const sortIndicator = (col) => {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const thStyle = {
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    fontSize: '0.88rem',
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Profile Review</h1>
        <Link to="/determine" className="btn btn-primary">+ New Profile</Link>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && (
        <>
          {/* Tiles */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {TILES.map(tile => (
              <button
                key={tile.key}
                onClick={() => setActiveTile(activeTile === tile.key ? null : tile.key)}
                style={{
                  background: activeTile === tile.key ? tile.bg : '#fff',
                  border: `2px solid ${activeTile === tile.key ? tile.border : '#e5e7eb'}`,
                  borderRadius: 8,
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s',
                  boxShadow: activeTile === tile.key ? `0 2px 8px ${tile.border}40` : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: tile.color, lineHeight: 1 }}>
                  {tileCounts[tile.key]}
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: tile.color }}>{tile.label}</span>
              </button>
            ))}
          </div>

          {/* Table */}
          {activeTile && (
            <div className="card" style={{ overflow: 'auto' }}>
              <h3 style={{ color: '#14532d', marginBottom: '1rem' }}>
                {TILES.find(t => t.key === activeTile)?.label} ({sortedProfiles.length})
              </h3>
              {sortedProfiles.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                  No profiles in this category.
                </p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={thStyle} onClick={() => handleSort('name')}>
                          Profile Name{sortIndicator('name')}
                        </th>
                        <th style={thStyle} onClick={() => handleSort('customer_name')}>
                          Generator{sortIndicator('customer_name')}
                        </th>
                        <th style={thStyle} onClick={() => handleSort('created_at')}>
                          Created{sortIndicator('created_at')}
                        </th>
                        <th style={thStyle} onClick={() => handleSort('hazardous')}>
                          Status{sortIndicator('hazardous')}
                        </th>
                        <th style={thStyle} onClick={() => handleSort('waste_codes')}>
                          Waste Codes{sortIndicator('waste_codes')}
                        </th>
                        <th style={thStyle} onClick={() => handleSort('hold_time')}>
                          Hold Time Remaining{sortIndicator('hold_time')}
                        </th>
                        <th style={{ fontSize: '0.88rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProfiles.map(m => {
                        const latestDet = m.determinations?.[m.determinations.length - 1]
                        const isHazardous = latestDet?.is_hazardous_waste
                        let wasteCodes = latestDet?.waste_codes_list || []
                        if (wasteCodes.length === 0 && latestDet?.waste_codes) {
                          try { wasteCodes = JSON.parse(latestDet.waste_codes) } catch { wasteCodes = [] }
                        }
                        const daysLeft = m.days_remaining_to_ship ?? null
                        const holdStyle = holdTimeColor(daysLeft)

                        return (
                          <tr key={m.id}>
                            <td>
                              {latestDet ? (
                                <Link to={`/results/${latestDet.id}`} style={{ color: '#166534', fontWeight: 600 }}>
                                  {m.name}
                                </Link>
                              ) : (
                                <Link to={`/review/${m.id}/signoff`} style={{ color: '#166534', fontWeight: 600 }}>
                                  {m.name}
                                </Link>
                              )}
                              {m.transaction_id && (
                                <div style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>
                                  {m.transaction_id}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '0.9rem' }}>{m.customer_name || '—'}</td>
                            <td style={{ fontSize: '0.88rem', color: '#6b7280' }}>
                              {new Date(m.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ fontSize: '0.88rem' }}>
                              {latestDet
                                ? (isHazardous ? 'Hazardous' : 'Non-Hazardous')
                                : <span style={{ color: '#9ca3af' }}>Pending</span>}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {wasteCodes.length > 0
                                ? wasteCodes.join(', ')
                                : <span style={{ color: '#9ca3af' }}>—</span>}
                            </td>
                            <td>
                              {daysLeft !== null ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: 6,
                                  fontSize: '0.88rem',
                                  ...holdStyle,
                                }}>
                                  {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.88rem' }}>—</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Link
                                  to={`/review/${m.id}/signoff`}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}
                                >
                                  Edit
                                </Link>
                                <Link
                                  to={latestDet ? `/results/${latestDet.id}` : `/review/${m.id}/signoff`}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}
                                >
                                  View
                                </Link>
                                {wasteCodes.length > 0 && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                    disabled={compareLoading === m.id}
                                    onClick={() => handleCompare(m)}
                                  >
                                    {compareLoading === m.id ? '…' : 'Match'}
                                  </button>
                                )}
                                {activeTile === 'pending_review' && (
                                  <>
                                    <button
                                      className="btn btn-primary"
                                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}
                                      disabled={actionLoading === m.id}
                                      onClick={() => handleSetStatus(m.id, 'approved')}
                                    >
                                      {actionLoading === m.id ? '…' : 'Approve'}
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}
                                      disabled={actionLoading === m.id}
                                      onClick={() => handleSetStatus(m.id, 'rejected')}
                                    >
                                      {actionLoading === m.id ? '…' : 'Reject'}
                                    </button>
                                  </>
                                )}
                                {activeTile === 'rejected' && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}
                                    disabled={actionLoading === m.id}
                                    onClick={() => handleSetStatus(m.id, 'pending_review')}
                                  >
                                    {actionLoading === m.id ? '…' : 'Resubmit'}
                                  </button>
                                )}
                                {activeTile === 'approved' && (() => {
                                  const listing = marketplaceListings[m.id]
                                  if (listing && listing.status === 'open') {
                                    return (
                                      <Link
                                        to="/marketplace"
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem', background: '#dbeafe', color: '#1e40af' }}
                                      >
                                        🏪 Listed
                                      </Link>
                                    )
                                  }
                                  if (listing && listing.status === 'bid_accepted') {
                                    return (
                                      <Link
                                        to="/marketplace"
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem', background: '#dcfce7', color: '#15803d' }}
                                      >
                                        ✅ Bid Accepted
                                      </Link>
                                    )
                                  }
                                  return (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem', background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}
                                      disabled={marketplaceLoading === m.id}
                                      onClick={() => handleSendToMarketplace(m.id)}
                                    >
                                      {marketplaceLoading === m.id ? '…' : '🏪 Send to Marketplace'}
                                    </button>
                                  )
                                })()}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!activeTile && items.length > 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <p style={{ color: '#6b7280', fontSize: '1.05rem' }}>
                Select a category above to view profiles for review.
              </p>
            </div>
          )}

          {!activeTile && items.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>No profiles available for review.</p>
              <Link to="/determine" className="btn btn-primary">Start a New Profile</Link>
            </div>
          )}
        </>
      )}

      {/* Compare Modal */}
      {compareModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem',
        }} onClick={() => setCompareModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 12, maxWidth: 700, width: '100%', maxHeight: '80vh',
            overflow: 'auto', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ color: '#14532d', margin: 0 }}>Incinerator Comparison</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  Profile: <strong>{compareModal.profileName}</strong>
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                  EPA Codes: {compareModal.wasteCodes.join(', ')}
                </p>
              </div>
              <button
                onClick={() => setCompareModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Full Matches */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#16a34a', fontSize: '1rem', marginBottom: '0.5rem', borderBottom: '2px solid #86efac', paddingBottom: '0.4rem' }}>
                ✅ Full Match ({compareModal.fullMatches.length})
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                These incinerators accept <strong>all</strong> EPA codes for this profile.
              </p>
              {compareModal.fullMatches.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>No incinerators fully match all waste codes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {compareModal.fullMatches.map(inc => (
                    <div key={inc.id} style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <strong style={{ color: '#166534' }}>{inc.name}</strong>
                      {(inc.city || inc.state) && (
                        <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                          — {[inc.city, inc.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {inc.permit_number && (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          (Permit: {inc.permit_number})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Partial Matches */}
            <div>
              <h3 style={{ color: '#d97706', fontSize: '1rem', marginBottom: '0.5rem', borderBottom: '2px solid #fde68a', paddingBottom: '0.4rem' }}>
                ⚠️ Partial Match ({compareModal.partialMatches.length})
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                These incinerators accept <strong>some but not all</strong> EPA codes for this profile.
              </p>
              {compareModal.partialMatches.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>No partial matches found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {compareModal.partialMatches.map(inc => (
                    <div key={inc.id} style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                      <div>
                        <strong style={{ color: '#92400e' }}>{inc.name}</strong>
                        {(inc.city || inc.state) && (
                          <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                            — {[inc.city, inc.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', marginTop: '0.3rem' }}>
                        <span style={{ color: '#16a34a' }}>Accepts: {inc.matchingCodes.join(', ')}</span>
                        <span style={{ color: '#dc2626', marginLeft: '0.75rem' }}>Missing: {inc.missingCodes.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setCompareModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
