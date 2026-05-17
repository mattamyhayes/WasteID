import { useEffect, useState, useMemo } from 'react'
import { mixtures as mixturesApi } from '../api/client'

/**
 * Compute a ship-by date from the determination created_at date.
 * RCRA regulations generally require shipment within 90 days of accumulation
 * start for large-quantity generators. We use the determination date as proxy.
 */
function computeShipByDate(createdAt) {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + 90)
  return d
}

function formatDate(d) {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString()
}

function ShipByBadge({ shipByDate }) {
  const now = new Date()
  const daysLeft = Math.ceil((shipByDate - now) / (1000 * 60 * 60 * 24))
  let color = '#166534'
  let bg = '#dcfce7'
  let label = `${daysLeft} days left`
  if (daysLeft < 0) {
    color = '#991b1b'
    bg = '#fee2e2'
    label = 'Overdue'
  } else if (daysLeft <= 14) {
    color = '#92400e'
    bg = '#fef3c7'
    label = `${daysLeft} days left`
  }
  return (
    <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, color, background: bg }}>
      {label}
    </span>
  )
}

function ApprovalBadge({ approved }) {
  if (approved) {
    return (
      <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, color: '#166534', background: '#dcfce7' }}>
        ✅ Approved
      </span>
    )
  }
  return (
    <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, color: '#92400e', background: '#fef3c7' }}>
      ⏳ Pending
    </span>
  )
}

export default function Shipping() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await mixturesApi.list()
        const all = res.data.results || res.data
        setItems(all)
      } catch {
        setError('Could not load orders.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filter to only signed orders (those with at least one determination that has a reviewer sign-off)
  const signedOrders = useMemo(() => {
    const orders = []
    for (const m of items) {
      const latestDet = m.determinations?.[m.determinations.length - 1]
      if (!latestDet) continue
      // A "signed" order is one where a reviewer has signed off (name provided)
      if (!latestDet.reviewer_name) continue
      const shipByDate = computeShipByDate(latestDet.created_at)
      const reviewComplete = !!(latestDet.reviewer_name && latestDet.reviewer_sign_off_date)
      orders.push({
        id: m.id,
        name: m.name,
        transactionId: m.transaction_id || '',
        customerName: m.customer_name || '—',
        locationName: m.customer_location_name || '',
        determinationDate: latestDet.created_at,
        shipByDate,
        reviewerName: latestDet.reviewer_name || '—',
        reviewDate: latestDet.reviewer_sign_off_date || null,
        reviewComplete,
        isHazardous: latestDet.is_hazardous_waste,
        wasteCodes: latestDet.waste_codes,
      })
    }
    // Sort by ship-by date ascending (most urgent first)
    orders.sort((a, b) => a.shipByDate - b.shipByDate)
    return orders
  }, [items])

  const thStyle = {
    padding: '0.75rem 0.5rem',
    textAlign: 'left',
    borderBottom: '2px solid #d1d5db',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.88rem',
    whiteSpace: 'nowrap',
  }

  const tdStyle = {
    padding: '0.6rem 0.5rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.9rem',
    color: '#1f2937',
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 1200 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#14532d' }}>Shipping</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Signed orders ready for shipping. Click an order to generate shipping information.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && signedOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No signed orders found.</p>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            Orders will appear here once a determination has been reviewed and signed off.
          </p>
        </div>
      )}

      {!loading && signedOrders.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Order #</th>
                <th style={thStyle}>Waste Profile</th>
                <th style={thStyle}>Generator</th>
                <th style={thStyle}>Ship By Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Customer Approved</th>
                <th style={thStyle}>Reviewed By</th>
                <th style={thStyle}>Review Date</th>
              </tr>
            </thead>
            <tbody>
              {signedOrders.map(order => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>#{order.id}</td>
                  <td style={tdStyle}>
                    <strong>{order.name}</strong>
                    {order.transactionId && (
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        {order.transactionId}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {order.customerName}
                    {order.locationName && (
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{order.locationName}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div>{formatDate(order.shipByDate)}</div>
                    <ShipByBadge shipByDate={order.shipByDate} />
                  </td>
                  <td style={tdStyle}>
                    <span className={`badge ${order.isHazardous ? 'badge-hazardous' : 'badge-safe'}`}>
                      {order.isHazardous ? '⚠️ Hazardous' : '✅ Non-Haz'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <ApprovalBadge approved={order.reviewComplete} />
                  </td>
                  <td style={tdStyle}>{order.reviewerName}</td>
                  <td style={tdStyle}>{formatDate(order.reviewDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shipping Form Modal - Coming Soon */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 560, width: '90%', padding: '2rem', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ color: '#14532d', marginBottom: '0.75rem' }}>
              Generate Shipping Information
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
              Order <strong>#{selectedOrder.id}</strong> — {selectedOrder.name}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Generator: {selectedOrder.customerName}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Ship by: {formatDate(selectedOrder.shipByDate)}
            </p>

            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: 8,
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚧</div>
              <h3 style={{ color: '#92400e', marginBottom: '0.5rem' }}>Coming Soon</h3>
              <p style={{ color: '#78350f', fontSize: '0.9rem' }}>
                The shipping form is currently under development. This feature will allow you to
                generate BOL, shipping labels, and manifest documentation for this order.
              </p>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
