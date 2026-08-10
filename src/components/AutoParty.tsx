import { useState } from 'react'
import { useStore } from '../lib/store'
import type { Party, PartyType } from '../lib/types'

// Autocomplete against the party directory, filtered by side (Purchaser / Seller).
export function AutoParty({
  value,
  type,
  onPick,
  onText,
}: {
  value: string
  type: PartyType
  onPick: (p: Party) => void
  onText: (name: string) => void
}) {
  const { db } = useStore()
  const [open, setOpen] = useState(false)
  const matches = db.parties
    .filter((p) => p.type === type || p.type === 'Both')
    .filter((p) => value && p.name.toLowerCase().includes(value.toLowerCase()) && p.name.toLowerCase() !== value.toLowerCase())
    .slice(0, 6)

  return (
    <div className="relative">
      <input
        className="input"
        value={value}
        placeholder={type === 'Purchaser' ? 'Who you buy from…' : 'Who you sell to…'}
        onChange={(e) => { onText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              onMouseDown={() => { onPick(p); setOpen(false) }}
            >
              <span className="font-semibold">{p.name}</span>
              {p.phone && <span className="ml-2 text-xs text-slate-400">{p.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
