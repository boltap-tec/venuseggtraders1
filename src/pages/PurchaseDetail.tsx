import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Wallet, FileText, LayoutList } from 'lucide-react'
import { useStore } from '../lib/store'
import type { BillingType, BillMode } from '../lib/types'
import { uid } from '../lib/db'
import PurchaseVoucher from '../components/PurchaseVoucher'
import { Modal, Field, StatusBadge } from '../components/ui'
import { purchaseStatus } from '../lib/calc'
import { inr, fmtDate, todayISO } from '../lib/format'

export default function PurchaseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, savePurchase, addPurchasePayment } = useStore()
  const purchase = db.purchases.find((p) => p.id === id)
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState(0)
  const [mode, setMode] = useState<BillingType>('Cash')
  const [note, setNote] = useState('')

  if (!purchase) return <div className="p-6">Purchase not found. <button className="text-brand-600 underline" onClick={() => nav('/purchases')}>Back</button></div>
  const firm = db.firms.find((f) => f.id === purchase.firmId)!
  const billMode: BillMode = purchase.billMode || db.settings.defaultBillMode
  const balance = purchase.amount - purchase.receivedAmount

  function setBillMode(m: BillMode) {
    savePurchase({ ...purchase!, billMode: m, updatedAt: new Date().toISOString() }, false)
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <button className="btn-ghost" onClick={() => nav('/purchases')}><ArrowLeft size={18} /> Back to Purchases</button>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={purchaseStatus(purchase)} />
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
            <button className={`px-3 py-1.5 text-sm font-semibold ${billMode === 'Simple' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`} onClick={() => setBillMode('Simple')}><FileText size={14} className="mr-1 inline" />Simple</button>
            <button className={`px-3 py-1.5 text-sm font-semibold ${billMode === 'Detailed' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`} onClick={() => setBillMode('Detailed')}><LayoutList size={14} className="mr-1 inline" />Detailed</button>
          </div>
          <button className="btn-outline" onClick={() => setPayOpen(true)}><Wallet size={16} /> Payment</button>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        </div>
      </div>

      <div className="no-print mb-4 flex flex-wrap gap-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm dark:border-teal-900 dark:bg-teal-900/20">
        <div><span className="text-slate-400">Amount </span><b>{inr(purchase.amount)}</b></div>
        <div><span className="text-slate-400">Paid </span><b>{inr(purchase.receivedAmount)}</b></div>
        <div><span className="text-slate-400">Balance due to purchaser </span><b className="text-rose-600">{inr(balance)}</b></div>
        <div className="ml-auto text-slate-400">{purchase.payments.length} payment(s) recorded</div>
      </div>

      <div className="overflow-x-auto pb-6">
        <PurchaseVoucher firm={firm} purchase={purchase} template={db.settings.purchaseTemplate} billMode={billMode} showPaymentHistory={db.settings.showPaymentHistory} />
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Payment · ${purchase.firmVoucherNo}`}>
        <p className="mb-3 text-sm text-slate-500">Paying <b>{purchase.purchaserName}</b> · Balance <b className="text-rose-600">{inr(balance)}</b></p>
        {purchase.payments.length > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:border-slate-700">
            {purchase.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-slate-800">
                <span>{fmtDate(p.date)} · {p.mode}{p.note ? ` · ${p.note}` : ''}</span>
                <span className="tabular-nums font-semibold">{inr(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><input className="input" type="number" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} autoFocus /></Field>
          <Field label="Mode"><select className="input" value={mode} onChange={(e) => setMode(e.target.value as BillingType)}>{db.settings.billingTypes.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Note (optional)" className="col-span-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid via GPay ref 4471" /></Field>
        </div>
        <button className="btn-ghost mt-2 text-xs" onClick={() => setAmount(balance)}>Full balance</button>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setPayOpen(false)}>Cancel</button>
          <button className="btn-primary" disabled={amount <= 0} onClick={() => { addPurchasePayment(purchase.id, { id: uid(), date: todayISO(), amount, mode, note }); setPayOpen(false); setAmount(0); setNote('') }}>Add Payment</button>
        </div>
      </Modal>
    </div>
  )
}
