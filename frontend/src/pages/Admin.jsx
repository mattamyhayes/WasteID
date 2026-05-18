import { useState } from 'react'
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

const ROLES = ['Admin', 'Manager', 'Analyst', 'Viewer']

const INITIAL_USERS = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Manager', status: 'Active' },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'Analyst', status: 'Inactive' },
]

let nextUserId = INITIAL_USERS.length + 1

function UserManagement() {
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
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

export default function Admin() {
  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d', marginBottom: '0.5rem' }}>Admin</h1>
        <p style={{ color: '#6b7280', maxWidth: 680 }}>
          Use these shortcuts to manage admin setup pages. Additional admin links can be added here over time.
        </p>
      </div>

      <div className="admin-links-grid">
        {adminLinks.map(({ to, title, icon }) => (
          <Link
            key={to}
            to={to}
            className="card admin-link-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#14532d',
            }}
          >
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
          </Link>
        ))}
      </div>

      <UserManagement />
    </div>
  )
}
