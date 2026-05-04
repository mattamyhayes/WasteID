import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/determine', label: 'New Determination' },
  { to: '/history', label: 'History' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav style={{
      background: '#14532d',
      color: '#fff',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      gap: '2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#bbf7d0' }}>
        🌿 WasteID
      </Link>
      <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.92rem',
              color: pathname === to ? '#bbf7d0' : 'rgba(255,255,255,0.75)',
              background: pathname === to ? 'rgba(255,255,255,0.12)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
