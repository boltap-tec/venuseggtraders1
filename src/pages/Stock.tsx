import { useState } from 'react'
import { Plus, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from 'lucide-react'
import { useStore } from '../lib/store'
import type { StockAdjustment, StockMovementReason } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, StatCard, Modal, Field } from '../components/ui'
import { firmStockLedger, firmCurrentStock } from '../lib/stock'
import { traysToEggs } from '../lib/calc'
import { fmtDate, todayISO, num } from '../lib/format'

export default function Stock() {
  const { db, currentFirmId, user, addAdjustment } = useStore()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('vet.stock.unlocked') === '1')
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)

  function tryUnlock() {
    if (pw === (db.settings.stockPassword || 'ram')) {
      setUnlocked(true)
      sessionStorage.setItem('vet.stock.unlocked', '1')
      setPw(''); setPwErr(false)
    } else {
      setPwErr(true)
    }
  }
  function lock() {
    setUnlocked(false)
    sessionStorage.removeItem('vet.stock.unlocked')
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-sm p-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-amber-400 text-white"><Lock size={26} /></div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Stock is locked</h2>
          <p className="mt-1 text-sm text-slate-500">Enter the password to view stock &amp; ledger.</p>
          <input
            className="input mt-5 text-center" type="password" placeholder="Password" value={pw} autoFocus
            onChange={(e) => { setPw(e.target.value); setPwErr(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') tryUnlock() }}
          />
          {pwErr && <p className="mt-2 text-sm text-rose-600">Wrong password. Try again.</p>}
          <button className="btn-primary mt-4 w-full" onClick={tryUnlock}><Unlock size={16} /> Unlock Stock</button>
          <p className="mt-3 text-xs text-slate-400">The password can be changed in Settings → Security.</p>
        </div>
      </div>
    )
  }
  return <StockContent lock={lock} />
}

function StockContent({ lock }: { lock: () => void }) {
  const { db, currentFirmId, user, addAdjustment } = useStore()
  const firm = db.firms.find((f) => f.id === currentFirmId)
  const eggsPerTray = firm?.eggsPerTrayOverride || db.settings.eggsPerTray
  const ledger = currentFirmId ? firmStockLedger(db, currentFirmId) : []
  const current = currentFirmId ? firmCurrentStock(db, currentFirmId) : 0
  const low = current < db.settings.lowStockThresholdTrays

  const purchasedIn = ledger.filter((r) => r.kind === 'Purchase').reduce((a, r) => a + r.inTrays, 0)
  const soldOut = ledger.filter((r) => r.kind === 'Sale').reduce((a, r) => a + r.outTrays, 0)

  const [open, setOpen] = useState(false)
  const [trays, setTrays] = useState(0)
  const [reason, setReason] = useState<StockMovementReason>('Adjustment')
  const [note, setNote] = useState('')

  function submit() {
    const a: StockAdjustment = { id: uid(), firmId: currentFirmId!, date: todayISO(), trays, reason, note, createdBy: user?.email || '', createdAt: new Date().toISOString() }
    addAdjustment(a)
    setOpen(false); setTrays(0); setNote('')
  }

  return (
    <div>
      <PageHeader title="Stock" subtitle={`${firm?.name} · ${eggsPerTray} eggs per tray`}
        actions={
          <>
            <button className="btn-outline" onClick={lock}><Lock size={16} /> Lock</button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Stock Adjustment</button>
          </>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current Stock" value={`${num(current)} trays`} sub={traysToEggs(current, eggsPerTray)} tone={low ? 'rose' : 'emerald'} />
        <StatCard label="Opening" value={`${num(firm?.openingStockTrays || 0)} trays`} tone="blue" />
        <StatCard label="Purchased In" value={`${num(purchasedIn)} trays`} tone="violet" icon={<ArrowUpCircle />} />
        <StatCard label="Sold Out" value={`${num(soldOut)} trays`} tone="brand" icon={<ArrowDownCircle />} />
      </div>

      {low && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle size={18} /> Low stock — below threshold of {db.settings.lowStockThresholdTrays} trays.
        </div>
      )}

      <div className="card mt-5 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Stock Ledger</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Date</th><th className="th">Movement</th><th className="th">Reference</th>
                <th className="th text-right">In</th><th className="th text-right">Out</th><th className="th text-right">Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ledger.length === 0 && <tr><td className="td text-slate-400" colSpan={6}>No movements yet.</td></tr>}
              {ledger.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td">{r.kind === 'Opening' ? '—' : fmtDate(r.date)}</td>
                  <td className="td">{r.kind}</td>
                  <td className="td">{r.ref}</td>
                  <td className="td text-right tabular-nums text-emerald-600">{r.inTrays ? '+' + r.inTrays : ''}</td>
                  <td className="td text-right tabular-nums text-rose-600">{r.outTrays ? '-' + r.outTrays : ''}</td>
                  <td className="td text-right tabular-nums font-semibold">{r.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Stock Adjustment">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trays (+add / −remove)"><input className="input" type="number" value={trays || ''} onChange={(e) => setTrays(parseFloat(e.target.value) || 0)} autoFocus /></Field>
          <Field label="Reason">
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value as StockMovementReason)}>
              {(['Adjustment', 'Breakage', 'Correction', 'Opening'] as StockMovementReason[]).map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Note" className="col-span-2"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 5 trays broken in transit" /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" disabled={!trays} onClick={submit}>Save Adjustment</button>
        </div>
      </Modal>
    </div>
  )
}
