import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage } from 'react-konva'
import type { XY } from '../types'

type Props = {
  value: XY[]
  onChange: (poly: XY[]) => void
  onClear?: () => void
}

type Pt = { x: number; y: number }

function closePolygon(points: Pt[]): Pt[] {
  if (points.length < 3) return []
  const first = points[0]
  const last = points[points.length - 1]
  if (first.x === last.x && first.y === last.y) return points
  return [...points, first]
}

export default function BodyCanvasSelector(props: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 320, h: 520 })
  const [drawing, setDrawing] = useState(false)
  const drawingRef = useRef(false)
  const [draft, setDraft] = useState<Pt[]>([])
  const draftRef = useRef<Pt[]>([])
  const stageRef = useRef<any>(null)

  // Resize (mobile-first, keep tall aspect)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const w = Math.max(280, Math.floor(rect.width))
      const h = Math.floor(w * 1.55)
      setSize({ w, h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const polygonFlat = useMemo(() => {
    const points = closePolygon(draft)
    return points.flatMap((p) => [p.x, p.y])
  }, [draft])

  const committedFlat = useMemo(() => {
    if (!props.value?.length) return []
    return props.value.flatMap(([x, y]) => [x * size.w, y * size.h])
  }, [props.value, size.h, size.w])

  function getPointer(stage: any): Pt | null {
    const pos = stage.getPointerPosition?.()
    if (!pos) return null
    return { x: pos.x, y: pos.y }
  }

  function startFromStage(stage: any) {
    const p = getPointer(stage)
    if (!p) return
    drawingRef.current = true
    setDrawing(true)
    draftRef.current = [p]
    setDraft(draftRef.current)
  }

  function moveFromStage(stage: any) {
    if (!drawingRef.current) return
    const p = getPointer(stage)
    if (!p) return
    setDraft((prev) => {
      const last = prev[prev.length - 1]
      const dx = p.x - last.x
      const dy = p.y - last.y
      if (dx * dx + dy * dy < 2.2) return prev
      const next = [...prev, p]
      draftRef.current = next
      return next
    })
  }

  function handleMouseMove(e: any) {
    const stage = e.target.getStage()
    if (!stage) return

    // Keep drawing strictly while mouse is pressed.
    // If the primary button is no longer down, finalize immediately.
    if (drawingRef.current && e?.evt?.buttons !== 1) {
      finalize()
      return
    }

    moveFromStage(stage)
  }

  function finalize() {
    if (!drawingRef.current) return
    drawingRef.current = false
    setDrawing(false)
    const current = draftRef.current
    const closed = closePolygon(current)
    if (closed.length < 4) {
      draftRef.current = []
      setDraft([])
      props.onChange([])
      return
    }
    // Persist polygon as normalized points (0..1) to keep schema stable across screen sizes.
    const normalized: XY[] = current.map((p) => [p.x / size.w, p.y / size.h])
    props.onChange(normalized)
  }

  function onMouseDown(e: any) {
    startFromStage(e.target.getStage())
  }
  function onMouseMove(e: any) {
    handleMouseMove(e)
  }
  function onTouchStart() {
    startFromStage(stageRef.current)
  }
  function onTouchMove() {
    moveFromStage(stageRef.current)
  }

  function clear() {
    draftRef.current = []
    setDraft([])
    props.onChange([])
    props.onClear?.()
  }

  // Global "release" safety net: if Konva misses the up/end event,
  // releasing the press anywhere still finalizes the polygon.
  useEffect(() => {
    if (!drawing) return

    const onUp = () => finalize()
    window.addEventListener('mouseup', onUp, { passive: true })
    window.addEventListener('touchend', onUp, { passive: true })
    window.addEventListener('touchcancel', onUp, { passive: true })
    return () => {
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
    }
  }, [drawing])

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        ref={wrapRef}
        className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm"
      >
        <div className="relative">
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={finalize}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={finalize}
            className="touch-none"
          >
            <Layer>
              {/* Neutral 2D standing body diagram (simple, non-sexualized) */}
              <Group x={size.w * 0.5} y={size.h * 0.09}>
                <Circle
                  x={0}
                  y={0}
                  radius={size.w * 0.08}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
              </Group>

              <Group x={size.w * 0.5} y={size.h * 0.18}>
                <Rect
                  x={-size.w * 0.03}
                  y={-size.h * 0.02}
                  width={size.w * 0.06}
                  height={size.h * 0.05}
                  cornerRadius={12}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
              </Group>

              <Group x={size.w * 0.5} y={size.h * 0.22}>
                <Rect
                  x={-size.w * 0.13}
                  y={0}
                  width={size.w * 0.26}
                  height={size.h * 0.34}
                  cornerRadius={38}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
              </Group>

              {/* Arms */}
              <Group x={size.w * 0.5} y={size.h * 0.28}>
                <Rect
                  x={-size.w * 0.22}
                  y={size.h * 0.01}
                  width={size.w * 0.09}
                  height={size.h * 0.33}
                  cornerRadius={36}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
                <Rect
                  x={size.w * 0.13}
                  y={size.h * 0.01}
                  width={size.w * 0.09}
                  height={size.h * 0.33}
                  cornerRadius={36}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
              </Group>

              {/* Legs */}
              <Group x={size.w * 0.5} y={size.h * 0.56}>
                <Rect
                  x={-size.w * 0.09}
                  y={0}
                  width={size.w * 0.08}
                  height={size.h * 0.36}
                  cornerRadius={32}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
                <Rect
                  x={size.w * 0.01}
                  y={0}
                  width={size.w * 0.08}
                  height={size.h * 0.36}
                  cornerRadius={32}
                  fill="#fff"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1.5}
                />
              </Group>
            </Layer>

            <Layer listening={false}>
              {/* Committed selection */}
              {committedFlat.length >= 6 ? (
                <Line
                  points={committedFlat}
                  closed
                  fill="rgba(244,114,182,0.20)"
                  stroke="rgba(244,114,182,0.85)"
                  strokeWidth={3}
                  lineJoin="round"
                />
              ) : null}

              {/* Draft path while drawing */}
              {polygonFlat.length >= 6 ? (
                <Line
                  points={polygonFlat}
                  closed={false}
                  stroke="rgba(167,139,250,0.95)"
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
            </Layer>
          </Stage>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-white/85 to-transparent px-3 py-3 text-xs text-black/60">
            <div>{drawing ? 'Drawing… release to close' : 'Draw freehand · release to close'}</div>
            <div className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold">
              {props.value?.length ? 'Selected' : 'No selection'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={clear}
          className="rounded-2xl bg-white/70 px-4 py-2 text-sm font-semibold text-black/70 shadow-sm hover:bg-white hover:text-black"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
