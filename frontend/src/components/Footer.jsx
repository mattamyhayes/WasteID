export default function Footer() {
  return (
    <footer
      style={{
        background: '#14532d',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        padding: '1rem 1.5rem',
        fontSize: '0.85rem',
      }}
    >
      © {new Date().getFullYear()} WasteID LLC. All rights reserved.
    </footer>
  )
}
