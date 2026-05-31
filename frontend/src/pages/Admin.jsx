import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { contactSubmissions } from '../api/client'

const SIDEBAR_ICON_STYLE = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 4px 8px rgba(20,83,45,0.15)',
}

const SIDEBAR_SVG_STYLE = { width: 16, height: 16, display: 'inline-flex' }

const adminLinks = [
  {
    to: '/orders',
    title: 'Orders',
    description: 'View and manage waste disposal orders.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  },
  {
    to: '/generators',
    title: 'Generators',
    description: 'Manage generator profiles and locations.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l5 3V6l4 2V4l5 4v11"/><path d="M9 21v-4h3v4"/></svg>),
  },
  {
    to: '/shippers',
    title: 'Shippers',
    description: 'Create and maintain shipper profiles.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  },
  {
    to: '/incinerators',
    title: 'Incinerators',
    description: 'Manage incinerator and disposal facility profiles.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 3 3 5 6 6-2 4-4 8-6 12-2-4-4-8-6-12 3-1 5-3 6-6z"/></svg>),
  },
  {
    to: '/epa-form',
    title: 'EPA Form',
    description: 'Open the EPA hazardous waste manifest form.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>),
  },
  {
    to: '/forms',
    title: 'Incinerator Form Manager',
    description: 'Import and manage form templates for auto-population.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>),
  },
  {
    to: '/sds',
    title: 'SDS',
    description: 'Import and manage Safety Data Sheets.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v4l4 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L9 7V3z"/><line x1="9" y1="3" x2="15" y2="3"/><path d="M8 14h8"/></svg>),
  },
  {
    to: '/marketplace',
    title: 'Marketplace',
    description: 'Manage and review marketplace listings and bids.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
  },
  {
    to: '/admin/chemicals',
    title: 'Chemical Database',
    description: 'View all chemical records, sources, and import history.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>),
  },
  {
    to: '/site-manager',
    title: 'Site Manager',
    description: 'Review system error logs, including storage failures.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>),
  },
  {
    to: '/admin/contact-submissions',
    title: 'Contact Form Submissions',
    description: 'Review contact and demo submissions from the home page.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  },
  {
    to: '/admin/users',
    title: 'User Management',
    description: 'Manage user accounts and role assignments.',
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  },
]

const ROLES = ['Admin', 'Manager', 'Analyst', 'Viewer']

const INITIAL_USERS = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Manager', status: 'Active' },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'Analyst', status: 'Inactive' },
]

let nextUserId = INITIAL_USERS.length + 1

export function UserManagement() {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'Viewer', status: 'Active' })
  const [error, setError] = useState('')

  const openNew = () => {
    setEditingUser(null)
    setForm({ name: '', email: '', role: 'Viewer', status: 'Active' })
    setError('')
    setShowForm(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status })
    setError('')
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...form } : u))
    } else {
      setUsers(prev => [...prev, { id: nextUserId++, ...form }])
    }
    setShowForm(false)
    setEditingUser(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Remove this user?')) return
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ color: '#14532d', marginBottom: '0.25rem' }}>👤 User Management</h2>
          <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>Manage user accounts and role assignments.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add User</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 520 }}>
          <h3 style={{ color: '#166534', marginBottom: '1rem' }}>{editingUser ? 'Edit User' : 'New User'}</h3>
          {error && <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>{error}</div>}
          <div className="form-group">
            <label>Name</label>
            <input className="form-control" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com" />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="form-control" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            {error && <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>⚠ {error}</span>}
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No users.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ ...tdStyle, color: '#4b5563' }}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: '#f3f4f6', color: '#374151' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
                      background: u.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                      color: u.status === 'Active' ? '#166534' : '#6b7280',
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.2rem 0.55rem', fontSize: '0.82rem' }}
                        onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '0.2rem 0.55rem', fontSize: '0.82rem' }}
                        onClick={() => handleDelete(u.id)}>Remove</button>
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

export function ContactFormSubmissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    contactSubmissions.list()
      .then(res => setSubmissions(res.data || []))
      .catch(() => setError('Could not load contact form submissions.'))
      .finally(() => setLoading(false))
  }, [])

  const thStyle = {
    padding: '0.75rem 0.5rem', textAlign: 'left', borderBottom: '2px solid #d1d5db',
    color: '#374151', fontWeight: 600, fontSize: '0.88rem',
  }
  const tdStyle = {
    padding: '0.6rem 0.5rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#1f2937',
  }

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ color: '#14532d', marginBottom: '0.25rem' }}>📬 Contact Form Submissions</h2>
        <p style={{ color: '#6b7280', fontSize: '0.92rem' }}>Demo requests and contact form submissions from the home page.</p>
      </div>

      {loading && <div style={{ color: '#6b7280' }}>Loading…</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && submissions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No submissions yet.</div>
      )}
      {!loading && !error && submissions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Message</th>
                <th style={thStyle}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{s.name}</td>
                  <td style={tdStyle}>{s.company}</td>
                  <td style={tdStyle}>{s.role || '—'}</td>
                  <td style={{ ...tdStyle, color: '#4b5563' }}>{s.email}</td>
                  <td style={tdStyle}>{s.phone}</td>
                  <td style={{ ...tdStyle, maxWidth: 240, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.message || '—'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.82rem' }}>
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
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

export default function Admin() {
  const [activeSection, setActiveSection] = useState(null)

  const activeLink = adminLinks.find(l => l.to === activeSection)

  return (
    <div className="profile-page" style={{ padding: '2rem 1.5rem 3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.5rem' }}>Admin</h1>
        <p style={{ color: '#6b7280', maxWidth: 680 }}>
          Use these shortcuts to manage admin setup pages. Additional admin links can be added here over time.
        </p>
      </div>

      <div className="profile-sidebar-layout">
        {/* Left sidebar navigation */}
        <div className="profile-sidebar">
          {adminLinks.map(({ to, title, icon }) => (
            <button
              key={to}
              className={`profile-sidebar-btn${activeSection === to ? ' active' : ''}`}
              onClick={() => setActiveSection(to)}
            >
              <span style={SIDEBAR_ICON_STYLE}><span style={SIDEBAR_SVG_STYLE}>{icon}</span></span>
              {title}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="profile-main-content">
          {!activeSection && (
            <div className="card" style={{ marginTop: 0, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: '0.95rem' }}>Select an admin section from the menu to get started.</p>
            </div>
          )}
          {activeSection === '/admin/contact-submissions' && <ContactFormSubmissions />}
          {activeSection === '/admin/users' && <UserManagement />}
          {activeSection && activeSection !== '/admin/contact-submissions' && activeSection !== '/admin/users' && (
            <div className="card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={SIDEBAR_ICON_STYLE}><span style={SIDEBAR_SVG_STYLE}>{activeLink?.icon}</span></span>
                <h2 style={{ color: '#14532d', margin: 0 }}>{activeLink?.title}</h2>
              </div>
              <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>{activeLink?.description}</p>
              <Link to={activeSection} className="btn btn-primary">
                Open {activeLink?.title}
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
