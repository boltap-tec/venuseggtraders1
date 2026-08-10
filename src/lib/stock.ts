// Stock derivation: opening + purchases (in) - sales (out) +/- adjustments.

import type { Database, ID } from './types'

export interface StockRow {
  date: string
  kind: 'Opening' | 'Purchase' | 'Sale' | 'Adjustment'
  ref: string
  inTrays: number
  outTrays: number
  balance: number
}

export function firmStockLedger(db: Database, firmId: ID): StockRow[] {
  const firm = db.firms.find((f) => f.id === firmId)
  const rows: StockRow[] = []
  const opening = firm?.openingStockTrays || 0

  const events: StockRow[] = []
  if (opening) {
    events.push({ date: '0000-01-01', kind: 'Opening', ref: 'Opening stock', inTrays: opening, outTrays: 0, balance: 0 })
  }
  for (const p of db.purchases.filter((x) => x.firmId === firmId && !x.deletedAt)) {
    events.push({ date: p.date, kind: 'Purchase', ref: p.firmVoucherNo, inTrays: p.trayQty, outTrays: 0, balance: 0 })
  }
  for (const s of db.sales.filter((x) => x.firmId === firmId && !x.deletedAt)) {
    const qty = s.items.reduce((a, it) => a + (Number(it.qtyTray) || 0), 0)
    events.push({ date: s.date, kind: 'Sale', ref: s.firmBillNo, inTrays: 0, outTrays: qty, balance: 0 })
  }
  for (const a of db.adjustments.filter((x) => x.firmId === firmId)) {
    events.push({
      date: a.date,
      kind: 'Adjustment',
      ref: a.reason + (a.note ? ` — ${a.note}` : ''),
      inTrays: a.trays > 0 ? a.trays : 0,
      outTrays: a.trays < 0 ? -a.trays : 0,
      balance: 0,
    })
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  let bal = 0
  for (const e of events) {
    bal += e.inTrays - e.outTrays
    rows.push({ ...e, balance: bal })
  }
  return rows
}

export function firmCurrentStock(db: Database, firmId: ID): number {
  const ledger = firmStockLedger(db, firmId)
  return ledger.length ? ledger[ledger.length - 1].balance : db.firms.find((f) => f.id === firmId)?.openingStockTrays || 0
}
