import { useMemo, useState } from 'react'
import { Download, TrendingUp, ShoppingCart, Receipt, HandCoins, Wallet } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, StatCard } from '../components/ui'
import { saleTotals, purchaseStatus } from '../lib/calc'
import { inr, fmtDate } from '../lib/format'
import { exportPurchaseRegister, exportSalesRegister, exportMarginReport } from '../lib/excel'

type Range = 'all' | '30' | '90' | 'fy'

export default function Reports() {
  const { db, currentFirmId } = useStore()
  const [consolidated, setConsolidated] = useState(false)
  const [range, setRange] = useState<Range>('all')

  const inRange = (iso: string) => {
    if (range === 'all') return true
    const d = new Date(iso).getTime()
    if (range === '30') return d >= Date.now() - 30 * 86400000
    if (range === '90') return d >= Date.now() - 90 * 86400000
    // fy
    const now = new Date(); const fyStart = new Date(now.getFullYear(), db.settings.fyStartMonth - 1, 1)
    if (now < fyStart) fyStart.setFullYear(fyStart.getFullYear() - 1)
    return d >= fyStart.getTime()
  }

  const sales = useMemo(() => db.sales.filter((s) => !s.deletedAt && (consolidated || s.firmId === currentFirmId) && inRange(s.date)), [db.sales, consolidated, currentFirmId, range])
  const purchases = useMemo(() => db.purchases.filter((p) => !p.deletedAt && (consolidated || p.firmId === currentFirmId) && inRange(p.date)), [db.purchases, consolidated, currentFirmId, range])

  const salesVal = sales.reduce((a, s) => a + saleTotals(s).net, 0)
  const purchaseVal = purchases.reduce((a, p) => a + p.amount, 0)
  const margin = sales.reduce((a, s) => a + saleTotals(s).margin, 0)
  const receivable = sales.reduce((a, s) => a + saleTotals(s).balance, 0)
  const payable = purchases.reduce((a, p) => a + (p.amount - p.receivedAmount), 0)

  // Receivables aging buckets
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  for (const s of sales) {
    const bal = saleTotals(s).balance
    if (bal <= 0) continue
    const days = Math.floor((Date.now() - new Date(s.date).getTime()) / 86400000)
    if (days <= 30) buckets['0-30'] += bal
    else if (days <= 60) buckets['31-60'] += bal
    else if (days <= 90) buckets['61-90'] += bal
    else buckets['90+'] += bal
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle={consolidated ? 'All firms (consolidated)' : db.firms.find((f) => f.id === currentFirmId)?.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value as Range)}>
              <option value="all">All time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="fy">This FY</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
              <input type="checkbox" checked={consolidated} onChange={(e) => setConsolidated(e.target.checked)} /> Consolidate firms
            </label>
          </div>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Sales" value={inr(salesVal)} tone="emerald" icon={<Receipt />} />
        <StatCard label="Purchases" value={inr(purchaseVal)} tone="blue" icon={<ShoppingCart />} />
        <StatCard label="Margin" value={inr(margin)} tone="violet" icon={<TrendingUp />} />
        <StatCard label="Receivable" value={inr(receivable)} tone="brand" icon={<HandCoins />} />
        <StatCard label="Payable" value={inr(payable)} tone="rose" icon={<Wallet />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Receivables aging */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Receivables aging (from Sellers)</h3>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(buckets).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-xs text-slate-400">{k} days</p>
                <p className="mt-1 font-bold tabular-nums">{inr(v)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export center */}
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">Export to Excel</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="btn-outline justify-start" onClick={() => exportSalesRegister(db, sales)}><Download size={16} /> Sales Register</button>
            <button className="btn-outline justify-start" onClick={() => exportPurchaseRegister(db, purchases)}><Download size={16} /> Purchase Register</button>
            <button className="btn-outline justify-start" onClick={() => exportMarginReport(db, sales)}><Download size={16} /> Margin Report</button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Exports respect the current range and consolidation toggle.</p>
        </div>
      </div>

      {/* Margin table */}
      <div className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="font-semibold">Margin by sale</h3>
          <button className="btn-ghost text-sm" onClick={() => exportMarginReport(db, sales)}><Download size={15} /> Excel</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Bill No</th><th className="th">Date</th><th className="th">Seller</th>
                <th className="th text-right">Sell</th><th className="th text-right">Cost</th><th className="th text-right">Margin</th><th className="th text-right">%</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.length === 0 && <tr><td className="td text-slate-400" colSpan={7}>No sales in range.</td></tr>}
              {sales.map((s) => {
                const t = saleTotals(s)
                const pct = t.taxable ? (t.margin / t.taxable) * 100 : 0
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td font-semibold">{s.firmBillNo}</td>
                    <td className="td">{fmtDate(s.date)}</td>
                    <td className="td">{s.sellerName}</td>
                    <td className="td text-right tabular-nums">{inr(t.taxable)}</td>
                    <td className="td text-right tabular-nums">{inr(t.cost)}</td>
                    <td className="td text-right tabular-nums font-semibold text-violet-600">{inr(t.margin)}</td>
                    <td className="td text-right tabular-nums">{Math.round(pct * 10) / 10}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
