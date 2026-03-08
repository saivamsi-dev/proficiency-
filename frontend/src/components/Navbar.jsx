import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Testimonials', href: '/#testimonials' },
]

export default function Navbar() {
  const { user } = useAuth()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isLanding = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 100,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          background: scrolled ? 'rgba(10,10,10,0.92)' : 'rgba(10,10,10,0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          transition: 'background 0.3s ease',
        }}
      >
        <div style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 24px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <motion.div
              whileHover={{ opacity: 0.85 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#0A0A0A', fontWeight: 800, fontSize: 12, lineHeight: 1 }}>P</span>
              </div>
              <span style={{
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '-0.02em',
              }}>
                Proficiency<span style={{ color: '#FFFFFF' }}>+</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop nav links */}
          {isLanding && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}
              className="hidden md:flex">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i + 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    color: 'var(--text2)',
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <>
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    style={{
                      background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border-hover)',
                      borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Dashboard
                  </motion.button>
                </Link>
                <Link to="/practice" style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    style={{
                      background: '#FFFFFF', color: '#0A0A0A', border: 'none',
                      borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Practice →
                  </motion.button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" style={{ textDecoration: 'none' }} className="hidden sm:block">
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    style={{
                      background: 'transparent', color: 'var(--text2)',
                      border: '1px solid var(--border-hover)',
                      borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    Sign in
                  </motion.button>
                </Link>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.01, background: '#E5E5E5' }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background: '#FFFFFF', color: '#0A0A0A', border: 'none',
                      borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Get started free
                  </motion.button>
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden"
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text2)',
                display: 'flex', alignItems: 'center',
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 64, left: 0, right: 0,
              zIndex: 99,
              background: 'rgba(10,10,10,0.97)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--border)',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  color: 'var(--text2)', fontSize: 15, fontWeight: 500,
                  padding: '10px 12px', textDecoration: 'none',
                  borderRadius: 6,
                }}
              >
                {link.label}
              </a>
            ))}
            {!user && (
              <Link to="/login" style={{ textDecoration: 'none', marginTop: 8 }}>
                <div style={{
                  color: 'var(--text)', fontSize: 15, fontWeight: 600,
                  padding: '10px 12px',
                }}>
                  Sign in
                </div>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}