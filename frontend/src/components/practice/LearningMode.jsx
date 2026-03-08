import { motion, AnimatePresence } from 'framer-motion'

/**
 * LearningMode — expanded panel showing grammar rules per error
 * Toggled from Practice.jsx results panel
 */
export default function LearningMode({ errors = [] }) {
  const ruledErrors = errors.filter(e => e.explanation || e.rule)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Learning mode</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
          Grammar rules behind each error in this session
        </div>

        {ruledErrors.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            No detailed rules available for this submission.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ruledErrors.slice(0, 5).map((err, i) => (
              <div key={i} style={{
                borderLeft: '2px solid var(--border)',
                paddingLeft: 14,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4,
                }}>
                  {err.error_type || 'Grammar rule'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                  {err.explanation}
                </div>
                {err.rule && (
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12, color: 'var(--text2)',
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '8px 12px',
                    fontStyle: 'italic',
                  }}>
                    {err.rule}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
