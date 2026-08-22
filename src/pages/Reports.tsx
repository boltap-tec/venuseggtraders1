import { useMemo, useState } from 'react'
import { FileSpreadsheet, Printer, Share2, TrendingUp, ShoppingCart, Receipt, HandCoins, Wallet } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader, StatCard } from '../components/ui'
import { saleTotals } from '../lib/calc'
import { inr, fmtDate, num } from '../lib/format'
import { reportToExcel, reportToPDF, reportShare, type ReportMeta } from '../lib/reportexport'

function fyStartISO(fyStartMonth: number): string {
  const now = new Date()
  let start = new Date(now.getFullYear(), fyStartMonth - 1, 1)
  if (now < start) start = new Date(now.getFullYear() - 1, fyStartMonth - 1, 1)
  return start.toISOString().slice(0, 10)
}
const round = (n: number, d = 2) => Math.round((isFinite(n) ? n : 0) * 10 ** d) / 10 ** d

export default function Reports() {
  const { db, currentFirmId } = useStore()
  const firm = db.firms.find((f) => f.id === currentFirmId)
  const [consolidated, setConsolidated] = useState(false)
  const [from, setFrom] = useState(() => fyStartISO(db.settings.fyStartMonth))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  const eggsForFirm = (firmId: string) => {
    const f = db.firms.find((x) => x.id === firmId)
    return f?.eggsPerTrayOverride || db.settings.eggsPerTray
  }
  const inRange = (iso: string) => iso >= from && iso <= to

  const purchases = useMemo(
    () => db.purchases.filter((p) => !p.deletedAt && (consolidated || p.firmId === currentFirmId) && inRange(p.date))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [db.purchases, consolidated, currentFirmId, from, to],
  )
  const sales = useMemo(
    () => db.sales.filter((s) => !s.deletedAt && (consolidated || s.firmId === currentFirmId) && inRange(s.date))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [db.sales, consolidated, currentFirmId, from, to],
  )

  // KPI summary
  const salesVal = sales.reduce((a, s) => a + saleTotals(s).net, 0)
  const purchaseVal = purchases.reduce((a, p) => a + p.amount, 0)
  const margin = sales.reduce((a, s) => a + saleTotals(s).margin, 0)
  const receivable = sales.reduce((a, s) => a + saleTotals(s).balance, 0)
  const payable = purchases.reduce((a, p) => a + (p.amount - p.receivedAmount), 0)

  // ---- Purchase report data ----
  const purchaseHeaders = ['Voucher No', 'Date', 'Name of Purchaser', 'No. of Trays', 'Rate/Egg', 'Total Amount']
  const purchaseRows = purchases.map((p) => {
    const eggs = p.eggsPerTray || eggsForFirm(p.firmId)
    const perEgg = p.trayQty * eggs ? p.amount / (p.trayQty * eggs) : 0
    return [p.firmVoucherNo, fmtDate(p.date), p.purchaserName, p.trayQty, round(perEgg, 3), round(p.amount, 2)]
  })
  const purchaseTotal = ['', '', 'TOTAL', purchases.reduce((a, p) => a + p.trayQty, 0), '', round(purchaseVal, 2)]

  // ---- Sales report data ----
  const salesHeaders = ['Bill No', 'Date', 'Name', 'No. of Trays', 'Rate/Egg', 'Total Amount']
  const salesRows = sales.map((s) => {
    const t = saleTotals(s)
    const trays = s.items.reduce((a, it) => a + (it.qtyTray || 0), 0)
    const eggs = eggsForFirm(s.firmId)
    const perEgg = trays * eggs ? t.net / (trays * eggs) : 0
    return [s.firmBillNo, fmtDate(s.date), s.sellerName, trays, round(perEgg, 3), round(t.net, 2)]
  })
  const salesTotal = ['', '', 'TOTAL', sales.reduce((a, s) => a + s.items.reduce((x, it) => x + (it.qtyTray || 0), 0), 0), '', round(salesVal, 2)]

  const meta = (): ReportMeta => ({
    firmName: consolidated ? 'All Firms (Consolidated)' : firm?.name || '—',
    address: consolidated ? '' : firm ? `${firm.address} - ${firm.pincode}` : '',
    gstin: consolidated ? '' : firm?.gstin,
    fromDate: fmtDate(from),
    toDate: fmtDate(to),
  })
  const fname = (kind: string) => `${kind}-report-${from}-to-${to}.xlsx`
  const accent = firm?.accent || '#ea580c'

  return (
    <div>
      <PageHeader title="Reports" subtitle={consolidated ? 'All firms (consolidated)' : firm?.name} />

      {/* Filters */}
      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">From date</label>
          <input className="input !w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To date</label>
          <input className="input !w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <label className="ml-auto flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
          <input type="checkbox" checked={consolidated} onChange={(e) => setConsolidated(e.target.checked)} /> Consolidate all firms
        </label>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Sales" value={inr(salesVal)} tone="emerald" icon={<Receipt />} />
        <StatCard label="Purchases" value={inr(purchaseVal)} tone="blue" icon={<ShoppingCart />} />
        <StatCard label="Margin" value={inr(margin)} tone="violet" icon={<TrendingUp />} />
        <StatCard label="Receivable" value={inr(receivable)} tone="brand" icon={<HandCoins />} />
        <StatCard label="Payable" value={inr(payable)} tone="rose" icon={<Wallet />} />
      </div>

      {/* Purchase Report */}
      <ReportBlock
        title="Purchase Report"
        headers={purchaseHeaders}
        rows={purchaseRows}
        totalRow={purchaseTotal}
        onExcel={() => reportToExcel(fname('purchase'), 'Purchase Report', meta(), purchaseHeaders, purchaseRows, purchaseTotal)}
        onPDF={() => reportToPDF('Purchase Report', meta(), purchaseHeaders, purchaseRows, purchaseTotal, accent)}
        onShare={() => reportShare(fname('purchase'), 'Purchase Report', meta(), purchaseHeaders, purchaseRows, purchaseTotal)}
      />

      {/* Sales Report */}
      <ReportBlock
        title="Sales Report"
        headers={salesHeaders}
        rows={salesRows}
        totalRow={salesTotal}
        onExcel={() => reportToExcel(fname('sales'), 'Sales Report', meta(), salesHeaders, salesRows, salesTotal)}
        onPDF={() => reportToPDF('Sales Report', meta(), salesHeaders, salesRows, salesTotal, accent)}
        onShare={() => reportShare(fname('sales'), 'Sales Report', meta(), salesHeaders, salesRows, salesTotal)}
      />
    </div>
  )
}

function ReportBlock({ title, headers, rows, totalRow, onExcel, onPDF, onShare }: {
  title: string
  headers: string[]
  rows: (string | number)[][]
  totalRow: (string | number)[]
  onExcel: () => void
  onPDF: () => void
  onShare: () => void
}) {
  return (
    <div className="card mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={onExcel}><FileSpreadsheet size={15} /> Excel</button>
          <button className="btn-outline" onClick={onPDF}><Printer size={15} /> PDF</button>
          <button className="btn-primary" onClick={onShare}><Share2 size={15} /> Share</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>{headers.map((h, i) => <th key={h} className={`th ${i >= 3 ? 'text-right' : ''}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 && <tr><td className="td text-slate-400" colSpan={headers.length}>No records in this date range.</td></tr>}
            {rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                {r.map((c, ci) => (
                  <td key={ci} className={`td ${ci >= 3 ? 'text-right tabular-nums' : ''} ${ci === 0 ? 'font-semibold' : ''}`}>
                    {ci === 5 ? inr(Number(c)) : ci === 4 && c !== '' ? `₹${c}` : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr className="font-bold">
                {totalRow.map((c, ci) => (
                  <td key={ci} className={`td ${ci >= 3 ? 'text-right tabular-nums' : ''}`}>
                    {ci === 5 ? inr(Number(c)) : ci === 3 ? num(Number(c)) : c}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
