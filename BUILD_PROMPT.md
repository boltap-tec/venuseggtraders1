# Build Prompt — "Venus Egg Traders" Multi-Firm Egg Trading Suite

> Paste this entire document to an AI coding agent (or hand it to a developer) as the build specification. It describes a **beautiful, modern, production-grade web application** for **egg-trading firms** to run **Purchases, Sales, Quotations, Billing, Stock Maintenance, and Reports** across **any number of firms** from a single admin login.

---

## 0. One-paragraph summary

Build a polished, responsive single-page web application for an **egg-trading mediator (broker/middleman)** who **buys eggs from Purchasers and sells them to Sellers**, operating **multiple firms** under one account. Each firm keeps its own branding, address, GST details, and document numbering. Users record **Purchases** (eggs bought **from a Purchaser**, in trays) and **Sales** (eggs sold **to a Seller**, B2B/B2C, in trays), maintain **live stock** (trays and loose eggs), issue **Quotations**, and generate clean, professional **PDF and Excel** invoices/quotations that carry the firm's full details (name, address, pincode, phone, GSTIN). Because the operator is a mediator, the app also tracks **margin/profit** (sale value − purchase cost) per deal, per party, and per firm. An **Admin** can add unlimited new firms and edit existing ones at any time **without altering documents already generated** (every document snapshots the firm + party details at creation time). Trays-to-eggs conversion (e.g. **1 tray = 30 eggs**) is configured in **Settings**. Payments are recorded against purchases and sales with partial-payment history and a derived paid/partial/pending status.

### Business model (important — read first)
The operator is a **mediator**, not a producer or a retailer of their own stock:
- **Purchaser** = the party the operator **buys from** (the supply side). Recorded in the **Purchase** table.
- **Seller** = the party the operator **sells to** (the demand side). Recorded in the **Sales** table.
- The operator's income is the **margin** between what they pay Purchasers and what they charge Sellers, so profit reporting is a first-class feature, not an afterthought.
- Payables flow **to Purchasers**; receivables flow **from Sellers**.

---

## 1. The firms (seed data)

Seed the database on first run with these two firms. Both are editable, and **more firms can be added by the Admin later with zero code changes**.

| Field | Firm 1 | Firm 2 |
|---|---|---|
| Name | **Venus Egg Traders** | **Ram Egg Traders** |
| Address | 158, Panduthakaranputhur | Jawahar Bazaar Corner, Karur |
| Pincode | 639009 | 639001 |
| GSTIN | *(configurable — leave blank until provided)* | *(configurable)* |
| Phone / Email | *(configurable)* | *(configurable)* |
| Egg-trade branding | its own logo, accent colour, prefix (e.g. `VET/`) | its own logo, accent colour, prefix (e.g. `RET/`) |

Each firm independently chooses its **document template, font, primary + secondary accent colour, logo, bank/UPI details, invoice prefix, and terms**, so a newly added firm automatically gets its own look.

---

## 2. Core domain model

Use these entities. Money and stock values are **derived, never hand-typed**, except where the spec explicitly says a field is editable.

### 2.1 Firm (Company)
```
id, name, address, pincode, phone, email,
gstin?, stateCode?, logoDataUrl?, bankDetails?, upiId?, payeeName?,
invoicePrefix?, quotePrefix?, purchasePrefix?,
accent?, accent2?, template, fontFamily?, terms?,
eggsPerTrayOverride?,        // optional per-firm override of the global setting
openingStockTrays?,          // starting inventory when the firm is created
signatoryName?, signatureDataUrl?,
isActive
```

### 2.2 Purchase (buying eggs)
Columns exactly as requested, plus payment tracking:
```
id,
voucherNo,            // global running number, unique system-wide
firmVoucherNo,        // per-firm, per-financial-year (e.g. VET/2026-27/014)
purchaserName,        // "Name of Purchaser" = the party the operator BUYS FROM (supply side)
date,                 // ISO
firmId,
trayQty,              // Tray_Qty (number of trays purchased)
eggsPerTray,          // SNAPSHOT of the tray size in effect (from Settings) at record time
amount,               // EDITABLE total amount (as requested)
ratePerTray?,         // optional; if entered, amount can auto-fill = trayQty * ratePerTray
billingType,          // Credit / Cash / Card / UPI / Cheque / Other
payments[],           // partial payment history (date, amount, mode, note)
receivedAmount,       // kept in sync with payments (amount PAID to the supplier)
paymentStatus,        // derived: Paid / Partial / Pending
notes?, createdBy, createdAt, updatedAt, deletedAt?
```
> **Editable amount + payment recording** are explicit requirements: the amount field is directly editable, and each purchase supports logging one or more payments toward it with a running balance.

### 2.3 Sale (selling eggs) — also the billing document
Columns exactly as requested, plus billing/payment fields:
```
id,
billNo,               // Bill No — global running number
firmBillNo,           // per-firm, per-FY (e.g. VET/2026-27/031) — printed on the invoice
date,                 // ISO
firmId,
sellerType,           // "Seller Type": B2B | B2C (choosable)
sellerName,           // "Seller Name" = the party the operator SELLS TO (demand side)
sellerAddress?, sellerPhone?, sellerGstin?,   // snapshotted; GSTIN mainly for B2B
qtyTray,              // Qty (Tray)
amountPerQty,         // Amount_Per_Qty (rate per tray)
totalAmount,          // Total_Amount = qtyTray * amountPerQty (DERIVED, never hand-typed)
costBasisPerTray?,    // optional: mediator's buy cost per tray for this sale (for margin);
                      // auto-suggestable from recent purchases / weighted-avg stock cost.
                      // NEVER printed on the Seller's invoice
linkedPurchaseIds?,   // optional: purchases this sale draws stock from (accurate margin)
billingType,          // Credit / Cash / Card / UPI / Cheque / Other
gstEnabled?, gstInclusive?, discountAmount?, discountIsPercent?,
payments[], receivedAmount, paymentStatus,   // derived status
docStatus,            // Draft / Finalized (number locks on finalize)
createdBy, createdAt, updatedAt, deletedAt?
```
> Support **multiple line items** per sale where a customer buys different grades/sizes (each line: description, qty in trays, rate per tray, optional HSN + GST%). `Total_Amount` is the sum of line totals minus discount, plus GST when enabled.

### 2.4 Quotation
Same shape as a Sale but **without payments**, plus `validUntil` and `status` (Draft / Sent / Accepted / Rejected / Expired / Converted) and a **one-click "Convert to Bill/Sale"** action.

### 2.5 Party (Customer/Supplier directory)
Reusable directory of parties. In this mediator model: a **Purchaser** is a party the operator *buys from* and a **Seller** is a party the operator *sells to* (a party can be both). Shape: `id, name, type (Purchaser | Seller | Both), address, phone, gstin?, notes`. Auto-suggest on the purchaser/seller name fields; but each document still **snapshots** the name/address/phone/GSTIN so later edits never change historical documents.

### 2.6 Stock / Inventory
Derived and maintained per firm:
```
currentTrays = openingStockTrays
             + Σ purchase.trayQty
             − Σ sale.qtyTray
             ± manual stock adjustments
```
Also expose **loose eggs** using the tray size (e.g. 305 eggs at 30/tray = 10 trays + 5 eggs). Provide a **Stock Adjustment** entry (breakage, wastage, opening correction) with reason + date, and a **Stock Ledger** listing every movement (purchase in / sale out / adjustment) with a running balance. Show **low-stock alerts** below a configurable threshold.

### 2.7 Settings
```
eggsPerTray,          // GLOBAL tray size (e.g. 30) — "No_Eggs in Tray", configurable here
currency (₹), dateFormat (dd-MM-yyyy),
billingTypes[],       // Credit, Cash, Card, UPI, Cheque, Other — editable list
defaultTaxRate, taxRates[], fyStartMonth (4 = April, Indian FY),
lowStockThresholdTrays,
invoiceFooter, reminderTemplate?
```

### 2.8 User & Roles
- **Admin:** full access — add/edit/delete firms, users, settings; everything below.
- **Operator:** create/edit purchases, sales, quotations; restricted from firm/user/settings management (configurable allowed-menus list).

---

## 3. Critical business rules

1. **Historical immutability.** Editing a firm's address/GSTIN/branding, or editing a party, must **never** change any document already generated. Achieve this by snapshotting the firm block and the party block onto each Purchase/Sale/Quotation at creation. Newly created documents use the latest firm details.
2. **Two numbering series** for both purchases and sales: a **global** running number (unique system-wide) plus a **per-firm, per-financial-year** number (e.g. `VET/2026-27/014`) that prints on the document. Numbers are assigned **atomically on finalize** so there are no gaps or collisions.
3. **Derived money.** `Total_Amount = Qty(Tray) × Amount_Per_Qty` (minus discount, plus GST if enabled). Payment status (Paid/Partial/Pending) is derived from `receivedAmount` vs total. The purchase **Amount is editable** by design; sale **Total is computed**.
4. **Tray ↔ eggs.** Tray size comes from Settings (per-firm override allowed) and is **snapshotted** onto each purchase/sale so changing the global size later doesn't rewrite history.
5. **GST is per firm.** A firm with a GSTIN issues a **"Tax Invoice"** (HSN/SAC, per-line GST, CGST+SGST intra-state or IGST inter-state via state codes); a firm without a GSTIN issues a plain **"Invoice"** with no tax. Nothing hard-coded — rates and FY are in Settings.
6. **B2B vs B2C.** Seller Type is user-choosable; B2B surfaces the party GSTIN on the invoice, B2C omits it. Both are supported for sales and quotations.
7. **Mediator margin.** For every sale, compute **margin = Total_Amount (sell) − buy cost** where buy cost = `qtyTray × costBasisPerTray` (or the sum of `linkedPurchaseIds`). Roll margin up **per deal, per party, per firm, and per period**. The buy cost and margin are **internal only** — never shown on the Seller's invoice/quotation.
8. **Two-sided balances.** Track **payables to Purchasers** (from purchases) and **receivables from Sellers** (from sales) separately; a party who is *Both* has both ledgers.
9. **Soft delete / Recycle bin** for all documents; Admin can restore or permanently delete.

---

## 4. Screens (pages)

1. **Login** — email/password, role-aware.
2. **Dashboard** — KPI cards (today's/this-month's purchases, sales, **margin/profit earned**, receivables from Sellers, payables to Purchasers, current stock in trays), revenue-and-margin-over-time chart, stock-level chart, low-stock and pending-payment widgets, recent activity, **per-firm + consolidated** views with a firm switcher.
3. **Purchases** — list with filters (firm, date range, purchaser, payment status) + create/edit form + detail view with payment capture and PDF/Excel/print.
4. **Sales / Billing** — same pattern; spreadsheet-like line-item editor (Enter adds a row), live totals, B2B/B2C toggle, billing-type selector, payment capture, Draft vs Finalized.
5. **Quotations** — like Sales minus payments, plus `validUntil`, status, and **Convert to Bill**.
6. **Stock** — current stock per firm, stock ledger (movements), stock-adjustment entry, low-stock alerts.
7. **Parties** — supplier/customer directory with search.
8. **Firms (Companies)** — Admin adds/edits firms (name, address, pincode, phone, email, GSTIN, state code, logo, bank/UPI, prefixes, accent colours, template, font, terms, opening stock, tray-size override, active toggle).
9. **Users** — Admin manages users and roles.
10. **Reports** — Purchase register, Sales register, **Margin/Profit report (per deal, per party, per firm, per period)**, Receivables from Sellers (aging 0–30/31–60/61–90/90+), Payables to Purchasers, Stock summary/valuation, Quotation report (conversion rate), Party statement (running balance, buy + sell sides), Firm/consolidated summary, GST working summary — **all exportable to Excel**.
11. **Settings** — tray size, billing types, tax rates, FY start, currency, date format, low-stock threshold, footer/reminder templates, full-backup export, reset-to-demo.

---

## 5. Documents: PDF & Excel export

Every Quotation and Sale/Bill must export to **clean, professional, print-ready PDF (A4)** and **Excel**, including the **full firm block**: firm name, address, pincode, phone, email, **GSTIN**, logo, and bank/UPI details, plus party details, itemised trays/rate/amount, totals, amount-in-words, GST breakup (when applicable), billing type, and signature line.

- **PDF:** pure client-side, print-stylesheet based (`@page A4`), branded per firm, **B&W-printer-friendly** (meaning carried by borders/weight/contrast, not colour alone), with a **"With header / Letter-pad"** toggle so it can print on pre-printed letterhead.
- **Excel:** via SheetJS — invoices/quotations and **every report** export with headers, ₹ number formats (Indian grouping `₹1,50,000.00`), totals rows, a filter summary, and one-sheet-per-firm on consolidated exports.
- **Full backup:** Settings → Export full backup (Excel) for data portability.
- **Numbers in words** and **Indian rupee grouping** throughout.

---

## 6. Design & UX bar

Make it genuinely **beautiful and attractive**, not just functional:

- Clean, modern, spacious layout; a sidebar + top bar with a **firm switcher** and global search.
- A refined colour system that adapts to each firm's accent; smooth micro-interactions; accessible contrast; **light and dark** support.
- **Fully responsive** — tables gracefully collapse to cards on mobile; touch-friendly.
- **Keyboard-friendly forms** (Enter to add a line item, sensible tab order, inline validation).
- Empty states, loading skeletons, toasts for success/error, and confirm dialogs for destructive actions.
- Fast: optimistic UI, no janky reflows; large lists virtualised or paginated.

---

## 7. Recommended tech stack & architecture

- **React 18 + TypeScript + Vite + Tailwind CSS**, React Router, Recharts (charts), SheetJS/`xlsx` (Excel), lucide-react (icons), qrcode (UPI QR).
- **Single data seam:** keep all persistence behind one module (`src/lib/db.ts`) so the app can run in **local mode** (browser `localStorage`, self-seeding demo data) *or* **cloud mode** (Supabase: Postgres + Auth + row-level security) by swapping only that file.
- Suggested structure:
  ```
  src/lib/     types.ts, db.ts, store.tsx, calc.ts (derived money+stock),
               numbering.ts (global + per-firm/FY), format.ts (₹ + words + dates),
               excel.ts, stock.ts
  src/components/  Layout, LineItemEditor, PartyFields, DocumentView (A4), ui
  src/pages/       Login, Dashboard, Purchases/PurchaseForm/PurchaseDetail,
                   Sales/SaleForm/SaleDetail, Quotations/…, Stock, Parties,
                   Firms, Users, Reports, Settings, RecycleBin
  ```
- Seed on first run with the two firms above, a few sample parties, and a handful of purchases/sales so dashboards/reports aren't empty. Provide **Reset to demo data**.
- Deployable as a static SPA (host must fall back to `index.html`). Document a Supabase setup path for real multi-device login + cloud database.

---

## 8. Acceptance checklist

- [ ] Admin can **add a new firm** (all fields) and it immediately appears in the firm switcher, numbering, and documents — **no code changes**.
- [ ] Admin can **edit an existing firm**; **already-generated** purchases, sales, and quotations are **unchanged**.
- [ ] **Purchase** captures Voucher Number, Name of Purchaser, Date, Tray_Qty, editable Amount, billing type, and **payments** with a running balance.
- [ ] **Sale** captures Bill No, Date, Seller Type (B2B/B2C), Seller Name (the party sold **to**), Qty(Tray), Amount_Per_Qty, and auto-computes **Total_Amount**; billing type is Credit/Cash/Card/UPI/etc.
- [ ] **Mediator margin** (sell − buy) is computed and reported per deal/party/firm/period, and is **never printed** on the Seller's invoice.
- [ ] **Payables to Purchasers** and **receivables from Sellers** are tracked as separate ledgers.
- [ ] **Tray size** ("No_Eggs in Tray") is set in **Settings**, snapshotted per document, per-firm override supported.
- [ ] **Stock** updates automatically from purchases (in), sales (out), and manual adjustments; low-stock alerts work.
- [ ] Quotations and Bills export to **clean PDF and Excel** with full firm details incl. address + GST.
- [ ] Global + per-firm/FY numbering is gapless and atomic.
- [ ] Roles enforced; soft-delete/recycle bin works; full backup export works.
- [ ] Responsive, accessible, light/dark, and visually polished.

---

*Reference implementation to mirror in structure and quality: the "Magizhini" multi-company billing/quotation app in `D:\Print_Technology` (same numbering, snapshotting, per-company branding, and PDF/Excel patterns — re-themed here for egg trading with Purchases + Sales + Stock).*
