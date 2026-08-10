import type { Firm, Purchase, BillMode, DocTemplate } from '../lib/types'
import { purchaseStatus, traysToEggs } from '../lib/calc'
import { inr, fmtDate, amountInWords } from '../lib/format'

// A4 print-ready PURCHASE voucher (eggs bought from a Purchaser).
// Simple = clean voucher; Detailed = adds the payment history + balance due to the Purchaser.

export default function PurchaseVoucher({
  firm,
  purchase,
  template,
  billMode = 'Simple',
  showPaymentHistory = true,
}: {
  firm: Firm
  purchase: Purchase
  template?: DocTemplate
  billMode?: BillMode
  showPaymentHistory?: boolean
}) {
  const p = purchase
  const accent = firm.accent || '#0d9488'
  const tpl: DocTemplate = template || 'classic'
  const fontFamily = tpl === 'classic' ? "'Libre Baskerville', serif" : "'Inter', sans-serif"
  const detailed = billMode === 'Detailed'
  const balance = p.amount - p.receivedAmount
  const status = purchaseStatus(p)

  return (
    <div className="doc-sheet print-area p-10" style={{ fontFamily, fontSize: 13, lineHeight: 1.5 }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 pb-4" style={{ borderColor: accent }}>
        <div className="flex items-center gap-3">
          {firm.logoDataUrl ? (
            <img src={firm.logoDataUrl} alt="" style={{ height: 56 }} />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl text-2xl font-black text-white" style={{ background: accent }}>{firm.name.slice(0, 1)}</div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: accent }}>{firm.name}</h1>
            <p className="text-slate-600">{firm.address} - {firm.pincode}</p>
            <p className="text-slate-600">{firm.phone && <>Ph: {firm.phone} </>}{firm.email && <>· {firm.email}</>}</p>
            {firm.gstin && <p className="font-semibold text-slate-700">GSTIN: {firm.gstin}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-lg px-4 py-1.5 text-lg font-bold text-white" style={{ background: accent }}>PURCHASE VOUCHER</div>
          <p className="mt-2 text-slate-700"><span className="font-semibold">Voucher No:</span> {p.firmVoucherNo}</p>
          <p className="text-slate-700"><span className="font-semibold">Date:</span> {fmtDate(p.date)}</p>
          <p className="text-slate-700"><span className="font-semibold">Billing:</span> {p.billingType}</p>
        </div>
      </div>

      {/* Purchaser */}
      <div className="mt-5 flex justify-between gap-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Purchased From</p>
          <p className="text-base font-bold text-slate-800">{p.purchaserName}</p>
          {p.purchaserPhone && <p className="text-slate-600">Ph: {p.purchaserPhone}</p>}
          {p.purchaserGstin && <p className="text-slate-700">GSTIN: {p.purchaserGstin}</p>}
        </div>
        {detailed && <p className="self-start rounded px-2 py-0.5 text-xs font-bold" style={{ background: accent + '18', color: accent }}>DETAILED VOUCHER</p>}
      </div>

      {/* Items */}
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr style={{ background: accent + '18' }}>
            <th className="border px-2 py-2 text-left" style={{ borderColor: accent + '55' }}>Description</th>
            <th className="border px-2 py-2 text-right" style={{ borderColor: accent + '55' }}>Trays</th>
            <th className="border px-2 py-2 text-right" style={{ borderColor: accent + '55' }}>Eggs/Tray</th>
            <th className="border px-2 py-2 text-right" style={{ borderColor: accent + '55' }}>Rate/Tray</th>
            <th className="border px-2 py-2 text-right" style={{ borderColor: accent + '55' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border px-2 py-1.5" style={{ borderColor: accent + '33' }}>Farm Eggs ({traysToEggs(p.trayQty, p.eggsPerTray)})</td>
            <td className="border px-2 py-1.5 text-right tabular-nums" style={{ borderColor: accent + '33' }}>{p.trayQty}</td>
            <td className="border px-2 py-1.5 text-right tabular-nums" style={{ borderColor: accent + '33' }}>{p.eggsPerTray}</td>
            <td className="border px-2 py-1.5 text-right tabular-nums" style={{ borderColor: accent + '33' }}>{p.ratePerTray ? inr(p.ratePerTray) : '—'}</td>
            <td className="border px-2 py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: accent + '33' }}>{inr(p.amount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-between gap-6">
        <div className="max-w-[55%]">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Amount in words</p>
          <p className="font-semibold text-slate-700">{amountInWords(p.amount)}</p>
          {p.notes && <p className="mt-2 text-xs text-slate-500"><b>Note:</b> {p.notes}</p>}
        </div>
        <div className="w-64 shrink-0 text-sm">
          <div className="flex justify-between py-0.5"><span className="font-bold" style={{ color: accent }}>Total Amount</span><span className="font-bold tabular-nums" style={{ color: accent }}>{inr(p.amount)}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-slate-600">Paid</span><span className="tabular-nums">{inr(p.receivedAmount)}</span></div>
          <div className="flex justify-between py-0.5"><span className="font-bold">Balance Due</span><span className="font-bold tabular-nums" style={{ color: balance > 0 ? '#e11d48' : '#059669' }}>{inr(balance)}</span></div>
          <p className="mt-1 text-right text-xs text-slate-400">Status: {status}</p>
        </div>
      </div>

      {/* Detailed: payment history */}
      {detailed && showPaymentHistory && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Payment History</p>
          {p.payments.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-slate-400" style={{ borderColor: accent + '44' }}>
              No payments recorded yet. Balance due to purchaser: <b style={{ color: '#e11d48' }}>{inr(balance)}</b>
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: accent + '12' }}>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: accent + '55' }}>Date</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: accent + '55' }}>Mode</th>
                  <th className="border px-2 py-2 text-left" style={{ borderColor: accent + '55' }}>Note</th>
                  <th className="border px-2 py-2 text-right" style={{ borderColor: accent + '55' }}>Amount</th>
                  <th className="border px-2 py-2 text-right" style={{ borderColor: accent + '55' }}>Running Due</th>
                </tr>
              </thead>
              <tbody>
                {runningDue(p.payments, p.amount).map((x) => (
                  <tr key={x.id}>
                    <td className="border px-2 py-1.5" style={{ borderColor: accent + '33' }}>{fmtDate(x.date)}</td>
                    <td className="border px-2 py-1.5" style={{ borderColor: accent + '33' }}>{x.mode || '—'}</td>
                    <td className="border px-2 py-1.5" style={{ borderColor: accent + '33' }}>{x.note || ''}</td>
                    <td className="border px-2 py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: accent + '33' }}>{inr(x.amount)}</td>
                    <td className="border px-2 py-1.5 text-right tabular-nums" style={{ borderColor: accent + '33' }}>{inr(x.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="mt-10 flex items-end justify-between">
        <p className="text-xs text-slate-400">{firm.name} — computer-generated voucher.</p>
        <div className="text-center">
          <div className="h-10" />
          <p className="border-t px-6 pt-1 text-sm font-semibold text-slate-700" style={{ borderColor: accent }}>{firm.signatoryName || `For ${firm.name}`}</p>
        </div>
      </div>
    </div>
  )
}

function runningDue(payments: { id: string; date: string; amount: number; mode?: string; note?: string }[], total: number) {
  let due = total
  return payments.map((p) => { due = Math.round((due - p.amount) * 100) / 100; return { ...p, due } })
}
