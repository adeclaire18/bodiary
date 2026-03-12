import { AnimatePresence, motion } from 'framer-motion'
import AddRecordPage from './pages/AddRecordPage'
import HistoryPage from './pages/HistoryPage'
import BottomTabs from './components/BottomTabs'
import { useUiStore } from './store/ui'

function App() {
  const tab = useUiStore((s) => s.tab)

  return (
    <div className="relative h-full">
      <div className="mx-auto h-full w-full max-w-md px-4 pb-24 pt-5">
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[rgb(var(--bk-purple))] to-[rgb(var(--bk-pink))] text-white shadow-sm">
              <span className="text-sm font-semibold">BK</span>
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">BodyKnows</div>
              <div className="text-xs text-black/55">Lightweight symptom tracker · client-only</div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'add' ? <AddRecordPage /> : <HistoryPage />}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomTabs />
    </div>
  )
}

export default App
