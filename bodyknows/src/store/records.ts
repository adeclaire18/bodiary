import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RecordItem } from '../types'

type RecordsState = {
  records: RecordItem[]
  addRecord: (r: RecordItem) => void
  clearAll: () => void
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (r) => set((s) => ({ records: [r, ...s.records] })),
      clearAll: () => set({ records: [] }),
    }),
    {
      name: 'bodyknows_records_v1',
      version: 1,
    },
  ),
)

