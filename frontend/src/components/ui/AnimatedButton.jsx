import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

const styles = {
  primary: {
    background: '#FFFFFF',
    color: '#0A0A0A',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--border-hover)',
  },
  danger: {
    background: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
  },
  dark: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
}

const sizes = {
  sm: { padding: '7px 14px', fontSize: '13px', borderRadius: '8px' },
  md: { padding: '10px 20px', fontSize: '14px', borderRadius: '8px' },
  lg: { padding: '12px 24px', fontSize: '15px', borderRadius: '8px' },
  xl: { padding: '14px 28px', fontSize: '16px', borderRadius: '8px' },
}

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  onClick,
  disabled,
  type = 'button',
  style = {},
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      style={{
        ...styles[variant],
        ...sizes[size],
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        userSelect: 'none',
        outline: 'none',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'background 0.15s ease',
        ...style,
      }}
      whileHover={isDisabled ? {} : { scale: 1.01 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      disabled={isDisabled}
      onClick={onClick}
      className={className}
      {...props}
    >
      {loading && (
        <Loader2
          size={15}
          style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}
        />
      )}
      {children}
    </motion.button>
  )
}
