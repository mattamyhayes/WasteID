import { Link } from 'react-router-dom'
import { ContactFormSubmissions } from './Admin'

export default function AdminContactSubmissions() {
  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin" style={{ color: '#166534', fontWeight: 600, textDecoration: 'none' }}>← Back to Admin</Link>
      </div>
      <ContactFormSubmissions />
    </div>
  )
}
