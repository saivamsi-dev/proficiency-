import { useState, useEffect } from 'react'

/**
 * Minimal animated background:
 * - Pure dark background
 * - Subtle dot grid
 * - Very soft, gray cursor-following light (no colours)
 */
export default function DotGrid({ className = '', showGlow = false, children }) {
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    function handleMove(e) {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX / innerWidth) * 100
      const y = (e.clientY / innerHeight) * 100
      setCursorPos({ x, y })
    }

    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        background: '#000000',
        overflow: 'hidden',
      }}
      className={className}
    >

      {/* Static dot grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />

      {/* Cursor-reactive spotlight (very subtle, grayscale) */}
      {showGlow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${cursorPos.x}% ${cursorPos.y}%, rgba(148,163,184,0.22), transparent 60%)`,
            opacity: 0.55,
            pointerEvents: 'none',
            transition: 'background-position 0.12s ease-out',
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
