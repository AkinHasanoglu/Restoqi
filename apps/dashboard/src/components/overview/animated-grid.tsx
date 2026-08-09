'use client'

import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
}

interface AnimatedGridProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedGrid({ children, className }: AnimatedGridProps) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function AnimatedGridItem({ children, className }: AnimatedGridProps) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  )
}
