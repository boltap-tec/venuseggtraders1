// Domain model for the Venus Egg Traders mediator suite.
// The operator BUYS from Purchasers (supply side) and SELLS to Sellers (demand side).

export type ID = string

export type Role = 'Admin' | 'Operator'

export type DocTemplate = 'modern' | 'classic' | 'minimal'

export interface User {
  id: ID
  name: string
  email: string
  role: Role
  password: string // client-side demo auth only
  allowedMenus?: string[] // undefined = all (used for Operators)
}

export interface Firm {
  id: ID
  name: string
  address: string
  pincode: string
  phone?: string
  email?: string
  gstin?: string
  stateCode?: string
  logoDataUrl?: string
  bankDetails?: string
  upiId?: string
  payeeName?: string
  invoicePrefix?: string // e.g. "VET/"
  quotePrefix?: string // e.g. "VET/Q/"
  purchasePrefix?: string // e.g. "VET/P/"
  accent?: string
  accent2?: string
  template?: DocTemplate
  fontFamily?: string
  terms?: string
  eggsPerTrayOverride?: number
  openingStockTrays?: number
  signatoryName?: string
  isActive: boolean
}

// Reusable party directory. Purchaser = we buy from; Seller = we sell to.
export type PartyType = 'Purchaser' | 'Seller' | 'Both'
export interface Party {
  id: ID
  name: string
  type: PartyType
  address?: string
  phone?: string
  gstin?: string
  notes?: string
}

export type BillingType = 'Credit' | 'Cash' | 'Card' | 'UPI' | 'In_account' | 'Cheque' | 'Other'
export type PaymentStatus = 'Paid' | 'Partial' | 'Pending'
export type DocStatus = 'Draft' | 'Finalized'

// Simple = clean one-page bill. Detailed = adds payment history + payment due block.
export type BillMode = 'Simple' | 'Detailed'

export interface Payment {
  id: ID
  date: string // ISO
  amount: number
  mode?: BillingType
  note?: string
}

// A purchase = eggs bought FROM a Purchaser.
export interface Purchase {
  id: ID
  voucherNo: number // global running number
  firmVoucherNo: string // per-firm / per-FY (prints on voucher)
  date: string // ISO
  firmId: ID
  purchaserName: string // snapshot of the party we buy from
  purchaserId?: ID
  purchaserPhone?: string
  purchaserGstin?: string
  trayQty: number
  eggsPerTray: number // snapshot of tray size at record time
  ratePerEgg?: number // rate per single egg (primary input)
  ratePerTray?: number // derived: ratePerEgg * eggsPerTray
  amount: number // EDITABLE total amount
  billingType: BillingType
  billMode?: BillMode // Simple / Detailed voucher
  payments: Payment[]
  receivedAmount: number // amount PAID to the purchaser (synced from payments)
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type SellerType = 'B2B' | 'B2C'

export interface SaleItem {
  id: ID
  description: string
  qtyTray: number
  ratePerEgg?: number // rate per single egg (primary input)
  amountPerQty: number // rate per tray (selling) — derived: ratePerEgg * eggsPerTray
  costPerTray?: number // internal buy cost per tray for margin — never printed
  hsnSac?: string
  taxRate?: number
}

// A sale = eggs sold TO a Seller (also the billing document).
export interface Sale {
  id: ID
  billNo: number // global running number
  firmBillNo: string // per-firm / per-FY (prints on invoice)
  date: string // ISO
  firmId: ID
  sellerType: SellerType // B2B | B2C
  sellerName: string // snapshot of the party we sell to
  sellerId?: ID
  sellerAddress?: string
  sellerPhone?: string
  sellerGstin?: string
  items: SaleItem[]
  discountAmount: number
  discountIsPercent?: boolean
  gstEnabled?: boolean
  gstInclusive?: boolean
  billingType: BillingType
  billMode?: BillMode // Simple / Detailed invoice
  payments: Payment[]
  receivedAmount: number
  docStatus: DocStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted'

export interface Quotation {
  id: ID
  quoteNo: number
  firmQuoteNo: string
  date: string
  firmId: ID
  sellerType: SellerType
  sellerName: string
  sellerId?: ID
  sellerAddress?: string
  sellerPhone?: string
  sellerGstin?: string
  items: SaleItem[]
  discountAmount: number
  discountIsPercent?: boolean
  gstEnabled?: boolean
  gstInclusive?: boolean
  validUntil?: string
  status: QuoteStatus
  convertedSaleId?: ID
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type StockMovementReason = 'Opening' | 'Adjustment' | 'Breakage' | 'Correction'
export interface StockAdjustment {
  id: ID
  firmId: ID
  date: string
  trays: number // +add / -remove
  reason: StockMovementReason
  note?: string
  createdBy: string
  createdAt: string
}

export interface Settings {
  currency: string // '₹'
  dateFormat: string
  eggsPerTray: number // global tray size
  defaultTaxRate: number
  taxRates: number[]
  fyStartMonth: number // 4 => April
  billingTypes: BillingType[]
  lowStockThresholdTrays: number
  invoiceFooter: string
  // ---- document design (reflects on bills immediately) ----
  saleTemplate: DocTemplate // design of the selling bill
  purchaseTemplate: DocTemplate // design of the purchase bill/voucher
  defaultBillMode: BillMode // Simple / Detailed default for new documents
  showPaymentHistory: boolean // include payment history on Detailed bills
  // ---- security ----
  stockPassword: string // password to unlock the Stock page (default 'ram')
}

export interface Database {
  users: User[]
  firms: Firm[]
  parties: Party[]
  purchases: Purchase[]
  sales: Sale[]
  quotations: Quotation[]
  adjustments: StockAdjustment[]
  settings: Settings
  counters: {
    voucherNo: number
    billNo: number
    quoteNo: number
    firmVoucherSeq: Record<string, number>
    firmBillSeq: Record<string, number>
    firmQuoteSeq: Record<string, number>
  }
}
