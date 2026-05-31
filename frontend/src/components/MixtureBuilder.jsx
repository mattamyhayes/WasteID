import { useState } from 'react'
import ChemicalSearch from './ChemicalSearch'

const UNITS = ['ppm', 'ppb', 'pct', 'kg', 'L', 'g', 'mL', 'lb', 'gal']
const UNIT_LABELS = {
  ppm: 'ppm (mg/L)', ppb: 'ppb', pct: '%',
  kg: 'kg', L: 'L', g: 'g', mL: 'mL', lb: 'lb', gal: 'gal'
}

const CATEGORY_LABELS = {
  P: 'P-list',
  U: 'U-list',
  F: 'F-list',
  K: 'K-list',
  D_CHAR: 'D-code',
  OTHER: 'Other',
}

const CHARACTERISTIC_FLAGS = [
  ['is_ignitable', 'Ignitable'],
  ['is_corrosive', 'Corrosive'],
  ['is_reactive', 'Reactive'],
  ['is_toxic', 'Toxic'],
  ['is_acutely_hazardous', 'Acutely Hazardous'],
]

function getCharacteristics(chem) {
  if (!chem) return []
  return CHARACTERISTIC_FLAGS.filter(([key]) => !!chem[key]).map(([, label]) => label)
}

function getCategoryDisplay(chem) {
  if (!chem) return ''
  return chem.category_display || CATEGORY_LABELS[chem.category] || chem.category || ''
}

/**
 * Build/edit mixture components.
 * Set `editable` to true when components should support inline quantity/unit edits.
 * Components may have `_source` field: 'imported' | 'manual' | 'modified'
 * @param {Array} components
 * @param {Function} onChange
 * @param {boolean} [editable=false]
 */
export default function MixtureBuilder({ components, onChange, editable = false }) {
  const [qtyMin, setQtyMin] = useState('')
  const [qtyMax, setQtyMax] = useState('')
  const [unit, setUnit] = useState('ppm')
  const [customName, setCustomName] = useState('')
  const [selectedChem, setSelectedChem] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editQtyMin, setEditQtyMin] = useState('')
  const [editQtyMax, setEditQtyMax] = useState('')
  const [editUnit, setEditUnit] = useState('ppm')

  const handleAdd = () => {
    if (!qtyMin || isNaN(parseFloat(qtyMin))) return
    if (!selectedChem && !customName.trim()) return

    const comp = {
      chemical: selectedChem ? selectedChem.id : null,
      custom_name: selectedChem ? '' : customName.trim(),
      quantity_min: parseFloat(qtyMin),
      quantity_max: qtyMax && !isNaN(parseFloat(qtyMax)) ? parseFloat(qtyMax) : null,
      quantity: parseFloat(qtyMin),
      unit,
      _displayName: selectedChem ? selectedChem.name : customName.trim(),
      _epaCode: selectedChem ? selectedChem.epa_waste_code : '',
      _casNumber: selectedChem ? (selectedChem.cas_number || '') : '',
      _categoryDisplay: selectedChem ? getCategoryDisplay(selectedChem) : '',
      _characteristics: selectedChem ? getCharacteristics(selectedChem) : [],
      _source: 'manual',
    }
    onChange([...components, comp])
    setSelectedChem(null)
    setCustomName('')
    setQtyMin('')
    setQtyMax('')
    setUnit('ppm')
  }

  const handleRemove = (index) => {
    onChange(components.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const handleStartEdit = (index) => {
    setEditingIndex(index)
    setEditQtyMin(String(components[index].quantity_min ?? components[index].quantity ?? ''))
    setEditQtyMax(String(components[index].quantity_max ?? ''))
    setEditUnit(components[index].unit)
  }

  const handleSaveEdit = (index) => {
    if (!editQtyMin || isNaN(parseFloat(editQtyMin))) return
    const updated = components.map((comp, i) => {
      if (i !== index) return comp
      const newComp = {
        ...comp,
        quantity_min: parseFloat(editQtyMin),
        quantity_max: editQtyMax && !isNaN(parseFloat(editQtyMax)) ? parseFloat(editQtyMax) : null,
        quantity: parseFloat(editQtyMin),
        unit: editUnit,
      }
      // If an imported row is edited, mark it as modified
      if (comp._source === 'imported') {
        newComp._source = 'modified'
      }
      return newComp
    })
    onChange(updated)
    setEditingIndex(null)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
  }

  return (
    <div>
      {components.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Chemical</th>
                <th>CAS #</th>
                <th>EPA Code</th>
                <th>Characteristic Category</th>
                <th>Characteristic</th>
                <th>Quantity (Min)</th>
                <th>Quantity (Max)</th>
                <th>Unit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp, i) => {
                const casNumber = comp._casNumber || comp.component_cas_number || comp.cas_number || comp.chemical_detail?.cas_number || ''
                return (
                <tr key={i}>
                  <td style={{ width: 32, textAlign: 'center', fontSize: '1rem' }} title={
                    comp._source === 'imported' ? 'Imported from document'
                      : comp._source === 'modified' ? 'Imported (modified)'
                      : 'Manually entered'
                  }>
                    <span role="img" aria-label={
                      comp._source === 'imported' ? 'Imported from document'
                        : comp._source === 'modified' ? 'Imported then modified'
                        : 'Manually entered'
                    }>
                      {comp._source === 'imported' ? '📥'
                        : comp._source === 'modified' ? '✏️'
                        : '✍'}
                    </span>
                  </td>
                  <td>{comp._displayName || comp.custom_name || `Component ${i + 1}`}</td>
                  <td>
                    {casNumber
                      ? casNumber
                      : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td>
                    {comp._epaCode
                      ? <span className="badge badge-warning">{comp._epaCode}</span>
                      : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td>
                    {(comp._categoryDisplay || getCategoryDisplay(comp.chemical_detail)) || <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td>
                    {(comp._characteristics?.length > 0 ? comp._characteristics : getCharacteristics(comp.chemical_detail)).join(', ') || <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td>
                    {editable && editingIndex === i
                      ? <input className="form-control" type="number" min="0" step="any"
                          value={editQtyMin} onChange={e => setEditQtyMin(e.target.value)}
                          style={{ width: 80, padding: '0.2rem 0.4rem', fontSize: '0.85rem' }} />
                      : (comp.quantity_min ?? comp.quantity ?? '')}
                  </td>
                  <td>
                    {editable && editingIndex === i
                      ? <input className="form-control" type="number" min="0" step="any"
                          value={editQtyMax} onChange={e => setEditQtyMax(e.target.value)}
                          placeholder="—"
                          style={{ width: 80, padding: '0.2rem 0.4rem', fontSize: '0.85rem' }} />
                      : (comp.quantity_max != null ? comp.quantity_max : <span style={{ color: '#9ca3af' }}>—</span>)}
                  </td>
                  <td>
                    {editable && editingIndex === i
                      ? <select className="form-control" value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          style={{ width: 80, padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}>
                          {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                        </select>
                      : UNIT_LABELS[comp.unit] || comp.unit}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {editable && editingIndex === i ? (
                      <>
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', marginRight: 4 }}
                          onClick={() => handleSaveEdit(i)}>✓</button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', marginRight: 4 }}
                          onClick={handleCancelEdit}>✕</button>
                      </>
                    ) : (
                      <>
                        {editable && (
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', marginRight: 4 }}
                            onClick={() => handleStartEdit(i)}>✎</button>
                        )}
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => handleRemove(i)}>✕</button>
                      </>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '1rem', border: '1.5px solid #e5e7eb' }}>
        <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#166534' }}>Add Chemical</p>

        <div className="form-group">
          <label>Search Chemical Database</label>
          <ChemicalSearch onSelect={(chem) => { setSelectedChem(chem); setCustomName('') }} />
          {selectedChem && (
            <div style={{ marginTop: '0.4rem', padding: '0.4rem 0.75rem', background: '#f0fdf4', borderRadius: 6, fontSize: '0.88rem' }}>
              ✅ <strong>{selectedChem.name}</strong>
              {selectedChem.epa_waste_code && <> · EPA: <strong>{selectedChem.epa_waste_code}</strong></>}
              <button onClick={() => setSelectedChem(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Clear</button>
            </div>
          )}
        </div>

        {!selectedChem && (
          <div className="form-group">
            <label>— or enter custom chemical name —</label>
            <input className="form-control" value={customName} onChange={e => setCustomName(e.target.value)}
              placeholder="e.g., Waste Solvent Constituent" />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Quantity (Min)</label>
            <input className="form-control" type="number" min="0" step="any"
              value={qtyMin} onChange={e => setQtyMin(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Quantity (Max)</label>
            <input className="form-control" type="number" min="0" step="any"
              value={qtyMax} onChange={e => setQtyMax(e.target.value)} placeholder="Optional" />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Unit</label>
            <select className="form-control" value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
            </select>
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={handleAdd}
          disabled={(!selectedChem && !customName.trim()) || !qtyMin}
        >
          + Add to Constituents
        </button>
      </div>
    </div>
  )
}
