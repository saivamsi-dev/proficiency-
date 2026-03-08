import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import client from '../api/client'
import { ChevronRight, Loader2, X, Upload, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import DiffViewer from '../components/practice/DiffViewer'
import LearningMode from '../components/practice/LearningMode'
import ComplexityMeter from '../components/practice/ComplexityMeter'

/* ── Severity config ── */
const severityConfig = {
  critical: { color: 'var(--red)', label: 'Critical', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  moderate: { color: 'var(--yellow)', label: 'Moderate', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
  low: { color: 'var(--green)', label: 'Low', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
}

/* ── Error card ── */
function ErrorCard({ error, index }) {
  const [expanded, setExpanded] = useState(false)
  const sev = severityConfig[error.severity?.toLowerCase()] || severityConfig.low

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* Severity strip */}
      <div style={{ width: 3, background: sev.color, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: '12px 16px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: sev.color,
            background: sev.bg, border: `1px solid ${sev.border}`,
            borderRadius: 999, padding: '2px 8px',
          }}>
            {sev.label}
          </span>
          {error.error_type && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text3)', border: '1px solid var(--border)',
              borderRadius: 999, padding: '2px 8px',
            }}>
              {error.error_type}
            </span>
          )}
        </div>

        {/* Error → Correction */}
        <div style={{
          fontFamily: '"JetBrains Mono", "Geist Mono", monospace',
          fontSize: 13, lineHeight: 1.6, marginBottom: 8,
        }}>
          <span style={{ color: 'var(--red)', textDecoration: 'line-through', background: 'rgba(239,68,68,0.08)', padding: '1px 4px', borderRadius: 3 }}>
            {error.original || error.error_text}
          </span>
          <span style={{ color: 'var(--text3)', margin: '0 8px' }}>→</span>
          <span style={{ color: 'var(--green)', background: 'rgba(34,197,94,0.08)', padding: '1px 4px', borderRadius: 3 }}>
            {error.corrected || error.correction}
          </span>
        </div>

        {/* Explanation */}
        {error.explanation && (
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 8 }}>
            {error.explanation}
          </p>
        )}

        {/* Learn more toggle */}
        {error.rule && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--text)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Learn more {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        <AnimatePresence initial={false}>
          {expanded && error.rule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
                fontStyle: 'italic',
              }}>
                {error.rule}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Shortcut row ── */
function ShortcutRow({ keys, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {keys.map(k => (
          <kbd key={k} style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, fontWeight: 500,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '2px 6px', color: 'var(--text2)',
          }}>{k}</kbd>
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>→ {action}</span>
    </div>
  )
}

/* ── Main Practice ── */
export default function Practice() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [learningOpen, setLearningOpen] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await client.post('/feedback/correct', { text })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [text])

  // Ctrl+Enter to submit
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (text.trim() && !loading) handleSubmit()
    }
    if (e.key === 'Escape' && result) {
      setResult(null)
    }
  }, [text, loading, result, handleSubmit])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function handleImageSelect(file) {
    if (!file) return
    setImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) handleImageSelect(file)
  }

  function handleDragOver(e) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave() { setDragOver(false) }

  async function handleImageUpload() {
    if (!image) return
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', image)
      const res = await client.post('/ocr/extract', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setText(res.data.text || '')
      clearImage()
      textareaRef.current?.focus()
    } catch {
      setError('OCR failed. Please try a clearer image.')
    } finally {
      setOcrLoading(false)
    }
  }

  function clearImage() {
    setImage(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const charCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const errors = result?.errors || []
  const score = result?.accuracy_score ?? null
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)'
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Needs work'

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* ── LEFT PANEL: Editor ── */}
      <div style={{
        width: '50%', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Practice</span>
            {result && (
              <button
                onClick={() => setResult(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', fontSize: 12, fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: '"JetBrains Mono", monospace' }}>
              Ctrl+Enter to analyse
            </span>
            <button
              onClick={() => setShortcutsOpen(v => !v)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                color: 'var(--text3)', fontSize: 11, fontFamily: 'Inter, sans-serif',
              }}
            >
              Shortcuts
            </button>
          </div>
        </div>

        {/* Shortcuts panel */}
        <AnimatePresence>
          {shortcutsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div style={{
                padding: '12px 24px', background: 'var(--bg2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 20, flexWrap: 'wrap',
              }}>
                <ShortcutRow keys={['Ctrl', 'Enter']} action="Analyse text" />
                <ShortcutRow keys={['Esc']} action="Clear results" />
                <ShortcutRow keys={['Ctrl', 'K']} action="Clear editor" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* Editor */}
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setText('') }
              }}
              placeholder="Type or paste your text here. Write freely — we'll handle the corrections."
              style={{
                width: '100%',
                minHeight: 220,
                background: 'var(--bg2)',
                border: `1px solid ${dragOver ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '20px',
                paddingBottom: 36,
                color: 'var(--text)',
                fontFamily: '"JetBrains Mono", "Geist Mono", monospace',
                fontSize: 14,
                lineHeight: 1.8,
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                caretColor: 'var(--text)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <div style={{
              position: 'absolute', bottom: 10, right: 14,
              fontSize: 12, color: 'var(--text3)',
              fontFamily: '"JetBrains Mono", monospace',
              pointerEvents: 'none',
            }}>
              {charCount} chars · {wordCount} words
            </div>
          </div>

          {/* Image upload strip */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {imagePreview ? (
              <div style={{
                border: '1px solid var(--border)', borderRadius: 12,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg2)',
              }}>
                <img src={imagePreview} alt="upload preview" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{image?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(image?.size / 1024).toFixed(1)} KB</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  onClick={handleImageUpload}
                  disabled={ocrLoading}
                  style={{
                    background: '#FFFFFF', color: '#0A0A0A', border: 'none',
                    borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {ocrLoading ? <Loader2 size={13} style={{ animation: 'spin 0.75s linear infinite' }} /> : null}
                  Extract text
                </motion.button>
                <button onClick={clearImage} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', padding: 4,
                }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1px dashed ${dragOver ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
                }}
              >
                <Upload size={16} color="var(--text3)" />
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                  Drop an image to extract text via OCR, or <span style={{ color: 'var(--text2)', textDecoration: 'underline' }}>browse</span>
                </span>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleImageSelect(e.target.files?.[0])}
          />

          {/* Error message */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            whileHover={text.trim() && !loading ? { scale: 1.01, background: '#E5E5E5' } : {}}
            whileTap={text.trim() && !loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%',
              background: !text.trim() || loading ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
              color: !text.trim() || loading ? 'var(--text3)' : '#0A0A0A',
              border: 'none',
              borderRadius: 8, padding: '12px 20px',
              fontSize: 15, fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s ease, color 0.2s ease',
            }}
          >
            {loading ? (
              <><Loader2 size={16} style={{ animation: 'spin 0.75s linear infinite' }} /> Analysing…</>
            ) : (
              <>Analyse text <ChevronRight size={16} /></>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── RIGHT PANEL: Results ── */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {result ? 'Results' : 'Waiting for input…'}
          </span>
          {result && (
            <button
              onClick={() => setLearningOpen(v => !v)}
              style={{
                background: learningOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                color: learningOpen ? 'var(--text)' : 'var(--text2)',
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              {learningOpen ? 'Hide' : 'Learning mode'}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <AnimatePresence mode="wait">
            {!result && !loading ? (
              /* Empty state */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 12, minHeight: 300,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChevronRight size={20} color="var(--text3)" />
                </div>
                <p style={{ fontSize: 14, color: 'var(--text3)', textAlign: 'center' }}>
                  Type something on the left and press<br />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--text2)' }}>Ctrl+Enter</span> to analyse
                </p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Score row */}
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '20px 24px',
                  display: 'flex', alignItems: 'center', gap: 20,
                }}>
                  {score !== null && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em', color: scoreColor, lineHeight: 1 }}>
                        {score}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>/ 100</div>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    {score !== null && (
                      <div style={{ fontSize: 15, fontWeight: 600, color: scoreColor, marginBottom: 10 }}>
                        {scoreLabel}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 12, color: 'var(--red)',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 999, padding: '3px 10px',
                      }}>
                        {errors.filter(e => e.severity?.toLowerCase() === 'critical').length} critical
                      </span>
                      <span style={{
                        fontSize: 12, color: 'var(--yellow)',
                        background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                        borderRadius: 999, padding: '3px 10px',
                      }}>
                        {errors.filter(e => e.severity?.toLowerCase() === 'moderate').length} moderate
                      </span>
                      <span style={{
                        fontSize: 12, color: 'var(--green)',
                        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                        borderRadius: 999, padding: '3px 10px',
                      }}>
                        {errors.filter(e => e.severity?.toLowerCase() === 'low').length} low
                      </span>
                    </div>
                  </div>
                </div>

                {/* Complexity meter */}
                {result?.complexity_score !== undefined && (
                  <ComplexityMeter score={result.complexity_score} />
                )}

                {/* Diff viewer */}
                {result?.corrected_text && (
                  <DiffViewer original={text} corrected={result.corrected_text} />
                )}

                {/* Learning mode panel */}
                <AnimatePresence>
                  {learningOpen && (
                    <LearningMode errors={errors} />
                  )}
                </AnimatePresence>

                {/* Corrections list */}
                {errors.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
                      {errors.length} correction{errors.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {errors.map((err, i) => (
                        <ErrorCard key={i} error={err} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {errors.length === 0 && result && (
                  <div style={{
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 12, padding: '24px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
                      No errors found
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      Great writing! Keep practising to maintain your streak.
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}