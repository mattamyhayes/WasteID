import { useState } from 'react'
import { Link } from 'react-router-dom'

const audiences = [
  {
    icon: '🏭',
    role: 'Generators',
    headline: 'Eliminate Manual SDS Data Entry',
    benefits: [
      'Automatically extract chemical data from Safety Data Sheets — no more manual transcription.',
      'Instantly cross-reference SDS content against EPA RCRA listed waste codes (P, U, F, K).',
      'Generate audit-ready hazardous waste determinations with full documented reasoning.',
      'Reduce compliance errors and cut profiling time from days to minutes.',
    ],
  },
  {
    icon: '🤝',
    role: 'Brokers',
    headline: 'Simplify Profile Output & Management',
    benefits: [
      'Centralize all customer waste profiles in one dashboard for easy tracking and retrieval.',
      'Instantly export professional, compliance-ready PDF reports for any profile.',
      'Manage multiple generator accounts and waste streams from a single interface.',
      'Speed up the approval cycle with standardized, complete profile documentation.',
    ],
  },
  {
    icon: '🚛',
    role: 'Shippers',
    headline: 'Streamline the Manifest Process',
    benefits: [
      'Auto-populate EPA Uniform Hazardous Waste Manifests directly from approved profiles.',
      'Eliminate double-entry errors between waste profiles and shipping documents.',
      'Track shipment status and maintain manifest records in one place.',
      'Stay DOT and EPA compliant with built-in regulatory checks at every step.',
    ],
  },
  {
    icon: '🔥',
    role: 'Incinerators',
    headline: 'Win More Business, Faster',
    benefits: [
      'Receive complete, standardized waste profiles directly from generators and brokers.',
      'Quickly evaluate incoming waste streams against your permitted acceptance criteria.',
      'Reduce back-and-forth with generators — profiles arrive ready to review.',
      'Expand your network through the WasteID marketplace and bid on new waste streams.',
    ],
  },
]

const platformFeatures = [
  { icon: '📄', title: 'Automated SDS Import', desc: 'Upload a Safety Data Sheet and WasteID extracts chemical composition, hazard codes, and regulatory data automatically.' },
  { icon: '⚖️', title: 'RCRA Determination Engine', desc: 'Step-by-step EPA RCRA hazardous waste analysis covering listed wastes (P/U/F/K) and all D001–D043 characteristics.' },
  { icon: '📋', title: 'Profile Management', desc: 'Create, store, and share waste profiles with generators, brokers, and disposal facilities in a single platform.' },
  { icon: '🚢', title: 'Manifest Automation', desc: 'Generate EPA Uniform Hazardous Waste Manifests pre-filled from approved profiles — no re-entry required.' },
  { icon: '🏬', title: 'Disposal Marketplace', desc: 'Connect generators with qualified incinerators and disposal facilities. Bid, select, and track in real time.' },
  { icon: '📊', title: 'Audit-Ready Reporting', desc: 'Export professional PDF and CSV reports with full documented reasoning to satisfy inspectors and auditors.' },
]

const ROLES = ['Generator', 'Broker / TSD', 'Shipper / Transporter', 'Incinerator / Disposal Facility', 'Consultant / Other']

export default function Home() {
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const subject = encodeURIComponent(`WasteID Demo Request — ${form.company || form.name}`)
    // Truncate message to keep mailto URL within typical 2000-char browser limits
    const truncatedMessage = form.message.slice(0, 500)
    const body = encodeURIComponent(
      `Name: ${form.name}\nCompany: ${form.company}\nRole: ${form.role}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${truncatedMessage}`
    )
    window.location.href = `mailto:sales@waste-id.com?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        color: '#fff',
        padding: 'clamp(3rem, 8vw, 6rem) 1.5rem clamp(2.5rem, 6vw, 5rem)',
        textAlign: 'center',
      }}>
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🌿</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
            Hazardous Waste Compliance,<br />Simplified End-to-End
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', maxWidth: 640, margin: '0 auto 0.75rem', opacity: 0.95, lineHeight: 1.75 }}>
            WasteID connects generators, brokers, shippers, and incinerators on one platform —
            automating SDS data entry, waste profiling, manifesting, and disposal.
          </p>
          <p style={{ fontSize: '1rem', maxWidth: 560, margin: '0 auto 2.25rem', opacity: 0.8, lineHeight: 1.6 }}>
            EPA RCRA compliant determinations in minutes, not days.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#demo" className="btn btn-secondary" style={{ fontSize: '1.05rem', padding: '0.75rem 1.9rem' }}>
              📅 Request a Demo
            </a>
            <a href="#learn-more" className="btn btn-outline" style={{ fontSize: '1.05rem', padding: '0.75rem 1.9rem', borderColor: '#fff', color: '#fff' }}>
              Learn More ↓
            </a>
          </div>
        </div>
      </div>

      {/* ── Audience Value Props ── */}
      <div id="learn-more" style={{ background: '#f0fdf4', padding: 'clamp(2.5rem, 6vw, 5rem) 1.5rem' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', color: '#14532d', marginBottom: '0.5rem', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            Built for Everyone in the Waste Supply Chain
          </h2>
          <p style={{ textAlign: 'center', color: '#4b7a56', marginBottom: '2.5rem', maxWidth: 600, margin: '0 auto 2.5rem' }}>
            Whether you generate, broker, ship, or dispose of hazardous waste — WasteID reduces paperwork,
            errors, and delays at every step.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {audiences.map(({ icon, role, headline, benefits }) => (
              <div key={role} className="card" style={{ borderTop: '4px solid #16a34a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#14532d', lineHeight: 1.3 }}>{headline}</h3>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#374151', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {benefits.map(b => <li key={b} style={{ marginBottom: '0.35rem' }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Platform Features ── */}
      <div style={{ padding: 'clamp(2.5rem, 6vw, 5rem) 1.5rem' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', color: '#14532d', marginBottom: '0.5rem', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            One Platform. Every Step.
          </h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            From the first SDS upload to the final disposal manifest, WasteID handles your entire compliance workflow.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {platformFeatures.map(({ icon, title, desc }) => (
              <div key={title} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <h3 style={{ margin: '0 0 0.35rem', color: '#14532d', fontSize: '0.97rem' }}>{title}</h3>
                  <p style={{ margin: 0, fontSize: '0.87rem', color: '#6b7280', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/profile" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.7rem 2rem' }}>
              🚀 Get Started — Create a Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ── Request a Demo ── */}
      <div id="demo" style={{ background: '#f0fdf4', padding: 'clamp(2.5rem, 6vw, 5rem) 1.5rem' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <h2 style={{ textAlign: 'center', color: '#14532d', marginBottom: '0.5rem', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            Request a Demo
          </h2>
          <p style={{ textAlign: 'center', color: '#4b7a56', marginBottom: '2rem', lineHeight: 1.7 }}>
            See WasteID in action with a personalized walkthrough for your role in the waste supply chain.
            Fill out the form and our team will reach out within one business day.
          </p>

          {submitted ? (
            <div className="alert alert-success" style={{ textAlign: 'center', fontSize: '1.05rem' }}>
              📧 <strong>Almost there!</strong> Your email client has been opened with the request pre-filled.
              Please send the email to complete your demo request — our team will follow up at <strong>{form.email}</strong>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 'clamp(1.5rem, 4vw, 2.5rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="demo-name">Full Name *</label>
                  <input id="demo-name" name="name" className="form-control" required value={form.name} onChange={handleChange} placeholder="Jane Smith" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="demo-company">Company *</label>
                  <input id="demo-company" name="company" className="form-control" required value={form.company} onChange={handleChange} placeholder="Acme Environmental" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="demo-role">Your Role *</label>
                  <select id="demo-role" name="role" className="form-control" required value={form.role} onChange={handleChange}>
                    <option value="">Select role…</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="demo-email">Work Email *</label>
                  <input id="demo-email" name="email" type="email" className="form-control" required value={form.email} onChange={handleChange} placeholder="jane@acmeenv.com" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="demo-phone">Phone (optional)</label>
                <input id="demo-phone" name="phone" type="tel" className="form-control" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
              </div>

              <div className="form-group">
                <label htmlFor="demo-message">What are your biggest compliance challenges?</label>
                <textarea
                  id="demo-message"
                  name="message"
                  className="form-control"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us about your current workflow, pain points, or what you'd like to see in the demo…"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem', padding: '0.75rem', justifyContent: 'center' }}>
                📅 Send Demo Request
              </button>

              <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center' }}>
                This will open your email client to send a message to <a href="mailto:sales@waste-id.com" style={{ color: '#16a34a' }}>sales@waste-id.com</a>. We never share your data.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="alert alert-warning">
          <strong>⚠️ Disclaimer:</strong> WasteID is a decision-support tool for informational purposes only. It does not
          constitute legal advice or replace laboratory testing (SW-846 methods). Always verify determinations with a
          qualified environmental professional and consult applicable state regulations.
        </div>
      </div>
    </div>
  )
}
