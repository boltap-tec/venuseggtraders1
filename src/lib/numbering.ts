// Numbering derives the visible serial from the LIVE (non-deleted) documents of
// the same firm + financial year. So deleting the latest doc frees its number:
// the next document reuses "last live serial + 1". Formats:
//   Purchase → Voucher/2025-2026/001
//   Sale     → Bill/2025-2026/001
//   Quote    → Quote/2025-2026/001

import type { Database, Firm } from './types'
import { financialYear } from './format'

function pad(n: number): string {
  return String(n).padStart(3, '0')
}

// Extract the trailing serial number from a document number string.
function serialOf(no?: string): number {
  const m = /(\d+)\s*$/.exec(no || '')
  return m ? parseInt(m[1], 10) : 0
}

function nextSerial(existing: string[]): number {
  return existing.reduce((max, no) => Math.max(max, serialOf(no)), 0) + 1
}

export function nextVoucher(db: Database, firm: Firm, dateISO: string) {
  const fy = financialYear(dateISO, db.settings.fyStartMonth)
  const live = db.purchases
    .filter((p) => p.firmId === firm.id && !p.deletedAt && financialYear(p.date, db.settings.fyStartMonth) === fy)
    .map((p) => p.firmVoucherNo)
  const seq = nextSerial(live)
  return { global: (db.counters.voucherNo || 0) + 1, firmVoucherNo: `Voucher/${fy}/${pad(seq)}` }
}

export function nextBill(db: Database, firm: Firm, dateISO: string) {
  const fy = financialYear(dateISO, db.settings.fyStartMonth)
  const live = db.sales
    .filter((s) => s.firmId === firm.id && !s.deletedAt && financialYear(s.date, db.settings.fyStartMonth) === fy)
    .map((s) => s.firmBillNo)
  const seq = nextSerial(live)
  return { global: (db.counters.billNo || 0) + 1, firmBillNo: `Bill/${fy}/${pad(seq)}` }
}

export function nextQuote(db: Database, firm: Firm, dateISO: string) {
  const fy = financialYear(dateISO, db.settings.fyStartMonth)
  const live = db.quotations
    .filter((q) => q.firmId === firm.id && !q.deletedAt && financialYear(q.date, db.settings.fyStartMonth) === fy)
    .map((q) => q.firmQuoteNo)
  const seq = nextSerial(live)
  return { global: (db.counters.quoteNo || 0) + 1, firmQuoteNo: `Quote/${fy}/${pad(seq)}` }
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
