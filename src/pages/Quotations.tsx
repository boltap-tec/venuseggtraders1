import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Pencil, Printer, FileSpreadsheet, ArrowRightLeft, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Quotation, SellerType, SaleItem, QuoteStatus } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, EmptyState, Modal, Field, Confirm, Pill } from '../components/ui'
import { AutoParty } from '../components/AutoParty'
import LineItemEditor from '../components/LineItemEditor'
import DocumentView from '../components/DocumentView'
import { saleTotals } from '../lib/calc'
import { inr, fmtDate, todayISO } from '../lib/format'
import { exportQuoteExcel } from '../lib/excel'

const blank = (firmId: string): Quotation => ({
  id: uid(), quoteNo: 0, firmQuoteNo: '', date: todayISO(), firmId,
  sellerType: 'B2C', sellerName: '',
  items: [{ id: uid(), description: 'Farm Eggs (Tray)', qtyTray: 0, amountPerQty: 0 }],
  discountAmount: 0, status: 'Draft', validUntil: '',
  createdBy: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

const statusTone: Record<QuoteStatus, string> = {
  Draft: 'slate', Sent: 'blue', Accepted: 'teal', Rejected: 'slate', Expired: 'slate', Converted: 'brand',
}

export default function Quotations() {
  const { db, currentFirmId, user, saveQuote, deleteQuote, convertQuote } = useStore()
  const firm = db.firms.find((f) => f.id === currentFirmId)!
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Quotation | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [view, setView] = useState<Quotation | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [convId, setConvId] = useState<string | null>(null)

  const list = useMemo(() => db.quotations
    .filter((x) => x.firmId === currentFirmId && !x.deletedAt)
    .filter((x) => !q || x.sellerName.toLowerCase().includes(q.toLowerCase()) || x.firmQuoteNo.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.quoteNo - a.quoteNo)), [db.quotations, currentFirmId, q])

  function openNew() { setEditing(blank(currentFirmId!)); setIsNew(true) }
  function openEdit(x: Quotation) { setEditing({ ...x, items: x.items.map((i) => ({ ...i })) }); setIsNew(false) }
  function save() {
    if (!editing) return
    saveQuote({ ...editing, createdBy: editing.createdBy || user?.email || '', updatedAt: new Date().toISOString() }, isNew)
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Quotations" subtitle="Price quotes to Sellers — convert to a bill in one click"
        actions={<button className="btn-primary" onClick={openNew}><Plus size={16} /> New Quotation</button>} />

      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState title="No quotations yet" hint="Create a quote and convert it to a bill when accepted." />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="th">Quote No</th><th className="th">Date</th><th className="th">Seller</th>
                <th className="th">Valid</th><th className="th text-right">Amount</th><th className="th">Status</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((x) => {
                const t = saleTotals(x)
                return (
                  <tr key={x.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td font-semibold">{x.firmQuoteNo}</td>
                    <td className="td">{fmtDate(x.date)}</td>
                    <td className="td">{x.sellerName}</td>
                    <td className="td">{fmtDate(x.validUntil)}</td>
                    <td className="td text-right tabular-nums font-semibold">{inr(t.net)}</td>
                    <td className="td"><Pill tone={statusTone[x.status]}>{x.status}</Pill></td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost !p-1.5" title="View" onClick={() => setView(x)}><Printer size={16} /></button>
                        {x.status !== 'Converted' && <button className="btn-ghost !p-1.5 text-teal-600" title="Convert to Bill" onClick={() => setConvId(x.id)}><ArrowRightLeft size={16} /></button>}
                        <button className="btn-ghost !p-1.5" title="Edit" onClick={() => openEdit(x)}><Pencil size={16} /></button>
                        <button className="btn-ghost !p-1.5 text-rose-500" title="Delete" onClick={() => setDelId(x.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'New Quotation' : 'Edit Quotation'} wide>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Date"><input className="input" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="Valid Until"><input className="input" type="date" value={editing.validUntil || ''} onChange={(e) => setEditing({ ...editing, validUntil: e.target.value })} /></Field>
              <Field label="Seller Type">
                <select className="input" value={editing.sellerType} onChange={(e) => setEditing({ ...editing, sellerType: e.target.value as SellerType })}>
                  <option value="B2B">B2B</option><option value="B2C">B2C</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as QuoteStatus })}>
                  {(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'] as QuoteStatus[]).map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Seller Name (sell to)">
              <AutoParty value={editing.sellerName} type="Seller"
                onPick={(p) => setEditing({ ...editing, sellerName: p.name, sellerId: p.id, sellerAddress: p.address, sellerPhone: p.phone, sellerGstin: p.gstin })}
                onText={(name) => setEditing({ ...editing, sellerName: name })} />
            </Field>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <LineItemEditor items={editing.items} onChange={(items: SaleItem[]) => setEditing({ ...editing, items })} showGst={!!firm.gstin && editing.gstEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="text-sm"><span className="text-slate-400">Total </span><b className="tabular-nums">{inr(saleTotals(editing).net)}</b></div>
              <div className="flex gap-2">
                <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={!editing.sellerName}>Save Quotation</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* View / print */}
      {view && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="no-print mx-auto mb-3 flex max-w-[210mm] items-center justify-between">
            <button className="btn-outline bg-white" onClick={() => setView(null)}><X size={16} /> Close</button>
            <div className="flex gap-2">
              <button className="btn-outline bg-white" onClick={() => exportQuoteExcel(view, firm)}><FileSpreadsheet size={16} /> Excel</button>
              <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
            </div>
          </div>
          <DocumentView firm={firm} doc={view} kind="quote" />
        </div>
      )}

      <Confirm open={!!delId} title="Delete quotation?" message="This moves it to the recycle bin."
        onCancel={() => setDelId(null)} onConfirm={() => { deleteQuote(delId!); setDelId(null) }} />
      <Confirm open={!!convId} title="Convert to Bill?" message="A new finalized sale/bill will be created from this quotation."
        onCancel={() => setConvId(null)} onConfirm={() => { const s = convertQuote(convId!); setConvId(null); if (s) nav(`/sales/${s.id}`) }} />
    </div>
  )
}
