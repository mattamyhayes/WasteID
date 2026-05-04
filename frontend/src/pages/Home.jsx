import { Link } from 'react-router-dom'

const features = [
  { icon: '🔬', title: 'Listed Waste (P/U/F/K)', desc: 'Cross-reference your chemicals against all four EPA RCRA listed waste codes.' },
  { icon: '⚗️', title: 'Characteristic Hazards', desc: 'Automatically evaluate D001–D043: ignitability, corrosivity, reactivity, and toxicity (TCLP).' },
  { icon: '📋', title: 'Step-by-Step Reasoning', desc: 'Follow the full RCRA decision framework with documented justification at each step.' },
  { icon: '📄', title: 'PDF & CSV Export', desc: 'Generate professional determination reports and download your mixture data instantly.' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        color: '#fff', padding: '5rem 1.5rem 4rem',
        textAlign: 'center',
      }}>
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🌿</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
            WasteID
          </h1>
          <p style={{ fontSize: '1.2rem', maxWidth: 580, margin: '0 auto 2rem', opacity: 0.9, lineHeight: 1.7 }}>
            Determine if your chemical mixture qualifies as a hazardous waste under EPA RCRA regulations —
            accurately, transparently, and in minutes.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/determine" className="btn btn-secondary" style={{ fontSize: '1.05rem', padding: '0.7rem 1.8rem' }}>
              🚀 Start New Determination
            </Link>
            <Link to="/history" className="btn btn-outline" style={{ fontSize: '1.05rem', padding: '0.7rem 1.8rem', borderColor: '#fff', color: '#fff' }}>
              📂 View History
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#14532d' }}>How It Works</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2.5rem' }}>
          Follow the standard EPA RCRA hazardous waste identification process, step by step.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>{icon}</div>
              <h3 style={{ marginBottom: '0.5rem', color: '#14532d', fontSize: '1rem' }}>{title}</h3>
              <p style={{ fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="alert alert-warning" style={{ marginTop: '2.5rem' }}>
          <strong>⚠️ Disclaimer:</strong> WasteID is a decision-support tool for informational purposes only. It does not
          constitute legal advice or replace laboratory testing (SW-846 methods). Always verify determinations with a
          qualified environmental professional and consult applicable state regulations.
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/determine" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.65rem 2rem' }}>
            Start a Determination →
          </Link>
        </div>
      </div>
    </div>
  )
}
