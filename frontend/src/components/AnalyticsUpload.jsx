import { useState, useRef } from 'react'
import { validateFile } from '../lib/documentStore'
import { profileDocuments } from '../api/client'
import { analyzeLabResults, parseLabReportText, parseResultValue, convertToPpm, getEffectiveThreshold } from '../lib/analyticsAnalysis'
import localChemicals from '../data/chemicals.json'

/**
 * AnalyticsUpload – Enhanced upload component for the Analytics (Lab Results) section.
 *
 * Before uploading, the user must answer:
 *   1. Are the results based on Totals or TCLP testing?
 *   2. Are the results in ppm (mg/L) or ppb?
 *
 * After upload, the component displays analysis of detected chemicals against
 * EPA 40 CFR 261 thresholds and indicates reportable results.
 */
export default function AnalyticsUpload({ profileId, onBeforeUpload, onUploaded, components = [] }) {
  const [testType, setTestType] = useState('')   // 'totals' or 'tclp'
  const [units, setUnits] = useState('')         // 'ppm' or 'ppb'
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [showQuestions, setShowQuestions] = useState(true)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    setError('')
    setSuccess('')
    const selected = e.target.files?.[0] || null
    if (!selected) {
      setFile(null)
      return
    }
    const validation = validateFile(selected)
    if (!validation.valid) {
      setError(validation.reason)
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(selected)
  }

  const handleUpload = async () => {
    // Validate pre-upload questions
    if (!testType) {
      setError('Please select whether results are based on Totals or TCLP testing.')
      return
    }
    if (!units) {
      setError('Please select whether results are in ppm (mg/L) or ppb.')
      return
    }
    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // Auto-save profile if needed
      let resolvedProfileId = profileId
      if (!resolvedProfileId && onBeforeUpload) {
        resolvedProfileId = await onBeforeUpload()
      }
      if (!resolvedProfileId) {
        setError('Failed to auto-save profile before upload. Please ensure required fields are valid and try again.')
        setUploading(false)
        return
      }

      const shortName = file.name.replace(/\.[^.]+$/, '') || 'Analytical Document'
      await profileDocuments.upload(resolvedProfileId, 'A', shortName, file)

      // Try to read and analyze the file content
      let analysis = null
      try {
        const text = await readFileAsText(file)
        if (text) {
          const parsedResults = parseLabReportText(text)
          if (parsedResults.length > 0) {
            analysis = analyzeLabResults(parsedResults, localChemicals, testType, units, components)
          } else {
            // File uploaded but no parseable results found
            analysis = {
              analyzedResults: [],
              reportableResults: [],
              ndResults: [],
              noMatchResults: [],
              summary: { total: 0, nd: 0, reportable: 0, belowThreshold: 0, noMatch: 0 },
              notice: 'No chemical results could be automatically parsed from this file. The document has been uploaded and attached to the profile for manual review.',
            }
          }
        }
      } catch {
        // File might not be text-readable (e.g. scanned PDF) – that's OK
      }

      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSuccess(`✓ "${shortName}" uploaded successfully and attached to this profile.`)
      setAnalysisResults(analysis)
      if (onUploaded) onUploaded()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to upload document. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const questionsAnswered = testType && units

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ marginBottom: '0.75rem', color: '#166534' }}>Analytics (Lab Results) Upload</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Upload analytical lab results for this profile. Results are saved only to this profile and compared against EPA 40 CFR 261 thresholds.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#b91c1c', fontSize: '0.88rem' }}>
          ⚠ {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: '#166534', fontSize: '0.88rem' }}>
          {success}
        </div>
      )}

      {/* Pre-upload Questions (A) */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.95rem', color: '#1e3a5f', marginBottom: '0.75rem' }}>
          📋 Pre-Upload Questions (Required)
        </h3>

        {/* Question 1: Totals or TCLP */}
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
            1. Are the results based on Totals or TCLP testing? *
          </label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="radio"
                name="testType"
                value="totals"
                checked={testType === 'totals'}
                onChange={() => setTestType('totals')}
              />
              Totals
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="radio"
                name="testType"
                value="tclp"
                checked={testType === 'tclp'}
                onChange={() => setTestType('tclp')}
              />
              TCLP
            </label>
          </div>
          {testType === 'totals' && (
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
              Rule of 20 will be applied: Totals threshold = TCLP regulatory level × 20
            </p>
          )}
          {testType === 'tclp' && (
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
              Results will be compared directly against TCLP regulatory levels.
            </p>
          )}
        </div>

        {/* Question 2: ppm or ppb */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
            2. Are the results in ppm (mg/L) or ppb? *
          </label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="radio"
                name="units"
                value="ppm"
                checked={units === 'ppm'}
                onChange={() => setUnits('ppm')}
              />
              ppm (mg/L)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="radio"
                name="units"
                value="ppb"
                checked={units === 'ppb'}
                onChange={() => setUnits('ppb')}
              />
              ppb (µg/L)
            </label>
          </div>
          {units === 'ppb' && (
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
              Results will be converted to ppm (÷1000) for EPA threshold comparison.
            </p>
          )}
        </div>
      </div>

      {/* File Upload */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 180 }}>
          <label>Lab Results File *</label>
          <input
            ref={fileInputRef}
            type="file"
            className="form-control"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.tif,.tiff,.csv,.txt,.rtf"
          />
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file || !questionsAnswered}
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.9rem' }}
          title={!questionsAnswered ? 'Please answer the pre-upload questions first' : ''}
        >
          {uploading ? 'Uploading…' : '⬆ Upload & Analyze'}
        </button>
        {!questionsAnswered && file && (
          <small style={{ color: '#b91c1c' }}>
            Please answer both questions above before uploading.
          </small>
        )}
        <small style={{ color: '#6b7280' }}>
          Max file size: 25 MB. Text-based files (CSV, TXT) provide best auto-analysis.
        </small>
      </div>

      {/* Analysis Results Display */}
      {analysisResults && <AnalysisResultsDisplay results={analysisResults} testType={testType} units={units} />}
    </div>
  )
}

/**
 * Display component for lab result analysis.
 */
function AnalysisResultsDisplay({ results, testType, units }) {
  if (!results) return null

  const { analyzedResults, reportableResults, ndResults, noMatchResults, summary, notice } = results

  return (
    <div style={{ marginTop: '1.25rem', borderTop: '2px solid #e5e7eb', paddingTop: '1rem' }}>
      <h3 style={{ color: '#1e3a5f', marginBottom: '0.75rem', fontSize: '1rem' }}>
        🔬 Analysis Results
      </h3>

      {/* Notice for unparseable files */}
      {notice && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '0.6rem 0.9rem', marginBottom: '0.75rem', color: '#92400e', fontSize: '0.88rem' }}>
          ℹ {notice}
        </div>
      )}

      {/* Summary */}
      {summary.total > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <SummaryBadge label="Total Analytes" count={summary.total} color="#374151" bg="#f3f4f6" />
          <SummaryBadge label="Non-Detect" count={summary.nd} color="#166534" bg="#dcfce7" />
          <SummaryBadge label="Below Threshold" count={summary.belowThreshold} color="#1e40af" bg="#dbeafe" />
          <SummaryBadge label="REPORTABLE" count={summary.reportable} color="#991b1b" bg="#fef2f2" border="#fca5a5" />
          {summary.noMatch > 0 && (
            <SummaryBadge label="No EPA Match" count={summary.noMatch} color="#92400e" bg="#fffbeb" />
          )}
        </div>
      )}

      {/* Test parameters */}
      <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        Test Type: <strong>{testType === 'totals' ? 'Totals (Rule of 20 applied)' : 'TCLP (direct comparison)'}</strong>
        {' · '}
        Units: <strong>{units === 'ppm' ? 'ppm (mg/L)' : 'ppb (converted to ppm)'}</strong>
      </div>

      {/* Reportable Results - shown prominently */}
      {reportableResults.length > 0 && (
        <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem' }}>
          <h4 style={{ color: '#991b1b', fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            ⚠ Reportable Results ({reportableResults.length})
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#7f1d1d', marginBottom: '0.5rem' }}>
            The following chemicals have detected levels at or above EPA regulatory thresholds per 40 CFR 261:
          </p>
          {reportableResults.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.4rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#991b1b' }}>
                {r.chemicalName} {r.casNumber && <span style={{ fontWeight: 400, color: '#6b7280' }}>({r.casNumber})</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: '0.2rem' }}>
                Detected: <strong>{r.detectedValuePpm.toFixed(4)} mg/L</strong>
                {' · '}Threshold: <strong>{r.threshold} mg/L</strong>
                {' · '}EPA Code: <strong style={{ color: '#991b1b' }}>{r.epaWasteCode}</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#1e40af', marginTop: '0.2rem', fontStyle: 'italic' }}>
                → {r.actionMessage}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ND Results */}
      {ndResults.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#166534' }}>
              ✓ Non-Detect Results ({ndResults.length}) – No action required
            </summary>
            <div style={{ paddingLeft: '1rem', marginTop: '0.35rem' }}>
              {ndResults.map((r, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.15rem' }}>
                  {r.chemicalName} {r.casNumber && `(${r.casNumber})`} — ND
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Below threshold results */}
      {analyzedResults.filter(r => r.status === 'BELOW_THRESHOLD').length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e40af' }}>
              ✓ Below Threshold ({analyzedResults.filter(r => r.status === 'BELOW_THRESHOLD').length})
            </summary>
            <div style={{ paddingLeft: '1rem', marginTop: '0.35rem' }}>
              {analyzedResults.filter(r => r.status === 'BELOW_THRESHOLD').map((r, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.15rem' }}>
                  {r.chemicalName} — {r.detectedValuePpm?.toFixed(4)} mg/L (threshold: {r.threshold} mg/L)
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* No Match results */}
      {noMatchResults.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#92400e' }}>
              ⚠ No EPA Database Match ({noMatchResults.length}) – Manual review recommended
            </summary>
            <div style={{ paddingLeft: '1rem', marginTop: '0.35rem' }}>
              {noMatchResults.map((r, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.15rem' }}>
                  {r.chemicalName} {r.casNumber && `(${r.casNumber})`} — {r.detectedValuePpm?.toFixed(4)} mg/L detected
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

function SummaryBadge({ label, count, color, bg, border }) {
  return (
    <span style={{
      background: bg,
      color,
      border: `1px solid ${border || bg}`,
      borderRadius: 6,
      padding: '0.3rem 0.6rem',
      fontSize: '0.82rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
    }}>
      <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{count}</span> {label}
    </span>
  )
}

/**
 * Read a File object as text content.
 * Works for CSV, TXT, and other text-based formats.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const mime = file.type || ''
    const name = file.name || ''
    // Only attempt text parsing for text-based files
    const isTextBased = mime.startsWith('text/') ||
      mime === 'application/csv' ||
      /\.(csv|txt|tsv)$/i.test(name)
    if (!isTextBased) {
      resolve(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
