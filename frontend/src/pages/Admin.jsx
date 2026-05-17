import { Link } from 'react-router-dom'

const adminLinks = [
  {
    to: '/generators',
    title: 'Generators',
    description: 'Manage generator profiles and locations.',
    icon: '🏭',
  },
  {
    to: '/shippers',
    title: 'Shippers',
    description: 'Create and maintain shipper profiles.',
    icon: '🚢',
  },
  {
    to: '/epa-form',
    title: 'EPA Form',
    description: 'Open the EPA hazardous waste manifest form.',
    icon: '📋',
  },
]

export default function Admin() {
  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.5rem' }}>Admin</h1>
        <p style={{ color: '#6b7280', maxWidth: 680 }}>
          Use these admin shortcuts to manage setup pages. More admin links can be added here over time.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {adminLinks.map(({ to, title, description, icon }) => (
          <Link
            key={to}
            to={to}
            className="card admin-link-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: '#14532d',
              border: '1px solid #dcfce7',
            }}
          >
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{title}</h2>
              <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>{description}</p>
            </div>
            <span style={{ marginTop: 'auto', fontWeight: 600, color: '#166534' }}>
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
