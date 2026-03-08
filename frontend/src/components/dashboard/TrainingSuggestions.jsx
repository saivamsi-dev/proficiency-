/**
 * Smart Training Suggestions Component
 * Shows personalized practice recommendations based on error patterns.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { identifyWeaknesses } from '../../lib/analytics'
import { cardHover, staggerItem } from '../../lib/motionVariants'

const categoryIcons = {
  'Articles': '📝',
  'Prepositions': '🔗',
  'Tense': '⏱️',
  'Subject Verb': '🎯',
  'Spelling': '🔤',
  'Vocabulary': '📚',
  'Word Order': '🏗️',
  'Punctuation': '✏️',
  'Other': '💡',
}

const categoryColors = {
  'Articles': '#7c6af7',
  'Prepositions': '#2dd4bf',
  'Tense': '#f59e0b',
  'Subject Verb': '#ef4444',
  'Spelling': '#3b82f6',
  'Vocabulary': '#22c55e',
  'Word Order': '#ec4899',
  'Punctuation': '#8b5cf6',
  'Other': '#6b6b6b',
}

export default function TrainingSuggestions() {
  const [loading, setLoading] = useState(true)
  const [weaknesses, setWeaknesses] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await client.get('/exercises/history')
        const data = res.data || []
        setWeaknesses(identifyWeaknesses(data))
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <SuggestionsSkeleton />
  }

  if (weaknesses.length === 0) {
    return (
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        style={{
          background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '26px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }}>🎯</div>
        <p style={{ color: '#6b6b6b', fontSize: '0.875rem' }}>
          Complete more exercises to get personalized suggestions
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      style={{
        background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '26px',
      }}
    >
      <h3 style={{
        color: '#fff',
        fontSize: '1.125rem',
        fontWeight: 700,
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ color: '#f59e0b' }}>🎯</span>
        Suggested Practice Focus
      </h3>
      <p style={{
        fontSize: '0.8rem',
        color: '#6b6b6b',
        marginBottom: '20px',
      }}>
        Based on your recent mistakes
      </p>

      {/* Weakness Areas */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{
          fontSize: '0.7rem',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '12px',
        }}>
          You often make mistakes in:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {weaknesses.map((weakness, i) => {
            const color = categoryColors[weakness.category] || '#6b6b6b'
            const icon = categoryIcons[weakness.category] || '💡'

            return (
              <motion.div
                key={weakness.category}
                variants={staggerItem}
                initial="hidden"
                animate="visible"
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: `${color}10`,
                  border: `1px solid ${color}25`,
                  borderRadius: '10px',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#e4e4e7', fontSize: '0.9rem', fontWeight: 600, marginBottom: '2px' }}>
                    {weakness.category}
                  </p>
                  <p style={{ color: '#71717a', fontSize: '0.75rem' }}>
                    {weakness.count} errors ({weakness.percentage}%)
                  </p>
                </div>
                <div style={{
                  width: '40px',
                  height: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${weakness.percentage}%` }}
                    transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                    style={{
                      height: '100%',
                      background: color,
                      borderRadius: '2px',
                    }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <p style={{
          fontSize: '0.7rem',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '12px',
        }}>
          Suggested exercises:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {weaknesses.slice(0, 2).map((weakness, i) => (
            <motion.div
              key={`suggestion-${weakness.category}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
              }}
            >
              <span style={{ color: '#7c6af7', fontSize: '0.875rem' }}>→</span>
              <span style={{ color: '#a1a1aa', fontSize: '0.8rem', flex: 1 }}>
                {weakness.suggestion}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link to="/practice" style={{ textDecoration: 'none' }}>
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(124,106,247,0.2)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            background: 'rgba(124,106,247,0.12)',
            border: '1px solid rgba(124,106,247,0.25)',
            borderRadius: '10px',
            color: '#9d8ff9',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          Start Focused Practice
          <span>→</span>
        </motion.button>
      </Link>
    </motion.div>
  )
}

function SuggestionsSkeleton() {
  return (
    <div style={{
      background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '26px',
    }}>
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          height: '20px',
          width: '60%',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      />
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          style={{
            height: '54px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            marginBottom: '10px',
          }}
        />
      ))}
    </div>
  )
}
