import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { marketplace as marketplaceApi } from '../api/client'

// ──────────────────────────────────────── Constants

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const COMMON_WASTE_CODES = [
  'D001','D002','D003','D004','D005','D006','D007','D008',
  'D009','D010','D011','D012','D018','D019','D021','D022',
  'D035','D036','D038','D039','D040','D041','D042','D043',
  'F001','F002','F003','F004','F005','F006',
  'K001','K002','K003',
  'P001','P002','P010','P012',
  'U001','U002','U003','U006','U019','U031','U044',
]

const BID_TYPE_LABELS = {
  shipping: 'Shipping Only',
  disposal: 'Disposal Only',
  both: 'Shipping & Disposal',
  either: 'Either',
}

const STATUS_COLORS = {
  open: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  bid_accepted: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  completed: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  withdrawn: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
}

const BID_STATUS_COLORS = {
  pending: { bg: '#fef9c3', color: '#854d0e' },
  accepted: { bg: '#dcfce7', color: '#15803d' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
  withdrawn: { bg: '#f3f4f6', color: '#6b7280' },
}

// ──────────────────────────────────────── Helpers

function HoldTimeBadge({ days }) {
  if (days == null) return <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}>—</span>
  const style = days <= 5
    ? { background: '#fee2e2', color: '#b91c1c' }
    : days <= 10
      ? { background: '#fef9c3', color: '#854d0e' }
      : { background: '#dcfce7', color: '#15803d' }
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 5, fontSize: '0.82rem', fontWeight: 700, ...style }}>
      {days}d left
    </span>
  )
}

function StatusBadge({ status, label }) {
  const c = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: 5, fontSize: '0.8rem', fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {label || status}
    </span>
  )
}

function BidStatusBadge({ status, label }) {
  const c = BID_STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: 5, fontSize: '0.78rem', fontWeight: 700, background: c.bg, color: c.color }}>
      {label || status}
    </span>
  )
}

// ──────────────────────────────────────── Bid Detail Panel (inside My Listings)

function BidPanel({ listing, onAccept, onClose, accepting }) {
  const bids = listing.bids || []
  const hasAcceptedBid = listing.status === 'bid_accepted'
  const acceptedBid = bids.find(b => b.status === 'accepted')

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 520, height: '100%', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2 }}>Bids for</div>
          <div style={{ fontWeight: 700, color: '#14532d', fontSize: '1.05rem' }}>{listing.mixture_name}</div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{listing.listing_id}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: '1rem 1.5rem', flex: 1 }}>
        {hasAcceptedBid && acceptedBid && (
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.5rem', fontSize: '1rem' }}>✅ Bid Accepted</div>
            <div style={{ fontSize: '0.9rem', color: '#166534' }}>
              <strong>{acceptedBid.bidder_company_name}</strong> has been awarded this contract.
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: '#374151' }}>
              <div><strong>Contact:</strong> {acceptedBid.bidder_contact_name || '—'}</div>
              <div><strong>Email:</strong> {acceptedBid.bidder_contact_email || '—'}</div>
              <div><strong>Phone:</strong> {acceptedBid.bidder_contact_phone || '—'}</div>
              <div><strong>EPA ID:</strong> {acceptedBid.epa_id || '—'}</div>
              <div><strong>Type:</strong> {acceptedBid.bid_type_display || acceptedBid.bid_type}</div>
              {acceptedBid.amount && <div><strong>Amount:</strong> ${Number(acceptedBid.amount).toLocaleString()}</div>}
            </div>
          </div>
        )}

        {bids.length === 0 && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>No bids submitted yet.</p>
        )}

        {bids.map(bid => (
          <div key={bid.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem', marginBottom: '0.75rem', background: bid.status === 'accepted' ? '#f0fdf4' : '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{bid.bidder_company_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>{bid.bid_id}</div>
              </div>
              <BidStatusBadge status={bid.status} label={bid.status_display || bid.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1rem', fontSize: '0.85rem', color: '#374151', marginBottom: '0.5rem' }}>
              <div><span style={{ color: '#6b7280' }}>Type:</span> <strong>{bid.bid_type_display || bid.bid_type}</strong></div>
              <div><span style={{ color: '#6b7280' }}>Amount:</span> <strong>{bid.amount ? `$${Number(bid.amount).toLocaleString()}` : '—'}</strong></div>
              <div><span style={{ color: '#6b7280' }}>Contact:</span> {bid.bidder_contact_name || '—'}</div>
              <div><span style={{ color: '#6b7280' }}>EPA ID:</span> {bid.epa_id || '—'}</div>
            </div>

            {bid.service_area_states_list?.length > 0 && (
              <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6b7280' }}>States served:</span> {bid.service_area_states_list.join(', ')}
              </div>
            )}

            {bid.certifications && (
              <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6b7280' }}>Certifications:</span> {bid.certifications}
              </div>
            )}

            {bid.notes && (
              <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '0.35rem' }}>
                <span style={{ color: '#6b7280' }}>Notes:</span> {bid.notes}
              </div>
            )}

            {bid.status === 'pending' && !hasAcceptedBid && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.3rem 0.75rem' }}
                  disabled={accepting}
                  onClick={() => onAccept(bid.id)}
                >
                  {accepting ? '…' : '✓ Accept This Bid'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────── Bid Submission Modal

function BidModal({ listing, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    bidder_company_name: '',
    bidder_contact_name: '',
    bidder_contact_email: '',
    bidder_contact_phone: '',
    epa_id: '',
    bid_type: listing.bid_type_needed === 'either' ? 'shipping' : (listing.bid_type_needed === 'both' ? 'both' : listing.bid_type_needed),
    amount: '',
    certifications: '',
    notes: '',
  })
  const [selectedStates, setSelectedStates] = useState([])
  const [selectedCodes, setSelectedCodes] = useState([])
  const [stateInput, setStateInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addState = (s) => {
    const upper = s.toUpperCase().trim()
    if (upper && !selectedStates.includes(upper)) setSelectedStates(ss => [...ss, upper])
    setStateInput('')
  }

  const addCode = (c) => {
    const upper = c.toUpperCase().trim()
    if (upper && !selectedCodes.includes(upper)) setSelectedCodes(cc => [...cc, upper])
    setCodeInput('')
  }

  const validate = () => {
    const e = {}
    if (!form.bidder_company_name.trim()) e.bidder_company_name = 'Company name is required.'
    if (!form.bidder_contact_email.trim()) e.bidder_contact_email = 'Contact email is required.'
    if (!form.bid_type) e.bid_type = 'Bid type is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit({
      listing: listing.id,
      ...form,
      amount: form.amount ? form.amount : null,
      service_area_states: selectedStates,
      waste_codes_handled: selectedCodes,
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, color: '#14532d', fontSize: '1.15rem' }}>Submit a Bid</h2>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 2 }}>{listing.mixture_name} · {listing.listing_id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* Profile summary */}
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            <strong>Generator:</strong> {listing.customer_name || '—'} &nbsp;·&nbsp;
            <strong>Status:</strong> {listing.epa_generator_status || '—'} &nbsp;·&nbsp;
            <strong>Needed:</strong> {BID_TYPE_LABELS[listing.bid_type_needed] || listing.bid_type_needed} &nbsp;·&nbsp;
            <strong>Waste Codes:</strong> {(listing.waste_codes || []).join(', ') || '—'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 600 }}>Company Name *</label>
              <input className={`form-control${errors.bidder_company_name ? ' is-invalid' : ''}`}
                value={form.bidder_company_name} onChange={e => set('bidder_company_name', e.target.value)}
                placeholder="Your company name" />
              {errors.bidder_company_name && <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>{errors.bidder_company_name}</div>}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Contact Name</label>
              <input className="form-control" value={form.bidder_contact_name}
                onChange={e => set('bidder_contact_name', e.target.value)} placeholder="Full name" />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>EPA ID</label>
              <input className="form-control" value={form.epa_id}
                onChange={e => set('epa_id', e.target.value)} placeholder="e.g. MAD053452637" />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Contact Email *</label>
              <input className={`form-control${errors.bidder_contact_email ? ' is-invalid' : ''}`} type="email"
                value={form.bidder_contact_email} onChange={e => set('bidder_contact_email', e.target.value)}
                placeholder="email@company.com" />
              {errors.bidder_contact_email && <div style={{ color: '#dc2626', fontSize: '0.82rem' }}>{errors.bidder_contact_email}</div>}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Contact Phone</label>
              <input className="form-control" value={form.bidder_contact_phone}
                onChange={e => set('bidder_contact_phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Bid Type *</label>
              <select className={`form-control${errors.bid_type ? ' is-invalid' : ''}`}
                value={form.bid_type} onChange={e => set('bid_type', e.target.value)}>
                {listing.bid_type_needed === 'either' || listing.bid_type_needed === 'shipping' || listing.bid_type_needed === 'both'
                  ? <option value="shipping">Shipping Only</option> : null}
                {listing.bid_type_needed === 'either' || listing.bid_type_needed === 'disposal' || listing.bid_type_needed === 'both'
                  ? <option value="disposal">Disposal Only</option> : null}
                {listing.bid_type_needed === 'either' || listing.bid_type_needed === 'both'
                  ? <option value="both">Shipping &amp; Disposal</option> : null}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Bid Amount ($)</label>
              <input className="form-control" type="number" min="0" step="0.01"
                value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="e.g. 2500" />
              <small style={{ color: '#9ca3af' }}>Leave blank if quoting on request</small>
            </div>
          </div>

          {/* Service area states */}
          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label style={{ fontWeight: 600 }}>Service Area States</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              {selectedStates.map(s => (
                <span key={s} style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '0.15rem 0.55rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {s}
                  <button onClick={() => setSelectedStates(ss => ss.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', padding: 0, lineHeight: 1, fontSize: '0.8rem' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="form-control" style={{ maxWidth: 120 }} value={stateInput} onChange={e => setStateInput(e.target.value)}>
                <option value="">State…</option>
                {US_STATES.filter(s => !selectedStates.includes(s)).map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => stateInput && addState(stateInput)}>Add</button>
            </div>
          </div>

          {/* Waste codes handled */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Waste Codes Handled</label>
            <small style={{ color: '#6b7280', display: 'block', marginBottom: '0.35rem' }}>Add the EPA waste codes your facility is permitted to manage</small>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              {selectedCodes.map(c => (
                <span key={c} style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 4, padding: '0.15rem 0.55rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace' }}>
                  {c}
                  <button onClick={() => setSelectedCodes(cc => cc.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#854d0e', padding: 0, lineHeight: 1, fontSize: '0.8rem' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="form-control" style={{ maxWidth: 160 }} value={codeInput} onChange={e => setCodeInput(e.target.value)}>
                <option value="">Code…</option>
                {COMMON_WASTE_CODES.filter(c => !selectedCodes.includes(c)).map(c => <option key={c}>{c}</option>)}
              </select>
              <input className="form-control" style={{ maxWidth: 120 }} value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder="or type…" />
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => codeInput && addCode(codeInput)}>Add</button>
            </div>
          </div>

          {/* Certifications */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Certifications &amp; Permits</label>
            <textarea className="form-control" rows={3} value={form.certifications}
              onChange={e => set('certifications', e.target.value)}
              placeholder="List your relevant certifications, EPA permits, DOT approvals, and any applicable state-level authorizations..." />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Additional Notes</label>
            <textarea className="form-control" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional information about your services, capacity, or timeline..." />
          </div>

          {/* Disclaimer */}
          <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem' }}>
            By submitting this bid, you certify that your company holds all required EPA and state permits to handle the identified waste streams, and that the information provided is accurate. Submission of a bid does not constitute a binding contract.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : '📤 Submit Bid'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────── Listing Card (Browse tab)

function ListingCard({ listing, onBidClick }) {
  const [expanded, setExpanded] = useState(false)
  const c = STATUS_COLORS[listing.status] || STATUS_COLORS.open

  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, background: '#fff', marginBottom: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <div
        style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Left: waste type indicator */}
        <div style={{ width: 40, height: 40, borderRadius: 8, background: listing.is_hazardous ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          {listing.is_hazardous ? '⚠️' : '♻️'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.98rem' }}>{listing.mixture_name}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 1 }}>
                {listing.customer_name} &nbsp;·&nbsp; {listing.listing_id}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={listing.status} label={listing.status_display} />
              <HoldTimeBadge days={listing.days_remaining_to_ship} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <span><span style={{ color: '#6b7280' }}>Type Needed:</span> <strong>{BID_TYPE_LABELS[listing.bid_type_needed] || listing.bid_type_needed}</strong></span>
            {listing.epa_generator_status && (
              <span><span style={{ color: '#6b7280' }}>Generator:</span> <strong>{listing.epa_generator_status}</strong></span>
            )}
            {listing.shipment_size_qty && (
              <span><span style={{ color: '#6b7280' }}>Size:</span> <strong>{listing.shipment_size_qty} {listing.shipment_size_unit}</strong></span>
            )}
            <span><span style={{ color: '#6b7280' }}>Bids:</span> <strong>{listing.bid_count}</strong></span>
          </div>

          {listing.waste_codes?.length > 0 && (
            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {listing.waste_codes.map(c => (
                <span key={c} style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 4, padding: '0.1rem 0.45rem', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>{c}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ color: '#9ca3af', fontSize: '0.9rem', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem', fontSize: '0.88rem', color: '#374151' }}>
            <div><span style={{ color: '#6b7280' }}>Profile ID:</span> <span style={{ fontFamily: 'monospace' }}>{listing.mixture_transaction_id}</span></div>
            <div><span style={{ color: '#6b7280' }}>Hazardous:</span> <strong>{listing.is_hazardous === null || listing.is_hazardous === undefined ? '—' : listing.is_hazardous ? 'Yes' : 'No'}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Listed:</span> {new Date(listing.created_at).toLocaleDateString()}</div>
            {listing.preferred_completion_date && (
              <div><span style={{ color: '#6b7280' }}>Preferred Completion:</span> {new Date(listing.preferred_completion_date + 'T00:00:00').toLocaleDateString()}</div>
            )}
          </div>
          {listing.description && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: '#374151' }}>
              <span style={{ color: '#6b7280' }}>Details:</span> {listing.description}
            </div>
          )}
          {listing.status === 'open' && (
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ fontSize: '0.9rem' }} onClick={() => onBidClick(listing)}>
                📤 Submit a Bid
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────── Main Marketplace Page

export default function Marketplace() {
  const [tab, setTab] = useState('browse')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [myListings, setMyListings] = useState([])
  const [myListingsLoading, setMyListingsLoading] = useState(false)

  // Browse filters
  const [filterBidType, setFilterBidType] = useState('')
  const [filterHazardous, setFilterHazardous] = useState('')
  const [filterEpa, setFilterEpa] = useState('')
  const [filterWasteCode, setFilterWasteCode] = useState('')
  const [filterState, setFilterState] = useState('')
  const [searchText, setSearchText] = useState('')

  // Bid submission
  const [bidTarget, setBidTarget] = useState(null)
  const [submittingBid, setSubmittingBid] = useState(false)
  const [bidSuccess, setBidSuccess] = useState(null)

  // Bid panel (My Listings)
  const [selectedListing, setSelectedListing] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [withdrawingListing, setWithdrawingListing] = useState(null)
  const [completingListing, setCompletingListing] = useState(null)

  const loadListings = async () => {
    setLoading(true)
    try {
      const params = { status: 'open,bid_accepted,completed' }
      if (filterBidType) params.bid_type_needed = filterBidType
      if (filterHazardous) params.is_hazardous = filterHazardous
      if (filterEpa) params.epa_generator_status = filterEpa
      if (filterWasteCode) params.waste_code = filterWasteCode
      const res = await marketplaceApi.listListings(params)
      setListings(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  const loadMyListings = async () => {
    setMyListingsLoading(true)
    try {
      const res = await marketplaceApi.listListings({ status: 'open,bid_accepted,completed,withdrawn' })
      setMyListings(res.data.results || res.data)
    } finally {
      setMyListingsLoading(false)
    }
  }

  useEffect(() => {
    loadListings()
  }, [filterBidType, filterHazardous, filterEpa, filterWasteCode])

  useEffect(() => {
    if (tab === 'my') loadMyListings()
  }, [tab])

  const filteredListings = useMemo(() => {
    if (!searchText.trim()) return listings
    const q = searchText.toLowerCase()
    return listings.filter(l =>
      (l.mixture_name || '').toLowerCase().includes(q) ||
      (l.customer_name || '').toLowerCase().includes(q) ||
      (l.listing_id || '').toLowerCase().includes(q) ||
      (l.waste_codes || []).some(c => c.toLowerCase().includes(q))
    )
  }, [listings, searchText])

  const openListings = filteredListings.filter(l => l.status === 'open')
  const otherListings = filteredListings.filter(l => l.status !== 'open')

  const handleBidSubmit = async (payload) => {
    setSubmittingBid(true)
    try {
      await marketplaceApi.submitBid(payload)
      setBidTarget(null)
      setBidSuccess(payload.listing)
      setTimeout(() => setBidSuccess(null), 5000)
      await loadListings()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to submit bid.')
    } finally {
      setSubmittingBid(false)
    }
  }

  const handleAcceptBid = async (bidId) => {
    if (!selectedListing) return
    setAccepting(true)
    try {
      const res = await marketplaceApi.acceptBid(selectedListing.id, bidId)
      const updated = res.data
      setMyListings(prev => prev.map(l => l.id === updated.id ? updated : l))
      setSelectedListing(updated)
      await loadListings()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to accept bid.')
    } finally {
      setAccepting(false)
    }
  }

  const handleWithdrawListing = async (listingId) => {
    if (!window.confirm('Withdraw this listing from the marketplace? All pending bids will be rejected.')) return
    setWithdrawingListing(listingId)
    try {
      await marketplaceApi.withdrawListing(listingId)
      await loadMyListings()
      await loadListings()
      if (selectedListing?.id === listingId) setSelectedListing(null)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to withdraw listing.')
    } finally {
      setWithdrawingListing(null)
    }
  }

  const handleCompleteListing = async (listingId) => {
    if (!window.confirm('Mark this listing as completed?')) return
    setCompletingListing(listingId)
    try {
      await marketplaceApi.completeListing(listingId)
      await loadMyListings()
      await loadListings()
      if (selectedListing?.id === listingId) setSelectedListing(null)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to complete listing.')
    } finally {
      setCompletingListing(null)
    }
  }

  const tabStyle = (key) => ({
    padding: '0.6rem 1.25rem',
    border: 'none',
    borderBottom: tab === key ? '3px solid #166534' : '3px solid transparent',
    background: 'none',
    color: tab === key ? '#14532d' : '#6b7280',
    fontWeight: tab === key ? 700 : 500,
    fontSize: '0.95rem',
    cursor: 'pointer',
  })

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: '#14532d', margin: 0 }}>🏪 Waste Marketplace</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.92rem' }}>
            Generators list approved waste profiles for service providers to bid on shipping, disposal, or both.
          </p>
        </div>
        <Link to="/review" className="btn btn-secondary">← Profile Review</Link>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {[
          { label: 'Open for Bids', count: listings.filter(l => l.status === 'open').length, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Bid Accepted', count: listings.filter(l => l.status === 'bid_accepted').length, color: '#15803d', bg: '#dcfce7' },
          { label: 'Completed', count: listings.filter(l => l.status === 'completed').length, color: '#374151', bg: '#f3f4f6' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'flex' }}>
        <button style={tabStyle('browse')} onClick={() => setTab('browse')}>🔍 Browse Listings</button>
        <button style={tabStyle('my')} onClick={() => setTab('my')}>📋 My Listings</button>
      </div>

      {/* ─── BROWSE TAB ─── */}
      {tab === 'browse' && (
        <div>
          {bidSuccess && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#15803d', fontWeight: 600, fontSize: '0.92rem' }}>
              ✅ Your bid has been submitted successfully! The generator will review bids and notify you if accepted.
            </div>
          )}

          {/* Filters */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '2 1 200px' }}>
                <label style={{ fontSize: '0.82rem', color: '#6b7280', display: 'block', marginBottom: 3 }}>Search</label>
                <input className="form-control" placeholder="Search by name, generator, waste code…"
                  value={searchText} onChange={e => setSearchText(e.target.value)} style={{ fontSize: '0.9rem' }} />
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label style={{ fontSize: '0.82rem', color: '#6b7280', display: 'block', marginBottom: 3 }}>Service Needed</label>
                <select className="form-control" value={filterBidType} onChange={e => setFilterBidType(e.target.value)} style={{ fontSize: '0.9rem' }}>
                  <option value="">All Types</option>
                  <option value="shipping">Shipping</option>
                  <option value="disposal">Disposal</option>
                  <option value="both">Both</option>
                  <option value="either">Either</option>
                </select>
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: '0.82rem', color: '#6b7280', display: 'block', marginBottom: 3 }}>Generator Size</label>
                <select className="form-control" value={filterEpa} onChange={e => setFilterEpa(e.target.value)} style={{ fontSize: '0.9rem' }}>
                  <option value="">All Sizes</option>
                  <option value="VSQG">VSQG</option>
                  <option value="SQG">SQG</option>
                  <option value="LQG">LQG</option>
                </select>
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <label style={{ fontSize: '0.82rem', color: '#6b7280', display: 'block', marginBottom: 3 }}>Hazardous</label>
                <select className="form-control" value={filterHazardous} onChange={e => setFilterHazardous(e.target.value)} style={{ fontSize: '0.9rem' }}>
                  <option value="">All</option>
                  <option value="true">Hazardous</option>
                  <option value="false">Non-Hazardous</option>
                </select>
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <label style={{ fontSize: '0.82rem', color: '#6b7280', display: 'block', marginBottom: 3 }}>Waste Code</label>
                <select className="form-control" value={filterWasteCode} onChange={e => setFilterWasteCode(e.target.value)} style={{ fontSize: '0.9rem' }}>
                  <option value="">Any Code</option>
                  {COMMON_WASTE_CODES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {(filterBidType || filterHazardous || filterEpa || filterWasteCode || searchText) && (
                <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }}
                  onClick={() => { setFilterBidType(''); setFilterHazardous(''); setFilterEpa(''); setFilterWasteCode(''); setSearchText('') }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading listings…</p>
          ) : filteredListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏪</div>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>No listings match your search criteria.</p>
              {(filterBidType || filterHazardous || filterEpa || filterWasteCode || searchText) && (
                <button className="btn btn-secondary" onClick={() => { setFilterBidType(''); setFilterHazardous(''); setFilterEpa(''); setFilterWasteCode(''); setSearchText('') }}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {openListings.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#1e40af', marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '0.15rem 0.6rem', fontSize: '0.85rem' }}>{openListings.length}</span>
                    Open for Bids
                  </h3>
                  {openListings.map(l => <ListingCard key={l.id} listing={l} onBidClick={setBidTarget} />)}
                </div>
              )}
              {otherListings.length > 0 && (
                <div>
                  <h3 style={{ color: '#6b7280', marginBottom: '0.75rem', fontSize: '1rem' }}>Other Listings</h3>
                  {otherListings.map(l => <ListingCard key={l.id} listing={l} onBidClick={setBidTarget} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── MY LISTINGS TAB ─── */}
      {tab === 'my' && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {myListingsLoading ? (
              <p style={{ color: '#6b7280' }}>Loading your listings…</p>
            ) : myListings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>
                  No profiles listed on the marketplace yet.
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  Go to <strong>Profile Review</strong>, find an approved profile, and click <strong>Send to Marketplace</strong> to list it here.
                </p>
                <Link to="/review" className="btn btn-primary">Go to Profile Review</Link>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#14532d', margin: 0 }}>Your Marketplace Listings ({myListings.length})</h3>
                  <Link to="/review" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>+ List Another Profile</Link>
                </div>
                {myListings.map(listing => {
                  const c = STATUS_COLORS[listing.status] || STATUS_COLORS.open
                  const isSelected = selectedListing?.id === listing.id
                  return (
                    <div
                      key={listing.id}
                      style={{ border: `2px solid ${isSelected ? '#166534' : c.border}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '0.75rem', background: isSelected ? '#f0fdf4' : '#fff', cursor: 'pointer', boxShadow: isSelected ? '0 2px 8px rgba(20,83,45,0.12)' : '0 1px 3px rgba(0,0,0,0.06)' }}
                      onClick={() => setSelectedListing(isSelected ? null : listing)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#14532d' }}>{listing.mixture_name}</div>
                          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 1 }}>
                            {listing.customer_name} &nbsp;·&nbsp; {listing.listing_id}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 5, padding: '0.15rem 0.55rem', fontSize: '0.82rem', fontWeight: 700 }}>
                            {listing.bid_count} bid{listing.bid_count !== 1 ? 's' : ''}
                          </span>
                          <StatusBadge status={listing.status} label={listing.status_display} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span><span style={{ color: '#6b7280' }}>Service:</span> {BID_TYPE_LABELS[listing.bid_type_needed] || listing.bid_type_needed}</span>
                        <span><span style={{ color: '#6b7280' }}>Hold Time:</span> <HoldTimeBadge days={listing.days_remaining_to_ship} /></span>
                        {listing.waste_codes?.length > 0 && (
                          <span>
                            {listing.waste_codes.slice(0, 3).map(c => (
                              <span key={c} style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 3, padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, marginRight: 3 }}>{c}</span>
                            ))}
                            {listing.waste_codes.length > 3 && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>+{listing.waste_codes.length - 3} more</span>}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                          onClick={() => setSelectedListing(isSelected ? null : listing)}
                        >
                          {isSelected ? 'Hide Bids ▲' : `View Bids (${listing.bid_count}) ▼`}
                        </button>
                        {listing.status === 'open' && (
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                            disabled={withdrawingListing === listing.id}
                            onClick={() => handleWithdrawListing(listing.id)}
                          >
                            {withdrawingListing === listing.id ? '…' : 'Withdraw'}
                          </button>
                        )}
                        {listing.status === 'bid_accepted' && (
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                            disabled={completingListing === listing.id}
                            onClick={() => handleCompleteListing(listing.id)}
                          >
                            {completingListing === listing.id ? '…' : '✓ Mark Complete'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Bid panel overlay */}
          {selectedListing && (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 99 }} onClick={() => setSelectedListing(null)} />
              <BidPanel
                listing={selectedListing}
                onAccept={handleAcceptBid}
                onClose={() => setSelectedListing(null)}
                accepting={accepting}
              />
            </>
          )}
        </div>
      )}

      {/* Bid submission modal */}
      {bidTarget && (
        <BidModal
          listing={bidTarget}
          onClose={() => setBidTarget(null)}
          onSubmit={handleBidSubmit}
          submitting={submittingBid}
        />
      )}
    </div>
  )
}
