import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import DotGrid from '../components/ui/AuroraBackground'
import { ChevronRight, Loader2, Zap, BookOpen, BarChart2 } from 'lucide-react'

function FloatingInput({ label, type, value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <motion.label
        animate={{
          y: focused || hasValue ? -22 : 0,
          fontSize: focused || hasValue ? '11px' : '14px',
          color: focused ? 'var(--text)' : 'var(--text3)',
        }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          left: 14,
          top: 12,
          fontWeight: 500,
          pointerEvents: 'none',
          background: 'var(--bg)',
          padding: '0 4px',
          borderRadius: 3,
          zIndex: 1,
        }}
      >
        {label}
      </motion.label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ''}
        required
        style={{
          width: '100%',
          background: 'var(--bg2)',
          border: `1px solid ${error ? 'var(--red)' : focused ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
          borderRadius: 8,
          padding: '12px 14px',
          paddingTop: hasValue || focused ? '20px' : '12px',
          color: 'var(--text)',
          fontSize: 15,
          fontFamily: 'Inter, sans-serif',
          outline: 'none',
          transition: 'border-color 0.2s ease, padding-top 0.18s ease',
        }}
      />
      {error && (
        <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  )
}

const featurePills = [
  { icon: <Zap size={14} />, label: 'AI-powered grammar correction' },
  { icon: <BookOpen size={14} />, label: 'Personalized learning path' },
  { icon: <BarChart2 size={14} />, label: 'Progress analytics dashboard' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passError, setPassError] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setEmailError('')
    setPassError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      // Shake animation
      if (formRef.current) {
        formRef.current.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-8px)' },
            { transform: 'translateX(8px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 400, easing: 'ease-out' }
        )
      }
      const msg = err.response?.data?.detail || 'Invalid email or password.'
      if (msg.toLowerCase().includes('password')) {
        setPassError(msg)
      } else {
        setEmailError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Left panel: form ─── */}
      <div style={{
        flex: '0 0 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 40px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 40 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#0A0A0A', fontWeight: 800, fontSize: 12 }}>P</span>
            </div>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>
              Proficiency<span style={{ color: '#FFFFFF' }}>+</span>
            </span>
          </Link>

          <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 8 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 36, lineHeight: 1.6 }}>
            Sign in to continue your learning journey
          </p>

          <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FloatingInput
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={emailError}
            />
            <FloatingInput
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              error={passError}
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.01, background: '#E5E5E5' }}
              whileTap={loading ? {} : { scale: 0.98 }}
              style={{
                width: '100%',
                background: '#FFFFFF',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <Loader2 size={16} style={{ animation: 'spin 0.75s linear infinite' }} />
              ) : (
                <>Continue <ChevronRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text2)', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }}>
              Sign up free
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ── Right panel: info ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="hidden lg:flex"
        style={{
          flex: '0 0 45%',
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 48px',
        }}
      >
        <div />

        <div>
          <p style={{
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.55,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
            marginBottom: 20,
          }}>
            "My writing accuracy jumped from 61% to 84% in just six weeks. The AI explanations
            actually teach you <em>why</em> something is wrong — not just flag it."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'var(--text2)',
            }}>
              LK
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Lena K.</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Intermediate learner · 3 months</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
            What you get
          </p>
          {featurePills.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--text2)',
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--text)' }}>{f.icon}</span>
              {f.label}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}