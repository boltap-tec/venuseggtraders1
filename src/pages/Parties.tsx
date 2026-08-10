import { useMemo, useState } from 'react'
import { Plus, Search, Trash2, Pencil, Users2 } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Party, PartyType } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, EmptyState, Modal, Field, Confirm, Pill } from '../components/ui'
import { saleTotals } from '../lib/calc'
import { inr } from '../lib/format'

const blank = (): Party => ({ id: uid(), name: '', type: 'Seller', address: '', phone: '', gstin: '', notes: '' })

export default function Parties() {
  const { db, saveParty, deleteParty } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'All' | PartyType>('All')
  const [editing, setEditing] = useState<Party | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)

  const list = useMemo(() => db.parties
    .filter((p) => filter === 'All' || p.type === filter || p.type === 'Both')
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [db.parties, q, filter])

  function balances(p: Party) {
    const payable = db.purchases.filter((x) => !x.deletedAt && (x.purchaserId === p.id || x.purchaserName === p.name))
      .reduce((a, x) => a + (x.amount - x.receivedAmount), 0)
    const receivable = db.sales.filter((x) => !x.deletedAt && (x.sellerId === p.id || x.sellerName === p.name))
      .reduce((a, x) => a + saleTotals(x).balance, 0)
    return { payable, receivable }
  }

  return (
    <div>
      <PageHeader title="Parties" subtitle="Purchasers you buy from · Sellers you sell to"
        actions={<button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={16} /> New Party</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search parties…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['All', 'Purchaser', 'Seller', 'Both'] as const).map((t) => (
            <button key={t} className={`btn ${filter === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Users2 size={40} />} title="No parties" hint="Add a Purchaser or Seller." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const b = balances(p)
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                    <Pill tone={p.type === 'Purchaser' ? 'blue' : p.type === 'Seller' ? 'teal' : 'brand'}>{p.type}</Pill>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost !p-1.5" onClick={() => { setEditing({ ...p }); setIsNew(false) }}><Pencil size={16} /></button>
                    <button className="btn-ghost !p-1.5 text-rose-500" onClick={() => setDelId(p.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                  {p.phone && <p>📞 {p.phone}</p>}
                  {p.address && <p>📍 {p.address}</p>}
                  {p.gstin && <p>GSTIN: {p.gstin}</p>}
                </div>
                <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
                  {b.receivable > 0 && <span>Receivable <b className="text-rose-600">{inr(b.receivable)}</b></span>}
                  {b.payable > 0 && <span>Payable <b className="text-amber-600">{inr(b.payable)}</b></span>}
                  {b.receivable <= 0 && b.payable <= 0 && <span className="text-emerald-600">Settled</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'New Party' : 'Edit Party'}>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" className="col-span-2"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></Field>
            <Field label="Type">
              <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as PartyType })}>
                <option value="Purchaser">Purchaser (buy from)</option><option value="Seller">Seller (sell to)</option><option value="Both">Both</option>
              </select>
            </Field>
            <Field label="Phone"><input className="input" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Address" className="col-span-2"><input className="input" value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
            <Field label="GSTIN"><input className="input" value={editing.gstin || ''} onChange={(e) => setEditing({ ...editing, gstin: e.target.value })} /></Field>
            <Field label="Notes"><input className="input" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={!editing.name} onClick={() => { saveParty(editing); setEditing(null) }}>Save</button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!delId} title="Delete party?" message="This removes the party from the directory. Existing documents keep their snapshot."
        onCancel={() => setDelId(null)} onConfirm={() => { deleteParty(delId!); setDelId(null) }} />
    </div>
  )
}
