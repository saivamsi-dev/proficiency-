/**
 * Error Analytics Dashboard Component
 * Displays charts for error categories, weekly trends, and severity distribution.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import client from '../../api/client'
import { PieChart, LineChart, BarChart } from '../charts/Charts'
import {
  analyzeErrorCategories,
  calculateWeeklyTrend,
  analyzeSeverityDistribution,
} from '../../lib/analytics'
import { cardHover, staggerContainer, staggerItem } from '../../lib/motionVariants'

export default function ErrorAnalytics() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorCategories, setErrorCategories] = useState({ categories: [], total: 0 })
  const [weeklyTrend, setWeeklyTrend] = useState([])
  const [severityDist, setSeverityDist] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await client.get('/exercises/history')
        const data = res.data || []
        setSubmissions(data)

        // Analyze the data
        setErrorCategories(analyzeErrorCategories(data))
        setWeeklyTrend(calculateWeeklyTrend(data))
        setSeverityDist(analyzeSeverityDistribution(data))
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <AnalyticsSkeletons />
  }

  if (submissions.length === 0) {
    return (
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        style={{
          background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '40px 26px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '16px', opacity: 0.3 }}>📊</div>
        <p style={{ color: '#6b6b6b', fontSize: '0.9375rem' }}>
          Complete some exercises to see your analytics
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Section Header */}
      <motion.div variants={staggerItem} style={{ marginBottom: '20px' }}>
        <h2 style={{
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: 700,
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ color: '#7c6af7' }}>📊</span>
          Error Analytics
        </h2>
        <p style={{ color: '#6b6b6b', fontSize: '0.8rem' }}>
          Insights from your last {submissions.length} submissions
        </p>
      </motion.div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {/* Error Categories Pie Chart */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3, borderColor: 'rgba(124,106,247,0.25)' }}
          style={{
            background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '22px',
            transition: 'all 0.3s ease',
          }}
        >
          <h3 style={{
            color: '#a1a1aa',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '18px',
          }}>
            Error Categories
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <PieChart data={errorCategories.categories.slice(0, 5)} size={130} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {errorCategories.categories.slice(0, 4).map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: ['#7c6af7', '#2dd4bf', '#f59e0b', '#ef4444'][i],
                  }} />
                  <span style={{ color: '#a1a1aa', fontSize: '0.75rem', flex: 1 }}>
                    {cat.name}
                  </span>
                  <span style={{ color: '#6b6b6b', fontSize: '0.7rem' }}>
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Weekly Improvement Trend */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3, borderColor: 'rgba(124,106,247,0.25)' }}
          style={{
            background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '22px',
            transition: 'all 0.3s ease',
          }}
        >
          <h3 style={{
            color: '#a1a1aa',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '18px',
          }}>
            Weekly Accuracy Trend
          </h3>
          <LineChart
            data={weeklyTrend}
            width={260}
            height={120}
            showArea={true}
            showDots={true}
          />
          {weeklyTrend.length >= 2 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
            }}>
              {(() => {
                const first = weeklyTrend[0]?.accuracy || 0
                const last = weeklyTrend[weeklyTrend.length - 1]?.accuracy || 0
                const diff = last - first
                const isPositive = diff >= 0
                return (
                  <>
                    <span style={{
                      color: isPositive ? '#22c55e' : '#ef4444',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      {isPositive ? '↑' : '↓'} {Math.abs(diff)}%
                    </span>
                    <span style={{ color: '#6b6b6b', fontSize: '0.7rem' }}>
                      vs first week
                    </span>
                  </>
                )
              })()}
            </div>
          )}
        </motion.div>

        {/* Severity Distribution */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -3, borderColor: 'rgba(124,106,247,0.25)' }}
          style={{
            background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '22px',
            transition: 'all 0.3s ease',
          }}
        >
          <h3 style={{
            color: '#a1a1aa',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '18px',
          }}>
            Error Severity
          </h3>
          <BarChart
            data={severityDist}
            width={260}
            height={100}
            horizontal={true}
          />
          <p style={{
            color: '#52525b',
            fontSize: '0.7rem',
            marginTop: '12px',
          }}>
            Focus on reducing high-severity errors first
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

function AnalyticsSkeletons() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
    }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '22px',
          }}
        >
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
            style={{
              height: '14px',
              width: '60%',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '4px',
              marginBottom: '18px',
            }}
          />
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 + 0.1 }}
            style={{
              height: '100px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
            }}
          />
        </div>
      ))}
    </div>
  )
}
