import { Link } from 'react-router-dom'

export default function Reports() {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: 900 }}>
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.75rem' }}>Reports</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1.5rem' }}>
          Access reporting tools and saved profile activity from one place.
        </p>
        <Link to="/history" className="btn btn-primary">
          Go to Profile History
        </Link>
      </div>
    </div>
  )
}
