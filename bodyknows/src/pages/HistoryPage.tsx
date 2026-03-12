import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRecordsStore } from '../store/records'
import { exportRecordsCsv } from '../utils/csv'

function TagBadge(props: { tag: string }) {
  const cls =
    props.tag === 'good'
      ? 'bg-[rgba(var(--bk-green),0.18)] text-black/75'
      : props.tag === 'bad'
        ? 'bg-[rgba(var(--bk-pink),0.18)] text-black/75'
        : 'bg-[rgba(var(--bk-purple),0.18)] text-black/75'
  return <span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${cls}`}>{props.tag}</span>
}

export default function HistoryPage() {
  const records = useRecordsStore((s) => s.records)
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null)

  const selected = useMemo(() => records.find((r) => r.id === selectedId) ?? null, [records, selectedId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold tracking-tight">History</div>
        <button
          type="button"
          onClick={() => exportRecordsCsv(records)}
          className="rounded-2xl bg-white/70 px-4 py-2 text-sm font-bold text-black/70 shadow-sm hover:bg-white hover:text-black"
          disabled={records.length === 0}
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1.3fr]">
        <div className="rounded-3xl border border-black/5 bg-white/70 p-3 shadow-sm">
          <div className="px-2 pb-2 text-sm font-extrabold">Records</div>
          <div className="max-h-[52vh] overflow-auto pr-1">
            {records.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-black/55">No records yet</div>
            ) : (
              records.map((r) => {
                const active = selectedId === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={[
                      'w-full rounded-2xl border px-3 py-3 text-left transition',
                      active
                        ? 'border-black/25 bg-white shadow-sm'
                        : 'border-transparent bg-white/40 hover:border-black/15 hover:bg-white/70',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-extrabold tracking-tight">{r.date}</div>
                      <TagBadge tag={r.tag} />
                    </div>
                    <div className="mt-1 text-[12px] text-black/60">
                      <span className="font-bold">Hour {r.hour}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="grid min-h-[240px] place-items-center rounded-3xl border border-black/5 bg-white/70 p-4 shadow-sm">
          {!selected ? (
            <div className="text-sm text-black/55">Select a record to view snapshot</div>
          ) : (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold">
                  {selected.date}
                  <span className="ml-2 text-xs font-bold text-black/55">Hour {selected.hour}</span>
                </div>
                <TagBadge tag={selected.tag} />
              </div>

              <div className="grid place-items-center">
                <img
                  src={selected.snapshot}
                  alt="snapshot"
                  className="max-h-[52vh] w-auto rounded-3xl border border-black/10 bg-white shadow-sm"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

