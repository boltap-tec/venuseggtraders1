import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Download, Wallet, Trash2, Pencil, Eye } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Purchase, BillingType } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, StatusBadge, EmptyState, Modal, Field, Confirm } from '../components/ui'
import { AutoParty } from '../components/AutoParty'
import { purchaseStatus, traysToEggs } from '../lib/calc'
import { inr, fmtDate, todayISO } from '../lib/format'
import { exportPurchaseRegister } from '../lib/excel'

const blank = (firmId: string, eggsPerTray: number): Purchase => ({
  id: uid(), voucherNo: 0, firmVoucherNo: '', date: todayISO(), firmId,
  purchaserName: '', trayQty: 0, eggsPerTray, ratePerTray: 0, amount: 0,
  billingType: 'Cash', payments: [], receivedAmount: 0,
  createdBy: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

export default function Purchases() {
  const { db, currentFirmId, user, savePurchase, deletePurchase, addPurchasePayment } = useStore()
  const nav = useNavigate()
  const firm = db.firms.find((f) => f.id === currentFirmId)
  const eggsPerTray = firm?.eggsPerTrayOverride || db.settings.eggsPerTray

  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [payFor, setPayFor] = useState<Purchase | null>(null)
  const [delId, setDelId] = useState<string | null>(null)

  const list = useMemo(() => {
    return db.purchases
      .filter((p) => p.firmId === currentFirmId && !p.deletedAt)
      .filter((p) => !q || p.purchaserName.toLowerCase().includes(q.toLowerCase()) || p.firmVoucherNo.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.voucherNo - a.voucherNo))
  }, [db.purchases, currentFirmId, q])

  function openNew() {
    if (!currentFirmId) { alert('Please select a firm first.'); return }
    setEditing(blank(currentFirmId, eggsPerTray))
    setIsNew(true)
  }
  function openEdit(p: Purchase) {
    setEditing({ ...p })
    setIsNew(false)
  }
  function save() {
    if (!editing) return
    try {
      const rec = { ...editing, createdBy: editing.createdBy || user?.email || '', updatedAt: new Date().toISOString() }
      savePurchase(rec, isNew)
      setEditing(null)
    } catch (err) {
      console.error('[Purchases] Save failed:', err)
      alert('Failed to save the purchase. Please check the console for details.')
    }
  }

  const totals = list.reduce(
    (a, p) => ({ trays: a.trays + p.trayQty, amount: a.amount + p.amount, bal: a.bal + (p.amount - p.receivedAmount) }),
    { trays: 0, amount: 0, bal: 0 },
  )

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle="Eggs bought from Purchasers (supply side)"
        actions={
          <>
            <button className="btn-outline" onClick={() => exportPurchaseRegister(db, list)}><Download size={16} /> Excel</button>
            <button className="btn-primary" onClick={openNew}><Plus size={16} /> New Purchase</button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search purchaser or voucher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No purchases yet" hint="Record your first purchase from a Purchaser." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="th">Voucher</th><th className="th">Date</th><th className="th">Firm</th><th className="th">Purchaser</th>
                  <th className="th text-right">Trays</th><th className="th text-right">Amount</th>
                  <th className="th text-right">Balance</th><th className="th">Billing</th><th className="th">Status</th><th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td font-semibold">{p.firmVoucherNo}</td>
                    <td className="td">{fmtDate(p.date)}</td>
                    <td className="td text-xs text-slate-500">{db.firms.find(f => f.id === p.firmId)?.name || '—'}</td>
                    <td className="td">{p.purchaserName}</td>
                    <td className="td text-right tabular-nums">{p.trayQty} <span className="text-xs text-slate-400">({traysToEggs(p.trayQty, p.eggsPerTray)})</span></td>
                    <td className="td text-right tabular-nums font-semibold">{inr(p.amount)}</td>
                    <td className="td text-right tabular-nums">{inr(p.amount - p.receivedAmount)}</td>
                    <td className="td">{p.billingType}</td>
                    <td className="td"><StatusBadge status={purchaseStatus(p)} /></td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost !p-1.5" title="View / Print voucher" onClick={() => nav(`/purchases/${p.id}`)}><Eye size={16} /></button>
                        <button className="btn-ghost !p-1.5" title="Record payment" onClick={() => setPayFor(p)}><Wallet size={16} /></button>
                        <button className="btn-ghost !p-1.5" title="Edit" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                        <button className="btn-ghost !p-1.5 text-rose-500" title="Delete" onClick={() => setDelId(p.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr className="font-bold">
                  <td className="td" colSpan={4}>Total ({list.length})</td>
                  <td className="td text-right tabular-nums">{totals.trays}</td>
                  <td className="td text-right tabular-nums">{inr(totals.amount)}</td>
                  <td className="td text-right tabular-nums">{inr(totals.bal)}</td>
                  <td className="td" colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Editor modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'New Purchase' : 'Edit Purchase'} wide>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            {firm && (
              <div className="col-span-2 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm dark:bg-teal-900/20">
                <span className="text-slate-500 dark:text-slate-400">Firm:</span>
                <span className="font-semibold text-teal-700 dark:text-teal-300">{firm.name}</span>
              </div>
            )}
            <Field label="Date"><input className="input" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
            <Field label="Billing Type">
              <select className="input" value={editing.billingType} onChange={(e) => setEditing({ ...editing, billingType: e.target.value as BillingType })}>
                {db.settings.billingTypes.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Name of Purchaser (buy from)" className="col-span-2">
              <AutoParty
                value={editing.purchaserName}
                type="Purchaser"
                onPick={(party) => setEditing({ ...editing, purchaserName: party.name, purchaserId: party.id, purchaserPhone: party.phone, purchaserGstin: party.gstin })}
                onText={(name) => setEditing({ ...editing, purchaserName: name, purchaserId: undefined })}
              />
            </Field>
            <Field label="No. of Trays">
              <input className="input" type="number" min={0} value={editing.trayQty || ''}
                onChange={(e) => {
                  const trayQty = parseFloat(e.target.value) || 0
                  const amount = editing.ratePerEgg ? trayQty * editing.eggsPerTray * editing.ratePerEgg : editing.amount
                  setEditing({ ...editing, trayQty, amount })
                }} />
              <p className="mt-1 text-xs text-slate-400">{traysToEggs(editing.trayQty, editing.eggsPerTray)} @ {editing.eggsPerTray}/tray</p>
            </Field>
            <Field label="Rate / Egg">
              <input className="input" type="number" min={0} step="0.01" value={editing.ratePerEgg || ''}
                onChange={(e) => {
                  const ratePerEgg = parseFloat(e.target.value) || 0
                  const ratePerTray = ratePerEgg * editing.eggsPerTray
                  setEditing({ ...editing, ratePerEgg, ratePerTray, amount: ratePerEgg ? editing.trayQty * editing.eggsPerTray * ratePerEgg : editing.amount })
                }} />
              <p className="mt-1 text-xs text-slate-400">= {editing.ratePerEgg ? inr(editing.ratePerEgg * editing.eggsPerTray) : '—'} / tray</p>
            </Field>
            <Field label="Amount (editable)" className="col-span-2">
              <input className="input text-lg font-bold" type="number" min={0} value={editing.amount || ''}
                onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Notes" className="col-span-2">
              <input className="input" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
            <div className="col-span-2 mt-2 flex flex-col items-end gap-1">
              {!editing.purchaserName && <p className="text-xs font-medium text-rose-500">⛔ Enter the Name of Purchaser to enable Save.</p>}
              <div className="flex gap-2">
                <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={!editing.purchaserName}>Save Purchase</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <PaymentModal
        purchase={payFor}
        onClose={() => setPayFor(null)}
        onAdd={(pay) => { addPurchasePayment(payFor!.id, pay); setPayFor(null) }}
        billingTypes={db.settings.billingTypes}
      />

      <Confirm open={!!delId} title="Delete purchase?" message="This moves the purchase to the recycle bin (soft delete)."
        onCancel={() => setDelId(null)} onConfirm={() => { deletePurchase(delId!); setDelId(null) }} />
    </div>
  )
}

function PaymentModal({ purchase, onClose, onAdd, billingTypes }: { purchase: Purchase | null; onClose: () => void; onAdd: (p: any) => void; billingTypes: BillingType[] }) {
  const [amount, setAmount] = useState(0)
  const [mode, setMode] = useState<BillingType>('Cash')
  const [note, setNote] = useState('')
  if (!purchase) return null
  const balance = purchase.amount - purchase.receivedAmount
  return (
    <Modal open onClose={onClose} title={`Payment · ${purchase.firmVoucherNo}`}>
      <p className="mb-3 text-sm text-slate-500">Paying <b>{purchase.purchaserName}</b> · Balance <b className="text-rose-600">{inr(balance)}</b></p>
      {purchase.payments.length > 0 && (
        <div className="mb-3 max-h-32 overflow-y-auto rounded-lg border border-slate-200 text-sm dark:border-slate-700">
          {purchase.payments.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-slate-800">
              <span>{fmtDate(p.date)} · {p.mode}{p.note ? ` · ${p.note}` : ''}</span><span className="tabular-nums font-semibold">{inr(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><input className="input" type="number" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} autoFocus /></Field>
        <Field label="Mode"><select className="input" value={mode} onChange={(e) => setMode(e.target.value as BillingType)}>{billingTypes.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Note (optional)" className="col-span-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid via GPay ref 4471" /></Field>
      </div>
      <div className="mt-2 flex gap-2">
        <button className="btn-ghost text-xs" onClick={() => setAmount(balance)}>Full balance</button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={amount <= 0} onClick={() => onAdd({ id: uid(), date: todayISO(), amount, mode, note })}>Add Payment</button>
      </div>
    </Modal>
  )
}
