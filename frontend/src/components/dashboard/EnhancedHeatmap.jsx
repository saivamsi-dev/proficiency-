/**
 * Enhanced Activity Heatmap
 * Displays activity with tooltips, color gradients, and submission details.
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Generate color based on activity intensity (0-5 scale)
 */
function getIntensityColor(intensity) {
  const colors = [
    'rgba(63,63,70,0.3)',     // 0 - no activity
    'rgba(74,222,128,0.2)',   // 1 - minimal
    'rgba(74,222,128,0.4)',   // 2 - light
    'rgba(74,222,128,0.6)',   // 3 - moderate
    'rgba(74,222,128,0.8)',   // 4 - high
    'rgba(34,197,94,1)',      // 5 - max
  ]
  return colors[Math.min(intensity, 5)]
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Generate last N weeks of dates
 */
function generateCalendarData(activityData = [], weeks = 12) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find date of last Sunday
  const lastSunday = new Date(today)
  lastSunday.setDate(today.getDate() - today.getDay())

  // Build activity lookup
  const activityMap = {}
  activityData.forEach(a => {
    activityMap[a.date] = a
  })

  // Generate weeks (columns)
  const columns = []
  for (let w = weeks - 1; w >= 0; w--) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastSunday)
      date.setDate(lastSunday.getDate() - (w * 7) + d)

      const dateStr = date.toISOString().split('T')[0]
      const activity = activityMap[dateStr]

      week.push({
        date: dateStr,
        dayOfWeek: d,
        submissions: activity?.exercise_count || activity?.submission_count || 0,
        accuracy: activity?.avg_accuracy,
        errors: activity?.total_errors || 0,
        words: activity?.total_words || 0,
        isFuture: date > today,
        isToday: dateStr === today.toISOString().split('T')[0],
      })
    }
    columns.push(week)
  }

  return columns
}

export default function EnhancedHeatmap({ 
  activityData = [], 
  weeks = 12,
  onDayClick,
}) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const calendar = useMemo(() => generateCalendarData(activityData, weeks), [activityData, weeks])

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Quick stats
  const totalSubmissions = activityData.reduce((sum, a) => sum + (a.submission_count || 0), 0)
  const activeDays = activityData.filter(a => a.submission_count > 0).length
  const longestStreak = calculateStreak(activityData)

  function handleDayClick(day) {
    if (day.submissions > 0 && !day.isFuture) {
      setSelectedDay(selectedDay?.date === day.date ? null : day)
      onDayClick?.(day)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: '#e4e4e7',
          margin: 0,
        }}>
          📅 Activity Heatmap
        </h3>

        {/* Quick Stats */}
        <div style={{
          display: 'flex',
          gap: '16px',
        }}>
          <Stat value={totalSubmissions} label="Submissions" />
          <Stat value={activeDays} label="Active Days" />
          <Stat value={longestStreak} label="Best Streak" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {/* Day labels */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginRight: '8px',
        }}>
          {dayLabels.map((label, i) => (
            <span
              key={label}
              style={{
                fontSize: '0.6rem',
                color: '#52525b',
                width: '24px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                visibility: i % 2 === 1 ? 'visible' : 'hidden',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Weeks */}
        <div style={{
          display: 'flex',
          gap: '3px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}>
          {calendar.map((week, wIdx) => (
            <div key={wIdx} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              {week.map(day => {
                const intensity = Math.min(day.submissions, 5)
                const isHovered = hoveredDay?.date === day.date
                const isSelected = selectedDay?.date === day.date

                return (
                  <motion.div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => handleDayClick(day)}
                    whileHover={{ scale: 1.2, zIndex: 10 }}
                    animate={{
                      scale: isSelected ? 1.2 : 1,
                      boxShadow: isSelected 
                        ? '0 0 12px rgba(74,222,128,0.5)'
                        : 'none',
                    }}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      background: day.isFuture
                        ? 'rgba(39,39,42,0.3)'
                        : getIntensityColor(intensity),
                      cursor: day.submissions > 0 && !day.isFuture 
                        ? 'pointer' : 'default',
                      border: day.isToday
                        ? '2px solid rgba(124,106,247,0.6)'
                        : isSelected
                          ? '2px solid rgba(74,222,128,0.8)'
                          : '1px solid transparent',
                      position: 'relative',
                    }}
                  >
                    {/* Tooltip */}
                    <AnimatePresence>
                      {isHovered && !day.isFuture && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.9 }}
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '8px',
                            background: '#18181b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            zIndex: 100,
                            minWidth: '140px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                          }}
                        >
                          <p style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#e4e4e7',
                            margin: '0 0 6px',
                          }}>
                            {formatDate(day.date)}
                          </p>
                          {day.submissions > 0 ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}>
                              <TooltipRow
                                label="Submissions"
                                value={day.submissions}
                              />
                              {day.words > 0 && (
                                <TooltipRow
                                  label="Words"
                                  value={day.words.toLocaleString()}
                                />
                              )}
                              {day.accuracy !== undefined && (
                                <TooltipRow
                                  label="Accuracy"
                                  value={`${Math.round(day.accuracy)}%`}
                                  color={day.accuracy >= 80 ? '#4ade80' : '#f59e0b'}
                                />
                              )}
                            </div>
                          ) : (
                            <p style={{
                              fontSize: '0.65rem',
                              color: '#71717a',
                              margin: 0,
                            }}>
                              No activity
                            </p>
                          )}
                          {/* Arrow */}
                          <div style={{
                            position: 'absolute',
                            bottom: '-5px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '8px',
                            height: '8px',
                            background: '#18181b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderTop: 'none',
                            borderLeft: 'none',
                          }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#52525b' }}>Less</span>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: getIntensityColor(i),
              }}
            />
          ))}
          <span style={{ fontSize: '0.65rem', color: '#52525b' }}>More</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              border: '2px solid rgba(124,106,247,0.6)',
              background: 'transparent',
            }} />
            <span style={{ fontSize: '0.65rem', color: '#52525b' }}>Today</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details */}
      <AnimatePresence>
        {selectedDay && selectedDay.submissions > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '16px',
              overflow: 'hidden',
            }}
          >
            <div style={{
              background: 'rgba(74,222,128,0.05)',
              border: '1px solid rgba(74,222,128,0.15)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <h4 style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#e4e4e7',
                  margin: 0,
                }}>
                  {formatDate(selectedDay.date)}
                </h4>
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '0.9rem',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '12px',
              }}>
                <DetailCard
                  icon="📝"
                  label="Submissions"
                  value={selectedDay.submissions}
                />
                <DetailCard
                  icon="📊"
                  label="Words Written"
                  value={selectedDay.words.toLocaleString()}
                />
                <DetailCard
                  icon="✅"
                  label="Accuracy"
                  value={`${Math.round(selectedDay.accuracy || 0)}%`}
                />
                <DetailCard
                  icon="❌"
                  label="Errors Found"
                  value={selectedDay.errors}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span style={{
        fontSize: '0.95rem',
        fontWeight: 700,
        color: '#e4e4e7',
      }}>
        {value}
      </span>
      <span style={{
        fontSize: '0.65rem',
        color: '#71717a',
        display: 'block',
      }}>
        {label}
      </span>
    </div>
  )
}

function TooltipRow({ label, value, color = '#e4e4e7' }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      <span style={{ fontSize: '0.65rem', color: '#71717a' }}>{label}</span>
      <span style={{ fontSize: '0.65rem', fontWeight: 600, color }}>{value}</span>
    </div>
  )
}

function DetailCard({ icon, label, value }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '8px',
      padding: '12px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      <p style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: '#e4e4e7',
        margin: '4px 0 2px',
      }}>
        {value}
      </p>
      <p style={{
        fontSize: '0.65rem',
        color: '#71717a',
        margin: 0,
      }}>
        {label}
      </p>
    </div>
  )
}

/**
 * Calculate longest streak from activity data
 */
function calculateStreak(activityData) {
  if (!activityData.length) return 0

  const dates = activityData
    .filter(a => a.submission_count > 0)
    .map(a => new Date(a.date))
    .sort((a, b) => a - b)

  if (!dates.length) return 0

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}
