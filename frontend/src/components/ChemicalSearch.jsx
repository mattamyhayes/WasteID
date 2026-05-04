import { useState, useEffect, useRef } from 'react'
import { chemicals } from '../api/client'

export default function ChemicalSearch({ onSelect, placeholder = 'Search chemicals by name, CAS, or EPA code…' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await chemicals.search(query)
        setResults(res.data.results || res.data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [query])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (chem) => {
    onSelect(chem)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="form-control"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && (
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#9ca3af' }}>
          Searching…
        </span>
      )}
      {open && results.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200,
          listStyle: 'none', maxHeight: 280, overflowY: 'auto', margin: 0, padding: 0
        }}>
          {results.map(chem => (
            <li
              key={chem.id}
              onClick={() => handleSelect(chem)}
              style={{
                padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontWeight: 600 }}>{chem.name}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {chem.cas_number && `CAS: ${chem.cas_number}`}
                {chem.epa_waste_code && ` · EPA: ${chem.epa_waste_code}`}
                {chem.category_display && ` · ${chem.category_display}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && !loading && query.trim() && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', border: '1.5px solid #d1d5db', borderRadius: 8,
          padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.9rem', zIndex: 200
        }}>
          No chemicals found. You can add it manually below.
        </div>
      )}
    </div>
  )
}
