import { motion } from 'framer-motion'

export default function AnimatedProgressBar({
  value = 0,
  colorClass = 'progress-fill-purple',
  height = 6,
  delay = 0.2,
  glow = 'rgba(124,106,247,0.4)',
}) {
  return (
    <div className="progress-track" style={{ height }}>
      <motion.div
        className={colorClass}
        style={{ height: '100%', borderRadius: 999,
          boxShadow: `0 0 10px ${glow}` }}
        initial={{ width: '0%', opacity: 0 }}
        whileInView={{ width: `${value}%`, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay }}
      />
    </div>
  )
}
