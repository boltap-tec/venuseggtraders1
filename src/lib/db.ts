// Persistence seam. Swap this single module for a real backend (Supabase/Postgres)
// without touching business logic. Currently: browser localStorage + self-seeding.

import type { Database } from './types'

const KEY = 'vet.db.v1'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function seed(): Database {
  const now = new Date().toISOString()
  const venusId = uid()
  const ramId = uid()
  const supA = uid()
  const supB = uid()
  const buyA = uid()
  const buyB = uid()

  const db: Database = {
    users: [
      { id: uid(), name: 'Administrator', email: 'admin@venus.app', role: 'Admin', password: 'admin123' },
      { id: uid(), name: 'Operator', email: 'operator@venus.app', role: 'Operator', password: 'operator123' },
    ],
    firms: [
      {
        id: venusId,
        name: 'Venus Egg Traders',
        address: '158, Panduthakaranputhur',
        pincode: '639009',
        phone: '',
        email: '',
        gstin: '',
        stateCode: '33',
        invoicePrefix: 'VET/',
        quotePrefix: 'VET/Q/',
        purchasePrefix: 'VET/P/',
        accent: '#ea580c',
        accent2: '#f59e0b',
        template: 'modern',
        fontFamily: 'Inter',
        terms: 'Goods once sold will not be taken back. Subject to Karur jurisdiction.',
        openingStockTrays: 120,
        signatoryName: 'For Venus Egg Traders',
        isActive: true,
      },
      {
        id: ramId,
        name: 'Ram Egg Traders',
        address: 'Jawahar Bazaar Corner, Karur',
        pincode: '639001',
        phone: '',
        email: '',
        gstin: '',
        stateCode: '33',
        invoicePrefix: 'RET/',
        quotePrefix: 'RET/Q/',
        purchasePrefix: 'RET/P/',
        accent: '#0d9488',
        accent2: '#0ea5e9',
        template: 'classic',
        fontFamily: 'Libre Baskerville',
        terms: 'Payment due within 7 days. Subject to Karur jurisdiction.',
        openingStockTrays: 80,
        signatoryName: 'For Ram Egg Traders',
        isActive: true,
      },
    ],
    parties: [
      { id: supA, name: 'Namakkal Poultry Farm', type: 'Purchaser', address: 'Namakkal', phone: '9840012345' },
      { id: supB, name: 'Suguna Hatcheries', type: 'Purchaser', address: 'Erode', phone: '9840067890' },
      { id: buyA, name: 'Sri Balaji Bakery', type: 'Seller', address: 'Karur', phone: '9842011111', gstin: '33ABCDE1234F1Z5' },
      { id: buyB, name: 'Walk-in Customer', type: 'Seller', address: 'Karur' },
    ],
    purchases: [],
    sales: [],
    quotations: [],
    adjustments: [],
    settings: {
      currency: '₹',
      dateFormat: 'dd-MM-yyyy',
      eggsPerTray: 30,
      defaultTaxRate: 0,
      taxRates: [0, 5, 12, 18],
      fyStartMonth: 4,
      billingTypes: ['Credit', 'Cash', 'Card', 'UPI', 'Cheque', 'Other'],
      lowStockThresholdTrays: 30,
      invoiceFooter: 'Thank you for your business!',
      saleTemplate: 'modern',
      purchaseTemplate: 'classic',
      defaultBillMode: 'Simple',
      showPaymentHistory: true,
      stockPassword: 'ram',
    },
    counters: { voucherNo: 0, billNo: 0, quoteNo: 0, firmVoucherSeq: {}, firmBillSeq: {}, firmQuoteSeq: {} },
  }

  // --- sample transactions so dashboards aren't empty ---
  const d = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10)

  seedPurchase(db, venusId, supA, 'Namakkal Poultry Farm', 40, 130, d(6), 'Cash', 40 * 130)
  seedPurchase(db, venusId, supB, 'Suguna Hatcheries', 60, 128, d(4), 'Credit', 4000)
  seedPurchase(db, ramId, supA, 'Namakkal Poultry Farm', 50, 132, d(3), 'UPI', 50 * 132)

  seedSale(db, venusId, buyA, 'Sri Balaji Bakery', 'B2B', 25, 150, 130, d(5), 'Credit', 0)
  seedSale(db, venusId, buyB, 'Walk-in Customer', 'B2C', 10, 155, 130, d(2), 'Cash', 1550)
  seedSale(db, ramId, buyA, 'Sri Balaji Bakery', 'B2B', 30, 152, 132, d(1), 'Credit', 2000)

  return db
}

function seedPurchase(
  db: Database,
  firmId: string,
  purchaserId: string,
  purchaserName: string,
  trayQty: number,
  ratePerTray: number,
  date: string,
  billingType: any,
  received: number,
) {
  const firm = db.firms.find((f) => f.id === firmId)!
  const fy = fyOf(date, db.settings.fyStartMonth)
  const key = `${firmId}:${fy}`
  db.counters.voucherNo += 1
  db.counters.firmVoucherSeq[key] = (db.counters.firmVoucherSeq[key] || 0) + 1
  const seq = db.counters.firmVoucherSeq[key]
  const amount = trayQty * ratePerTray
  db.purchases.push({
    id: uid(),
    voucherNo: db.counters.voucherNo,
    firmVoucherNo: `${firm.purchasePrefix}${fy}/${String(seq).padStart(3, '0')}`,
    date,
    firmId,
    purchaserName,
    purchaserId,
    trayQty,
    eggsPerTray: db.settings.eggsPerTray,
    ratePerTray,
    amount,
    billingType,
    payments: received ? [{ id: uid(), date, amount: received, mode: billingType }] : [],
    receivedAmount: received,
    createdBy: 'admin@venus.app',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

function seedSale(
  db: Database,
  firmId: string,
  sellerId: string,
  sellerName: string,
  sellerType: any,
  qtyTray: number,
  rate: number,
  cost: number,
  date: string,
  billingType: any,
  received: number,
) {
  const firm = db.firms.find((f) => f.id === firmId)!
  const party = db.parties.find((p) => p.id === sellerId)
  const fy = fyOf(date, db.settings.fyStartMonth)
  const key = `${firmId}:${fy}`
  db.counters.billNo += 1
  db.counters.firmBillSeq[key] = (db.counters.firmBillSeq[key] || 0) + 1
  const seq = db.counters.firmBillSeq[key]
  db.sales.push({
    id: uid(),
    billNo: db.counters.billNo,
    firmBillNo: `${firm.invoicePrefix}${fy}/${String(seq).padStart(3, '0')}`,
    date,
    firmId,
    sellerType,
    sellerName,
    sellerId,
    sellerAddress: party?.address,
    sellerPhone: party?.phone,
    sellerGstin: party?.gstin,
    items: [{ id: uid(), description: 'Farm Eggs (Tray)', qtyTray, amountPerQty: rate, costPerTray: cost }],
    discountAmount: 0,
    billingType,
    payments: received ? [{ id: uid(), date, amount: received, mode: billingType }] : [],
    receivedAmount: received,
    docStatus: 'Finalized',
    createdBy: 'admin@venus.app',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

function fyOf(iso: string, fyStartMonth: number): string {
  const dt = new Date(iso)
  const m = dt.getMonth() + 1
  const y = dt.getFullYear()
  const startYear = m >= fyStartMonth ? y : y - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function loadDB(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw) as Database
      // Backfill newly-added settings so older saved data keeps working.
      const settingsDefaults: Partial<Database['settings']> = {
        saleTemplate: 'modern',
        purchaseTemplate: 'classic',
        defaultBillMode: 'Simple',
        showPaymentHistory: true,
        stockPassword: 'ram',
      }
      db.settings = { ...settingsDefaults, ...db.settings } as Database['settings']
      return db
    }
  } catch {
    // ignore corrupt state
  }
  const fresh = seed()
  saveDB(fresh)
  return fresh
}

export function saveDB(db: Database): void {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function resetDB(): Database {
  const fresh = seed()
  saveDB(fresh)
  return fresh
}

// A fresh seeded database WITHOUT touching localStorage — used to initialise
// a brand-new cloud workspace.
export function freshSeed(): Database {
  return seed()
}
