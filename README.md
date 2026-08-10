# Egg Traders Suite — Multi-Firm Mediator App

A modern web app for an **egg-trading mediator**: you **buy from Purchasers** and **sell to Sellers** across multiple firms (Venus Egg Traders, Ram Egg Traders, and any you add), with **margin tracking** built in.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

**Demo logins**
| Role | Email | Password |
|---|---|---|
| Admin | `admin@venus.app` | `admin123` |
| Operator | `operator@venus.app` | `operator123` |

The app seeds itself on first run with the two firms + sample data. Reset anytime from **Settings → Reset to demo data**.

```bash
npm run build     # type-check + production bundle to dist/
npm run preview   # serve the build
```

## What's inside

- **Dashboard** — sales, purchases, margin, receivables (from Sellers), payables (to Purchasers), live stock, 7-day charts.
- **Purchases** — Voucher No, Purchaser (buy-from), Date, Tray Qty, **editable Amount**, billing type, payment recording.
- **Sales / Billing** — Bill No, Seller Type (B2B/B2C), Seller (sell-to), line items in trays, auto **Total**, internal buy-cost → **margin**, payments, PDF + Excel.
- **Quotations** — with validity, status, and one-click **Convert to Bill**.
- **Stock** — opening + purchases − sales ± adjustments, ledger, low-stock alerts. Tray size (eggs/tray) set in Settings.
- **Parties** — Purchaser/Seller directory with per-party payable & receivable.
- **Firms** (Admin) — add unlimited firms; each with its own branding, GSTIN, prefixes, template. Editing a firm never changes documents already generated (they snapshot firm + party details).
- **Users / Reports / Settings** — roles, margin & register exports, tray size, billing types, tax rates, backup.

## Architecture

React 18 + TypeScript + Vite + Tailwind + React Router + Recharts + SheetJS.
All persistence sits behind one seam — `src/lib/db.ts` (currently browser localStorage). Swap that single file for a cloud backend (e.g. Supabase/Postgres) to sync across devices; the schema and business logic in `src/lib` stay unchanged.

See [BUILD_PROMPT.md](BUILD_PROMPT.md) for the full specification.
