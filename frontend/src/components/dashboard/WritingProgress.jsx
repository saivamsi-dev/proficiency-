/**
 * Writing Progress Visualization Component
 * Shows total words written, accuracy, improvement trend, and progress rings.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import client from '../../api/client'
import { ProgressRing, Sparkline } from '../charts/Charts'
import AnimatedNumber from '../ui/AnimatedNumber'
import { calculateWritingProgress, calculateWeeklyTrend } from '../../lib/analytics'
import { cardHover } from '../../lib/motionVariants'

export default function WritingProgress({ stats = {} }) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({
    totalWords: 0,
    accuracyPercent: 0,
    improvementTrend: 0,
    avgWordsPerSubmission: 0,
  })
  const [weeklyData, setWeeklyData] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await client.get('/exercises/history')
        const data = res.data || []
        setProgress(calculateWritingProgress(data))
        setWeeklyData(calculateWeeklyTrend(data))
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <ProgressSkeleton />
  }

  const sparklineData = weeklyData.map(w => w.accuracy)

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
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ color: '#2dd4bf' }}>✦</span>
        Progress Insights
      </h3>
      <p style={{
        fontSize: '0.8rem',
        color: '#6b6b6b',
        marginBottom: '24px',
      }}>
        Your writing journey at a glance
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
      }}>
        {/* Total Words */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(124,106,247,0.08)',
            border: '1px solid rgba(124,106,247,0.15)',
            borderRadius: '12px',
            padding: '18px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#9d8ff9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Words Written
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            <AnimatedNumber value={progress.totalWords} />
          </div>
        </motion.div>

        {/* Accuracy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'rgba(45,212,191,0.08)',
            border: '1px solid rgba(45,212,191,0.15)',
            borderRadius: '12px',
            padding: '18px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Accuracy Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            <AnimatedNumber value={progress.accuracyPercent} />%
          </div>
        </motion.div>

        {/* Improvement Trend with Sparkline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '18px',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Improvement Trend
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: progress.improvementTrend >= 0 ? '#22c55e' : '#ef4444',
                }}>
                  {progress.improvementTrend >= 0 ? '+' : ''}{progress.improvementTrend}%
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  color: progress.improvementTrend >= 0 ? '#22c55e' : '#ef4444',
                  background: progress.improvementTrend >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}>
                  {progress.improvementTrend >= 0 ? '↑ improving' : '↓ needs work'}
                </span>
              </div>
            </div>
            {sparklineData.length >= 2 && (
              <Sparkline
                data={sparklineData}
                width={100}
                height={30}
                color={progress.improvementTrend >= 0 ? '#22c55e' : '#ef4444'}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* Progress Rings */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <ProgressRing
          value={stats.current_streak || 0}
          max={30}
          size={70}
          strokeWidth={6}
          color="#f59e0b"
          label="Streak"
        />
        <ProgressRing
          value={stats.exercises_today || 0}
          max={5}
          size={70}
          strokeWidth={6}
          color="#22c55e"
          label="Today"
        />
        <ProgressRing
          value={Math.min(stats.weekly_xp || 0, 200)}
          max={200}
          size={70}
          strokeWidth={6}
          color="#7c6af7"
          label="XP"
        />
      </div>
    </motion.div>
  )
}

function ProgressSkeleton() {
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
          width: '50%',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          marginBottom: '24px',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            style={{
              height: '80px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              gridColumn: i === 3 || i === 4 ? 'span 1' : 'span 1',
            }}
          />
        ))}
      </div>
    </div>
  )
}
