import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from 'recharts'
import { TrendingUp, ShoppingCart, Receipt, Boxes, AlertTriangle, Wallet, HandCoins, ExternalLink, Truck } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, StatCard, StatusBadge } from '../components/ui'
import { saleTotals, purchaseStatus, traysToEggs } from '../lib/calc'
import { firmCurrentStock } from '../lib/stock'
import { inr, fmtDate, num } from '../lib/format'

export default function Dashboard() {
  const { db, currentFirmId } = useStore()
  const firm = db.firms.find((f) => f.id === currentFirmId)
  const eggsPerTray = firm?.eggsPerTrayOverride || db.settings.eggsPerTray

  const sales = db.sales.filter((s) => s.firmId === currentFirmId && !s.deletedAt)
  const purchases = db.purchases.filter((p) => p.firmId === currentFirmId && !p.deletedAt)

  const kpi = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1)
    const inMonth = (iso: string) => new Date(iso) >= new Date(monthStart.toISOString().slice(0, 10))
    let salesVal = 0, purchaseVal = 0, margin = 0, receivable = 0, payable = 0
    for (const s of sales) {
      const t = saleTotals(s)
      if (inMonth(s.date)) { salesVal += t.net; margin += t.margin }
      receivable += t.balance
    }
    for (const p of purchases) {
      if (inMonth(p.date)) purchaseVal += p.amount
      payable += p.amount - p.receivedAmount
    }
    return { salesVal, purchaseVal, margin, receivable, payable }
  }, [sales, purchases])

  const stock = currentFirmId ? firmCurrentStock(db, currentFirmId) : 0
  const lowStock = stock < db.settings.lowStockThresholdTrays

  // Trend: last 7 days
  const trend = useMemo(() => {
    const days: { day: string; Sales: number; Purchases: number; Margin: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      const label = d.slice(5)
      const sVal = sales.filter((s) => s.date === d).reduce((a, s) => a + saleTotals(s).net, 0)
      const pVal = purchases.filter((p) => p.date === d).reduce((a, p) => a + p.amount, 0)
      const m = sales.filter((s) => s.date === d).reduce((a, s) => a + saleTotals(s).margin, 0)
      days.push({ day: label, Sales: Math.round(sVal), Purchases: Math.round(pVal), Margin: Math.round(m) })
    }
    return days
  }, [sales, purchases])

  const recent = [...sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)
  const pendingPurchases = purchases.filter((p) => purchaseStatus(p) !== 'Paid').slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={firm ? `${firm.name} — this month` : 'Select a firm'}
        actions={
          <a
            className="btn-primary"
            href="https://ewaybillgst.gov.in/login.aspx"
            target="_blank"
            rel="noopener noreferrer"
            title="Open the Government E-Way Bill portal in a new tab"
          >
            <Truck size={16} /> E-Way Bill <ExternalLink size={14} />
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Sales (mo)" value={inr(kpi.salesVal)} tone="emerald" icon={<Receipt />} />
        <StatCard label="Purchases (mo)" value={inr(kpi.purchaseVal)} tone="blue" icon={<ShoppingCart />} />
        <StatCard label="Receivable" value={inr(kpi.receivable)} sub="from Sellers" tone="brand" icon={<HandCoins />} />
        <StatCard label="Payable" value={inr(kpi.payable)} sub="to Purchasers" tone="rose" icon={<Wallet />} />
        <StatCard label="Stock" value={`${num(stock)} trays`} sub={traysToEggs(stock, eggsPerTray)} tone={lowStock ? 'rose' : 'emerald'} icon={<Boxes />} />
      </div>

      {lowStock && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle size={18} /> Stock is low ({num(stock)} trays, threshold {db.settings.lowStockThresholdTrays}). Consider purchasing more.
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Sales vs Purchases (7 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: any) => inr(Number(v))} />
                <Area type="monotone" dataKey="Sales" stroke="#10b981" fill="url(#gS)" strokeWidth={2} />
                <Area type="monotone" dataKey="Purchases" stroke="#3b82f6" fill="url(#gP)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Daily margin</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: any) => inr(Number(v))} />
                <Bar dataKey="Margin" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recent sales</h3>
            <Link to="/sales" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No sales yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((s) => {
                const t = saleTotals(s)
                return (
                  <Link to={`/sales/${s.id}`} key={s.id} className="flex items-center justify-between py-2.5 hover:opacity-80">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.sellerName}</p>
                      <p className="text-xs text-slate-400">{s.firmBillNo} · {fmtDate(s.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{inr(t.net)}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Payments due to Purchasers</h3>
            <Link to="/purchases" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          {pendingPurchases.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nothing pending. 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.purchaserName}</p>
                    <p className="text-xs text-slate-400">{p.firmVoucherNo} · {fmtDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-rose-600">{inr(p.amount - p.receivedAmount)}</p>
                    <StatusBadge status={purchaseStatus(p)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
