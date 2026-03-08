/**
 * AI Tip Panel Component
 * Displays rotating writing tips based on user activity.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import client from '../../api/client'
import { generateTips } from '../../lib/analytics'

export default function TipPanel({ stats = {}, minimized = false }) {
  const [tips, setTips] = useState([])
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    async function loadTips() {
      try {
        const res = await client.get('/exercises/history')
        const submissions = res.data || []
        const generatedTips = generateTips(submissions)
        setTips(generatedTips)
      } catch {
        // Fallback to generic tips
        setTips(generateTips({}, []))
      }
    }
    loadTips()
  }, [stats])

  // Auto-rotate tips
  useEffect(() => {
    if (tips.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [tips.length, isPaused])

  const nextTip = useCallback(() => {
    setCurrentTipIndex(prev => (prev + 1) % tips.length)
  }, [tips.length])

  const prevTip = useCallback(() => {
    setCurrentTipIndex(prev => (prev - 1 + tips.length) % tips.length)
  }, [tips.length])

  if (tips.length === 0) {
    return null
  }

  const currentTip = tips[currentTipIndex]

  if (minimized) {
    return (
      <MinimizedTip
        tip={currentTip}
        onNext={nextTip}
        tipNumber={currentTipIndex + 1}
        totalTips={tips.length}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        background: 'linear-gradient(135deg, rgba(124,106,247,0.06) 0%, rgba(45,212,191,0.04) 100%)',
        border: '1px solid rgba(124,106,247,0.15)',
        borderRadius: '14px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '150px',
        height: '150px',
        background: 'radial-gradient(circle, rgba(124,106,247,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            style={{ fontSize: '1rem' }}
          >
            💡
          </motion.span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#9d8ff9',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Writing Tip
          </span>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevTip}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#71717a',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </motion.button>
          <span style={{
            fontSize: '0.65rem',
            color: '#52525b',
            minWidth: '36px',
            textAlign: 'center',
          }}>
            {currentTipIndex + 1}/{tips.length}
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextTip}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#71717a',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </motion.button>
        </div>
      </div>

      {/* Tip Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTipIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          style={{ minHeight: '50px' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{
              fontSize: '1.5rem',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              {currentTip.icon}
            </span>
            <p style={{
              color: '#e4e4e7',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {currentTip.tip}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        marginTop: '16px',
      }}>
        {tips.slice(0, 6).map((_, i) => (
          <motion.button
            key={i}
            onClick={() => setCurrentTipIndex(i)}
            whileHover={{ scale: 1.2 }}
            style={{
              width: i === currentTipIndex ? '16px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === currentTipIndex ? '#7c6af7' : 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '0.6rem',
            color: '#52525b',
          }}
        >
          ⏸ paused
        </motion.div>
      )}
    </motion.div>
  )
}

function MinimizedTip({ tip, onNext, tipNumber, totalTips }) {
  if (!tip) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: 'rgba(124,106,247,0.06)',
        border: '1px solid rgba(124,106,247,0.12)',
        borderRadius: '10px',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{tip.icon}</span>
      <p style={{
        flex: 1,
        color: '#a1a1aa',
        fontSize: '0.8rem',
        margin: 0,
        lineHeight: 1.4,
      }}>
        {tip.tip}
      </p>
      {typeof tipNumber === 'number' && typeof totalTips === 'number' && (
        <span style={{ fontSize: '0.7rem', color: '#71717a', marginRight: 8 }}>
          {tipNumber}/{totalTips}
        </span>
      )}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        style={{
          fontSize: '0.65rem',
          color: '#7c6af7',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
        }}
      >
        Next →
      </motion.button>
    </motion.div>
  )
}

/**
 * Floating tip for specific context
 */
export function ContextTip({ category, onClose }) {
  const contextTips = {
    articles: 'Use "a" before consonant sounds, "an" before vowel sounds. "The" is for specific items.',
    tense: 'Keep your verb tenses consistent throughout a paragraph unless indicating a time change.',
    prepositions: 'Common pairs: "interested in", "good at", "depend on", "listen to", "look forward to".',
    spelling: 'Common mistakes: affect/effect, their/there/they\'re, its/it\'s. Double-check these!',
    punctuation: 'Use commas before coordinating conjunctions (and, but, or) in compound sentences.',
    default: 'Read your text aloud to catch awkward phrasing and missing words.',
  }

  const tip = contextTips[category?.toLowerCase()] || contextTips.default

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
        border: '1px solid rgba(124,106,247,0.2)',
        borderRadius: '10px',
        padding: '14px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        maxWidth: '300px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '1rem' }}>💡</span>
          <p style={{
            color: '#d4d4d8',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {tip}
          </p>
        </div>
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: '#6b6b6b',
              fontSize: '0.7rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
