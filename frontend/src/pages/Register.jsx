import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ─────────────────────────────────────────────
 * Background layers
 * ────────────────────────────────────────────*/

function DotGridBackground() {
  return <div className="register-dot-grid" aria-hidden="true" />
}

function BeamBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    function handleResize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    window.addEventListener('resize', handleResize)

    const beams = []
    const BEAM_COUNT = 6

    function spawnBeam() {
      const maxLife = 500 + Math.random() * 700
      const angleDeg = -25 + Math.random() * 50
      const angle = (angleDeg * Math.PI) / 180
      beams.push({
        x: Math.random() * width,
        y: -100,
        angle,
        speed: 0.25 + Math.random() * 0.35,
        length: 280 + Math.random() * 380,
        width: 0.5 + Math.random() * 1.2,
        life: 0,
        maxLife,
        maxOpacity: 0.05 + Math.random() * 0.09,
        opacity: 0,
      })
    }

    for (let i = 0; i < BEAM_COUNT; i++) {
      spawnBeam()
    }

    let frameId
    function render() {
      ctx.clearRect(0, 0, width, height)

      for (let i = beams.length - 1; i >= 0; i--) {
        const beam = beams[i]
        beam.life += 1
        beam.y += beam.speed

        const progress = beam.life / beam.maxLife
        let opacity
        if (progress < 0.15) {
          opacity = (progress / 0.15) * beam.maxOpacity
        } else if (progress > 0.85) {
          opacity = ((1 - progress) / 0.15) * beam.maxOpacity
        } else {
          opacity = beam.maxOpacity
        }
        beam.opacity = opacity

        ctx.save()
        ctx.translate(beam.x, beam.y)
        ctx.rotate(beam.angle)
        const gradient = ctx.createLinearGradient(0, 0, beam.length, 0)
        gradient.addColorStop(0, 'rgba(255,255,255,0)')
        gradient.addColorStop(0.3, `rgba(255,255,255,${beam.opacity})`)
        gradient.addColorStop(0.7, `rgba(255,255,255,${beam.opacity * 0.6})`)
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = gradient
        ctx.lineWidth = beam.width
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(beam.length, 0)
        ctx.stroke()
        ctx.restore()

        if (beam.y > height + 100 || beam.life >= beam.maxLife) {
          beams.splice(i, 1)
          spawnBeam()
        }
      }

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="register-beam-canvas" aria-hidden="true" />
}

/* ─────────────────────────────────────────────
 * Password strength helpers
 * ────────────────────────────────────────────*/

function getPasswordScore(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

function getStrengthMeta(score) {
  if (score <= 0) return { label: '', color: '' }
  if (score === 1) return { label: 'Weak password', color: '#ef4444' }
  if (score === 2) return { label: 'Fair password', color: '#eab308' }
  if (score === 3) return { label: 'Good password', color: '#f97316' }
  if (score === 4) return { label: 'Strong password', color: '#22c55e' }
  return { label: 'Very strong!', color: '#22c55e' }
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [touched, setTouched] = useState({ username: false, email: false, password: false })
  const [showReqs, setShowReqs] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [shake, setShake] = useState(false)

  const passwordScore = getPasswordScore(form.password)
  const strengthMeta = getStrengthMeta(passwordScore)

  const errors = {
    username:
      !form.username || form.username.trim().length < 3
        ? 'Username must be at least 3 characters.'
        : '',
    email:
      !form.email
        ? 'Email is required.'
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
          ? 'Enter a valid email address.'
          : '',
    password:
      !form.password
        ? 'Password is required.'
        : form.password.length < 8
          ? 'Password must be at least 8 characters.'
          : '',
  }

  const hasError = Object.values(errors).some(Boolean)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleBlur(field) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ username: true, email: true, password: true })
    setSubmitError('')

    if (hasError) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1800))
      await register(form.username, form.email, form.password)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      const data = err?.response?.data
      if (typeof data === 'object') {
        const flat = Object.values(data).flat().join(' ')
        setSubmitError(flat || 'Registration failed. Please try again.')
      } else {
        setSubmitError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function inputClass(field) {
    const value = form[field]
    const isTouched = touched[field]
    const error = errors[field]

    if (!isTouched && !value) return 'field-input'
    if (!isTouched && value) return 'field-input has-value'
    if (isTouched && error) return 'field-input error'
    return 'field-input success has-value'
  }

  function showSuccessIcon(field) {
    const value = form[field]
    const isTouched = touched[field]
    const error = errors[field]
    return isTouched && !error && !!value
  }

  const reqs = {
    length8: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  }

  const passwordHasValue = form.password.length > 0

  return (
    <div className="register-root">
      <DotGridBackground />
      <BeamBackground />

      <main className="register-main">
        {/* Logo */}
        <div className="register-logo" style={{ animationDelay: '0s' }}>
          <Link to="/" className="logo-link">
            <div className="logo-mark">
              <span>P+</span>
            </div>
            <span className="logo-text">Proficiency+</span>
          </Link>
        </div>

        {/* Stepper */}
        <div className="register-stepper" style={{ animationDelay: '0.06s' }}>
          <div className="step-pill active">
            <div className="step-circle active">
              <span>1</span>
            </div>
            <span>Account</span>
          </div>
          <div className="step-connector">
            <div className="step-connector-dot" />
          </div>
          <div className="step-pill inactive">
            <div className="step-circle inactive">
              <span>2</span>
            </div>
            <span>Preferences</span>
          </div>
        </div>

        {/* Heading */}
        <div className="register-heading" style={{ animationDelay: '0.1s' }}>
          <h1>Create your account</h1>
          <p>Free forever. No credit card needed.</p>
        </div>

        {/* Form card */}
        <section
          className={`register-card ${shake ? 'shake' : ''}`}
          style={{ animationDelay: '0.14s' }}
        >
          {!success ? (
            <>
              <div className="oauth-row">
                <button type="button" className="oauth-btn">
                  <svg
                    className="oauth-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M11.99 10.2v3.6h5.03c-.22 1.16-.9 2.15-1.9 2.81l3.07 2.39c1.79-1.65 2.81-4.09 2.81-6.97 0-.67-.06-1.31-.18-1.93H11.99z"
                    />
                    <path
                      fill="#34A853"
                      d="M6.53 13.79l-.82.63-2.45 1.9C4.59 19.4 7.57 21 11 21c2.7 0 4.96-.89 6.61-2.4l-3.07-2.39c-.88.6-2.01.97-3.54.97-2.72 0-5.02-1.83-5.84-4.39z"
                    />
                    <path
                      fill="#4A90E2"
                      d="M3.26 8.32A8.96 8.96 0 0 0 3 10.5c0 .77.1 1.52.27 2.24a7.54 7.54 0 0 0 3.26-5.63L3.26 8.32z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M11 4.5c1.47 0 2.78.51 3.81 1.5l2.85-2.85C16 1.89 13.7 1 11 1 7.57 1 4.59 2.6 3.26 5.32l3.27 2.79C7.01 6.33 9.31 4.5 11 4.5z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
                <button type="button" className="oauth-btn">
                  <svg
                    className="oauth-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.37 1.12 2.95.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.75 0 0 .84-.27 2.75 1.05A9.18 9.18 0 0 1 12 6.27c.85 0 1.7.12 2.5.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.43.2 2.49.1 2.75.64.72 1.02 1.63 1.02 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.92 0 1.38-.01 2.49-.01 2.83 0 .27.18.6.69.5A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
                    />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>

              <div className="divider">
                <span className="divider-line" />
                <span className="divider-text">or continue with email</span>
                <span className="divider-line" />
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Username */}
                <div className="field-group">
                  <label className="field-label" htmlFor="username">
                    Username
                  </label>
                  <div className="field-input-wrapper">
                    <input
                      id="username"
                      type="text"
                      placeholder="your_username"
                      value={form.username}
                      onChange={e => handleChange('username', e.target.value)}
                      onBlur={() => handleBlur('username')}
                      className={inputClass('username')}
                    />
                    {showSuccessIcon('username') && (
                      <span className="field-success-icon">✓</span>
                    )}
                  </div>
                  {touched.username && errors.username && (
                    <div className="field-error">
                      <span>⚠</span>
                      <span>{errors.username}</span>
                    </div>
                  )}
                  {touched.username && !errors.username && form.username && (
                    <div className="field-success-msg">✓ Looks good</div>
                  )}
                </div>

                {/* Email */}
                <div className="field-group">
                  <label className="field-label" htmlFor="email">
                    Email address
                  </label>
                  <div className="field-input-wrapper">
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={inputClass('email')}
                    />
                    {showSuccessIcon('email') && (
                      <span className="field-success-icon">✓</span>
                    )}
                  </div>
                  {touched.email && errors.email && (
                    <div className="field-error">
                      <span>⚠</span>
                      <span>{errors.email}</span>
                    </div>
                  )}
                  {touched.email && !errors.email && form.email && (
                    <div className="field-success-msg">✓ Valid email</div>
                  )}
                </div>

                {/* Password */}
                <div className="field-group">
                  <label className="field-label" htmlFor="password">
                    Password
                  </label>
                  <div className="field-input-wrapper">
                    <input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      onFocus={() => setShowReqs(true)}
                      className={inputClass('password')}
                    />
                    {showSuccessIcon('password') && (
                      <span className="field-success-icon">✓</span>
                    )}
                  </div>
                  {touched.password && errors.password && (
                    <div className="field-error">
                      <span>⚠</span>
                      <span>{errors.password}</span>
                    </div>
                  )}

                  {/* Password strength */}
                  {passwordHasValue && (
                    <div className="password-strength">
                      <div className="strength-bars">
                        {[1, 2, 3, 4, 5].map(index => {
                          const active = passwordScore >= index
                          return (
                            <div key={index} className="strength-bar-track">
                              <div
                                className="strength-bar-fill"
                                style={{
                                  width: active ? '100%' : '0%',
                                  backgroundColor: active ? strengthMeta.color : 'transparent',
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>
                      {strengthMeta.label && (
                        <div className="strength-label" style={{ color: strengthMeta.color }}>
                          <span
                            className="strength-dot"
                            style={{ backgroundColor: strengthMeta.color }}
                          />
                          <span>{strengthMeta.label}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Requirements checklist */}
                  {showReqs && passwordHasValue && (
                    <div className="password-reqs">
                      {[
                        { key: 'length8', label: 'At least 8 characters' },
                        { key: 'upper', label: 'One uppercase letter' },
                        { key: 'number', label: 'One number' },
                        { key: 'special', label: 'One special character' },
                      ].map(item => {
                        const met = reqs[item.key]
                        return (
                          <div
                            key={item.key}
                            className={`req-item ${met ? 'met' : 'unmet'}`}
                          >
                            <span className="req-dot" />
                            <span>{item.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Inline submit error */}
                {submitError && (
                  <div className="field-error global">
                    <span>⚠</span>
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className={`submit-btn ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  <span className="submit-shimmer" />
                  {loading ? (
                    <>
                      <span className="submit-spinner" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create account</span>
                      <span className="submit-arrow">›</span>
                    </>
                  )}
                </button>
              </form>

              {/* Legal text */}
              <p className="legal-text">
                By signing up you agree to our{' '}
                <button type="button">Terms of Service</button> and{' '}
                <button type="button">Privacy Policy</button>.
              </p>
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon">
                <span>✓</span>
              </div>
              <h2>Account created!</h2>
              <p>
                Welcome to Proficiency+. Your learning journey starts now.
                Redirecting to your dashboard...
              </p>
              <div className="success-dots">
                <span className="dot dot-1" />
                <span className="dot dot-2" />
                <span className="dot dot-3" />
              </div>
            </div>
          )}
        </section>

        {/* Sign in link */}
        <p className="signin-text" style={{ animationDelay: '0.22s' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        </p>

        {/* Feature pills */}
        <div className="feature-pills" style={{ animationDelay: '0.28s' }}>
          <div className="feature-pill">
            <span className="pill-dot" style={{ backgroundColor: '#22c55e' }} />
            <span>Free forever plan</span>
          </div>
          <div className="feature-pill">
            <span className="pill-dot" style={{ backgroundColor: '#7DD3FC' }} />
            <span>AI grammar correction</span>
          </div>
          <div className="feature-pill">
            <span className="pill-dot" style={{ backgroundColor: '#eab308' }} />
            <span>No credit card</span>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');

        :root {
          --bg: #080808;
          --bg2: #0f0f0f;
          --surface: #141414;
          --surface2: #181818;
          --border: rgba(255,255,255,0.06);
          --border2: rgba(255,255,255,0.12);
          --border3: rgba(255,255,255,0.20);
          --text: #f5f5f5;
          --text2: #a3a3a3;
          --text3: #525252;
          --green: #22c55e;
          --red: #ef4444;
          --yellow: #eab308;
          --input-bg: rgba(255,255,255,0.04);
          --input-focus: rgba(255,255,255,0.08);
          --ease-devin: cubic-bezier(0.16, 1, 0.3, 1);
        }

        .register-root {
          position: relative;
          min-height: 100vh;
          background: radial-gradient(circle at top, #050505 0%, #050505 30%, #020202 100%);
          color: var(--text);
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        .register-dot-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, black 30%, transparent 100%);
          z-index: 0;
        }

        .register-beam-canvas {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.85;
        }

        .register-main {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          text-align: center;
          max-width: 480px;
          margin: 0 auto;
        }

        .register-logo,
        .register-stepper,
        .register-heading,
        .register-card,
        .signin-text,
        .feature-pills {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s var(--ease-devin) forwards;
        }

        .logo-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }

        .logo-mark {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 800;
          color: #080808;
        }

        .logo-text {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        /* Stepper */
        .register-stepper {
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .step-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
        }

        .step-pill.active {
          background: #ffffff;
          color: #080808;
        }

        .step-pill.inactive {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text3);
        }

        .step-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Geist Mono', monospace;
          font-size: 11px;
          font-weight: 800;
        }

        .step-circle.active {
          background: #080808;
          color: #ffffff;
        }

        .step-circle.inactive {
          background: var(--surface2);
          color: var(--text3);
        }

        .step-connector {
          position: relative;
          width: 48px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
        }

        .step-connector-dot {
          position: absolute;
          right: -2px;
          top: 50%;
          transform: translateY(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--text3);
        }

        /* Heading */
        .register-heading {
          margin-top: 26px;
          margin-bottom: 28px;
        }

        .register-heading h1 {
          font-size: clamp(28px, 4vw, 38px);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
          line-height: 1.1;
        }

        .register-heading p {
          font-size: 14px;
          color: var(--text3);
        }

        /* Card */
        .register-card {
          width: 100%;
          max-width: 480px;
          background: var(--surface);
          border-radius: 16px;
          border: 1px solid var(--border);
          padding: 32px;
          position: relative;
          overflow: hidden;
          text-align: left;
        }

        .register-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 100px;
          background: radial-gradient(ellipse at top, rgba(255,255,255,0.04), transparent 70%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s var(--ease-devin);
        }

        .register-card:focus-within {
          border-color: var(--border2);
        }

        .register-card:focus-within::before {
          opacity: 1;
        }

        .register-card.shake {
          animation: shake 0.4s ease;
        }

        /* OAuth buttons */
        .oauth-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .oauth-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 9px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition:
            background-color 0.2s var(--ease-devin),
            border-color 0.2s var(--ease-devin),
            color 0.2s var(--ease-devin),
            transform 0.2s var(--ease-devin);
        }

        .oauth-btn:hover {
          border-color: var(--border2);
          background: rgba(255,255,255,0.04);
          color: var(--text);
          transform: translateY(-1px);
        }

        .oauth-btn:active {
          transform: translateY(0);
        }

        .oauth-icon {
          width: 15px;
          height: 15px;
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .divider-text {
          font-size: 12px;
          color: var(--text3);
        }

        /* Fields */
        .field-group {
          margin-bottom: 20px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 8px;
          transition: color 0.2s var(--ease-devin);
        }

        .field-group:focus-within .field-label {
          color: var(--text2);
        }

        .field-input-wrapper {
          position: relative;
        }

        .field-input {
          width: 100%;
          background: var(--input-bg);
          border-radius: 9px;
          border: 1px solid var(--border);
          padding: 12px 14px;
          color: var(--text);
          font-size: 14px;
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          outline: none;
          transition:
            background-color 0.2s var(--ease-devin),
            border-color 0.2s var(--ease-devin),
            box-shadow 0.2s var(--ease-devin),
            transform 0.2s var(--ease-devin);
          -webkit-appearance: none;
        }

        .field-input::placeholder {
          color: var(--text3);
        }

        .field-input:focus {
          background: var(--input-focus);
          border-color: var(--border3);
          box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
        }

        .field-input.has-value {
          background: var(--input-focus);
          border-color: var(--border2);
        }

        .field-input.error {
          border-color: rgba(239,68,68,0.5);
        }

        .field-input.success {
          border-color: rgba(34,197,94,0.4);
        }

        .field-success-icon {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: var(--green);
          pointer-events: none;
        }

        .field-error {
          display: flex;
          align-items: flex-start;
          gap: 5px;
          font-size: 12px;
          color: var(--red);
          margin-top: 6px;
          animation: float-up 0.25s ease;
        }

        .field-error.global {
          margin-top: 4px;
        }

        .field-success-msg {
          font-size: 12px;
          color: var(--green);
          margin-top: 6px;
          animation: float-up 0.25s ease;
        }

        /* Password strength */
        .password-strength {
          margin-top: 10px;
        }

        .strength-bars {
          display: flex;
          gap: 5px;
          margin-bottom: 6px;
        }

        .strength-bar-track {
          flex: 1;
          height: 3px;
          border-radius: 999px;
          background: var(--surface2);
          overflow: hidden;
        }

        .strength-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .strength-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          animation: float-up 0.3s ease;
        }

        .strength-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* Requirements checklist */
        .password-reqs {
          margin-top: 10px;
          animation: slideDown 0.3s ease;
        }

        .req-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .req-item.unmet {
          color: var(--text3);
        }

        .req-item.met {
          color: var(--green);
        }

        .req-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--text3);
          transition: background-color 0.25s var(--ease-devin);
        }

        .req-item.met .req-dot {
          background: var(--green);
        }

        /* Submit */
        .submit-btn {
          width: 100%;
          margin-top: 4px;
          padding: 13px;
          border-radius: 9px;
          border: none;
          background: #ffffff;
          color: #080808;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition:
            background-color 0.2s ease,
            transform 0.2s ease,
            opacity 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #e8e8e8;
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
          background: #d4d4d4;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent);
          transform: translateX(-100%);
          pointer-events: none;
        }

        .submit-btn:hover:not(.loading) .submit-shimmer {
          transition: transform 0.5s ease;
          transform: translateX(100%);
        }

        .submit-arrow {
          font-size: 16px;
        }

        .submit-btn.loading {
          background: #e8e8e8;
          pointer-events: none;
        }

        .submit-spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(8,8,8,0.2);
          border-top-color: #080808;
          animation: spin 0.7s linear infinite;
        }

        /* Legal */
        .legal-text {
          margin-top: 16px;
          font-size: 11.5px;
          color: var(--text3);
          text-align: center;
          line-height: 1.6;
        }

        .legal-text button {
          border: none;
          background: transparent;
          color: var(--text2);
          text-decoration: underline;
          text-decoration-color: var(--border2);
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .legal-text button:hover {
          color: var(--text);
        }

        /* Success state */
        .success-state {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px 0;
          animation: fadeUp 0.5s var(--ease-devin);
        }

        .success-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .success-state h2 {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .success-state p {
          font-size: 14px;
          color: var(--text2);
          line-height: 1.6;
        }

        .success-dots {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .success-dots .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text3);
          animation: pulse-dot 1.2s ease infinite;
        }

        .success-dots .dot-2 {
          animation-delay: 0.2s;
        }
        .success-dots .dot-3 {
          animation-delay: 0.4s;
        }

        /* Sign in text */
        .signin-text {
          margin-top: 24px;
          font-size: 13px;
          color: var(--text3);
        }

        .signin-text button {
          border: none;
          background: transparent;
          color: var(--text2);
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: var(--border2);
          cursor: pointer;
          padding: 0;
        }

        .signin-text button:hover {
          color: var(--text);
        }

        /* Feature pills */
        .feature-pills {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--border);
          font-size: 12px;
          color: var(--text3);
          cursor: default;
          transition:
            border-color 0.2s var(--ease-devin),
            color 0.2s var(--ease-devin);
        }

        .feature-pill:hover {
          border-color: var(--border2);
          color: var(--text2);
        }

        .pill-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Animations */
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-up {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-dot {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34,197,94,0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(34,197,94,0);
          }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .register-card {
            padding: 26px 20px 24px;
          }

          .oauth-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
