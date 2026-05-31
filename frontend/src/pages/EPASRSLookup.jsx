import { useState } from 'react'
import axios from 'axios'
import { isStaticMode } from '../api/client'

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

const SEARCH_TYPES = [
  { key: 'name', label: 'By Name', description: 'Search by substance or synonym name', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
  )},
  { key: 'cas', label: 'By CAS Number', description: 'Search by CAS Registry Number (e.g. 67-64-1)', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/><circle cx="18" cy="18" r="3"/></svg>
  )},
  { key: 'id', label: 'By SRS ID', description: 'Search by EPA internal Substance ID', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>
  )},
]

const LIST_ACRONYMS = [
  { value: '', label: 'All Lists' },
  { value: 'TSCA', label: 'TSCA' },
  { value: 'RCRA', label: 'RCRA' },
  { value: 'CERCLA', label: 'CERCLA' },
  { value: 'CAA', label: 'CAA (Clean Air Act)' },
  { value: 'CWA', label: 'CWA (Clean Water Act)' },
  { value: 'SDWA', label: 'SDWA (Safe Drinking Water Act)' },
  { value: 'EPCRA', label: 'EPCRA' },
]

const EPA_SRS_BASE_URL = 'https://cdxapps.epa.gov/oms-substance-registry-services/rest-api'

export default function EPASRSLookup() {
  const [activeType, setActiveType] = useState('name')
  const [query, setQuery] = useState('')
  const [listAcronym, setListAcronym] = useState('')
  const [excludeSynonyms, setExcludeSynonyms] = useState(false)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) {
      setError('Please enter a search value.')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)

    try {
      let data
      if (isStaticMode) {
        // In static mode, call EPA SRS directly from the browser
        const url = buildEpaSrsUrl(activeType, query.trim(), listAcronym, excludeSynonyms)
        const response = await axios.get(url)
        const responseData = response.data
        if (Array.isArray(responseData)) {
          data = { results: responseData, count: responseData.length }
        } else if (responseData && typeof responseData === 'object') {
          data = { results: [responseData], count: 1 }
        } else {
          data = { results: [], count: 0 }
        }
      } else {
        // Use backend proxy
        const apiUrl = `${import.meta.env.VITE_API_URL}/api/epa-srs-lookup/`
        const response = await axios.get(apiUrl, {
          params: {
            search_type: activeType,
            query: query.trim(),
            list_acronym: listAcronym,
            exclude_synonyms: excludeSynonyms,
          },
        })
        data = response.data
      }

      if (data.error) {
        setError(data.error)
      } else {
        setResults(data)
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else if (err.message) {
        setError(`Request failed: ${err.message}`)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        🔬 EPA SRS Lookup
      </h1>
      <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Search the EPA Substance Registry Services (SRS) database for chemical substance information,
        regulatory lists, and identifiers.
      </p>

      <div className="profile-sidebar-layout">
        {/* Left sidebar navigation */}
        <div className="profile-sidebar">
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Search Method
          </div>
          {SEARCH_TYPES.map(item => (
            <button
              key={item.key}
              className={`profile-sidebar-btn${activeType === item.key ? ' active' : ''}`}
              onClick={() => { setActiveType(item.key); setResults(null); setError('') }}
            >
              <span style={SIDEBAR_ICON_STYLE}><span style={SIDEBAR_SVG_STYLE}>{item.icon}</span></span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="profile-main-content">
          <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                {SEARCH_TYPES.find(s => s.key === activeType)?.label}
              </h3>
              <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1rem' }}>
                {SEARCH_TYPES.find(s => s.key === activeType)?.description}
              </p>

              {/* Query input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                  {activeType === 'name' ? 'Substance Name' : activeType === 'cas' ? 'CAS Number' : 'SRS Substance ID'}
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    activeType === 'name' ? 'e.g. Acetone, Benzene, Toluene' :
                    activeType === 'cas' ? 'e.g. 67-64-1' :
                    'e.g. 2034'
                  }
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #ccc',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Additional options for name/cas searches */}
              {(activeType === 'name' || activeType === 'cas') && (
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                      EPA List Filter
                    </label>
                    <select
                      value={listAcronym}
                      onChange={(e) => setListAcronym(e.target.value)}
                      style={{
                        padding: '0.5rem 0.7rem',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                      }}
                    >
                      {LIST_ACRONYMS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '1.3rem' }}>
                    <input
                      type="checkbox"
                      id="excludeSynonyms"
                      checked={excludeSynonyms}
                      onChange={(e) => setExcludeSynonyms(e.target.checked)}
                    />
                    <label htmlFor="excludeSynonyms" style={{ fontSize: '0.9rem' }}>
                      Exclude Synonyms
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#166534',
                  color: '#fff',
                  border: 'none',
                  padding: '0.6rem 1.5rem',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Searching...' : 'Search EPA SRS'}
              </button>
            </div>
          </form>

          {/* Error display */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '1rem',
              color: '#991b1b',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Results display */}
          {results && (
            <div>
              <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                Found <strong>{results.count}</strong> result{results.count !== 1 ? 's' : ''}
              </div>

              {results.results && results.results.length > 0 ? (
                results.results.map((substance, idx) => (
                  <SubstanceCard key={idx} substance={substance} />
                ))
              ) : (
                <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No results found for your query.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Categorized characteristic labels
const PHYSICAL_CHARACTERISTICS = [
  'Color',
  'pH',
  'Odor',
  'Phases/layers',
  'Phases/Layers',
]

const CHEMICAL_CHARACTERISTICS = [
  'BTU',
  'Value Specific Gravity (lbs/gal)',
  'Specific Gravity',
  'Specific Gravity (lbs/gal)',
]

const OTHER_CHARACTERISTICS = [
  'Pyrophoric',
  'Polymerizable (Inhibited)',
  'Dioxins',
  'Shock Sensitive',
  'Polymerizable',
  'Organic Peroxides',
  'Pesticides/Herbicides',
  'Explosive',
  'Oxidizer',
  'Asbestos Friable',
  'Furans',
  'Reactive',
  'Cyanides',
  'Radioactive',
  'Water Reactive',
  'Asbestos Non-Friable',
  'NORM',
  'Thermally Unstable',
  'Air Reactive',
  'Metal Fines',
  'Biohazard/Infectious Waste',
  'Reactive Sulfides',
]

function categorizeCharacteristics(substance) {
  // Gather characteristics from the substance data
  const rawCharacteristics = substance.characteristics || []
  const physical = []
  const chemical = []
  const other = []

  const allItems = Array.isArray(rawCharacteristics) ? rawCharacteristics : []

  allItems.forEach(item => {
    const label = typeof item === 'string' ? item : (item.name || item.characteristicName || '')
    const value = typeof item === 'object' ? (item.value || item.characteristicValue || '') : ''
    const entry = { label, value }

    const labelLower = label.toLowerCase()

    if (PHYSICAL_CHARACTERISTICS.some(p => labelLower.includes(p.toLowerCase()))) {
      physical.push(entry)
    } else if (CHEMICAL_CHARACTERISTICS.some(c => labelLower.includes(c.toLowerCase()))) {
      chemical.push(entry)
    } else if (OTHER_CHARACTERISTICS.some(o => labelLower.includes(o.toLowerCase()))) {
      other.push(entry)
    } else {
      // Default uncategorized items go to other
      other.push(entry)
    }
  })

  return { physical, chemical, other }
}

function extractWasteCodes(substance) {
  // Extract waste codes from lists or classifications
  const lists = substance.lists || substance.listDetails || []
  const codes = []

  if (Array.isArray(lists)) {
    lists.forEach(list => {
      const acronym = list.listAcronym || list.name || ''
      const listName = list.listName || ''
      // Look for RCRA waste codes (D, F, K, P, U codes)
      if (/^[DFKPU]\d{3}/i.test(acronym) || /^[DFKPU]\d{3}/i.test(listName)) {
        codes.push(acronym || listName)
      }
      // Also check if the list has associated waste codes
      if (list.supplementalDetails) {
        const details = Array.isArray(list.supplementalDetails) ? list.supplementalDetails : [list.supplementalDetails]
        details.forEach(d => {
          const code = d.wasteCode || d.code || ''
          if (code) codes.push(code)
        })
      }
    })
  }

  // Also check for waste codes in classifications
  const classifications = substance.classifications || []
  if (Array.isArray(classifications)) {
    classifications.forEach(cls => {
      const name = typeof cls === 'string' ? cls : (cls.name || cls.classificationName || '')
      if (/^[DFKPU]\d{3}/i.test(name)) {
        codes.push(name)
      }
    })
  }

  return [...new Set(codes)]
}

function CharacteristicsSection({ title, icon, items, color, bgColor, borderColor }) {
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <h5 style={{
        fontSize: '0.85rem',
        fontWeight: 600,
        marginBottom: '0.4rem',
        color: color,
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}>
        {icon} {title}
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 4,
              padding: '0.25rem 0.6rem',
              fontSize: '0.8rem',
              color: color,
            }}
          >
            {item.label}{item.value ? `: ${item.value}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function SubstanceCard({ substance }) {
  // Extract key fields (EPA SRS response structure)
  const name = substance.systematicName || substance.epaName || substance.currentCasNumber || 'Unknown Substance'

  // Lists this substance appears on
  const lists = substance.lists || substance.listDetails || []
  // Synonyms
  const synonyms = substance.synonyms || substance.synonymDetails || []

  // All initial attributes to display
  const attributes = [
    { label: 'Substance Key', value: substance.subsKey },
    { label: 'Internal Tracking Number', value: substance.internalTrackingNumber },
    { label: 'Systematic Name', value: substance.systematicName },
    { label: 'EPA Identification Number', value: substance.epaIdentificationNumber },
    { label: 'Current CAS Number', value: substance.currentCasNumber || substance.casNumber },
    { label: 'Current Taxonomic Serial Number', value: substance.currentTaxonomicSerialNumber },
    { label: 'EPA Name', value: substance.epaName },
    { label: 'Substance Type', value: substance.substanceType },
    { label: 'Category Class', value: substance.categoryClass },
    { label: 'Kingdom Code', value: substance.kingdomCode },
    { label: 'IUPAC Name', value: substance.iupacName },
    { label: 'PubChem ID', value: substance.pubChemId },
    { label: 'DTX SID', value: substance.dtxsid },
    { label: 'CompTox Update Date', value: substance.comptoxUpdateDate },
    { label: 'Molecular Weight', value: substance.molecularWeight },
    { label: 'Molecular Formula', value: substance.molecularFormula },
    { label: 'InChI Notation', value: substance.inchiNotation },
    { label: 'SMILES Notation', value: substance.smilesNotation },
  ]

  const classifications = substance.classifications ? substance.classifications.filter(Boolean) : []
  if (classifications.length > 0) {
    attributes.push({ label: 'Classifications', value: classifications.join(', ') })
  }

  // Categorize characteristics
  const { physical, chemical, other } = categorizeCharacteristics(substance)
  const hasCharacteristics = physical.length > 0 || chemical.length > 0 || other.length > 0

  // Extract waste codes
  const wasteCodes = extractWasteCodes(substance)

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: '1.2rem',
      marginBottom: '1rem',
    }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.8rem', color: '#1a1a1a' }}>
        {name}
      </h3>

      {/* All attributes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.3rem 1rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
        {attributes.map((attr, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span style={{ fontWeight: 600, color: '#333' }}>{attr.label}:</span>
            <span style={{ color: '#555' }}>{attr.value != null ? attr.value : '—'}</span>
          </div>
        ))}
      </div>

      {/* Categorized Characteristics */}
      {hasCharacteristics && (
        <div style={{
          background: '#fafafa',
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.8rem', color: '#1a1a1a' }}>
            🧪 Characteristics
          </h4>

          <CharacteristicsSection
            title="Physical"
            icon="⚖️"
            items={physical}
            color="#4338ca"
            bgColor="#eef2ff"
            borderColor="#c7d2fe"
          />

          <CharacteristicsSection
            title="Chemical"
            icon="🔬"
            items={chemical}
            color="#b45309"
            bgColor="#fffbeb"
            borderColor="#fde68a"
          />

          <CharacteristicsSection
            title="Other"
            icon="⚠️"
            items={other}
            color="#dc2626"
            bgColor="#fef2f2"
            borderColor="#fecaca"
          />
        </div>
      )}

      {/* Waste Codes */}
      {wasteCodes.length > 0 && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#166534' }}>
            🏷️ Related Waste Codes
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {wasteCodes.map((code, i) => (
              <span
                key={i}
                style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: 4,
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#14532d',
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lists */}
      {lists.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>EPA Lists</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(Array.isArray(lists) ? lists : []).map((list, i) => (
              <span
                key={i}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 4,
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.8rem',
                  color: '#1d4ed8',
                }}
              >
                {list.listAcronym || list.name || list}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Synonyms */}
      {synonyms.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Synonyms</h4>
          <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.6 }}>
            {(Array.isArray(synonyms) ? synonyms.slice(0, 20) : []).map((syn, i) => (
              <span key={i}>
                {syn.synonymName || syn.name || syn}
                {i < Math.min(synonyms.length, 20) - 1 ? ', ' : ''}
              </span>
            ))}
            {synonyms.length > 20 && <span style={{ color: '#888' }}> ...and {synonyms.length - 20} more</span>}
          </div>
        </div>
      )}

      {/* Raw data toggle */}
      <details style={{ marginTop: '0.5rem' }}>
        <summary style={{ fontSize: '0.85rem', cursor: 'pointer', color: '#166534', fontWeight: 500 }}>
          📋 Click to see raw data
        </summary>
        <pre style={{
          background: '#f5f5f5',
          padding: '0.8rem',
          borderRadius: 6,
          fontSize: '0.75rem',
          overflow: 'auto',
          maxHeight: 300,
          marginTop: '0.5rem',
        }}>
          {JSON.stringify(substance, null, 2)}
        </pre>
      </details>
    </div>
  )
}

function buildEpaSrsUrl(searchType, query, listAcronym, excludeSynonyms) {
  let url
  const params = new URLSearchParams()

  if (searchType === 'name') {
    url = `${EPA_SRS_BASE_URL}/substances/name`
    params.set('nameList', query)
  } else if (searchType === 'cas') {
    url = `${EPA_SRS_BASE_URL}/substances/cas`
    params.set('casList', query)
  } else {
    // ID lookup uses singular /substance/{id}
    url = `${EPA_SRS_BASE_URL}/substance/${encodeURIComponent(query)}`
  }

  if ((searchType === 'name' || searchType === 'cas') && listAcronym) {
    params.set('listAcronym', listAcronym)
  }
  if ((searchType === 'name' || searchType === 'cas') && excludeSynonyms) {
    params.set('excludeSynonyms', 'true')
  }

  const paramStr = params.toString()
  return paramStr ? `${url}?${paramStr}` : url
}
