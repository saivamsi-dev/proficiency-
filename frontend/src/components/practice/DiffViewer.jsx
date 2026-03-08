/**
 * DiffViewer — side-by-side or unified diff
 * Shows original text vs corrected text with highlights
 */
export default function DiffViewer({ original, corrected }) {
  if (!original || !corrected) return null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderBottom: '1px solid var(--border)',
      }}>
        {['Original', 'Corrected'].map((label, i) => (
          <div key={label} style={{
            padding: '10px 16px',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text3)',
            borderLeft: i === 1 ? '1px solid var(--border)' : 'none',
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Original */}
        <div style={{
          padding: '16px',
          fontFamily: '"JetBrains Mono", "Geist Mono", monospace',
          fontSize: 13, lineHeight: 1.8,
          color: 'var(--text2)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {original}
        </div>

        {/* Corrected */}
        <div style={{
          padding: '16px',
          borderLeft: '1px solid var(--border)',
          fontFamily: '"JetBrains Mono", "Geist Mono", monospace',
          fontSize: 13, lineHeight: 1.8,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {corrected}
        </div>
      </div>
    </div>
  )
}
