// Global + per-firm/FY numbering. Sequences are assigned atomically on save/finalize.

import type { Database, Firm } from './types'
import { financialYear } from './format'

export function nextVoucher(db: Database, firm: Firm, dateISO: string) {
  const fy = financialYear(dateISO, db.settings.fyStartMonth)
  const key = `${firm.id}:${fy}`
  const global = db.counters.voucherNo + 1
  const seq = (db.counters.firmVoucherSeq[key] || 0) + 1
  const prefix = firm.purchasePrefix || `${initials(firm.name)}/P/`
  const firmVoucherNo = `${prefix}${fy}/${String(seq).padStart(3, '0')}`
  return { global, seq, key, firmVoucherNo, fy }
}

export function nextBill(db: Database, firm: Firm, dateISO: string) {
  const fy = financialYear(dateISO, db.settings.fyStartMonth)
  const key = `${firm.id}:${fy}`
  const global = db.counters.billNo + 1
  const seq = (db.counters.firmBillSeq[key] || 0) + 1
  const prefix = firm.invoicePrefix || `${initials(firm.name)}/`
  const firmBillNo = `${prefix}${fy}/${String(seq).padStart(3, '0')}`
  return { global, seq, key, firmBillNo, fy }
}

export function nextQuote(db: Database, firm: Firm, dateISO: string) {
  const fy = financialYear(dateISO, db.settings.fyStartMonth)
  const key = `${firm.id}:${fy}`
  const global = db.counters.quoteNo + 1
  const seq = (db.counters.firmQuoteSeq[key] || 0) + 1
  const prefix = firm.quotePrefix || `${initials(firm.name)}/Q/`
  const firmQuoteNo = `${prefix}${fy}/${String(seq).padStart(3, '0')}`
  return { global, seq, key, firmQuoteNo, fy }
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'DOC'
  )
}
