import { useState } from 'react'
import axios from 'axios'

const audiences = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V10l5 3V9l4 2V7l5 4v10" />
        <path d="M7 21v-4h3v4" />
        <path d="M14 21v-6h3v6" />
        <path d="M7 7h3" />
        <path d="M17 11h2" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <path d="M14 12.5l1.6 1.6 2.4-2.8" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7h11v7H3z" />
        <path d="M14 10h4l3 3v1h-7z" />
        <circle cx="7" cy="17" r="1.8" />
        <circle cx="17" cy="17" r="1.8" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3c1.8 2.3 2.7 4.2 2.7 6.1 0 1.3-.5 2.4-1.3 3.2.1-2-.8-3.5-2.2-4.9-2 2.1-3.9 4.1-3.9 7.1A4.8 4.8 0 0 0 12 20a4.8 4.8 0 0 0 4.7-4.8c0-1.8-.7-3.1-1.7-4.6" />
      </svg>
    ),
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

const ROLES = ['Generator', 'Broker / TSD', 'Shipper / Transporter', 'Incinerator / Disposal Facility', 'Consultant / Other']

export default function Home() {
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const baseUrl = import.meta.env.VITE_API_URL || ''
      await axios.post(`${baseUrl}/api/demo-request/`, form)
      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again or email sales@waste-id.com directly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        color: '#fff',
        padding: 'clamp(2.5rem, 6vw, 4.5rem) 1.5rem clamp(2rem, 5vw, 3.5rem)',
        textAlign: 'center',
      }}>
        <div className="container">
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌿</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, marginBottom: '0.85rem', lineHeight: 1.2 }}>
            One Platform. Every Step.
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', maxWidth: 640, margin: '0 auto 1.75rem', opacity: 0.95, lineHeight: 1.7 }}>
            WasteID connects generators, brokers, shippers, and incinerators on one platform —
            automating SDS data entry, waste profiling, manifesting, and disposal.
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
      <div id="learn-more" style={{ background: '#f0fdf4', padding: 'clamp(2rem, 5vw, 3.5rem) 1.5rem' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', color: '#14532d', marginBottom: '0.35rem', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            Built for Everyone in the Waste Supply Chain
          </h2>
          <p style={{ textAlign: 'center', color: '#4b7a56', marginBottom: '1.75rem', maxWidth: 600, margin: '0 auto 1.75rem' }}>
            Whether you generate, broker, ship, or dispose of hazardous waste — WasteID reduces paperwork,
            errors, and delays at every step.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {audiences.map(({ icon, role, headline, benefits }) => (
              <div key={role} className="card" style={{ borderTop: '4px solid #16a34a', padding: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.7rem' }}>
                  <span
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 8px 16px rgba(20,83,45,0.15)',
                    }}
                  >
                    <span style={{ width: 24, height: 24, display: 'inline-flex' }}>{icon}</span>
                  </span>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{role}</div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#14532d', lineHeight: 1.3 }}>{headline}</h3>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.15rem', color: '#374151', fontSize: '0.9rem', lineHeight: 1.65 }}>
                  {benefits.map(b => <li key={b} style={{ marginBottom: '0.35rem' }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Request a Demo ── */}
      <div id="demo" style={{ background: '#f0fdf4', padding: 'clamp(2rem, 5vw, 3.5rem) 1.5rem' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <h2 style={{ textAlign: 'center', color: '#14532d', marginBottom: '0.35rem', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            Request a Demo
          </h2>
          <p style={{ textAlign: 'center', color: '#4b7a56', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            See WasteID in action with a personalized walkthrough for your role in the waste supply chain.
            Fill out the form and our team will reach out within one business day.
          </p>

          {submitted ? (
            <div className="alert alert-success" style={{ textAlign: 'center', fontSize: '1.05rem' }}>
              ✅ <strong>Demo request sent!</strong> Our team will follow up at <strong>{form.email}</strong> within one business day.
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
                <label htmlFor="demo-phone">Phone *</label>
                <input id="demo-phone" name="phone" type="tel" className="form-control" required value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
              </div>

              <div className="form-group">
                <label htmlFor="demo-message">What are your biggest process challenges?</label>
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

              {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

              <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%', fontSize: '1.05rem', padding: '0.75rem', justifyContent: 'center' }}>
                {sending ? '⏳ Sending...' : '📅 Send Demo Request'}
              </button>

              <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center' }}>
                We never share your data.
              </p>
            </form>
          )}
        </div>
      </div>

    </div>
  )
}
