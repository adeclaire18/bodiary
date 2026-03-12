import type { Tag } from '../types'

const opts: { id: Tag; label: string; cls: string }[] = [
  { id: 'good', label: 'GOOD', cls: 'from-[rgba(var(--bk-green),0.95)] to-[rgba(var(--bk-green),0.85)]' },
  { id: 'bad', label: 'BAD', cls: 'from-[rgba(var(--bk-pink),0.95)] to-[rgba(var(--bk-pink),0.85)]' },
  { id: 'confused', label: 'CONFUSED', cls: 'from-[rgba(var(--bk-purple),0.95)] to-[rgba(var(--bk-purple),0.85)]' },
]

export default function TagPicker(props: { value: Tag | null; onChange: (t: Tag) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = props.value === o.id
        return (
          <button
            key={o.id}
            type="button"
            className={[
              'rounded-3xl border px-3 py-3 text-sm font-extrabold tracking-tight transition',
              active
                ? 'border-black/15 bg-[#6ee7b7] text-black/70 shadow-sm'
                : 'border-black/10 bg-white text-black/70 hover:bg-white/80 hover:text-black',
            ].join(' ')}
            onClick={() => props.onChange(o.id)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}