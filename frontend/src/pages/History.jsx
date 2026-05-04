import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mixtures } from '../api/client'

export default function History() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await mixtures.list()
      const all = (res.data.results || res.data)
        .slice()
        .sort((a, b) => b.id - a.id)
      setItems(all)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this mixture and all its determinations?')) return
    await mixtures.delete(id)
    setItems(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d' }}>Determination History</h1>
        <Link to="/determine" className="btn btn-primary">+ New Determination</Link>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>No determinations yet.</p>
          <Link to="/determine" className="btn btn-primary">Start Your First Determination</Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map(m => {
          const latestDet = m.determinations?.[m.determinations.length - 1]
          const isHazardous = latestDet?.is_hazardous_waste
          return (
            <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{m.name}</strong>
                  {latestDet && (
                    <span className={`badge ${isHazardous ? 'badge-hazardous' : 'badge-safe'}`}>
                      {isHazardous ? '⚠️ Hazardous' : '✅ Not Hazardous'}
                    </span>
                  )}
                  {!latestDet && <span className="badge badge-warning">No determination yet</span>}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {m.components?.length ?? 0} component{m.components?.length !== 1 ? 's' : ''} ·
                  Created {new Date(m.created_at).toLocaleDateString()}
                  {latestDet && (
                    <>
                      {' · '}
                      Waste codes: {JSON.parse(latestDet.waste_codes || '[]').join(', ') || 'None'}
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {latestDet && (
                  <Link to={`/results/${latestDet.id}`} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
                    View Results
                  </Link>
                )}
                <button className="btn btn-danger" style={{ fontSize: '0.9rem' }} onClick={() => handleDelete(m.id)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
