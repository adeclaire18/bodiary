import { useMemo, useRef, useState } from 'react'

type Props = {
  hour: number
  onChange: (h: number) => void
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function angle360FromPoint(x: number, y: number, cx: number, cy: number): number {
  const dx = x - cx
  const dy = y - cy
  // 0° at top, clockwise positive
  const rad = Math.atan2(dy, dx)
  const deg = (rad * 180) / Math.PI
  return (deg + 90 + 360) % 360
}

export default function ClockDial(props: Props) {
  const size = 168
  const draggingRef = useRef(false)
  const prevA360Ref = useRef<number | null>(null)
  const turnsRef = useRef(0)
  const [totalAngle, setTotalAngle] = useState(0) // 0..720

  const displayHour = useMemo(() => clamp(props.hour, 0, 23), [props.hour])

  const needleAngle = useMemo(() => totalAngle % 360, [totalAngle])

  function setFromTotal(a: number) {
    const clamped = clamp(a, 0, 720)
    setTotalAngle(clamped)
    const h = clamp(Math.round(clamped / 30), 0, 23)
    props.onChange(h)
  }

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true
    prevA360Ref.current = null
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const a360 = angle360FromPoint(e.clientX, e.clientY, cx, cy)

    const prev = prevA360Ref.current
    if (prev != null) {
      // crossing 0° boundary
      if (prev > 300 && a360 < 60) turnsRef.current += 1
      if (prev < 60 && a360 > 300) turnsRef.current -= 1
    }
    prevA360Ref.current = a360

    const total = turnsRef.current * 360 + a360
    setFromTotal(total)
  }

  function onPointerUp() {
    draggingRef.current = false
    // enforce boundary mapping: >720 -> 23, <0 -> 0 via clamp
    setFromTotal(totalAngle)
  }

  function resetToNow() {
    const now = new Date()
    props.onChange(now.getHours())
    turnsRef.current = now.getHours() > 11 ? 1 : 0
    setFromTotal(now.getHours() * 30)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative grid place-items-center rounded-full border border-black/10 bg-white shadow-sm"
        style={{ width: size, height: size }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="absolute inset-2 rounded-full bg-gradient-to-b from-black/0 to-black/3" />

        {/* 12 ticks */}
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180
            const x1 = 50 + Math.sin(a) * 40
            const y1 = 50 - Math.cos(a) * 40
            const x2 = 50 + Math.sin(a) * 44
            const y2 = 50 - Math.cos(a) * 44
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinecap="round" />
          })}
        </svg>

        <div
          className="absolute left-1/2 top-1/2 h-[62px] w-1 -translate-x-1/2 -translate-y-[56px] origin-[50%_56px] rounded-full bg-[rgb(var(--bk-purple))] shadow-sm"
          style={{ transform: `translate(-50%, -56px) rotate(${needleAngle}deg)` }}
        />
        <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80" />

        <div className="absolute bottom-3 text-[11px] font-semibold text-black/55">Drag the hand</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold text-black/70">
          Hour: {displayHour}
        </div>
        <button
          type="button"
          onClick={resetToNow}
          className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-black/65 hover:bg-white hover:text-black"
        >
          Now
        </button>
      </div>

      <div className="text-[11px] text-black/50">Angle / 30° = hour · range 0–720° maps to 0–23</div>
    </div>
  )
}

