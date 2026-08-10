// Derived money + margin + stock engine. Nothing here is hand-typed on documents.

import type { Sale, SaleItem, Quotation, Purchase, PaymentStatus } from './types'

export interface SaleTotals {
  gross: number // sum of line totals (qty * rate)
  discount: number
  taxable: number
  tax: number
  net: number // amount payable by the Seller
  received: number
  balance: number
  status: PaymentStatus
  cost: number // internal buy cost (never printed)
  margin: number // net (ex-tax basis) profit for the mediator
}

export function lineTotal(it: SaleItem): number {
  return (Number(it.qtyTray) || 0) * (Number(it.amountPerQty) || 0)
}

export function lineCost(it: SaleItem): number {
  return (Number(it.qtyTray) || 0) * (Number(it.costPerTray) || 0)
}

function computeDiscount(gross: number, doc: { discountAmount: number; discountIsPercent?: boolean }): number {
  if (!doc.discountAmount) return 0
  return doc.discountIsPercent ? (gross * doc.discountAmount) / 100 : doc.discountAmount
}

export function saleTotals(doc: Sale | Quotation): SaleTotals {
  const gross = doc.items.reduce((s, it) => s + lineTotal(it), 0)
  const cost = doc.items.reduce((s, it) => s + lineCost(it), 0)
  const discount = computeDiscount(gross, doc)
  const afterDiscount = Math.max(0, gross - discount)

  let taxable = afterDiscount
  let tax = 0
  if (doc.gstEnabled) {
    if (doc.gstInclusive) {
      // rates already include GST — extract it per line proportionally
      const totalTaxPortion = doc.items.reduce((s, it) => {
        const lt = lineTotal(it)
        const r = (it.taxRate ?? 0) / 100
        return s + (lt - lt / (1 + r))
      }, 0)
      // scale by discount ratio
      const ratio = gross > 0 ? afterDiscount / gross : 1
      tax = totalTaxPortion * ratio
      taxable = afterDiscount - tax
    } else {
      const ratio = gross > 0 ? afterDiscount / gross : 1
      tax = doc.items.reduce((s, it) => s + lineTotal(it) * ((it.taxRate ?? 0) / 100), 0) * ratio
      taxable = afterDiscount
    }
  }

  const net = Math.round((taxable + tax) * 100) / 100
  const received = 'receivedAmount' in doc ? (doc as Sale).receivedAmount || 0 : 0
  const balance = Math.round((net - received) * 100) / 100
  const status: PaymentStatus = received <= 0 ? 'Pending' : balance <= 0.001 ? 'Paid' : 'Partial'
  const margin = Math.round((taxable - cost) * 100) / 100

  return {
    gross: round2(gross),
    discount: round2(discount),
    taxable: round2(taxable),
    tax: round2(tax),
    net,
    received: round2(received),
    balance,
    status,
    cost: round2(cost),
    margin,
  }
}

export function purchaseStatus(p: Purchase): PaymentStatus {
  const bal = (p.amount || 0) - (p.receivedAmount || 0)
  if ((p.receivedAmount || 0) <= 0) return 'Pending'
  return bal <= 0.001 ? 'Paid' : 'Partial'
}

export function round2(n: number): number {
  return Math.round((isFinite(n) ? n : 0) * 100) / 100
}

export function traysToEggs(trays: number, eggsPerTray: number): string {
  const whole = Math.floor(Math.abs(trays))
  const frac = Math.abs(trays) - whole
  const looseEggs = Math.round(frac * eggsPerTray)
  const sign = trays < 0 ? '-' : ''
  if (looseEggs === 0) return `${sign}${whole} tray${whole === 1 ? '' : 's'}`
  return `${sign}${whole} tray${whole === 1 ? '' : 's'} + ${looseEggs} egg${looseEggs === 1 ? '' : 's'}`
}
