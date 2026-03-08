import { motion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function StaggerGroup({ children, className = '', style = {}, once = true }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
