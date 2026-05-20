import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { mixtures } from '../api/client'
import HazardBadge from '../components/HazardBadge'
import CompositionChart from '../components/CompositionChart'

export default function DeterminationResults() {
  const { id } = useParams()
  const [det, setDet] = useState(null)
  const [mixture, setMixture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        // Fetch all mixtures and find the one containing this determination
        const res = await mixtures.list()
        const all = res.data.results || res.data
        let found = null
        let foundDet = null
        for (const m of all) {
          const d = m.determinations?.find(d => String(d.id) === String(id))
          if (d) { found = m; foundDet = d; break }
        }
        if (!found) throw new Error('Determination not found')
        setMixture(found)
        setDet(foundDet)
      } catch (e) {
        setError('Could not load determination results.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const handlePdf = async () => {
    try {
      const res = await mixtures.reportPdf(mixture.id)
      downloadBlob(res.data, `wasteid_report_${mixture.id}.pdf`)
    } catch (e) {
      alert(e?.response?.data?.detail || 'PDF generation failed.')
    }
  }

  const handleCsv = async () => {
    try {
      const res = await mixtures.exportCsv(mixture.id)
      downloadBlob(res.data, `mixture_${mixture.id}.csv`)
    } catch (e) {
      alert(e?.response?.data?.detail || 'CSV export failed.')
    }
  }

  if (loading) return <div className="container" style={{ padding: '3rem' }}>Loading results…</div>
  if (error || !det) return <div className="container" style={{ padding: '3rem' }}><div className="alert alert-danger">{error || 'Not found.'}</div></div>

  const wasteCodes = det.waste_codes_list || []
  const reasoning = det.reasoning_list || []
  const isHazardous = det.is_hazardous_waste

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/history" style={{ color: '#166534', fontSize: '0.9rem' }}>← Back to History</Link>
          <h1 style={{ color: '#14532d', marginTop: '0.25rem' }}>{mixture.name}</h1>
          {(mixture.customer_name || mixture.customer_location_name) && (
            <p style={{ color: '#374151', fontSize: '0.92rem', margin: '0.15rem 0 0' }}>
              {mixture.customer_name && <><strong>Generator:</strong> {mixture.customer_name}</>}
              {mixture.customer_name && mixture.customer_location_name && ' · '}
              {mixture.customer_location_name && <><strong>Location:</strong> {mixture.customer_location_name}</>}
            </p>
          )}
          <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>
            Determined: {new Date(det.created_at).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePdf}>📄 PDF Report</button>
          <button className="btn btn-secondary" onClick={handleCsv}>📊 Export CSV</button>
          <Link to="/determine" className="btn btn-primary">+ New Determination</Link>
        </div>
      </div>

      {/* Days Remaining to Ship Banner */}
      {mixture.days_remaining_to_ship != null && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: 10,
          marginBottom: '1.5rem',
          background: mixture.days_remaining_to_ship <= 0 ? '#fef2f2'
            : mixture.days_remaining_to_ship <= 5 ? '#fffbeb'
            : '#f0fdf4',
          border: `2px solid ${mixture.days_remaining_to_ship <= 0 ? '#dc2626'
            : mixture.days_remaining_to_ship <= 5 ? '#f59e0b'
            : '#16a34a'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '2.5rem' }}>
            {mixture.days_remaining_to_ship <= 0 ? '🚨' : mixture.days_remaining_to_ship <= 5 ? '⏰' : '📅'}
          </span>
          <div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: mixture.days_remaining_to_ship <= 0 ? '#b91c1c'
                : mixture.days_remaining_to_ship <= 5 ? '#92400e'
                : '#15803d',
            }}>
              {mixture.days_remaining_to_ship <= 0
                ? `OVERDUE — shipment was due ${Math.abs(mixture.days_remaining_to_ship)} day(s) ago`
                : `${mixture.days_remaining_to_ship} day(s) remaining to ship`}
            </div>
            <div style={{ fontSize: '0.92rem', color: '#6b7280', marginTop: 2 }}>
              Ship by: <strong>{new Date(mixture.ship_by_date + 'T00:00:00').toLocaleDateString()}</strong>
              {mixture.epa_generator_status && <>{' · '}{mixture.epa_generator_status} ({mixture.hold_days} day hold)</>}
              {mixture.generation_date && <>{' · '}Generated: {new Date(mixture.generation_date + 'T00:00:00').toLocaleDateString()}</>}
            </div>
          </div>
        </div>
      )}

      {/* Status Banner */}
      <div style={{
        padding: '1.5rem 2rem',
        borderRadius: 12,
        background: isHazardous ? '#fef2f2' : '#f0fdf4',
        border: `2px solid ${isHazardous ? '#dc2626' : '#16a34a'}`,
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '2.5rem' }}>{isHazardous ? '⚠️' : '✅'}</span>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isHazardous ? '#b91c1c' : '#15803d' }}>
            {isHazardous ? 'HAZARDOUS WASTE' : 'NOT HAZARDOUS WASTE'}
          </div>
          <div style={{ fontSize: '0.92rem', color: '#6b7280', marginTop: 2 }}>
            {isHazardous
              ? 'This mixture appears to meet RCRA hazardous waste criteria. Proper handling and disposal required.'
              : 'Based on available information, this mixture does not appear to be hazardous under RCRA.'}
          </div>
        </div>
        {wasteCodes.length > 0 && (
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>Applicable Waste Codes:</div>
            <div>{wasteCodes.map(code => <HazardBadge key={code} code={code} />)}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Hazard Characteristics */}
        <div className="card">
          <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Hazard Characteristics</h3>
          {[
            { flag: det.has_ignitability, code: 'D001', label: 'Ignitable' },
            { flag: det.has_corrosivity, code: 'D002', label: 'Corrosive' },
            { flag: det.has_reactivity, code: 'D003', label: 'Reactive' },
            { flag: det.has_toxicity, label: 'Toxicity (D004–D043)' },
            { flag: det.is_listed_hazardous, label: 'Listed Hazardous (P/U/F/K)' },
          ].map(({ flag, code, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{flag ? '🔴' : '🟢'}</span>
              <span style={{ fontSize: '0.92rem', fontWeight: flag ? 700 : 400, color: flag ? '#b91c1c' : '#374151' }}>
                {code && <HazardBadge code={code} />}{!code && label}
              </span>
              {!flag && !code && <span style={{ color: '#6b7280', fontSize: '0.88rem' }}>{label}</span>}
            </div>
          ))}
        </div>

        {/* Composition Chart */}
        <div className="card">
          <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Mixture Composition</h3>
          <CompositionChart components={mixture.components} />
          {mixture.components.length === 0 && <p style={{ color: '#9ca3af' }}>No components to display.</p>}
        </div>
      </div>

      {/* Reasoning Steps */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Determination Reasoning</h3>
        {reasoning.map((step) => (
          <div key={step.step} style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span style={{
                background: '#166534', color: '#fff', borderRadius: '50%',
                width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
              }}>{step.step}</span>
              <h4 style={{ color: '#14532d' }}>{step.title}</h4>
              {step.result && (
                <span className={`badge ${step.result.includes('NOT') || step.result === 'NO_CHARACTERISTICS' ? 'badge-safe' : step.result.includes('POSSIBLY') ? 'badge-warning' : 'badge-info'}`}>
                  {step.result}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: '0.4rem' }}><em>{step.question}</em></p>
            {step.details && step.details.length > 0 && (
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                {step.details.map((d, i) => (
                  <li key={i} style={{ fontSize: '0.9rem', color: '#374151', marginBottom: 3 }}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {det.recommendations && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Recommendations</h3>
          {det.recommendations.split('\n').filter(l => l.trim()).map((line, i) => (
            <div key={i} style={{
              padding: '0.5rem 0.75rem', marginBottom: '0.4rem',
              background: i === 0 && isHazardous ? '#fef2f2' : i === 0 ? '#f0fdf4' : '#f9fafb',
              borderRadius: 6, fontSize: '0.9rem', lineHeight: 1.5,
              borderLeft: `3px solid ${i === 0 && isHazardous ? '#dc2626' : '#16a34a'}`,
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Reviewer Sign-Off */}
      {det.reviewer_name && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Reviewer Sign-Off</h3>
          <div style={{
            padding: '1rem',
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: 8,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2 }}>Reviewed By</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{det.reviewer_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 2 }}>Sign-Off Date</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {det.reviewer_sign_off_date
                    ? new Date(det.reviewer_sign_off_date + 'T00:00:00').toLocaleDateString()
                    : '—'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
              This determination was reviewed and signed off by the individual named above, who certifies that all inputs
              and outputs have been fully reviewed and accepts full responsibility for the accuracy of this determination.
            </div>
          </div>
        </div>
      )}

      {/* Journey */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Journey</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Produced Date</td>
                <td>{mixture.produced_date
                  ? new Date(mixture.produced_date + 'T00:00:00').toLocaleDateString()
                  : '—'}</td>
              </tr>
              <tr>
                <td>Profile Started</td>
                <td>{mixture.profile_started_at
                  ? new Date(mixture.profile_started_at).toLocaleString()
                  : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Components Table */}
      <div className="card">
        <h3 style={{ color: '#166534', marginBottom: '1rem' }}>Components ({mixture.components.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Chemical</th>
                <th>CAS Number</th>
                <th>EPA Code</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {mixture.components.map((comp) => (
                <tr key={comp.id}>
                  <td>{comp.component_name}</td>
                  <td style={{ color: '#6b7280', fontSize: '0.87rem' }}>{comp.chemical_detail?.cas_number || '—'}</td>
                  <td>{comp.chemical_detail?.epa_waste_code
                    ? <HazardBadge code={comp.chemical_detail.epa_waste_code} />
                    : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                  <td style={{ fontSize: '0.87rem' }}>{comp.chemical_detail?.category_display || '—'}</td>
                  <td>{comp.quantity}</td>
                  <td>{comp.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
