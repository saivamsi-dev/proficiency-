import { motion } from 'framer-motion'

export default function AnimatedCard({ children, className = '', style = {}, ...props }) {
  return (
    <motion.div
      className={`card ${className}`}
      style={style}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
