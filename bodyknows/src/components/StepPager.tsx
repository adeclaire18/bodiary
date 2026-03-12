import { AnimatePresence, motion } from 'framer-motion'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

export type StepKey = 1 | 2 | 3

type Props = {
  step: StepKey
  onStepChange: (s: StepKey) => void
  canGoNext: (s: StepKey) => boolean
  render: (s: StepKey) => React.ReactNode
}

function clampStep(n: number): StepKey {
  if (n <= 1) return 1
  if (n >= 3) return 3
  return n as StepKey
}

export default function StepPager(props: Props) {
  const dirRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const dxRef = useRef(0)
  const [dx, setDx] = useState(0)

  useEffect(() => {
    setDragging(false)
    dxRef.current = 0
    setDx(0)
  }, [props.step])

  function tryGo(next: StepKey) {
    if (next === props.step) return
    if (next > props.step && !props.canGoNext(props.step)) return
    props.onStepChange(next)
  }

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true)
    startXRef.current = e.clientX
    dxRef.current = 0
    setDx(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const d = e.clientX - startXRef.current
    dxRef.current = d
    setDx(d)
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    const threshold = 64
    const d = dxRef.current
    dxRef.current = 0
    setDx(0)

    if (d <= -threshold) tryGo(clampStep(props.step + 1))
    if (d >= threshold) tryGo(clampStep(props.step - 1))
  }

  return (
    <div
      className="touch-pan-y select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
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