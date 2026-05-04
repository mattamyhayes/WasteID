const HAZARD_META = {
  D001: { label: 'D001 Ignitable', color: '#f97316', bg: '#fff7ed', icon: '🔥' },
  D002: { label: 'D002 Corrosive', color: '#dc2626', bg: '#fef2f2', icon: '⚗️' },
  D003: { label: 'D003 Reactive', color: '#7c3aed', bg: '#f5f3ff', icon: '💥' },
  D004: { label: 'D004 Arsenic', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D005: { label: 'D005 Barium', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D006: { label: 'D006 Cadmium', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D007: { label: 'D007 Chromium', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D008: { label: 'D008 Lead', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D009: { label: 'D009 Mercury', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D010: { label: 'D010 Selenium', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
  D011: { label: 'D011 Silver', color: '#166534', bg: '#f0fdf4', icon: '☠️' },
}

function defaultMeta(code) {
  if (code.startsWith('D')) return { label: code + ' Toxic', color: '#166534', bg: '#f0fdf4', icon: '☠️' }
  if (code.startsWith('P')) return { label: code + ' Acutely Hazardous', color: '#b91c1c', bg: '#fef2f2', icon: '⚠️' }
  if (code.startsWith('U')) return { label: code + ' Toxic Waste', color: '#92400e', bg: '#fffbeb', icon: '⚠️' }
  if (code.startsWith('F')) return { label: code + ' Listed Solvent', color: '#1d4ed8', bg: '#eff6ff', icon: '🧪' }
  if (code.startsWith('K')) return { label: code + ' Source-specific', color: '#5b21b6', bg: '#f5f3ff', icon: '🏭' }
  return { label: code, color: '#374151', bg: '#f9fafb', icon: '📋' }
}

export default function HazardBadge({ code }) {
  const meta = HAZARD_META[code] || defaultMeta(code)
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.25rem 0.7rem',
      borderRadius: 999,
      background: meta.bg,
      color: meta.color,
      fontWeight: 700,
      fontSize: '0.82rem',
      border: `1.5px solid ${meta.color}33`,
      margin: '2px',
    }}>
      {meta.icon} {meta.label}
    </span>
  )
}
