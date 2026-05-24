import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listForms, deleteForm } from '../lib/formStore'

export default function FormManager() {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])

  useEffect(() => {
    setForms(listForms())
  }, [])

  const handleDelete = (id) => {
    if (!confirm('Delete this form template? This cannot be undone.')) return
    deleteForm(id)
    setForms(listForms())
  }

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: '#14532d', marginBottom: '0.25rem' }}>📄 Form Manager</h1>
          <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>
            Import paper forms as templates. Map fields to profile data so forms auto-populate during export.
          </p>
        </div>
        <Link to="/forms/new" className="btn btn-primary">+ New Form</Link>
      </div>

      {forms.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No form templates yet.</p>
          <p style={{ fontSize: '0.9rem' }}>Upload a PDF or image of a paper form to get started. The system will detect fillable fields and let you map them to profile data.</p>
          <Link to="/forms/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>Import Your First Form</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Form Name</th>
                <th style={thStyle}>File</th>
                <th style={thStyle}>Fields</th>
                <th style={thStyle}>Date Uploaded</th>
                <th style={{ ...thStyle, width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map(form => (
                <tr key={form.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/forms/edit/${form.id}`)}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{form.name}</td>
                  <td style={{ ...tdStyle, color: '#4b5563', fontSize: '0.85rem' }}>{form.file_name}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: form.fields.length > 0 ? '#dcfce7' : '#f3f4f6', color: form.fields.length > 0 ? '#166534' : '#6b7280' }}>
                      {form.fields.length} fields
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#4b5563', fontSize: '0.85rem' }}>
                    {new Date(form.created_at).toLocaleDateString()}
                  </td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.2rem 0.55rem', fontSize: '0.82rem' }}
                        onClick={() => navigate(`/forms/edit/${form.id}`)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '0.2rem 0.55rem', fontSize: '0.82rem' }}
                        onClick={() => handleDelete(form.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
