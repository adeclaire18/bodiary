import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { motion } from 'framer-motion'
import BodyCanvasSelector from '../components/BodyCanvasSelector'
import ClockDial from '../components/ClockDial'
import StepPager, { type StepKey } from '../components/StepPager'
import TagPicker from '../components/TagPicker'
import { useRecordsStore } from '../store/records'
import type { RecordItem, Tag, XY } from '../types'
import { formatLocalYMD } from '../utils/date'
import { createId } from '../utils/id'

type Draft = {
  polygon: XY[]
  tag: Tag | null
  hour: number
  note: string
}

function Pill(props: { children: React.ReactNode }) {
  return <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/70">{props.children}</div>
}

export default function AddRecordPage() {
  const addRecord = useRecordsStore((s) => s.addRecord)

  const [step, setStep] = useState<StepKey>(1)
  
  // 调试步骤变化
  const debugSetStep = (newStep: StepKey) => {
    console.log('setStep called:', { from: step, to: newStep })
    setStep(newStep)
  }
  
  // 监听步骤变化
  useEffect(() => {
    console.log('Step changed to:', step)
  }, [step])

  // 添加步骤切换函数，供按钮调用
  const goToNextStep = () => {
    console.log('goToNextStep called', { currentStep: step })
    if (step < 3) {
      const canNext = canGoNext(step)
      console.log('Checking canGoNext for current step:', { step, canNext })
      if (canNext) {
        const nextStep = (step + 1) as StepKey
        console.log('Going to step', nextStep)
        debugSetStep(nextStep)
      } else {
        console.log('Cannot go to next step, validation failed')
      }
    } else {
      console.log('Already at step 3, cannot go further')
    }
  }

  const [draft, setDraft] = useState<Draft>(() => ({
    polygon: [],
    tag: null,
    hour: new Date().getHours(),
    note: '',
  }))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const captureRef = useRef<HTMLDivElement | null>(null)

  const canGoNext = (s: StepKey) => {
    console.log('canGoNext called', { step: s, draft: draft })
    try {
      if (s === 1) {
        const result = draft.polygon.length >= 3
        console.log('Step 1 check:', { polygonLength: draft.polygon.length, required: 3, result })
        return result
      }
      if (s === 2) {
        const result = !!draft.tag
        console.log('Step 2 check:', { tag: draft.tag, result })
        return result
      }
      console.log('Step 3 or other, returning true')
      return true
    } catch (error) {
      console.error('Error in canGoNext:', error)
      return false
    }
  }

  // 调试：在组件渲染时检查按钮状态
  console.log('Component render - Step 1 button state:', {
    step: step,
    polygonLength: draft.polygon.length,
    canGoNext1: canGoNext(1),
    buttonDisabled: !canGoNext(1)
  })

  const summary = useMemo(() => {
    return {
      tag: draft.tag ?? '—',
      hour: draft.hour,
      note: draft.note?.trim() ? draft.note.trim() : '—',
      points: draft.polygon.length,
    }
  }, [draft])

  async function save() {
    if (!draft.tag) return
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      if (!captureRef.current) throw new Error('Capture target missing')
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: null,
        scale: window.devicePixelRatio ?? 1,
        useCORS: true,
      })
      const snapshot = canvas.toDataURL('image/png')

      const now = new Date()
      const record: RecordItem = {
        id: createId(),
        date: formatLocalYMD(now),
        hour: draft.hour,
        tag: draft.tag,
        note: draft.note ?? '',
        polygon: draft.polygon,
        snapshot,
      }
      addRecord(record)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function resetAll() {
    setStep(1)
    setSaved(false)
    setError(null)
    setDraft({ polygon: [], tag: null, hour: new Date().getHours(), note: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-extrabold tracking-tight">Add Record</div>
          <Pill>Step {step}/3</Pill>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-2xl bg-white/70 px-4 py-2 text-sm font-bold text-black/70 shadow-sm hover:bg-white hover:text-black"
        >
          Restart
        </button>
      </div>

      <StepPager
        step={step}
        onStepChange={debugSetStep}
        canGoNext={canGoNext}
        render={(s) => {
          if (s === 1) {
            return (
              <div className="space-y-4">
                <div className="rounded-3xl border border-black/5 bg-white/70 p-4 shadow-sm">
                  <div className="text-sm font-extrabold">Step 1 — Select Body Area</div>
                  <div className="mt-1 text-xs text-black/55">
                    Draw a freehand area on the body diagram. Release to auto-close the polygon.
                  </div>

                  <div className="mt-4" ref={captureRef}>
                    <BodyCanvasSelector
                      value={draft.polygon}
                      onChange={(poly) => setDraft((d) => ({ ...d, polygon: poly }))}
                      onClear={() => setDraft((d) => ({ ...d, polygon: [] }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, polygon: [] }))}
                    className="rounded-3xl bg-white/70 px-4 py-4 text-sm font-extrabold text-black/70 shadow-sm hover:bg-white hover:text-black"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNext(1)}
                    onClick={() => {
                      console.log('Next button clicked - event triggered!')
                      goToNextStep()
                    }}
                    onMouseDown={() => console.log('Next button mouse down')}
                    onMouseUp={() => console.log('Next button mouse up')}
                    className="rounded-3xl bg-black/90 px-4 py-4 text-sm font-extrabold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
                {/* 调试信息 */}
                <div className="text-xs text-black/50">
                  Button debug: canGoNext(1)={String(canGoNext(1))}, step={step}, polygonLength={draft.polygon.length}
                </div>
              </div>
            )
          }

          if (s === 2) {
            return (
              <div className="space-y-4">
                <div className="rounded-3xl border border-black/5 bg-white/70 p-4 shadow-sm">
                  <div className="text-sm font-extrabold">Step 2 — Tag and Time</div>
                  <div className="mt-1 text-xs text-black/55">Pick one tag. Time and note are optional.</div>

                  <div className="mt-4 rounded-3xl bg-white/70 p-4">
                    <div className="text-xs font-extrabold text-black/60">Tag (required)</div>
                    <div className="mt-3">
                      <TagPicker value={draft.tag} onChange={(tag) => setDraft((d) => ({ ...d, tag }))} />
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl bg-white/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-black/60">Time (optional)</div>
                      <Pill>Default: current hour</Pill>
                    </div>
                    <div className="mt-3 flex justify-center">
                      <ClockDial hour={draft.hour} onChange={(hour) => setDraft((d) => ({ ...d, hour }))} />
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl bg-white/70 p-4">
                    <div className="text-xs font-extrabold text-black/60">Note (optional)</div>
                    <textarea
                      value={draft.note}
                      onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                      placeholder="Write a quick note…"
                      className="mt-2 min-h-[92px] w-full resize-none rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/35 focus:border-black/25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => debugSetStep(1)}
                    className="rounded-3xl bg-white/70 px-4 py-4 text-sm font-extrabold text-black/70 shadow-sm hover:bg-white hover:text-black"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNext(2)}
                    onClick={() => debugSetStep(3)}
                    className="rounded-3xl bg-black/90 px-4 py-4 text-sm font-extrabold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div className="space-y-4">
              <div className="rounded-3xl border border-black/5 bg-white/70 p-4 shadow-sm">
                <div className="text-sm font-extrabold">Step 3 — Save</div>
                <div className="mt-1 text-xs text-black/55">
                  Preview summary and save. Snapshot is generated with html2canvas and stored as base64 in localStorage.
                </div>

                <div className="mt-4 grid gap-4">
                  <div className="rounded-3xl bg-white/70 p-4">
                    <div className="text-xs font-extrabold text-black/60">Summary</div>
                    <div className="mt-3 space-y-2 text-sm text-black/75">
                      <div className="flex items-center justify-between rounded-2xl bg-black/5 px-3 py-2">
                        <span className="text-xs text-black/60">Tag</span>
                        <span className="font-extrabold">{summary.tag}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-black/5 px-3 py-2">
                        <span className="text-xs text-black/60">Hour</span>
                        <span className="font-extrabold">{summary.hour}</span>
                      </div>
                      <div className="rounded-2xl bg-black/5 px-3 py-2">
                        <div className="text-xs text-black/60">Note</div>
                        <div className="mt-1 font-semibold text-black/80">{summary.note}</div>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-black/5 px-3 py-2">
                        <span className="text-xs text-black/60">Polygon points</span>
                        <span className="font-extrabold">{summary.points}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/70 p-4">
                    <div className="text-xs font-extrabold text-black/60">Snapshot preview target</div>
                    <div className="mt-3 rounded-3xl border border-black/10 bg-white p-3 shadow-sm">
                      <div ref={captureRef}>
                        <BodyCanvasSelector
                          value={draft.polygon}
                          onChange={(poly) => setDraft((d) => ({ ...d, polygon: poly }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="mt-4 rounded-2xl border border-[rgba(var(--bk-pink),0.35)] bg-white px-3 py-2 text-sm text-black/80">
                    Save failed: {error}
                  </div>
                ) : null}

                {saved ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl border border-[rgba(var(--bk-green),0.35)] bg-white px-3 py-3"
                  >
                    <div className="text-sm font-extrabold">Saved!</div>
                    <div className="mt-1 text-xs text-black/55">Record stored in localStorage.</div>
                  </motion.div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-3xl bg-white/70 px-4 py-4 text-sm font-extrabold text-black/70 shadow-sm hover:bg-white hover:text-black"
                  disabled={saving}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || saved || !draft.tag}
                  className="rounded-3xl bg-black/90 px-4 py-4 text-sm font-extrabold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
                </button>
              </div>

              {saved ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="w-full rounded-3xl bg-white px-4 py-4 text-sm font-extrabold text-black shadow-sm hover:bg-white/90"
                >
                  Add another
                </button>
              ) : null}
            </div>
          )
        }}
      />
    </div>
  )
}