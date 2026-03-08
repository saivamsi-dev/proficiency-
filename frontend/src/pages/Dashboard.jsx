import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import {
  LayoutDashboard, PenLine, BarChart2, BookOpen, Trophy, Settings,
  LogOut, TrendingUp, TrendingDown, Flame, Target, ArrowRight,
} from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import Reveal from '../components/ui/Reveal'
import StaggerGroup from '../components/ui/StaggerGroup'
import StaggerItem from '../components/ui/StaggerItem'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

/* ── Sidebar nav items ── */
const navItems = [
  { to: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={16} />, end: true },
  { to: '/practice', label: 'Practice', icon: <PenLine size={16} /> },
  { to: '/dashboard', label: 'Analytics', icon: <BarChart2 size={16} /> },
  { to: '/dashboard', label: 'Training', icon: <BookOpen size={16} /> },
  { to: '/dashboard', label: 'Achievements', icon: <Trophy size={16} /> },
  { to: '/dashboard', label: 'Settings', icon: <Settings size={16} /> },
]

/* ── Heatmap colors ── */
function heatColor(count) {
  if (!count) return '#161616'
  if (count === 1) return '#1a2e1a'
  if (count === 2) return '#166534'
  if (count === 3) return '#15803d'
  return '#22c55e'
}

/* ── Skeleton ── */
function Skeleton({ w = '100%', h = 16, r = 6 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

/* ── Stat card ── */
function StatCard({ icon, value, suffix = '', label, change, loading }) {
  const positive = change >= 0
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '24px',
    }}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton w={32} h={32} r={8} />
          <Skeleton w="60%" h={32} />
          <Skeleton w="40%" h={14} />
        </div>
      ) : (
        <>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--bg)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text2)', marginBottom: 16,
          }}>
            {icon}
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>
            <AnimatedNumber value={value} suffix={suffix} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
            {change !== undefined && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: positive ? 'var(--green)' : 'var(--red)',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {positive ? '+' : ''}{change}%
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Sidebar ── */
function Sidebar({ user, activeLabel, onLabelChange, onLogout }) {
  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5, background: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0A0A0A', fontWeight: 800, fontSize: 11 }}>P</span>
          </div>
          <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>
            Proficiency<span style={{ color: '#FFFFFF' }}>+</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map((item) => {
          const isActive = activeLabel === item.label
          return (
            <Link key={item.label} to={item.to} style={{ textDecoration: 'none' }}
              onClick={() => onLabelChange(item.label)}>
              <div style={{ position: 'relative', marginBottom: 2 }}>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 8,
                    }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <div style={{
                  position: 'relative', zIndex: 1,
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  color: isActive ? 'var(--text)' : 'var(--text2)',
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.15s ease',
                  cursor: 'pointer',
                }}>
                  {item.icon}
                  {item.label}
                </div>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      {user && (
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--text2)', flexShrink: 0,
            }}>
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button onClick={onLogout} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: 4, borderRadius: 4,
            }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Activity Heatmap ── */
function ActivityHeatmap({ activities }) {
  const WEEKS = 26
  const today = new Date()
  const cells = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() - (w * 7 + (6 - d)))
      const key = date.toISOString().split('T')[0]
      const count = activities?.[key] || 0
      cells.push({ date: key, count, label: `${date.toDateString()} · ${count} session${count !== 1 ? 's' : ''}` })
    }
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${WEEKS}, 11px)`,
        gridTemplateRows: 'repeat(7, 11px)',
        gap: 2,
        width: 'fit-content',
      }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.label}
            style={{
              width: 11, height: 11, borderRadius: 2,
              background: heatColor(cell.count),
              transition: 'opacity 0.15s ease',
              cursor: 'default',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Less</span>
        {['#161616', '#1a2e1a', '#166534', '#15803d', '#22c55e'].map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>More</span>
      </div>
    </div>
  )
}

/* ── Dark recharts tooltip ── */
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

/* ── Dashboard ── */
export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [activities, setActivities] = useState({})
  const [errorCats, setErrorCats] = useState([])
  const [achievements, setAchievements] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [activeLabel, setActiveLabel] = useState('Overview')

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, historyRes, activitiesRes, trainRes] = await Promise.allSettled([
          client.get('/exercises/stats'),
          client.get('/exercises/history'),
          client.get('/exercises/activity'),
          client.get('/training/suggestions'),
        ])

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (historyRes.status === 'fulfilled') {
          const data = historyRes.value.data || []
          setHistory(data.slice(-12).map((d, i) => ({
            week: `W${i + 1}`,
            accuracy: d.accuracy_score || 0,
          })))
          // Build error category breakdown
          const cats = {}
          data.forEach(session => {
            (session.errors || []).forEach(err => {
              const cat = err.error_type || 'Other'
              cats[cat] = (cats[cat] || 0) + 1
            })
          })
          setErrorCats(
            Object.entries(cats)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([name, count]) => ({ name, count }))
          )
        }
        if (activitiesRes.status === 'fulfilled') setActivities(activitiesRes.value.data || {})
        if (trainRes.status === 'fulfilled') setSuggestions((trainRes.value.data || []).slice(0, 3))
        setAchievements([
          { id: 1, emoji: '🔥', title: '7-Day Streak', desc: 'Practice 7 days in a row', unlocked: true },
          { id: 2, emoji: '✍️', title: 'First Correction', desc: 'Submit your first text', unlocked: true },
          { id: 3, emoji: '🎯', title: '90% Accuracy', desc: 'Score 90+ in a session', unlocked: false },
          { id: 4, emoji: '📸', title: 'OCR Explorer', desc: 'Use image upload once', unlocked: true },
          { id: 5, emoji: '📚', title: '100 Sessions', desc: 'Complete 100 sessions', unlocked: false },
          { id: 6, emoji: '🏆', title: 'Top Learner', desc: 'Reach top 1% of users', unlocked: false },
          { id: 7, emoji: '⚡', title: 'Speed Typer', desc: 'Submit in under 30s', unlocked: true },
          { id: 8, emoji: '🌱', title: 'Consistent', desc: 'Practice 30 days total', unlocked: false },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { icon: <Target size={16} />, value: stats?.total_sessions || 0, label: 'Total sessions', change: 12, suffix: '' },
    { icon: <PenLine size={16} />, value: stats?.total_corrections || 0, label: 'Corrections fixed', change: 8, suffix: '' },
    { icon: <Flame size={16} />, value: stats?.current_streak || 0, label: 'Day streak', change: 0, suffix: '' },
    { icon: <BarChart2 size={16} />, value: stats?.avg_accuracy || 0, label: 'Avg. accuracy', change: 4, suffix: '%' },
  ]

  return (
    <div style={{ display: 'flex', background: 'var(--bg)', minHeight: '100vh' }}>
      <Sidebar user={user} activeLabel={activeLabel} onLabelChange={setActiveLabel} onLogout={() => { logout(); navigate('/') }} />

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              {greeting}{user?.username ? `, ${user.username}` : ''} 👋
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link to="/practice" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.01, background: '#E5E5E5' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: '#FFFFFF', color: '#0A0A0A', border: 'none',
                borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              Practice now <ArrowRight size={14} />
            </motion.button>
          </Link>
        </motion.div>

        {/* Stat cards */}
        <StaggerGroup style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <StaggerItem key={i}>
              <StatCard {...s} loading={loading} />
            </StaggerItem>
          ))}
        </StaggerGroup>

        {/* Bento row 1: Heatmap (8) + Streak (4) */}
        <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 16, marginBottom: 16 }}>
          <Reveal>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 24,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Activity</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Last 26 weeks</div>
              {loading
                ? <Skeleton h={11 * 7 + 6 * 6} />
                : <ActivityHeatmap activities={activities} />
              }
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 24, height: '100%',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Current streak</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Practice days in a row</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 8 }}>🔥</div>
                <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  {loading ? '-' : (stats?.current_streak || 0)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>days</div>
              </div>
              <div style={{
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 8, padding: '8px 12px', textAlign: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>Keep it going!</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bento row 2: Progress chart (6) + Error analytics (6) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Reveal>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Accuracy over time</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Weekly accuracy score</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={loading || !history.length
                  ? Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, accuracy: 50 + Math.random() * 30 }))
                  : history}
                >
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: '#525252', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#525252', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="accuracy" name="Accuracy" stroke="#F5F5F5" strokeWidth={1.5} fill="url(#accGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Error breakdown</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>By category</div>
              {errorCats.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={errorCats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#525252', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#A3A3A3', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Errors"
                      fill="rgba(255,255,255,0.15)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                  {['Tense', 'Pronoun', 'Spelling', 'Punctuation', 'Agreement'].map((cat, i) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text2)', width: 80, flexShrink: 0 }}>{cat}</div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${[65, 40, 80, 30, 55][i]}%`, background: 'rgba(255,255,255,0.25)', borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', width: 30, textAlign: 'right' }}>{[65, 40, 80, 30, 55][i]}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* Bento row 3: Achievements (8) + Training (4) */}
        <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 16 }}>
          <Reveal>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Achievements</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {achievements.map((a) => (
                  <motion.div
                    key={a.id}
                    whileHover={a.unlocked ? { scale: 1.02 } : {}}
                    title={a.desc}
                    style={{
                      background: 'var(--bg2)',
                      border: `1px solid ${a.unlocked ? 'var(--border-hover)' : 'var(--border)'}`,
                      borderRadius: 10, padding: 14,
                      textAlign: 'center',
                      opacity: a.unlocked ? 1 : 0.3,
                      filter: a.unlocked ? 'none' : 'grayscale(1)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{a.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{a.title}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Training</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Suggested for you</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(suggestions.length > 0 ? suggestions : [
                  { id: 1, title: 'Present Perfect Tense', difficulty: 'Medium', description: 'Master when to use "have/has + past participle"', progress: 40 },
                  { id: 2, title: 'Pronoun Agreement', difficulty: 'Easy', description: 'Match pronouns to their antecedents correctly', progress: 20 },
                  { id: 3, title: 'Comma Usage', difficulty: 'Hard', description: 'Learn the 7 main rules for comma placement', progress: 0 },
                ]).map((s) => {
                  const diffColor = s.difficulty === 'Easy' ? 'var(--green)' : s.difficulty === 'Hard' ? 'var(--red)' : 'var(--yellow)'
                  return (
                    <div key={s.id} style={{
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, flex: 1 }}>
                          {s.title}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          color: diffColor,
                          border: `1px solid ${diffColor}`,
                          borderRadius: 999,
                          padding: '2px 8px',
                          flexShrink: 0,
                          marginLeft: 8,
                        }}>
                          {s.difficulty}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.4 }}>
                        {s.description}
                      </p>
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.progress || 0}%`, background: '#FFFFFF', borderRadius: 999 }} />
                      </div>
                      <Link to="/practice" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Start <ArrowRight size={12} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </div>

      </main>
    </div>
  )
}