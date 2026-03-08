import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────
 * Hooks
 * ────────────────────────────────────────────*/

function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return

    const elements = Array.from(document.querySelectorAll('.reveal'))
    if (!elements.length) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px',
      },
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function useCounter(target, started) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!started) return
    const duration = 1600
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, started])

  return value
}

/* ─────────────────────────────────────────────
 * Background layers
 * ────────────────────────────────────────────*/

function DotGridBackground() {
  return (
    <div className="landing-dot-grid" aria-hidden="true" />
  )
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
    let animationFrameId

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
      const maxLife = 400 + Math.random() * 600
      const angleDeg = -15 + Math.random() * 30
      const angle = (angleDeg * Math.PI) / 180
      beams.push({
        x: Math.random() * width,
        y: -100,
        angle,
        speed: 0.3 + Math.random() * 0.4,
        length: 300 + Math.random() * 400,
        width: 0.5 + Math.random(),
        life: 0,
        maxLife,
        maxOpacity: 0.06 + Math.random() * 0.08,
      })
    }

    for (let i = 0; i < BEAM_COUNT; i++) {
      spawnBeam()
    }

    function draw() {
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

      animationFrameId = requestAnimationFrame(draw)
    }

    animationFrameId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="landing-beam-canvas" aria-hidden="true" />
}

/* ─────────────────────────────────────────────
 * Utility components
 * ────────────────────────────────────────────*/

function BentoCard({ className = '', onMouseMove, onMouseLeave, children }) {
  return (
    <div
      className={`bento-card ${className}`}
      onMouseMove={event => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        event.currentTarget.style.setProperty('--mx', `${x}%`)
        event.currentTarget.style.setProperty('--my', `${y}%`)
        if (onMouseMove) onMouseMove(event)
      }}
      onMouseLeave={event => {
        event.currentTarget.style.removeProperty('--mx')
        event.currentTarget.style.removeProperty('--my')
        if (onMouseLeave) onMouseLeave(event)
      }}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
 * Main Landing Page
 * ────────────────────────────────────────────*/

export default function Landing() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [statsVisible, setStatsVisible] = useState(false)

  useReveal()

  const statsRef = useRef(null)

  useEffect(() => {
    if (!statsRef.current || typeof IntersectionObserver === 'undefined') return
    const section = statsRef.current

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setStatsVisible(true)
            observer.unobserve(section)
          }
        })
      },
      { threshold: 0.3 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % 4)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const learnerCount = useCounter(128000, statsVisible)
  const correctionsCount = useCounter(4200000, statsVisible)
  const accuracyGain = useCounter(23, statsVisible)
  const satisfaction = useCounter(98, statsVisible)

  const heatmapData = useMemo(() => {
    const rows = 7
    const cols = 26
    const data = []
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        const level = Math.floor(Math.random() * 5)
        row.push(level)
      }
      data.push(row)
    }
    return data
  }, [])

  const formatNumber = n => n.toLocaleString('en-IN')

  return (
    <div className="landing-root">
      <DotGridBackground />
      <BeamBackground />

      <div className="landing-main">
        {/* Navbar */}
        <header className="landing-navbar reveal reveal-delay-1">
          <div className="nav-left">
            <div className="nav-logo-mark">
              <span>P+</span>
            </div>
            <span className="nav-logo-text">Proficiency+</span>
          </div>

          <nav className="nav-center">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Features
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              How it works
            </button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}>
              Testimonials
            </button>
          </nav>

          <div className="nav-right">
            <button
              className="btn ghost small"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
            <button
              className="btn primary small"
              onClick={() => navigate('/register')}
            >
              Get started free
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="landing-content">
          <section className="hero-section reveal" id="hero">
            <div className="hero-radial" aria-hidden="true" />

            <div className="hero-inner">
              {/* Badge */}
              <div className="hero-badge" style={{ animationDelay: '0.1s' }}>
                <span className="hero-badge-dot" />
                <span>AI Grammar Correction · Now with OCR</span>
              </div>

              {/* H1 */}
              <h1 className="hero-title" style={{ animationDelay: '0.2s' }}>
                Write better English,
                <br />
                every single day
              </h1>

              {/* Subheading */}
              <p className="hero-subtitle" style={{ animationDelay: '0.3s' }}>
                Proficiency+ uses AI to correct your grammar, explain every error,
                and build a personalised improvement plan — automatically.
              </p>

              {/* CTA row */}
              <div className="hero-cta-row" style={{ animationDelay: '0.4s' }}>
                <button
                  className="btn primary large"
                  onClick={() => navigate('/register')}
                >
                  Start for free →
                </button>
                <button
                  className="btn ghost large"
                  onClick={() =>
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  See how it works
                </button>
              </div>

              {/* Social proof */}
              <div className="hero-social" style={{ animationDelay: '0.5s' }}>
                <div className="hero-avatars">
                  {[
                    { initials: 'AJ', color: '#4f46e5' },
                    { initials: 'SK', color: '#ec4899' },
                    { initials: 'LK', color: '#22c55e' },
                    { initials: 'MR', color: '#eab308' },
                    { initials: 'TP', color: '#0ea5e9' },
                  ].map((user, index) => (
                    <div
                      key={user.initials}
                      className="hero-avatar"
                      style={{
                        backgroundColor: user.color,
                        marginLeft: index === 0 ? 0 : -8,
                        zIndex: 5 - index,
                      }}
                    >
                      <span>{user.initials}</span>
                    </div>
                  ))}
                </div>
                <div className="hero-stars">★★★★★</div>
                <span className="hero-proof-text">
                  Trusted by <strong>128,000+</strong> learners
                </span>
              </div>

              {/* Step tabs widget */}
              <div className="hero-tabs-wrapper" style={{ animationDelay: '0.6s' }}>
                <div className="hero-tabs">
                  {['Write', 'Analyse', 'Correct', 'Improve'].map((label, index) => (
                    <button
                      key={label}
                      className={`hero-tab ${activeTab === index ? 'active' : ''}`}
                      onClick={() => setActiveTab(index)}
                    >
                      <span className="hero-tab-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="hero-tab-content">
                  <div className={`hero-tab-panel ${activeTab === 0 ? 'active' : ''}`}>
                    <div className="panel-label">EDITOR</div>
                    <p className="panel-description">
                      Type freely in the editor. Proficiency+ tracks every mistake and
                      prepares a detailed correction pass.
                    </p>
                    <div className="panel-editor">
                      <div className="panel-editor-line">
                        She don&apos;t like the way he speaks to she.
                      </div>
                      <div className="panel-editor-line">
                        Yesterday I go to the market and buyed fresh vegetable
                        <span className="panel-cursor" />
                      </div>
                      <div className="panel-editor-hint">
                        Press <span>Ctrl</span> + <span>Enter</span> to analyse
                      </div>
                    </div>
                  </div>

                  <div className={`hero-tab-panel ${activeTab === 1 ? 'active' : ''}`}>
                    <div className="panel-label">AI ANALYSIS</div>
                    <p className="panel-description">
                      The model runs a full pass over tense, agreement, spelling,
                      pronouns, and more.
                    </p>
                    <div className="panel-pills-row">
                      <div className="panel-pill">
                        <span className="pill-label">Tense</span>
                        <span className="pill-value pill-error">2 errors</span>
                      </div>
                      <div className="panel-pill">
                        <span className="pill-label">Spelling</span>
                        <span className="pill-value pill-warning">1 error</span>
                      </div>
                      <div className="panel-pill">
                        <span className="pill-label">Agreement</span>
                        <span className="pill-value pill-warning">1 error</span>
                      </div>
                    </div>
                  </div>

                  <div className={`hero-tab-panel ${activeTab === 2 ? 'active' : ''}`}>
                    <div className="panel-label">CORRECTIONS</div>
                    <p className="panel-description">
                      See exactly what changed, with in-place diffs for every sentence.
                    </p>
                    <div className="panel-editor">
                      <div className="panel-editor-line">
                        She{' '}
                        <span className="word-del">don&apos;t</span>{' '}
                        <span className="word-ins">doesn&apos;t</span> like the way he
                        speaks to{' '}
                        <span className="word-del">she</span>
                        <span className="word-ins">her</span>.
                      </div>
                      <div className="panel-editor-line">
                        Yesterday I{' '}
                        <span className="word-del">go</span>
                        <span className="word-ins">went</span> to the market and{' '}
                        <span className="word-del">buyed</span>
                        <span className="word-ins">bought</span> fresh{' '}
                        <span className="word-del">vegetable</span>
                        <span className="word-ins">vegetables</span>.
                      </div>
                    </div>
                    <div className="panel-success-pill">
                      ✓ 3 corrections applied · Accuracy: 94%
                    </div>
                  </div>

                  <div className={`hero-tab-panel ${activeTab === 3 ? 'active' : ''}`}>
                    <div className="panel-label">PROGRESS TRACKED</div>
                    <p className="panel-description">
                      Every session feeds into your dashboard, with accuracy trends and
                      streaks.
                    </p>
                    <div className="panel-grid">
                      <div className="panel-stat-box">
                        <div className="panel-stat-label">Sessions</div>
                        <div className="panel-stat-value">47</div>
                      </div>
                      <div className="panel-stat-box">
                        <div className="panel-stat-label">Streak</div>
                        <div className="panel-stat-value">12 days</div>
                      </div>
                      <div className="panel-stat-box">
                        <div className="panel-stat-label">Accuracy</div>
                        <div className="panel-stat-value">↑ 23%</div>
                      </div>
                      <div className="panel-stat-box">
                        <div className="panel-stat-label">Corrections</div>
                        <div className="panel-stat-value">1,284</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats bar */}
          <section ref={statsRef} className="stats-section reveal reveal-delay-1">
            <div className="stats-grid">
              <div className="stats-item">
                <div className="stats-number">
                  {formatNumber(learnerCount)}+
                </div>
                <div className="stats-label">Active learners</div>
              </div>
              <div className="stats-item">
                <div className="stats-number">
                  {formatNumber(correctionsCount)}+
                </div>
                <div className="stats-label">Corrections made</div>
              </div>
              <div className="stats-item">
                <div className="stats-number">
                  {accuracyGain}%
                </div>
                <div className="stats-label">Avg. accuracy gain</div>
              </div>
              <div className="stats-item">
                <div className="stats-number">
                  {satisfaction}%
                </div>
                <div className="stats-label">User satisfaction</div>
              </div>
            </div>
          </section>

          {/* Features / Bento grid */}
          <section id="features" className="features-section reveal">
            <div className="section-header">
              <div className="section-label">FEATURES</div>
              <h2 className="section-title">Use Proficiency+ to<br />improve faster</h2>
              <p className="section-subtext">
                Everything you need to go from making mistakes to making progress.
              </p>
            </div>

            <div className="bento-grid">
              {/* AI Grammar Correction */}
              <BentoCard className="bento-cell large">
                <div className="card-header">
                  <div className="card-icon">⚡</div>
                  <div>
                    <div className="card-title">AI Grammar Correction</div>
                    <div className="card-body">
                      BART-powered corrections with clear, line-by-line diffs.
                    </div>
                  </div>
                </div>
                <div className="card-preview mono">
                  <div className="preview-line">
                    <span className="word-del">He go</span>{' '}
                    <span className="word-ins">He goes</span> to school every day.
                  </div>
                  <div className="preview-line">
                    <span className="word-del">She don&apos;t</span>{' '}
                    <span className="word-ins">She doesn&apos;t</span> know the answer.
                  </div>
                  <div className="preview-line">
                    <span className="word-del">They has</span>{' '}
                    <span className="word-ins">They have</span> finished their work.
                  </div>
                </div>
              </BentoCard>

              {/* Progress Analytics */}
              <BentoCard className="bento-cell medium">
                <div className="card-header">
                  <div className="card-icon">📊</div>
                  <div>
                    <div className="card-title">Progress Analytics</div>
                    <div className="card-body">
                      See your accuracy trend climb with every correction.
                    </div>
                  </div>
                </div>
                <div className="card-bars">
                  {[35, 52, 41, 68, 55, 74, 62, 88, 76, 92].map((height, index, arr) => {
                    const max = Math.max(...arr)
                    const isMax = height === max
                    const opacity = isMax ? 0.85 : 0.1 + (height / 100) * 0.25
                    return (
                      <div
                        key={index}
                        className="card-bar"
                        style={{
                          height: `${height}%`,
                          backgroundColor: `rgba(255,255,255,${opacity})`,
                        }}
                      />
                    )
                  })}
                </div>
              </BentoCard>

              {/* Personalized Training */}
              <BentoCard className="bento-cell small">
                <div className="card-header">
                  <div className="card-icon">🎯</div>
                  <div>
                    <div className="card-title">Personalized Training</div>
                    <div className="card-body">
                      Drills adapt to your weakest error patterns.
                    </div>
                  </div>
                </div>
                <div className="card-progress-list">
                  {[
                    { label: 'Tense drills', value: 72 },
                    { label: 'Pronoun use', value: 45 },
                    { label: 'Punctuation', value: 88 },
                  ].map(item => (
                    <div key={item.label} className="progress-row">
                      <div className="progress-top">
                        <span className="progress-label">{item.label}</span>
                        <span className="progress-value">{item.value}%</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BentoCard>

              {/* OCR Upload */}
              <BentoCard className="bento-cell small">
                <div className="card-header">
                  <div className="card-icon">📷</div>
                  <div>
                    <div className="card-title">OCR Upload</div>
                    <div className="card-body">
                      Snap a photo of handwritten notes and correct them instantly.
                    </div>
                  </div>
                </div>
                <div className="card-upload-zone">
                  <div className="upload-icon">↑</div>
                  <div className="upload-text">
                    Drop image here or <span>browse</span>
                  </div>
                </div>
              </BentoCard>

              {/* Daily Streak */}
              <BentoCard className="bento-cell small">
                <div className="card-header">
                  <div className="card-icon">🔥</div>
                  <div>
                    <div className="card-title">Daily Streak</div>
                    <div className="card-body">
                      A GitHub-style calendar that rewards consistency.
                    </div>
                  </div>
                </div>
                <div className="card-heatmap">
                  {heatmapData.map((row, rowIndex) => (
                    <div key={rowIndex} className="heatmap-row">
                      {row.map((level, colIndex) => {
                        const colors = [
                          '#1a1a1a',
                          '#1a2e1a',
                          '#166534',
                          '#15803d',
                          '#22c55e',
                        ]
                        return (
                          <div
                            key={colIndex}
                            className="heatmap-cell"
                            style={{ backgroundColor: colors[level] }}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </BentoCard>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="how-section reveal reveal-delay-1">
            <div className="how-grid">
              <div className="how-text">
                <div className="section-label">HOW IT WORKS</div>
                <h2 className="section-title">
                  From first draft to
                  <br />
                  near-perfect English
                </h2>
                <p className="section-subtext">
                  Proficiency+ walks you from messy first draft to polished,
                  confident writing in four simple steps.
                </p>

                <div className="how-steps">
                  {[
                    {
                      title: 'Write something',
                      desc: 'Type any sentence or paragraph. No prompts. Write what feels natural.',
                    },
                    {
                      title: 'Get instant corrections',
                      desc: "The AI highlights every error, explains why it's wrong, and shows the fix.",
                    },
                    {
                      title: 'Review and learn',
                      desc: 'Tap any correction to read the grammar rule. Learn the why, not just the what.',
                    },
                    {
                      title: 'Build a streak',
                      desc: 'Practice daily. Your heatmap and accuracy score update after every session.',
                    },
                  ].map((step, index) => {
                    const isActive = activeStep === index
                    return (
                      <button
                        key={step.title}
                        type="button"
                        className={`how-step ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveStep(index)}
                      >
                        <div className="how-step-circle">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="how-step-content">
                          <div className="how-step-title">{step.title}</div>
                          <div className="how-step-desc">{step.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="how-panel-wrapper">
                <div className="how-panel">
                  {activeStep === 0 && (
                    <div className="how-panel-inner">
                      <div className="panel-label">EDITOR</div>
                      <p className="panel-description">
                        Draft in plain English. The editor feels like a focused coding
                        environment, built for long-form writing.
                      </p>
                      <div className="panel-editor">
                        <div className="panel-editor-line">
                          She don&apos;t like the way he speaks to she.
                        </div>
                        <div className="panel-editor-line">
                          Yesterday I go to the market and buyed fresh vegetable
                          <span className="panel-cursor" />
                        </div>
                        <div className="panel-editor-hint">
                          Press <span>Ctrl</span> + <span>Enter</span> to analyse
                        </div>
                      </div>
                    </div>
                  )}
                  {activeStep === 1 && (
                    <div className="how-panel-inner">
                      <div className="panel-label">ERROR TYPES</div>
                      <p className="panel-description">
                        Proficiency+ surfaces the categories that matter most for your level.
                      </p>
                      <div className="how-errors">
                        {[
                          { label: 'Tense mismatch', detail: 'Past vs present', color: 'red' },
                          { label: 'Subject–verb agreement', detail: 'He go → He goes', color: 'yellow' },
                          { label: 'Pronoun usage', detail: 'she → her', color: 'green' },
                        ].map((item, index) => (
                          <div
                            key={item.label}
                            className={`how-error-row how-error-row-${index + 1}`}
                          >
                            <div className={`how-error-dot dot-${item.color}`} />
                            <div className="how-error-main">
                              <div className="how-error-label">{item.label}</div>
                              <div className="how-error-detail">{item.detail}</div>
                            </div>
                            <div className="how-error-count">+1</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeStep === 2 && (
                    <div className="how-panel-inner">
                      <div className="panel-label">DIFF VIEW</div>
                      <p className="panel-description">
                        A side-by-side diff that shows exactly what changed and why.
                      </p>
                      <div className="how-diff">
                        <div className="how-diff-line">
                          She <span className="word-del">don&apos;t</span>{' '}
                          <span className="word-ins">doesn&apos;t</span> like the way he
                          speaks to <span className="word-del">she</span>
                          <span className="word-ins">her</span>.
                        </div>
                        <div className="how-diff-line">
                          Yesterday I <span className="word-del">go</span>
                          <span className="word-ins">went</span> to the market and{' '}
                          <span className="word-del">buyed</span>
                          <span className="word-ins">bought</span> fresh{' '}
                          <span className="word-del">vegetable</span>
                          <span className="word-ins">vegetables</span>.
                        </div>
                      </div>
                      <div className="panel-success-pill">
                        ✓ Changes applied · Accuracy now 94%
                      </div>
                    </div>
                  )}
                  {activeStep === 3 && (
                    <div className="how-panel-inner">
                      <div className="panel-label">PROGRESS OVER TIME</div>
                      <p className="panel-description">
                        See sessions, streaks, and accuracy gains for every practice run.
                      </p>
                      <div className="panel-grid">
                        <div className="panel-stat-box">
                          <div className="panel-stat-label">Sessions</div>
                          <div className="panel-stat-value">47</div>
                        </div>
                        <div className="panel-stat-box">
                          <div className="panel-stat-label">Streak</div>
                          <div className="panel-stat-value">12 days</div>
                        </div>
                        <div className="panel-stat-box">
                          <div className="panel-stat-label">Accuracy gain</div>
                          <div className="panel-stat-value">↑ 23%</div>
                        </div>
                        <div className="panel-stat-box">
                          <div className="panel-stat-label">Corrections</div>
                          <div className="panel-stat-value">1,284</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section id="testimonials" className="testimonials-section reveal reveal-delay-2">
            <div className="section-header centered">
              <div className="section-label">TESTIMONIALS</div>
              <h2 className="section-title">Loved by learners</h2>
            </div>
            <div className="testimonials-grid">
              {[
                {
                  initials: 'AJ',
                  name: 'Arjun J.',
                  role: 'Software Engineer',
                  text: 'The diff viewer is genius. I can see exactly what I wrote versus what I should have written, side by side.',
                },
                {
                  initials: 'LK',
                  name: 'Lena K.',
                  role: 'Intermediate learner',
                  text: 'The streak system keeps me coming back every day. My accuracy jumped in a month.',
                },
                {
                  initials: 'MR',
                  name: 'Maria R.',
                  role: 'University student',
                  text: 'I use it before every essay. It catches subtle issues I would never spot on my own.',
                },
              ].map((t, index) => (
                <div
                  key={t.initials}
                  className={`testimonial-card reveal reveal-delay-${index}`}
                >
                  <p className="testimonial-text">“{t.text}”</p>
                  <div className="testimonial-footer">
                    <div className="testimonial-author">
                      <div className="testimonial-avatar">
                        <span>{t.initials}</span>
                      </div>
                      <div>
                        <div className="testimonial-name">{t.name}</div>
                        <div className="testimonial-role">{t.role}</div>
                      </div>
                    </div>
                    <div className="testimonial-stars">★★★★★</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA section */}
          <section className="cta-section reveal reveal-delay-1">
            <div className="cta-glow" aria-hidden="true" />
            <div className="cta-inner">
              <div className="section-label">GET STARTED</div>
              <h2 className="cta-title">
                Ready to write
                <br />
                better English?
              </h2>
              <p className="cta-subtext">
                Start a free practice session in under a minute. No credit card, no setup.
              </p>
              <button
                className="btn primary large"
                onClick={() => navigate('/register')}
              >
                Start for free →
              </button>
            </div>
          </section>

          {/* Footer */}
          <footer className="landing-footer">
            <div className="footer-left">
              <div className="footer-logo">
                <span>P+</span>
              </div>
              <span className="footer-text">Proficiency+ · AI English Learning</span>
            </div>
            <div className="footer-center">
              <button type="button">Privacy</button>
              <button type="button">Terms</button>
              <button type="button">Contact</button>
              <button
                type="button"
                onClick={() => window.open('https://github.com', '_blank')}
              >
                GitHub
              </button>
            </div>
            <div className="footer-right">
              <span>© {new Date().getFullYear()} Proficiency+</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');

        :root {
          --bg: #080808;
          --bg2: #0f0f0f;
          --surface: #141414;
          --surface2: #1a1a1a;
          --border: rgba(255,255,255,0.06);
          --border2: rgba(255,255,255,0.12);
          --text: #f5f5f5;
          --text2: #a3a3a3;
          --text3: #525252;
          --green: #22c55e;
          --red: #ef4444;
          --yellow: #eab308;
          --ease-devin: cubic-bezier(0.16, 1, 0.3, 1);
        }

        .landing-root {
          position: relative;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .landing-main {
          position: relative;
          z-index: 1;
        }

        .landing-content {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        .landing-dot-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
          opacity: 0.8;
          z-index: 0;
        }

        .landing-beam-canvas {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.7;
        }

        /* Navbar */
        .landing-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          background: rgba(8,8,8,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border);
          z-index: 10;
          animation: fadeIn 0.5s var(--ease-devin) forwards;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-logo-mark {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #080808;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Geist Mono', monospace;
        }

        .nav-logo-text {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 18px;
        }

        .nav-center button {
          border: none;
          background: transparent;
          color: var(--text2);
          font-size: 14px;
          cursor: pointer;
          padding: 4px 0;
          transition: color 0.16s var(--ease-devin);
        }

        .nav-center button:hover {
          color: var(--text);
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Buttons */
        .btn {
          border-radius: 8px;
          font-weight: 600;
          font-size: 13.5px;
          padding: 9px 18px;
          border: none;
          cursor: pointer;
          transition:
            background-color 0.18s var(--ease-devin),
            color 0.18s var(--ease-devin),
            border-color 0.18s var(--ease-devin),
            transform 0.18s var(--ease-devin);
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .btn.primary {
          background: #ffffff;
          color: #080808;
        }

        .btn.primary:hover {
          background: #e8e8e8;
          transform: translateY(-1px);
        }

        .btn.ghost {
          background: transparent;
          color: var(--text2);
          border: 1px solid var(--border2);
        }

        .btn.ghost:hover {
          border-color: rgba(255,255,255,0.25);
          color: var(--text);
          transform: translateY(-1px);
        }

        .btn.large {
          padding: 13px 28px;
          font-size: 15px;
          border-radius: 9px;
        }

        .btn.small {
          padding: 8px 16px;
          font-size: 13px;
        }

        /* Hero */
        .hero-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative;
        }

        .hero-inner {
          max-width: 860px;
          width: 100%;
        }

        .hero-radial {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 600px;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 65%);
          opacity: 0.4;
          animation: pulse 6s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
        }

        .hero-badge,
        .hero-title,
        .hero-subtitle,
        .hero-cta-row,
        .hero-social,
        .hero-tabs-wrapper {
          opacity: 0;
          transform: translateY(16px);
          animation: fadeUp 0.65s var(--ease-devin) forwards;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid var(--border2);
          background: rgba(255,255,255,0.03);
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text2);
          margin-bottom: 24px;
        }

        .hero-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--green);
          box-shadow: 0 0 6px var(--green);
          animation: blink 1.4s ease-in-out infinite;
        }

        .hero-title {
          font-size: clamp(52px, 7vw, 78px);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1.04;
          margin-bottom: 20px;
        }

        .hero-subtitle {
          font-size: 17px;
          color: var(--text2);
          max-width: 500px;
          margin: 0 auto 32px;
          line-height: 1.65;
        }

        .hero-cta-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }

        .hero-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hero-avatars {
          display: flex;
        }

        .hero-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          font-family: 'Geist Mono', monospace;
          color: #f9fafb;
        }

        .hero-stars {
          color: var(--yellow);
          font-size: 12px;
        }

        .hero-proof-text {
          font-size: 12px;
          color: var(--text3);
        }

        .hero-proof-text strong {
          color: var(--text);
          font-weight: 700;
        }

        .hero-tabs-wrapper {
          margin-top: 40px;
        }

        .hero-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-radius: 14px 14px 0 0;
          overflow: hidden;
          border: 1px solid var(--border);
          border-bottom: none;
          background: rgba(8,8,8,0.8);
        }

        .hero-tab {
          padding: 13px 16px;
          border: none;
          background: transparent;
          color: var(--text3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
          position: relative;
          border-right: 1px solid var(--border);
        }

        .hero-tab:last-child {
          border-right: none;
        }

        .hero-tab.active {
          background: rgba(255,255,255,0.03);
          color: var(--text);
        }

        .hero-tab.active::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background: #ffffff;
        }

        .hero-tab-index {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text3);
        }

        .hero-tab-content {
          border-radius: 0 0 14px 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 24px 26px 26px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.02),
            0 32px 64px rgba(0,0,0,0.5);
        }

        .hero-tab-panel {
          display: none;
          opacity: 0;
          transform: translateY(4px);
          transition:
            opacity 0.3s var(--ease-devin),
            transform 0.3s var(--ease-devin);
          font-family: 'Geist Mono', monospace;
          font-size: 13.5px;
        }

        .hero-tab-panel.active {
          display: block;
          opacity: 1;
          transform: translateY(0);
        }

        .panel-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 8px;
        }

        .panel-description {
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          color: var(--text2);
          margin-bottom: 16px;
        }

        .panel-editor {
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid var(--border);
          padding: 16px;
          text-align: left;
        }

        .panel-editor-line {
          margin-bottom: 6px;
        }

        .panel-editor-hint {
          margin-top: 12px;
          font-size: 12px;
          color: var(--text3);
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .panel-editor-hint span {
          background: var(--surface2);
          border-radius: 4px;
          padding: 2px 6px;
          border: 1px solid var(--border);
          font-size: 11px;
        }

        .panel-cursor {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: #ffffff;
          margin-left: 2px;
          animation: blink 1s steps(1) infinite;
        }

        .panel-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .panel-pill {
          background: var(--bg);
          border-radius: 7px;
          border: 1px solid var(--border);
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
        }

        .pill-label {
          color: var(--text2);
        }

        .pill-value {
          font-family: 'Geist Mono', monospace;
        }

        .pill-error {
          color: var(--red);
        }

        .pill-warning {
          color: var(--yellow);
        }

        .panel-success-pill {
          margin-top: 14px;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(34,197,94,0.15);
          background: rgba(34,197,94,0.06);
          color: var(--green);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .panel-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .panel-stat-box {
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid var(--border);
          padding: 10px 12px;
          text-align: left;
        }

        .panel-stat-label {
          font-size: 12px;
          color: var(--text3);
          margin-bottom: 4px;
        }

        .panel-stat-value {
          font-family: 'Geist Mono', monospace;
          font-size: 16px;
          font-weight: 700;
        }

        .word-del {
          text-decoration: line-through;
          color: var(--red);
          background: rgba(239,68,68,0.1);
          border-radius: 3px;
          padding: 0 3px;
        }

        .word-ins {
          color: var(--green);
          background: rgba(34,197,94,0.1);
          border-radius: 3px;
          padding: 0 3px;
        }

        /* Stats */
        .stats-section {
          background: var(--bg2);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 40px 0;
        }

        .stats-grid {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }

        .stats-item {
          text-align: left;
        }

        .stats-number {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .stats-label {
          margin-top: 6px;
          font-size: 13px;
          color: var(--text3);
        }

        /* Sections */
        .section-header {
          margin-bottom: 28px;
        }

        .section-header.centered {
          text-align: center;
        }

        .section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 8px;
        }

        .section-title {
          font-size: clamp(36px, 4vw, 50px);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 10px;
        }

        .section-subtext {
          font-size: 15px;
          color: var(--text2);
          line-height: 1.65;
          max-width: 420px;
        }

        .features-section {
          padding: 72px 0 40px;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 16px;
        }

        .bento-cell {
          position: relative;
        }

        .bento-cell.large {
          grid-column: span 7;
        }

        .bento-cell.medium {
          grid-column: span 5;
        }

        .bento-cell.small {
          grid-column: span 4;
        }

        .bento-card {
          background: var(--surface);
          border-radius: 12px;
          border: 1px solid var(--border);
          padding: 22px 20px 20px;
          position: relative;
          overflow: hidden;
          transition:
            border-color 0.18s var(--ease-devin),
            transform 0.18s var(--ease-devin),
            box-shadow 0.18s var(--ease-devin);
        }

        .bento-card::before {
          content: '';
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.03) 0%, transparent 60%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s var(--ease-devin);
        }

        .bento-card:hover {
          border-color: var(--border2);
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.35);
        }

        .bento-card:hover::before {
          opacity: 1;
        }

        .card-header {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .card-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        .card-body {
          font-size: 14px;
          color: var(--text2);
        }

        .card-preview.mono {
          margin-top: 10px;
          font-family: 'Geist Mono', monospace;
          font-size: 13.5px;
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid var(--border);
          padding: 12px 14px;
        }

        .preview-line {
          margin-bottom: 6px;
        }

        .card-bars {
          margin-top: 10px;
          height: 64px;
          display: flex;
          align-items: flex-end;
          gap: 4px;
        }

        .card-bar {
          flex: 1;
          border-radius: 3px 3px 0 0;
        }

        .card-progress-list {
          margin-top: 10px;
        }

        .progress-row {
          margin-bottom: 10px;
        }

        .progress-top {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-family: 'Geist Mono', monospace;
          color: var(--text3);
          margin-bottom: 3px;
        }

        .progress-track {
          height: 3px;
          background: var(--bg);
          border-radius: 999px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: rgba(255,255,255,0.7);
        }

        .card-upload-zone {
          margin-top: 10px;
          border-radius: 8px;
          border: 1.5px dashed var(--border2);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .upload-icon {
          font-size: 18px;
        }

        .upload-text {
          font-size: 13px;
          color: var(--text3);
        }

        .upload-text span {
          color: var(--text2);
        }

        .card-heatmap {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .heatmap-row {
          display: flex;
          gap: 2px;
        }

        .heatmap-cell {
          flex: 1;
          aspect-ratio: 1;
          border-radius: 2px;
          transition: transform 0.12s var(--ease-devin);
        }

        .heatmap-cell:hover {
          transform: scale(1.4);
        }

        /* How it works */
        .how-section {
          padding: 72px 0;
        }

        .how-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
          gap: 80px;
          align-items: flex-start;
        }

        .how-text {
          max-width: 480px;
        }

        .how-steps {
          margin-top: 28px;
        }

        .how-step {
          width: 100%;
          border: none;
          background: transparent;
          padding: 24px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
          gap: 20px;
          cursor: pointer;
          text-align: left;
          transition: color 0.2s var(--ease-devin);
        }

        .how-step:last-child {
          border-bottom: none;
        }

        .how-step-circle {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--border2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          color: var(--text3);
        }

        .how-step-content {
          flex: 1;
        }

        .how-step-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text2);
          margin-bottom: 4px;
        }

        .how-step-desc {
          font-size: 13.5px;
          color: var(--text3);
        }

        .how-step.active .how-step-circle {
          background: #ffffff;
          color: #080808;
          border-color: #ffffff;
          font-weight: 800;
        }

        .how-step.active .how-step-title {
          color: var(--text);
        }

        .how-step.active .how-step-desc {
          color: var(--text2);
        }

        .how-panel-wrapper {
          position: sticky;
          top: 80px;
        }

        .how-panel {
          background: var(--surface);
          border-radius: 12px;
          border: 1px solid var(--border);
          padding: 24px 24px 22px;
          min-height: 320px;
        }

        .how-panel-inner {
          animation: fadeUp 0.4s var(--ease-devin);
        }

        .how-errors {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .how-error-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          opacity: 0;
          transform: translateY(8px);
          animation: slideIn 0.4s var(--ease-devin) forwards;
        }

        .how-error-row-1 {
          animation-delay: 0.05s;
        }
        .how-error-row-2 {
          animation-delay: 0.12s;
        }
        .how-error-row-3 {
          animation-delay: 0.2s;
        }

        .how-error-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .dot-red {
          background: var(--red);
        }
        .dot-yellow {
          background: var(--yellow);
        }
        .dot-green {
          background: var(--green);
        }

        .how-error-main {
          flex: 1;
        }

        .how-error-label {
          font-size: 13px;
          color: var(--text);
        }

        .how-error-detail {
          font-size: 12px;
          color: var(--text3);
        }

        .how-error-count {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          color: var(--text2);
        }

        .how-diff {
          margin-top: 12px;
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid var(--border);
          padding: 14px 16px;
          font-family: 'Geist Mono', monospace;
          font-size: 13.5px;
        }

        .how-diff-line {
          margin-bottom: 6px;
        }

        /* Testimonials */
        .testimonials-section {
          padding: 72px 0 60px;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .testimonial-card {
          background: var(--surface);
          border-radius: 12px;
          border: 1px solid var(--border);
          padding: 24px 22px 20px;
        }

        .testimonial-text {
          font-size: 14px;
          color: var(--text2);
          line-height: 1.7;
          margin-bottom: 20px;
        }

        .testimonial-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .testimonial-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Geist Mono', monospace;
          font-size: 11px;
          color: var(--text2);
        }

        .testimonial-name {
          font-size: 13px;
          font-weight: 700;
        }

        .testimonial-role {
          font-size: 12px;
          color: var(--text3);
        }

        .testimonial-stars {
          color: var(--yellow);
          font-size: 13px;
        }

        /* CTA */
        .cta-section {
          position: relative;
          background: var(--bg2);
          border-top: 1px solid var(--border);
          padding: 100px 0;
          text-align: center;
          overflow: hidden;
        }

        .cta-inner {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .cta-glow {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 300px;
          background: radial-gradient(circle at center, rgba(255,255,255,0.04) 0%, transparent 65%);
          pointer-events: none;
        }

        .cta-title {
          font-size: clamp(40px, 5vw, 62px);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 12px;
        }

        .cta-subtext {
          font-size: 16px;
          color: var(--text2);
          line-height: 1.65;
          max-width: 440px;
          margin: 0 auto 22px;
        }

        /* Footer */
        .landing-footer {
          padding: 28px 24px 28px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1120px;
          margin: 0 auto;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-logo {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #080808;
          font-family: 'Geist Mono', monospace;
        }

        .footer-text {
          font-size: 13px;
          color: var(--text2);
        }

        .footer-center {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .footer-center button {
          border: none;
          background: transparent;
          color: var(--text3);
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          transition: color 0.16s var(--ease-devin);
        }

        .footer-center button:hover {
          color: var(--text2);
        }

        .footer-right {
          font-size: 12px;
          color: var(--text3);
        }

        /* Reveal system */
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 0.65s var(--ease-devin),
            transform 0.65s var(--ease-devin);
        }

        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal-delay-0 {
          transition-delay: 0s;
        }

        .reveal-delay-1 {
          transition-delay: 0.08s;
        }

        .reveal-delay-2 {
          transition-delay: 0.16s;
        }

        .reveal-delay-3 {
          transition-delay: 0.24s;
        }

        .reveal-delay-4 {
          transition-delay: 0.32s;
        }

        /* Animations */
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translateX(-50%) scale(1.05);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .nav-center {
            display: none;
          }
          .how-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 32px;
          }
          .bento-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .bento-cell.large,
          .bento-cell.medium,
          .bento-cell.small {
            grid-column: span 1;
          }
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 24px;
          }
          .testimonials-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .landing-navbar {
            padding: 0 18px;
          }
          .landing-footer {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .hero-section {
            padding-top: 110px;
          }
          .hero-title {
            font-size: clamp(40px, 10vw, 52px);
          }
          .stats-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  )
}

