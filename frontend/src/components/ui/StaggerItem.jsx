import { motion } from 'framer-motion'

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function StaggerItem({ children, className = '', style = {} }) {
  return (
    <motion.div variants={item} className={className} style={style}>
      {children}
    </motion.div>
  )
}
