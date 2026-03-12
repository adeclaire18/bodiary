import { AnimatePresence, motion } from 'framer-motion'
import type React from 'react'

export type StepKey = 1 | 2 | 3

type Props = {
  step: StepKey
  onStepChange: (s: StepKey) => void
  canGoNext: (s: StepKey) => boolean
  render: (s: StepKey) => React.ReactNode
}

export default function StepPager(props: Props) {
  return (
    <div>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={props.step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {props.render(props.step)}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}