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

  function startFromStage(stage: any, e?: any) {
    console.log('startFromStage called', { drawing: drawingRef.current })
    if (e) {
      e.evt.preventDefault?.()
      const target = e.target.getStage?.() || stage
      target?.setPointerCapture?.(e.evt.pointerId)
    }
    const p = getPointer(stage)
    if (!p) return
    drawingRef.current = true
    setDrawing(true)
    draftRef.current = [p]
    setDraft(draftRef.current)
    console.log('Drawing started, points:', draftRef.current.length)
  }

  function moveFromStage(stage: any) {
    if (!drawingRef.current) {
      console.log('moveFromStage: not drawing')
      return
    }
    const p = getPointer(stage)
    if (!p) return
    // console.log('moveFromStage: adding point', p)
    setDraft((prev) => {
      const last = prev[prev.length - 1]
      const dx = p.x - last.x
      const dy = p.y - last.y
      // 移除距离过滤，确保实时绘制反馈
      // if (dx * dx + dy * dy < 2.2) return prev
      const next = [...prev, p]
      draftRef.current = next
      // console.log('Points count:', next.length)
      return next
    })
  }



  function finalize(e?: any) {
    if (!drawingRef.current) return
    if (e?.evt) {
      const stage = e.target.getStage?.() || stageRef.current
      stage?.releasePointerCapture?.(e.evt.pointerId)
    }
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
    const normalized: XY[] = current.map((p) => [p.x / size.w, p.y / size.h])
    console.log('finalize calling onChange with', normalized.length, 'points')
    props.onChange(normalized)
  }

  function onMouseDown(e: any) {
    console.log('onMouseDown triggered')
    const stage = e.target.getStage?.()
    if (!stage) return
    
    // Konva特殊处理：在Stage上绑定全局鼠标移动事件
    stage.container().style.cursor = 'crosshair'
    
    // 绑定全局鼠标移动和释放事件到document，确保事件捕获
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    startFromStage(stage, e)
  }
  
  function handleGlobalMouseMove(e: MouseEvent) {
    // console.log('handleGlobalMouseMove triggered', { drawing: drawingRef.current })
    if (!drawingRef.current) return
    const stage = stageRef.current
    if (!stage) return
    
    // 将DOM事件转换为Konva坐标
    const rect = stage.container().getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // console.log('Mouse position:', { x, y })
    
    // 手动创建点对象并添加到轨迹中
    const p = { x, y }
    setDraft((prev) => {
      const next = [...prev, p]
      draftRef.current = next
      // console.log('Points count:', next.length)
      return next
    })
  }
  
  function handleGlobalMouseUp(e: MouseEvent) {
    // console.log('handleGlobalMouseUp triggered')
    const stage = stageRef.current
    if (!stage) return
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleGlobalMouseMove)
    document.removeEventListener('mouseup', handleGlobalMouseUp)
    if (stage.container()) {
      stage.container().style.cursor = 'default'
    }
    
    finalize()
  }
  
  // function onMouseMove(e: any) {
  //   // 这个事件可能不会被触发，主要依赖全局事件处理
  //   console.log('onMouseMove triggered (Stage level)')
  // }
  function onTouchStart(e: any) {
    console.log('onTouchStart triggered')
    startFromStage(stageRef.current, e)
  }
  function onTouchMove(e: any) {
    console.log('onTouchMove triggered')
    if (e.evt) e.evt.preventDefault?.()
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
        draggable={false}
      >
        <div className="relative" draggable={false}>
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            onMouseDown={onMouseDown}
            // onMouseMove={onMouseMove}
            onMouseUp={() => {}} // 使用全局事件处理
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
              {committedFlat.length >= 4 ? (
                <Line
                  points={committedFlat}
                  closed
                  fill="#f472b633"
                  stroke="#f472b6d9"
                  strokeWidth={3}
                  lineJoin="round"
                />
              ) : null}

              {/* Draft path while drawing */}
              {polygonFlat.length >= 4 ? (
                <Line
                  points={polygonFlat}
                  closed={false}
                  stroke="#a78bfaf2"
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
            </Layer>
          </Stage>


        </div>
      </div>

      {/* Clear按钮已移动到右下角 */}
    </div>
  )
}