import { motion } from 'framer-motion'
import { useUiStore } from '../store/ui'

function TabButton(props: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="relative flex-1 rounded-2xl px-3 py-3 text-sm font-semibold tracking-tight"
    >
      <span className={props.active ? 'text-black' : 'text-black/55'}>{props.label}</span>
      {props.active ? (
        <motion.div
          layoutId="tab-pill"
          className="absolute inset-0 -z-10 rounded-2xl bg-white shadow-sm"
          transition={{ type: 'spring', stiffness: 520, damping: 36 }}
        />
      ) : null}
    </button>
  )
}

export default function BottomTabs() {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 pb-3">
      <div className="pointer-events-auto mx-auto w-full max-w-md px-4">
        <div className="rounded-3xl border border-black/5 bg-white/60 p-2 shadow-lg backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <TabButton active={tab === 'add'} label="Add Record" onClick={() => setTab('add')} />
            <TabButton active={tab === 'history'} label="History" onClick={() => setTab('history')} />
          </div>
        </div>
      </div>
    </div>
  )
}

