import * as XLSX from 'xlsx'
import type { Database, Sale, Quotation, Purchase, Firm } from './types'
import { saleTotals } from './calc'
import { fmtDate } from './format'
import { amountInWords } from './format'

function download(wb: XLSX.WorkBook, name: string) {
  XLSX.writeFile(wb, name)
}

function firmHeaderRows(firm: Firm): any[][] {
  return [
    [firm.name],
    [`${firm.address} - ${firm.pincode}`],
    [firm.phone ? `Phone: ${firm.phone}` : '', firm.gstin ? `GSTIN: ${firm.gstin}` : ''].filter(Boolean),
    [],
  ]
}

export function exportSaleExcel(sale: Sale, firm: Firm) {
  const t = saleTotals(sale)
  const rows: any[][] = [
    ...firmHeaderRows(firm),
    [firm.gstin ? 'TAX INVOICE' : 'INVOICE'],
    ['Bill No', sale.firmBillNo, '', 'Date', fmtDate(sale.date)],
    ['Seller Type', sale.sellerType, '', 'Billing', sale.billingType],
    ['Sold To', sale.sellerName],
    [sale.sellerAddress || ''],
    sale.sellerGstin ? ['GSTIN', sale.sellerGstin] : [],
    [],
    ['#', 'Description', 'Qty (Tray)', 'Rate/Tray', 'Amount'],
    ...sale.items.map((it, i) => [i + 1, it.description, it.qtyTray, it.amountPerQty, it.qtyTray * it.amountPerQty]),
    [],
    ['', '', '', 'Gross', t.gross],
    ['', '', '', 'Discount', t.discount],
    ...(sale.gstEnabled ? [['', '', '', 'Taxable', t.taxable], ['', '', '', 'GST', t.tax]] : []),
    ['', '', '', 'Net Total', t.net],
    ['', '', '', 'Received', t.received],
    ['', '', '', 'Balance', t.balance],
    [],
    [amountInWords(t.net)],
    [],
    [firm.terms || ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows.filter((r) => r.length))
  ws['!cols'] = [{ wch: 5 }, { wch: 34 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice')
  download(wb, `${sale.firmBillNo.replace(/\//g, '-')}.xlsx`)
}

export function exportQuoteExcel(q: Quotation, firm: Firm) {
  const t = saleTotals(q)
  const rows: any[][] = [
    ...firmHeaderRows(firm),
    ['QUOTATION'],
    ['Quote No', q.firmQuoteNo, '', 'Date', fmtDate(q.date)],
    ['Valid Until', fmtDate(q.validUntil)],
    ['Quote To', q.sellerName],
    [q.sellerAddress || ''],
    [],
    ['#', 'Description', 'Qty (Tray)', 'Rate/Tray', 'Amount'],
    ...q.items.map((it, i) => [i + 1, it.description, it.qtyTray, it.amountPerQty, it.qtyTray * it.amountPerQty]),
    [],
    ['', '', '', 'Gross', t.gross],
    ['', '', '', 'Discount', t.discount],
    ...(q.gstEnabled ? [['', '', '', 'GST', t.tax]] : []),
    ['', '', '', 'Net Total', t.net],
    [],
    [amountInWords(t.net)],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows.filter((r) => r.length))
  ws['!cols'] = [{ wch: 5 }, { wch: 34 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Quotation')
  download(wb, `${q.firmQuoteNo.replace(/\//g, '-')}.xlsx`)
}

function firmName(db: Database, id: string) {
  return db.firms.find((f) => f.id === id)?.name || '—'
}

export function exportPurchaseRegister(db: Database, purchases: Purchase[]) {
  const rows = [
    ['Voucher No', 'Date', 'Firm', 'Purchaser', 'Trays', 'Rate/Tray', 'Amount', 'Paid', 'Balance', 'Billing'],
    ...purchases.map((p) => [
      p.firmVoucherNo, fmtDate(p.date), firmName(db, p.firmId), p.purchaserName, p.trayQty,
      p.ratePerTray || '', p.amount, p.receivedAmount, p.amount - p.receivedAmount, p.billingType,
    ]),
    [],
    ['', '', '', 'TOTAL', purchases.reduce((s, p) => s + p.trayQty, 0), '',
      purchases.reduce((s, p) => s + p.amount, 0), purchases.reduce((s, p) => s + p.receivedAmount, 0),
      purchases.reduce((s, p) => s + (p.amount - p.receivedAmount), 0)],
  ]
  sheetToFile(rows, 'Purchase Register', 'purchase-register.xlsx')
}

export function exportSalesRegister(db: Database, sales: Sale[]) {
  const rows = [
    ['Bill No', 'Date', 'Firm', 'Type', 'Seller', 'Trays', 'Net', 'Received', 'Balance', 'Cost', 'Margin', 'Billing'],
    ...sales.map((s) => {
      const t = saleTotals(s)
      const trays = s.items.reduce((a, it) => a + it.qtyTray, 0)
      return [s.firmBillNo, fmtDate(s.date), firmName(db, s.firmId), s.sellerType, s.sellerName, trays,
        t.net, t.received, t.balance, t.cost, t.margin, s.billingType]
    }),
    [],
    ['', '', '', '', 'TOTAL', sales.reduce((a, s) => a + s.items.reduce((x, it) => x + it.qtyTray, 0), 0),
      sum(sales, (s) => saleTotals(s).net), sum(sales, (s) => saleTotals(s).received),
      sum(sales, (s) => saleTotals(s).balance), sum(sales, (s) => saleTotals(s).cost),
      sum(sales, (s) => saleTotals(s).margin)],
  ]
  sheetToFile(rows, 'Sales Register', 'sales-register.xlsx')
}

export function exportMarginReport(db: Database, sales: Sale[]) {
  const rows = [
    ['Bill No', 'Date', 'Firm', 'Seller', 'Sell Value', 'Buy Cost', 'Margin', 'Margin %'],
    ...sales.map((s) => {
      const t = saleTotals(s)
      const pct = t.taxable ? (t.margin / t.taxable) * 100 : 0
      return [s.firmBillNo, fmtDate(s.date), firmName(db, s.firmId), s.sellerName, t.taxable, t.cost, t.margin, Math.round(pct * 10) / 10]
    }),
    [],
    ['', '', '', 'TOTAL', sum(sales, (s) => saleTotals(s).taxable), sum(sales, (s) => saleTotals(s).cost), sum(sales, (s) => saleTotals(s).margin)],
  ]
  sheetToFile(rows, 'Margin Report', 'margin-report.xlsx')
}

export function exportBackup(db: Database) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(db.firms), 'Firms')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(db.parties), 'Parties')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(db.purchases.map(flat)), 'Purchases')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(db.sales.map(flat)), 'Sales')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(db.quotations.map(flat)), 'Quotations')
  download(wb, `venus-backup-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function flat(o: any) {
  const c: any = {}
  for (const k of Object.keys(o)) c[k] = typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k]
  return c
}
function sum<T>(arr: T[], f: (t: T) => number) {
  return Math.round(arr.reduce((s, x) => s + f(x), 0) * 100) / 100
}
function sheetToFile(rows: any[][], sheet: string, file: string) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheet)
  download(wb, file)
}
