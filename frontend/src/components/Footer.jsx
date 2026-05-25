import { useLocation } from 'react-router-dom'

export default function Footer() {
  const { pathname } = useLocation()
  const showDisclaimer = pathname !== '/WasteID/' && pathname !== '/WasteID'

  return (
    <footer
      style={{
        background: '#14532d',
        color: 'rgba(255,255,255,0.7)',
        padding: '1rem 1.5rem',
        fontSize: '0.85rem',
      }}
    >
      <div className="container" style={{ maxWidth: 1100 }}>
        {showDisclaimer && (
          <div style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            <strong>⚠️ Disclaimer:</strong> WasteID is a decision-support tool for informational purposes only. It does not
            constitute legal advice or replace laboratory testing (SW-846 methods). Always verify determinations with a
            qualified environmental professional and consult applicable state regulations.
          </div>
        )}
        <div style={{ textAlign: 'center' }}>© {new Date().getFullYear()} WasteID LLC. All rights reserved.</div>
      </div>
    </footer>
  )
}
