/**
 * UI Enhancement Components
 * Loading skeletons, keyboard shortcuts, transitions
 */
import { motion } from 'framer-motion'

/**
 * Skeleton loading placeholder
 */
export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '8px',
  className = '', 
}) {
  return (
    <motion.div
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(63,63,70,0.3) 25%, rgba(82,82,91,0.4) 50%, rgba(63,63,70,0.3) 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}

/**
 * Skeleton for a stat card
 */
export function StatCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <Skeleton width="40%" height="0.75rem" />
      <div style={{ height: '8px' }} />
      <Skeleton width="60%" height="2rem" />
      <div style={{ height: '8px' }} />
      <Skeleton width="80%" height="0.65rem" />
    </div>
  )
}

/**
 * Skeleton for text block
 */
export function TextBlockSkeleton({ lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === lines - 1 ? '60%' : '100%'} 
          height="0.85rem" 
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for the dashboard grid
 */
export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
      }}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {/* Left panel */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <Skeleton width="40%" height="1.25rem" />
          <div style={{ height: '20px' }} />
          <TextBlockSkeleton lines={4} />
        </div>

        {/* Right panel */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <Skeleton width="50%" height="1.25rem" />
          <div style={{ height: '20px' }} />
          <Skeleton width="100%" height="120px" borderRadius="12px" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for practice page
 */
export function PracticeSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <Skeleton width="30%" height="1.5rem" />
      <div style={{ height: '24px' }} />
      <Skeleton width="100%" height="200px" borderRadius="12px" />
      <div style={{ height: '20px' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Skeleton width="120px" height="44px" borderRadius="22px" />
      </div>
    </div>
  )
}

/**
 * Keyboard shortcut key display
 */
export function KbdKey({ children }) {
  return (
    <kbd style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '24px',
      height: '24px',
      padding: '0 8px',
      fontSize: '0.7rem',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      color: '#a1a1aa',
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px',
      boxShadow: '0 2px 0 rgba(0,0,0,0.3)',
    }}>
      {children}
    </kbd>
  )
}

/**
 * Keyboard shortcuts help panel
 */
export function KeyboardShortcutsHelp({ shortcuts = [] }) {
  const defaultShortcuts = [
    { keys: ['Ctrl', 'Enter'], action: 'Submit text' },
    { keys: ['Ctrl', 'E'], action: 'Explain mistake' },
    { keys: ['Ctrl', '/'], action: 'Focus text input' },
    { keys: ['Esc'], action: 'Clear selection' },
  ]

  const items = shortcuts.length > 0 ? shortcuts : defaultShortcuts

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(24,24,27,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#71717a',
        margin: '0 0 12px',
      }}>
        Keyboard Shortcuts
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {items.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              {s.keys.map((k, ki) => (
                <span key={ki} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <KbdKey>{k}</KbdKey>
                  {ki < s.keys.length - 1 && (
                    <span style={{ color: '#52525b', fontSize: '0.65rem' }}>+</span>
                  )}
                </span>
              ))}
            </div>
            <span style={{
              fontSize: '0.75rem',
              color: '#a1a1aa',
            }}>
              {s.action}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/**
 * Fade in animation wrapper
 */
export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.4,
  y = 20,
  ...props 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Scale fade wrapper
 */
export function ScaleFade({ 
  children, 
  delay = 0,
  ...props 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * Error state display
 */
export function ErrorState({ 
  message = 'Something went wrong', 
  onRetry,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontSize: '3rem',
        marginBottom: '16px',
      }}>
        😕
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#e4e4e7',
        margin: '0 0 8px',
      }}>
        Oops!
      </h3>
      <p style={{
        fontSize: '0.85rem',
        color: '#71717a',
        margin: '0 0 20px',
        maxWidth: '300px',
      }}>
        {message}
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid rgba(124,106,247,0.3)',
            background: 'rgba(124,106,247,0.1)',
            color: '#9d8ff9',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  )
}

/**
 * Empty state display
 */
export function EmptyState({ 
  icon = '📭',
  title = 'Nothing here yet',
  description,
  action,
  onAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontSize: '3rem',
        marginBottom: '16px',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#e4e4e7',
        margin: '0 0 8px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '0.85rem',
          color: '#71717a',
          margin: '0 0 20px',
          maxWidth: '300px',
        }}>
          {description}
        </p>
      )}
      {action && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #7c6af7 0%, #9d8ff9 100%)',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {action}
        </motion.button>
      )}
    </motion.div>
  )
}

/**
 * Success toast notification
 */
export function Toast({ 
  message, 
  type = 'success', // 'success' | 'error' | 'info'
  onClose,
}) {
  const config = {
    success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', color: '#4ade80', icon: '✓' },
    error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#f87171', icon: '✕' },
    info: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#60a5fa', icon: 'ℹ' },
  }

  const c = config[type] || config.info

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: c.border,
        color: c.color,
        fontSize: '0.8rem',
        fontWeight: 700,
      }}>
        {c.icon}
      </span>
      <span style={{
        fontSize: '0.85rem',
        color: '#e4e4e7',
        fontWeight: 500,
      }}>
        {message}
      </span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px',
            marginLeft: '8px',
          }}
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

/**
 * Pulse animation for live indicators
 */
export function PulseIndicator({ color = '#4ade80', size = 8 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <motion.span
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.7, 0, 0.7],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
        }}
      />
      <span style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
      }} />
    </span>
  )
}
