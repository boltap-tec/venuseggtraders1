import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, FileSpreadsheet, Wallet, FileText, LayoutList } from 'lucide-react'
import { useStore } from '../lib/store'
import type { BillingType, BillMode } from '../lib/types'
import { uid } from '../lib/db'
import DocumentView from '../components/DocumentView'
import { Modal, Field, StatusBadge } from '../components/ui'
import { saleTotals } from '../lib/calc'
import { inr, fmtDate, todayISO } from '../lib/format'
import { exportSaleExcel } from '../lib/excel'

export default function SaleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, addSalePayment, saveSale } = useStore()
  const sale = db.sales.find((s) => s.id === id)
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState(0)
  const [mode, setMode] = useState<BillingType>('Cash')
  const [note, setNote] = useState('')

  if (!sale) return <div className="p-6">Sale not found. <button className="text-brand-600 underline" onClick={() => nav('/sales')}>Back</button></div>
  const firm = db.firms.find((f) => f.id === sale.firmId)
  if (!firm) return <div className="p-6">Firm not found for this sale. <button className="text-brand-600 underline" onClick={() => nav('/sales')}>Back</button></div>
  const t = saleTotals(sale)
  const billMode: BillMode = sale.billMode || db.settings.defaultBillMode

  function setBillMode(m: BillMode) {
    saveSale({ ...sale!, billMode: m, updatedAt: new Date().toISOString() }, false)
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <button className="btn-ghost" onClick={() => nav('/sales')}><ArrowLeft size={18} /> Back to Sales</button>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={t.status} />
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            <button className={`px-3 py-1.5 text-sm font-semibold ${billMode === 'Simple' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`} onClick={() => setBillMode('Simple')}><FileText size={14} className="mr-1 inline" />Simple</button>
            <button className={`px-3 py-1.5 text-sm font-semibold ${billMode === 'Detailed' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`} onClick={() => setBillMode('Detailed')}><LayoutList size={14} className="mr-1 inline" />Detailed</button>
          </div>
          <button className="btn-outline" onClick={() => setPayOpen(true)}><Wallet size={16} /> Payment</button>
          <button className="btn-outline" onClick={() => exportSaleExcel(sale, firm)}><FileSpreadsheet size={16} /> Excel</button>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        </div>
      </div>

      {/* Internal margin strip (never printed) */}
      <div className="no-print mb-4 flex flex-wrap gap-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm dark:border-violet-900 dark:bg-violet-900/20">
        <div><span className="text-slate-400">Net </span><b>{inr(t.net)}</b></div>
        <div><span className="text-slate-400">Received </span><b>{inr(t.received)}</b></div>
        <div><span className="text-slate-400">Payment Due </span><b className="text-rose-600">{inr(t.balance)}</b></div>
        <div className="ml-auto"><span className="text-slate-400">Buy Cost </span><b>{inr(t.cost)}</b></div>
        <div><span className="text-slate-400">Margin </span><b className="text-violet-600">{inr(t.margin)}</b></div>
      </div>

      <div className="overflow-x-auto pb-6">
        <DocumentView firm={firm} doc={sale} kind="invoice" template={db.settings.saleTemplate} billMode={billMode} showPaymentHistory={db.settings.showPaymentHistory} />
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Payment · ${sale.firmBillNo}`}>
        <p className="mb-3 text-sm text-slate-500">From <b>{sale.sellerName}</b> · Balance <b className="text-rose-600">{inr(t.balance)}</b></p>
        {sale.payments.length > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:border-slate-700">
            {sale.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-slate-800">
                <span>{fmtDate(p.date)} · {p.mode}{p.note ? ` · ${p.note}` : ''}</span><span className="tabular-nums font-semibold">{inr(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><input className="input" type="number" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} autoFocus /></Field>
          <Field label="Mode"><select className="input" value={mode} onChange={(e) => setMode(e.target.value as BillingType)}>{db.settings.billingTypes.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Note (optional)" className="col-span-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. received cash / UPI ref" /></Field>
        </div>
        <button className="btn-ghost mt-2 text-xs" onClick={() => setAmount(t.balance)}>Full balance</button>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setPayOpen(false)}>Cancel</button>
          <button className="btn-primary" disabled={amount <= 0} onClick={() => { addSalePayment(sale.id, { id: uid(), date: todayISO(), amount, mode, note }); setPayOpen(false); setAmount(0); setNote('') }}>Add Payment</button>
        </div>
      </Modal>
    </div>
  )
}
