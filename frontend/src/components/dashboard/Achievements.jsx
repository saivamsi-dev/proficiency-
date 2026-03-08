/**
 * Achievement System Component
 * Displays unlocked and locked achievements as animated badges.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import client from '../../api/client'
import { checkAchievements, getAllAchievements } from '../../lib/analytics'
import { achievementUnlock, cardHover } from '../../lib/motionVariants'

export default function Achievements({ stats = {} }) {
  const [loading, setLoading] = useState(true)
  const [unlockedAchievements, setUnlockedAchievements] = useState([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await client.get('/exercises/history')
        const data = res.data || []
        setUnlockedAchievements(checkAchievements(stats, data))
      } catch (err) {
        console.error('Failed to fetch history:', err)
        setUnlockedAchievements(checkAchievements(stats, []))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [stats])

  if (loading) {
    return <AchievementsSkeleton />
  }

  const allAchievements = getAllAchievements()
  const unlockedIds = new Set(unlockedAchievements.map(a => a.id))

  // Combine unlocked and locked achievements
  const displayAchievements = showAll
    ? allAchievements.map(a => ({
        ...a,
        unlocked: unlockedIds.has(a.id),
      }))
    : unlockedAchievements

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{
            color: '#fff',
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span>🏆</span>
            Achievements
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>
            {unlockedAchievements.length} of {allAchievements.length} unlocked
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAll(!showAll)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#a1a1aa',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {showAll ? 'Show Unlocked' : 'Show All'}
        </motion.button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '6px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedAchievements.length / allAchievements.length) * 100}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #7c6af7, #2dd4bf)',
              borderRadius: '3px',
            }}
          />
        </div>
      </div>

      {/* Achievement Grid */}
      {displayAchievements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#52525b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.5 }}>🎯</div>
          <p style={{ fontSize: '0.875rem' }}>Complete exercises to unlock achievements!</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '12px',
        }}>
          <AnimatePresence mode="popLayout">
            {displayAchievements.map((achievement, i) => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

function AchievementBadge({ achievement, index }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const isUnlocked = achievement.unlocked

  return (
    <motion.div
      variants={achievementUnlock}
      initial="hidden"
      animate="visible"
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        background: isUnlocked
          ? 'linear-gradient(135deg, rgba(124,106,247,0.12) 0%, rgba(45,212,191,0.08) 100%)'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isUnlocked ? 'rgba(124,106,247,0.25)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: '12px',
        padding: '16px 12px',
        textAlign: 'center',
        cursor: 'pointer',
        opacity: isUnlocked ? 1 : 0.5,
        filter: isUnlocked ? 'none' : 'grayscale(1)',
      }}
      whileHover={{
        y: -3,
        boxShadow: isUnlocked ? '0 8px 24px rgba(124,106,247,0.2)' : 'none',
      }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.05 + 0.1, type: 'spring', stiffness: 400 }}
        style={{
          fontSize: '1.75rem',
          marginBottom: '8px',
        }}
      >
        {achievement.icon}
      </motion.div>

      {/* Name */}
      <p style={{
        color: isUnlocked ? '#fff' : '#52525b',
        fontSize: '0.75rem',
        fontWeight: 600,
        marginBottom: '2px',
        lineHeight: 1.3,
      }}>
        {achievement.name}
      </p>

      {/* Locked indicator */}
      {!isUnlocked && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '0.6rem',
          color: '#52525b',
        }}>
          🔒
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              minWidth: '140px',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <p style={{ color: '#f1f1f1', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              {achievement.name}
            </p>
            <p style={{ color: '#71717a', fontSize: '0.7rem', lineHeight: 1.4 }}>
              {achievement.description}
            </p>
            {/* Tooltip arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              background: '#1a1a1a',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock shimmer effect */}
      {isUnlocked && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2, delay: index * 0.1, repeat: Infinity, repeatDelay: 5 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  )
}

function AchievementsSkeleton() {
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
          width: '40%',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '12px',
      }}>
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            style={{
              height: '90px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '12px',
            }}
          />
        ))}
      </div>
    </div>
  )
}
