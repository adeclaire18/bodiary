import Papa from 'papaparse'
import type { RecordItem } from '../types'

export function exportRecordsCsv(records: RecordItem[]) {
  const rows = records.map((r) => ({
    date: r.date,
    hour: r.hour,
    tag: r.tag,
    note: r.note ?? '',
    polygon: JSON.stringify(r.polygon ?? []),
  }))

  const csv = Papa.unparse(rows, { quotes: false, newline: '\n' })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `bodyknows_records_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

