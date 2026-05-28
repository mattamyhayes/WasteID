import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { mixtures } from '../api/client'
import stateRulesData from '../data/stateRules.json'

const CATEGORY_LABELS = {
  identification: '🔬 Identification',
  manifest: '📋 Manifest',
  storage: '🏗️ Storage',
  transport: '🚛 Transport',
  reporting: '📊 Reporting',
  labeling: '🏷️ Labeling',
}

const CATEGORY_COLORS = {
  identification: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  manifest: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
  storage: { bg: '#fefce8', border: '#fde68a', color: '#92400e' },
  transport: { bg: '#fdf4ff', border: '#e9d5ff', color: '#7c3aed' },
  reporting: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
  labeling: { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1' },
}

export default function StateRulesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const stateCode = searchParams.get('state') || ''
  const mixtureId = searchParams.get('mixture')
  const returnTo = searchParams.get('return') || '/profile'

  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [mixture, setMixture] = useState(null)

  // Filter rules for this state
  const stateRules = stateRulesData.filter(r => r.state_code === stateCode.toUpperCase() && r.is_active)
  const rulesWithQuestions = stateRules.filter(r => r.questions && r.questions.length > 0)

  useEffect(() => {
    if (!mixtureId) return
    async function loadMixture() {
      try {
        const res = await mixtures.get(mixtureId)
        setMixture(res.data)
      } catch { /* ignore */ }
    }
    loadMixture()
  }, [mixtureId])

  const handleAnswerChange = (ruleId, questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [ruleId]: { ...(prev[ruleId] || {}), [questionId]: value }
    }))
  }

  const allAnswered = rulesWithQuestions.every(rule =>
    rule.questions.every(q => {
      const val = answers[rule.id]?.[q.id]
      return val !== undefined && val !== ''
    })
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mixtureId) {
        await mixtures.validateStateRules(mixtureId, answers)
      }
      navigate(returnTo)
    } catch {
      navigate(returnTo)
    } finally {
      setSaving(false)
    }
  }

  const stateName = getStateName(stateCode)

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ color: '#14532d', margin: 0 }}>
          📜 State Rules — {stateName} ({stateCode.toUpperCase()})
        </h1>
        <Link to={returnTo} className="btn btn-secondary">
          ← Back to Profile
        </Link>
      </div>

      {mixture && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <strong style={{ color: '#166534' }}>Profile:</strong>{' '}
          <span style={{ color: '#374151' }}>{mixture.name}</span>
          {mixture.transaction_id && (
            <span style={{ color: '#6b7280', fontFamily: 'monospace', marginLeft: '0.75rem', fontSize: '0.85rem' }}>
              ({mixture.transaction_id})
            </span>
          )}
        </div>
      )}

      {stateRules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <p style={{ color: '#166534', fontSize: '1.1rem', fontWeight: 600 }}>
            No unique state rules apply for {stateName}.
          </p>
          <p style={{ color: '#6b7280' }}>Federal RCRA rules are sufficient for this state.</p>
        </div>
      ) : (
        <>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            {stateName} has <strong>{stateRules.length}</strong> unique state rule{stateRules.length !== 1 ? 's' : ''} that
            apply beyond federal RCRA requirements. {rulesWithQuestions.length > 0 && (
              <>Complete the required information below to satisfy state compliance.</>
            )}
          </p>

          {/* Rules grouped by category */}
          {Object.keys(CATEGORY_LABELS).map(cat => {
            const catRules = stateRules.filter(r => r.rule_category === cat)
            if (catRules.length === 0) return null
            const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.identification

            return (
              <div key={cat} className="card" style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: colors.color, marginBottom: '0.75rem', fontSize: '1rem' }}>
                  {CATEGORY_LABELS[cat]} ({catRules.length})
                </h3>
                {catRules.map(rule => (
                  <div key={rule.id} style={{
                    border: `1px solid ${colors.border}`,
                    background: colors.bg,
                    borderRadius: 8,
                    padding: '1rem',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: colors.color, fontSize: '0.85rem' }}>{rule.id}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem', marginLeft: '0.75rem' }}>{rule.rule_reference}</span>
                      </div>
                    </div>
                    <p style={{ color: '#374151', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: rule.questions.length > 0 ? '0.75rem' : 0 }}>
                      {rule.description}
                    </p>

                    {/* Questions */}
                    {rule.questions.map(q => (
                      <div key={q.id} style={{ marginTop: '0.5rem' }}>
                        <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.88rem', display: 'block', marginBottom: '0.3rem' }}>
                          {q.text}
                        </label>
                        {q.type === 'yes_no' || q.type === 'boolean' ? (
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                              <input type="radio" name={`${rule.id}_${q.id}`}
                                checked={answers[rule.id]?.[q.id] === 'yes'}
                                onChange={() => handleAnswerChange(rule.id, q.id, 'yes')} />
                              Yes
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                              <input type="radio" name={`${rule.id}_${q.id}`}
                                checked={answers[rule.id]?.[q.id] === 'no'}
                                onChange={() => handleAnswerChange(rule.id, q.id, 'no')} />
                              No
                            </label>
                          </div>
                        ) : (
                          <input className="form-control"
                            value={answers[rule.id]?.[q.id] || ''}
                            onChange={e => handleAnswerChange(rule.id, q.id, e.target.value)}
                            placeholder="Enter your response"
                            style={{ maxWidth: 500 }} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Link to={returnTo} className="btn btn-secondary">Cancel</Link>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || (rulesWithQuestions.length > 0 && !allAnswered)}>
              {saving ? 'Saving…' : '✓ Save & Return to Profile'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function getStateName(code) {
  const names = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands',
  }
  return names[code?.toUpperCase()] || code
}
