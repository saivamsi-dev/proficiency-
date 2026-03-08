/**
 * ComplexityMeter — 5-segment horizontal bar
 * Scores 0-100 map to segments: Very Simple → Simple → Intermediate → Advanced → Expert
 */
const levels = ['Very Simple', 'Simple', 'Intermediate', 'Advanced', 'Expert']

export default function ComplexityMeter({ score = 0 }) {
  const index = Math.min(Math.floor(score / 20), 4)
  const label = levels[index]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Writing complexity</span>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {levels.map((lvl, i) => (
          <div
            key={lvl}
            title={lvl}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= index ? '#FFFFFF' : 'var(--bg2)',
              border: `1px solid ${i <= index ? 'transparent' : 'var(--border)'}`,
              transition: 'background 0.4s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}
