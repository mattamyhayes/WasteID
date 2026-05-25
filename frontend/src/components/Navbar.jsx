import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

export const navLinks = [
  { to: '/profile', label: 'New Profile', icon: '🚀' },
  { to: '/review', label: 'Review', icon: '📋' },
  { to: '/orders', label: 'Orders', icon: '📦' },
  { to: '/shipping', label: 'Shipping', icon: '🚛' },
  { to: '/reports', label: 'Reports', icon: '📂' },
  { to: '/incinerators', label: 'Incinerators', icon: '🔥' },
  { to: '/admin', label: 'Admin', icon: '⚙️' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav
      ref={navRef}
      style={{
        background: '#000',
        color: '#fff',
        height: 'var(--navbar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        gap: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
      <Link to="/" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#fff', flexShrink: 0 }}>
        🌿 <span style={{ color: '#fff' }}>Waste</span><span style={{ color: '#14532d' }}>ID</span>
      </Link>

      {/* Nav links (desktop: inline row; mobile: dropdown) */}
      <div className={`nav-links${open ? ' open' : ''}`}>
        {navLinks.map(({ to, label, icon, iconOnly }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            aria-label={iconOnly ? label : undefined}
            title={iconOnly ? label : undefined}
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
            {iconOnly ? icon : label}
          </Link>
        ))}
      </div>

      {/* Hamburger button (mobile only) */}
      <button
        className="hamburger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? '✕' : '☰'}
      </button>
    </nav>
  )
}
