import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Download, Trash2, Pencil, Eye } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Sale, SellerType, BillingType, SaleItem } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, StatusBadge, EmptyState, Modal, Field, Confirm, Pill } from '../components/ui'
import { AutoParty } from '../components/AutoParty'
import LineItemEditor from '../components/LineItemEditor'
import { saleTotals } from '../lib/calc'
import { inr, fmtDate, todayISO } from '../lib/format'
import { exportSalesRegister } from '../lib/excel'

const blank = (firmId: string): Sale => ({
  id: uid(), billNo: 0, firmBillNo: '', date: todayISO(), firmId,
  sellerType: 'B2B', sellerName: '',
  items: [{ id: uid(), description: 'Farm Eggs (Tray)', qtyTray: 0, amountPerQty: 0, costPerTray: 0 }],
  discountAmount: 0, billingType: 'Cash', payments: [], receivedAmount: 0, docStatus: 'Finalized',
  createdBy: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

export default function Sales() {
  const { db, currentFirmId, user, saveSale, deleteSale } = useStore()
  const firm = db.firms.find((f) => f.id === currentFirmId)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Sale | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)

  const list = useMemo(() => {
    return db.sales
      .filter((s) => s.firmId === currentFirmId && !s.deletedAt)
      .filter((s) => !q || s.sellerName.toLowerCase().includes(q.toLowerCase()) || s.firmBillNo.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.billNo - a.billNo))
  }, [db.sales, currentFirmId, q])

  function openNew() {
    if (!currentFirmId) { alert('Please select a firm first.'); return }
    setEditing(blank(currentFirmId)); setIsNew(true)
  }
  function openEdit(s: Sale) { setEditing({ ...s, items: s.items.map((i) => ({ ...i })) }); setIsNew(false) }
  function save(view?: boolean) {
    if (!editing) return
    try {
      // Seller Name is optional — if left blank, use the type (B2B / B2C) as the name.
      const name = editing.sellerName.trim() || editing.sellerType
      const rec = { ...editing, sellerName: name, createdBy: editing.createdBy || user?.email || '', updatedAt: new Date().toISOString() }
      const saved = saveSale(rec, isNew)
      setEditing(null)
      if (view) nav(`/sales/${saved.id}`)
    } catch (err) {
      console.error('[Sales] Save failed:', err)
      alert('Failed to save the sale. Please check the console for details.')
    }
  }

  const totals = list.reduce((a, s) => { const t = saleTotals(s); return { net: a.net + t.net, margin: a.margin + t.margin, bal: a.bal + t.balance } }, { net: 0, margin: 0, bal: 0 })

  return (
    <div>
      <PageHeader
        title="Sales / Billing"
        subtitle="Eggs sold to Sellers (demand side)"
        actions={
          <>
            <button className="btn-outline" onClick={() => exportSalesRegister(db, list)}><Download size={16} /> Excel</button>
            <button className="btn-primary" onClick={openNew}><Plus size={16} /> New Sale</button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search seller or bill no…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No sales yet" hint="Create your first bill to a Seller." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="th">Bill No</th><th className="th">Date</th><th className="th">Firm</th><th className="th">Type</th><th className="th">Seller</th>
                  <th className="th text-right">Trays</th><th className="th text-right">Net</th>
                  <th className="th text-right">Margin</th><th className="th">Status</th><th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((s) => {
                  const t = saleTotals(s)
                  const trays = s.items.reduce((x, it) => x + it.qtyTray, 0)
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="td font-semibold">{s.firmBillNo}</td>
                      <td className="td">{fmtDate(s.date)}</td>
                      <td className="td text-xs text-slate-500">{db.firms.find(f => f.id === s.firmId)?.name || '—'}</td>
                      <td className="td"><Pill tone={s.sellerType === 'B2B' ? 'blue' : 'teal'}>{s.sellerType}</Pill></td>
                      <td className="td">{s.sellerName}</td>
                      <td className="td text-right tabular-nums">{trays}</td>
                      <td className="td text-right tabular-nums font-semibold">{inr(t.net)}</td>
                      <td className="td text-right tabular-nums text-violet-600">{inr(t.margin)}</td>
                      <td className="td"><StatusBadge status={t.status} /></td>
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost !p-1.5" title="View / Print" onClick={() => nav(`/sales/${s.id}`)}><Eye size={16} /></button>
                          <button className="btn-ghost !p-1.5" title="Edit" onClick={() => openEdit(s)}><Pencil size={16} /></button>
                          <button className="btn-ghost !p-1.5 text-rose-500" title="Delete" onClick={() => setDelId(s.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr className="font-bold">
                  <td className="td" colSpan={6}>Total ({list.length})</td>
                  <td className="td text-right tabular-nums">{inr(totals.net)}</td>
                  <td className="td text-right tabular-nums text-violet-600">{inr(totals.margin)}</td>
                  <td className="td" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <SaleEditor
        editing={editing} setEditing={setEditing} isNew={isNew} firmHasGst={!!firm?.gstin}
        firmName={firm?.name || ''}
        billingTypes={db.settings.billingTypes} onSave={save} onCancel={() => setEditing(null)}
      />

      <Confirm open={!!delId} title="Delete sale?" message="This moves the sale to the recycle bin (soft delete)."
        onCancel={() => setDelId(null)} onConfirm={() => { deleteSale(delId!); setDelId(null) }} />
    </div>
  )
}

export function SaleEditor({ editing, setEditing, isNew, firmHasGst, firmName, billingTypes, onSave, onCancel }: {
  editing: Sale | null; setEditing: (s: Sale | null) => void; isNew: boolean; firmHasGst: boolean
  firmName: string; billingTypes: BillingType[]; onSave: (view?: boolean) => void; onCancel: () => void
}) {
  if (!editing) return null
  const t = saleTotals(editing)
  return (
    <Modal open onClose={onCancel} title={isNew ? 'New Sale / Bill' : 'Edit Sale'} wide>
      <div className="space-y-3">
        {firmName && (
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-900/20">
            <span className="text-slate-500 dark:text-slate-400">Firm:</span>
            <span className="font-semibold text-brand-700 dark:text-brand-300">{firmName}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Date"><input className="input" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
          <Field label="Name (Type)">
            <select className="input" value={editing.sellerType} onChange={(e) => setEditing({ ...editing, sellerType: e.target.value as SellerType })}>
              <option value="B2B">B2B</option><option value="B2C">B2C</option>
            </select>
          </Field>
          <Field label="Billing Type">
            <select className="input" value={editing.billingType} onChange={(e) => setEditing({ ...editing, billingType: e.target.value as BillingType })}>
              {billingTypes.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          {firmHasGst && (
            <Field label="GST">
              <select className="input" value={editing.gstEnabled ? (editing.gstInclusive ? 'inc' : 'exc') : 'none'}
                onChange={(e) => { const v = e.target.value; setEditing({ ...editing, gstEnabled: v !== 'none', gstInclusive: v === 'inc' }) }}>
                <option value="none">None</option><option value="exc">Add GST</option><option value="inc">GST incl.</option>
              </select>
            </Field>
          )}
        </div>

        <Field label="Customer Name (optional)">
          <AutoParty value={editing.sellerName} type="Seller"
            onPick={(p) => setEditing({ ...editing, sellerName: p.name, sellerId: p.id, sellerAddress: p.address, sellerPhone: p.phone, sellerGstin: p.gstin })}
            onText={(name) => setEditing({ ...editing, sellerName: name, sellerId: undefined })} />
          <p className="mt-1 text-xs text-slate-400">Optional — if left blank, the bill uses the type ({editing.sellerType}) as the name.</p>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Address"><input className="input" value={editing.sellerAddress || ''} onChange={(e) => setEditing({ ...editing, sellerAddress: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={editing.sellerPhone || ''} onChange={(e) => setEditing({ ...editing, sellerPhone: e.target.value })} /></Field>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <LineItemEditor items={editing.items} onChange={(items: SaleItem[]) => setEditing({ ...editing, items })} showGst={firmHasGst && editing.gstEnabled} showCost />
          <p className="mt-1 text-xs text-slate-400">Buy Cost/Tray is internal (for margin) and never printed on the invoice.</p>
        </div>

        {editing.billingType === 'Credit' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Received now">
              <input className="input" type="number" value={editing.receivedAmount || ''} onChange={(e) => setEditing({ ...editing, receivedAmount: parseFloat(e.target.value) || 0 })} />
            </Field>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="flex gap-5 text-sm">
            <div><span className="text-slate-400">Net </span><b className="tabular-nums">{inr(t.net)}</b></div>
            <div><span className="text-slate-400">Cost </span><b className="tabular-nums">{inr(t.cost)}</b></div>
            <div><span className="text-slate-400">Margin </span><b className="tabular-nums text-violet-600">{inr(t.margin)}</b></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={onCancel}>Cancel</button>
            <button className="btn-outline" onClick={() => onSave(false)}>Save</button>
            <button className="btn-primary" onClick={() => onSave(true)}>Save &amp; View</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
