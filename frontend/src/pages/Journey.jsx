import { useEffect, useState, useMemo } from 'react'
import { journey, mixtures as mixturesApi } from '../api/client'
import { JOURNEY_PHASES } from '../lib/journeyStore'
import { holdTimeColor, daysRemainingFromDate } from '../lib/shipByUtils'

// Map phase name → date field key
const PHASE_DATE_KEY = {
  Profile: 'profile_date',
  Quote: 'quote_date',
  Order: 'order_date',
  Shipping: 'shipping_date',
  Disposal: 'disposal_date',
}

function getPhaseEntryDate(item, phase) {
  const dateKey = PHASE_DATE_KEY[phase]
  return item[dateKey] ? new Date(item[dateKey]) : new Date(item.created_at)
}

function getJourneyIdentifier(item) {
  const orderId = typeof item.order_id === 'string' ? item.order_id : ''
  if (orderId.startsWith('OID')) return orderId

  const profileCandidates = [
    item.profile_id,
    item.mixture_transaction_id,
    item.transaction_id,
  ]
  for (const candidate of profileCandidates) {
    if (typeof candidate === 'string' && candidate.startsWith('PID')) return candidate
  }

  if (item.id != null) return `PID-LOCAL-${String(item.id).padStart(4, '0')}`
  return 'PID-UNKNOWN'
}

function computePhaseStats(items) {
  const now = new Date()
  return JOURNEY_PHASES.map(phase => {
    const inPhase = items.filter(i => i.phase === phase)
    let avgDays = 0
    if (inPhase.length > 0) {
      const totalMs = inPhase.reduce((sum, item) => {
        return sum + (now - getPhaseEntryDate(item, phase))
      }, 0)
      avgDays = Math.round(totalMs / inPhase.length / (1000 * 60 * 60 * 24))
    }
    return { phase, count: inPhase.length, avgDays }
  })
}

function PhaseCircle({ phase, count, avgDays, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
        minWidth: 0,
        flex: '1 1 0',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? '#166534' : '#e7f0e9',
          color: isActive ? '#fff' : '#166534',
          border: isActive ? '3px solid #14532d' : '3px solid #bbf7d0',
          transition: 'all 0.2s',
          fontWeight: 700,
          boxShadow: isActive ? '0 4px 12px rgba(22,101,52,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{count}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 2 }}>items</span>
      </div>
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.85rem',
          color: isActive ? '#14532d' : '#6b7280',
        }}
      >
        {phase}
      </span>
      <span
        style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
        }}
      >
        ~{avgDays}d avg
      </span>
    </button>
  )
}

function ConnectorLine() {
  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 32,
        height: 3,
        background: '#bbf7d0',
        alignSelf: 'flex-start',
        marginTop: 40,
        borderRadius: 2,
      }}
    />
  )
}

export default function Journey() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('Profile')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [journeyRes, mixturesRes] = await Promise.all([
          journey.list(),
          mixturesApi.list(),
        ])
        // Non-Profile journey items (Quote, Order, Shipping, Disposal)
        const journeyItems = (journeyRes.data.results || journeyRes.data).filter(
          i => i.phase !== 'Profile'
        )
        // Map actual submitted profiles (mixtures) into the journey item shape
        const profileItems = (mixturesRes.data.results || mixturesRes.data || []).map(m => ({
          id: `profile-${m.id}`,
          profile_id: m.transaction_id,
          order_id: null,
          name: m.name,
          customer: m.customer_name,
          phase: 'Profile',
          profile_date: m.profile_started_at || m.created_at,
          quote_date: null,
          order_date: null,
          shipping_date: null,
          disposal_date: null,
          generation_date: m.generation_date,
          pickup_by_date: m.ship_by_date,
          created_at: m.created_at,
        }))
        setItems([...profileItems, ...journeyItems])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => computePhaseStats(items), [items])
  const phaseItems = useMemo(
    () => items.filter(i => i.phase === activePhase),
    [items, activePhase]
  )

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ color: '#14532d', marginBottom: '1.5rem' }}>Journey</h1>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && (
        <>
          {/* Phase circles */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: 0,
              marginBottom: '2rem',
              overflowX: 'auto',
              padding: '0.5rem 0',
            }}
          >
            {stats.map((s, idx) => (
              <div key={s.phase} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <PhaseCircle
                  phase={s.phase}
                  count={s.count}
                  avgDays={s.avgDays}
                  isActive={activePhase === s.phase}
                  onClick={() => setActivePhase(s.phase)}
                />
                {idx < stats.length - 1 && <ConnectorLine />}
              </div>
            ))}
          </div>

          {/* Phase detail table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <h2 style={{ color: '#14532d', marginBottom: '1rem', fontSize: '1.15rem' }}>
              {activePhase} — {phaseItems.length} item{phaseItems.length !== 1 ? 's' : ''}
            </h2>
            {phaseItems.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>
                No items currently in the {activePhase} phase.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Customer</th>
                      <th>Entered Phase</th>
                      <th>Days in Phase</th>
                      <th>EPA Pickup Time Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseItems.map(item => {
                      const entered = getPhaseEntryDate(item, activePhase)
                      const daysIn = Math.round((new Date() - entered) / (1000 * 60 * 60 * 24))
                      const journeyId = getJourneyIdentifier(item)
                      return (
                        <tr key={item.id}>
                          <td>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: '#4b5563',
                                fontWeight: 600,
                                background: '#f3f4f6',
                                borderRadius: '4px',
                                padding: '0.1rem 0.4rem',
                              }}
                            >
                              {journeyId}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td style={{ color: '#6b7280' }}>{item.customer}</td>
                          <td style={{ color: '#6b7280', fontSize: '0.88rem' }}>
                            {entered.toLocaleDateString()}
                          </td>
                          <td>
                            <span
                              className={`badge ${daysIn > 14 ? 'badge-warning' : 'badge-info'}`}
                            >
                              {daysIn}d
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const pickupDateStr = item.pickup_by_date || item.ship_by_date || null
                              const daysLeft = daysRemainingFromDate(pickupDateStr)
                              if (daysLeft === null) {
                                return <span style={{ color: '#9ca3af', fontSize: '0.88rem' }}>—</span>
                              }
                              const holdStyle = holdTimeColor(daysLeft)
                              return (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: 6,
                                  fontSize: '0.88rem',
                                  ...holdStyle,
                                }}>
                                  {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                </span>
                              )
                            })()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
