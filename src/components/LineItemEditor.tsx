import { Plus, Trash2 } from 'lucide-react'
import type { SaleItem } from '../lib/types'
import { uid } from '../lib/db'
import { inr } from '../lib/format'

export default function LineItemEditor({
  items,
  onChange,
  showGst,
  showCost,
  eggsPerTray = 30,
}: {
  items: SaleItem[]
  onChange: (items: SaleItem[]) => void
  showGst?: boolean
  showCost?: boolean
  eggsPerTray?: number
}) {
  function update(id: string, patch: Partial<SaleItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  // Rate/Egg is the primary input; Rate/Tray (amountPerQty) is kept in sync from it.
  function setRatePerEgg(id: string, ratePerEgg: number) {
    update(id, { ratePerEgg, amountPerQty: Math.round(ratePerEgg * eggsPerTray * 100) / 100 })
  }
  function setRatePerTray(id: string, amountPerQty: number) {
    update(id, { amountPerQty, ratePerEgg: eggsPerTray ? Math.round((amountPerQty / eggsPerTray) * 1000) / 1000 : 0 })
  }
  function ratePerEggOf(it: SaleItem): number | '' {
    if (it.ratePerEgg != null) return it.ratePerEgg
    if (it.amountPerQty && eggsPerTray) return Math.round((it.amountPerQty / eggsPerTray) * 1000) / 1000
    return ''
  }
  function addRow() {
    onChange([...items, { id: uid(), description: '', qtyTray: 0, amountPerQty: 0 }])
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-2">Description</th>
            <th className="pb-2 px-2 w-24">Qty (Tray)</th>
            <th className="pb-2 px-2 w-24">Rate / Egg</th>
            <th className="pb-2 px-2 w-28">Rate / Tray</th>
            {showCost && <th className="pb-2 px-2 w-28">Buy Cost/Tray</th>}
            {showGst && <th className="pb-2 px-2 w-20">GST %</th>}
            <th className="pb-2 px-2 w-28 text-right">Amount</th>
            <th className="pb-2 pl-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="py-1 pr-2">
                <input
                  className="input"
                  placeholder="Farm Eggs (Tray)"
                  value={it.description}
                  onChange={(e) => update(it.id, { description: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow() } }}
                />
              </td>
              <td className="py-1 px-2">
                <input className="input" type="number" min={0} value={it.qtyTray || ''}
                  onChange={(e) => update(it.id, { qtyTray: parseFloat(e.target.value) || 0 })} />
              </td>
              <td className="py-1 px-2">
                <input className="input" type="number" min={0} step="0.01" value={ratePerEggOf(it)}
                  title={`1 tray = ${eggsPerTray} eggs`}
                  onChange={(e) => setRatePerEgg(it.id, parseFloat(e.target.value) || 0)} />
              </td>
              <td className="py-1 px-2">
                <input className="input" type="number" min={0} value={it.amountPerQty || ''}
                  onChange={(e) => setRatePerTray(it.id, parseFloat(e.target.value) || 0)} />
              </td>
              {showCost && (
                <td className="py-1 px-2">
                  <input className="input" type="number" min={0} value={it.costPerTray || ''}
                    title="Internal buy cost — never printed"
                    onChange={(e) => update(it.id, { costPerTray: parseFloat(e.target.value) || 0 })} />
                </td>
              )}
              {showGst && (
                <td className="py-1 px-2">
                  <input className="input" type="number" min={0} value={it.taxRate ?? ''}
                    onChange={(e) => update(it.id, { taxRate: parseFloat(e.target.value) || 0 })} />
                </td>
              )}
              <td className="py-1 px-2 text-right text-sm font-semibold tabular-nums">
                {inr((it.qtyTray || 0) * (it.amountPerQty || 0))}
              </td>
              <td className="py-1 pl-2">
                <button className="btn-ghost !p-1.5 text-rose-500" onClick={() => remove(it.id)} title="Remove">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-outline mt-2" onClick={addRow}><Plus size={16} /> Add line (or press Enter)</button>
    </div>
  )
}
