export default function ComingSoon({ title }) {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: 900 }}>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.75rem' }}>{title}</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          This page is coming soon.
        </p>
      </div>
    </div>
  )
}
