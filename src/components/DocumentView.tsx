import type { Firm, Sale, Quotation, BillMode, DocTemplate } from '../lib/types'
import { saleTotals } from '../lib/calc'
import { inr, fmtDate, amountInWords } from '../lib/format'

// A4 print-ready invoice / quotation. Colour is carried by borders + weight so it
// stays legible on B&W printers. The firm block is snapshotted at render from the
// doc's firm. Three templates (modern / classic / minimal) + Simple/Detailed mode.

export default function DocumentView({
  firm,
  doc,
  kind,
  template,
  billMode = 'Simple',
  showPaymentHistory = true,
}: {
  firm: Firm
  doc: Sale | Quotation
  kind: 'invoice' | 'quote'
  template?: DocTemplate
  billMode?: BillMode
  showPaymentHistory?: boolean
}) {
  const t = saleTotals(doc)
  const isSale = kind === 'invoice'
  const sale = doc as Sale
  const quote = doc as Quotation
  const accent = firm.accent || '#ea580c'
  const tpl: DocTemplate = template || firm.template || 'modern'
  const isGst = !!firm.gstin && (doc as any).gstEnabled
  const title = isSale ? (isGst ? 'TAX INVOICE' : 'INVOICE') : 'QUOTATION'
  const docNo = isSale ? sale.firmBillNo : quote.firmQuoteNo
  const fontFamily = firm.fontFamily === 'Libre Baskerville' || tpl === 'classic' ? "'Libre Baskerville', serif" : "'Inter', sans-serif"
  const detailed = billMode === 'Detailed'
  const payments = isSale ? sale.payments || [] : []

  const headerBg = tpl === 'minimal' ? 'transparent' : accent
  const headerText = tpl === 'minimal' ? accent : '#fff'

  return (
    <div className="doc-sheet print-area p-10" style={{ fontFamily, fontSize: 13, lineHeight: 1.5 }}>
      {/* ---------- Header ---------- */}
      {tpl === 'classic' ? (
        <div className="border-b-4 border-double pb-4 text-center" style={{ borderColor: accent }}>
          <h1 className="text-3xl font-extrabold tracking-wide" style={{ color: accent }}>{firm.name}</h1>
          <p className="text-slate-600">{firm.address} - {firm.pincode}</p>
          <p className="text-slate-600">
            {firm.phone && <>Ph: {firm.phone} </>}{firm.email && <>· {firm.email} </>}
            {firm.gstin && <>· GSTIN: {firm.gstin}</>}
          </p>
          <div className="mt-2 inline-block border px-6 py-1 text-lg font-bold tracking-widest" style={{ borderColor: accent, color: accent }}>{title}</div>
        </div>
      ) : (
        <div className="flex items-start justify-between border-b-2 pb-4" style={{ borderColor: tpl === 'minimal' ? '#e2e8f0' : accent }}>
          <div className="flex items-center gap-3">
            {firm.logoDataUrl ? (
              <img src={firm.logoDataUrl} alt="" style={{ height: 56 }} />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl text-2xl font-black" style={{ background: tpl === 'minimal' ? accent + '18' : accent, color: tpl === 'minimal' ? accent : '#fff' }}>
                {firm.name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: accent }}>{firm.name}</h1>
              <p className="text-slate-600">{firm.address} - {firm.pincode}</p>
              <p className="text-slate-600">{firm.phone && <>Ph: {firm.phone} </>}{firm.email && <>· {firm.email}</>}</p>
              {firm.gstin && <p className="font-semibold text-slate-700">GSTIN: {firm.gstin}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block rounded-lg px-4 py-1.5 text-lg font-bold" style={{ background: headerBg, color: headerText, border: tpl === 'minimal' ? `1.5px solid ${accent}` : 'none' }}>{title}</div>
            <p className="mt-2 text-slate-700"><span className="font-semibold">No:</span> {docNo}</p>
            <p className="text-slate-700"><span className="font-semibold">Date:</span> {fmtDate(doc.date)}</p>
            {!isSale && quote.validUntil && <p className="text-slate-700"><span className="font-semibold">Valid until:</span> {fmtDate(quote.validUntil)}</p>}
          </div>
        </div>
      )}

      {tpl === 'classic' && (
        <div className="mt-2 flex justify-between text-slate-700">
          <span><span className="font-semibold">No:</span> {docNo}</span>
          <span><span className="font-semibold">Date:</span> {fmtDate(doc.date)}</span>
        </div>
      )}

      {/* ---------- Parties ---------- */}
      <div className="mt-5 flex justify-between gap-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{isSale ? 'Bill To' : 'Quote To'}</p>
          <p className="text-base font-bold text-slate-800">{doc.sellerName}</p>
          {doc.sellerAddress && <p className="text-slate-600">{doc.sellerAddress}</p>}
          {doc.sellerPhone && <p className="text-slate-600">Ph: {doc.sellerPhone}</p>}
          {doc.sellerGstin && <p className="text-slate-700">GSTIN: {doc.sellerGstin}</p>}
        </div>
        <div className="text-right text-slate-600">
          <p><span className="font-semibold">Type:</span> {doc.sellerType}</p>
          {isSale && <p><span className="font-semibold">Billing:</span> {sale.billingType}</p>}
          {detailed && <p className="mt-1 inline-block rounded px-2 py-0.5 text-xs font-bold" style={{ background: accent + '18', color: accent }}>DETAILED BILL</p>}
        </div>
      </div>

      {/* ---------- Items ---------- */}
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr style={{ background: tpl === 'minimal' ? '#f8fafc' : accent + '18' }}>
            <Th accent={accent} tpl={tpl}>#</Th>
            <Th accent={accent} tpl={tpl} left>Description</Th>
            {isGst && <Th accent={accent} tpl={tpl} left>HSN</Th>}
            <Th accent={accent} tpl={tpl} right>Qty (Tray)</Th>
            <Th accent={accent} tpl={tpl} right>Rate/Tray</Th>
            {isGst && <Th accent={accent} tpl={tpl} right>GST%</Th>}
            <Th accent={accent} tpl={tpl} right>Amount</Th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={it.id}>
              <Td accent={accent}>{i + 1}</Td>
              <Td accent={accent}>{it.description || '—'}</Td>
              {isGst && <Td accent={accent}>{it.hsnSac || ''}</Td>}
              <Td accent={accent} right>{it.qtyTray}</Td>
              <Td accent={accent} right>{inr(it.amountPerQty)}</Td>
              {isGst && <Td accent={accent} right>{it.taxRate ?? 0}%</Td>}
              <Td accent={accent} right bold>{inr(it.qtyTray * it.amountPerQty)}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------- Totals ---------- */}
      <div className="mt-4 flex justify-between gap-6">
        <div className="max-w-[55%]">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Amount in words</p>
          <p className="font-semibold text-slate-700">{amountInWords(t.net)}</p>
          {firm.terms && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Terms</p>
              <p className="text-xs text-slate-500">{firm.terms}</p>
            </>
          )}
          {(firm.bankDetails || firm.upiId) && (
            <div className="mt-3 rounded-lg border p-2 text-xs text-slate-600" style={{ borderColor: accent + '44' }}>
              {firm.bankDetails && <p className="whitespace-pre-line">{firm.bankDetails}</p>}
              {firm.upiId && <p><span className="font-semibold">UPI:</span> {firm.upiId}</p>}
            </div>
          )}
        </div>
        <div className="w-64 shrink-0 text-sm">
          <Row label="Gross" value={inr(t.gross)} />
          {t.discount > 0 && <Row label="Discount" value={'- ' + inr(t.discount)} />}
          {isGst && <Row label="Taxable" value={inr(t.taxable)} />}
          {isGst && <Row label="GST" value={inr(t.tax)} />}
          <div className="my-1 border-t" style={{ borderColor: accent }} />
          <Row label="Net Total" value={inr(t.net)} bold accent={accent} />
          {isSale && (detailed || sale.billingType === 'Credit') && (
            <>
              <Row label="Received" value={inr(t.received)} />
              <Row label="Payment Due" value={inr(t.balance)} bold accent={t.balance > 0 ? '#e11d48' : undefined} />
            </>
          )}
        </div>
      </div>

      {/* ---------- Detailed: payment history ---------- */}
      {isSale && detailed && showPaymentHistory && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Payment History</p>
          {payments.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-slate-400" style={{ borderColor: accent + '44' }}>
              No payments recorded yet. Outstanding due: <b style={{ color: '#e11d48' }}>{inr(t.balance)}</b>
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: accent + '12' }}>
                  <Th accent={accent} tpl={tpl} left>Date</Th>
                  <Th accent={accent} tpl={tpl} left>Mode</Th>
                  <Th accent={accent} tpl={tpl} left>Note</Th>
                  <Th accent={accent} tpl={tpl} right>Amount</Th>
                  <Th accent={accent} tpl={tpl} right>Running Due</Th>
                </tr>
              </thead>
              <tbody>
                {runningDue(payments, t.net).map((p) => (
                  <tr key={p.id}>
                    <Td accent={accent}>{fmtDate(p.date)}</Td>
                    <Td accent={accent}>{p.mode || '—'}</Td>
                    <Td accent={accent}>{p.note || ''}</Td>
                    <Td accent={accent} right bold>{inr(p.amount)}</Td>
                    <Td accent={accent} right>{inr(p.due)}</Td>
                  </tr>
                ))}
                <tr style={{ background: accent + '10' }}>
                  <Td accent={accent} bold>Total</Td>
                  <Td accent={accent}>{''}</Td>
                  <Td accent={accent}>{''}</Td>
                  <Td accent={accent} right bold>{inr(t.received)}</Td>
                  <Td accent={accent} right bold>{inr(t.balance)}</Td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---------- Signature ---------- */}
      <div className="mt-10 flex items-end justify-between">
        <p className="text-xs text-slate-400">{firm.name} — computer-generated document.</p>
        <div className="text-center">
          <div className="h-10" />
          <p className="border-t px-6 pt-1 text-sm font-semibold text-slate-700" style={{ borderColor: accent }}>
            {firm.signatoryName || `For ${firm.name}`}
          </p>
        </div>
      </div>
    </div>
  )
}

function runningDue(payments: { id: string; date: string; amount: number; mode?: string; note?: string }[], net: number) {
  let due = net
  return payments.map((p) => { due = Math.round((due - p.amount) * 100) / 100; return { ...p, due } })
}

function Th({ children, accent, tpl, left, right }: { children: React.ReactNode; accent: string; tpl: DocTemplate; left?: boolean; right?: boolean }) {
  return <th className={`border px-2 py-2 ${right ? 'text-right' : left ? 'text-left' : 'text-center'}`} style={{ borderColor: tpl === 'minimal' ? '#e2e8f0' : accent + '55' }}>{children}</th>
}
function Td({ children, accent, right, bold }: { children: React.ReactNode; accent: string; right?: boolean; bold?: boolean }) {
  return <td className={`border px-2 py-1.5 tabular-nums ${right ? 'text-right' : ''} ${bold ? 'font-semibold' : ''}`} style={{ borderColor: accent + '33' }}>{children}</td>
}
function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className={bold ? 'font-bold' : 'text-slate-600'} style={accent ? { color: accent } : undefined}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold' : ''}`} style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  )
}
