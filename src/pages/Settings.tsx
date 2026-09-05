import { useState } from 'react'
import { Save, Database, RotateCcw, Egg, Palette, Lock, Cloud, CloudOff, RefreshCw, DownloadCloud, KeyRound } from 'lucide-react'
import { useStore } from '../lib/store'
import type { BillingType, DocTemplate, BillMode } from '../lib/types'
import { PageHeader, Field, Confirm } from '../components/ui'
import { exportBackup } from '../lib/excel'

const TEMPLATES: { id: DocTemplate; label: string; hint: string }[] = [
  { id: 'modern', label: 'Modern', hint: 'Logo left · colour header block' },
  { id: 'classic', label: 'Classic', hint: 'Centered serif · double rule' },
  { id: 'minimal', label: 'Minimal', hint: 'Clean lines · low ink' },
]

export default function Settings() {
  const { db, saveSettings, resetDemo, cloud, syncState, syncNow, restoreFromCloud, changePassword } = useStore()
  const [s, setS] = useState({ ...db.settings })
  const [saved, setSaved] = useState(false)
  const [reset, setReset] = useState(false)

  // Change login password (cloud mode)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  async function doChangePassword() {
    setPwMsg(null)
    if (pw1.length < 6) { setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' }); return }
    if (pw1 !== pw2) { setPwMsg({ ok: false, text: 'The two passwords do not match.' }); return }
    setPwBusy(true)
    const err = await changePassword(pw1)
    setPwBusy(false)
    if (err) setPwMsg({ ok: false, text: err })
    else { setPwMsg({ ok: true, text: 'Password changed successfully.' }); setPw1(''); setPw2('') }
  }

  function save() {
    saveSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Global configuration for all firms" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Egg size={18} /> Egg & Tray</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Eggs per Tray (global)"><input className="input" type="number" value={s.eggsPerTray} onChange={(e) => setS({ ...s, eggsPerTray: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Low-stock threshold (trays)"><input className="input" type="number" value={s.lowStockThresholdTrays} onChange={(e) => setS({ ...s, lowStockThresholdTrays: parseInt(e.target.value) || 0 })} /></Field>
          </div>
          <p className="mt-2 text-xs text-slate-400">Tray size is snapshotted onto each purchase/sale, so changing it later never rewrites history. Firms can override this in Firms → Edit.</p>
        </div>

        {/* ---- Document design ---- */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-1 flex items-center gap-2 font-semibold"><Palette size={18} /> Document Design</h3>
          <p className="mb-4 text-xs text-slate-400">Saving reflects immediately on every Simple &amp; Detailed bill and voucher. Each firm's accent colour still personalises its own documents.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="label">Selling Bill design</p>
              <div className="space-y-2">
                {TEMPLATES.map((tpl) => (
                  <button key={tpl.id} onClick={() => setS({ ...s, saleTemplate: tpl.id })}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${s.saleTemplate === tpl.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}>
                    <span><span className="font-semibold">{tpl.label}</span><span className="block text-xs text-slate-400">{tpl.hint}</span></span>
                    {s.saleTemplate === tpl.id && <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Selected</span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Purchase Bill design</p>
              <div className="space-y-2">
                {TEMPLATES.map((tpl) => (
                  <button key={tpl.id} onClick={() => setS({ ...s, purchaseTemplate: tpl.id })}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${s.purchaseTemplate === tpl.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}>
                    <span><span className="font-semibold">{tpl.label}</span><span className="block text-xs text-slate-400">{tpl.hint}</span></span>
                    {s.purchaseTemplate === tpl.id && <span className="badge bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">Selected</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Default Bill Mode">
              <select className="input" value={s.defaultBillMode} onChange={(e) => setS({ ...s, defaultBillMode: e.target.value as BillMode })}>
                <option value="Simple">Simple — clean one-page bill</option>
                <option value="Detailed">Detailed — with payment history &amp; due</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
              <input type="checkbox" checked={s.showPaymentHistory} onChange={(e) => setS({ ...s, showPaymentHistory: e.target.checked })} />
              Show payment history on Detailed bills
            </label>
          </div>
        </div>

        {/* ---- Security ---- */}
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Lock size={18} /> Security</h3>
          <Field label="Stock page password"><input className="input" value={s.stockPassword} onChange={(e) => setS({ ...s, stockPassword: e.target.value })} /></Field>
          <p className="mt-2 text-xs text-slate-400">Required to open the Stock page. Default is <code>ram</code>.</p>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Financial & Tax</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency"><input className="input" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></Field>
            <Field label="FY Start Month (4 = Apr)"><input className="input" type="number" min={1} max={12} value={s.fyStartMonth} onChange={(e) => setS({ ...s, fyStartMonth: parseInt(e.target.value) || 4 })} /></Field>
            <Field label="Default Tax Rate %"><input className="input" type="number" value={s.defaultTaxRate} onChange={(e) => setS({ ...s, defaultTaxRate: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Tax Rates (comma-sep)"><input className="input" value={s.taxRates.join(', ')} onChange={(e) => setS({ ...s, taxRates: e.target.value.split(',').map((x) => parseFloat(x.trim())).filter((x) => !isNaN(x)) })} /></Field>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Billing Types</h3>
          <Field label="Types (comma-separated)">
            <input className="input" value={s.billingTypes.join(', ')}
              onChange={(e) => setS({ ...s, billingTypes: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) as BillingType[] })} />
          </Field>
          <div className="mt-2 flex flex-wrap gap-1">
            {s.billingTypes.map((b) => <span key={b} className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{b}</span>)}
          </div>
          <Field label="Invoice Footer" className="mt-3"><input className="input" value={s.invoiceFooter} onChange={(e) => setS({ ...s, invoiceFooter: e.target.value })} /></Field>
        </div>

        {/* ---- Cloud (Supabase) ---- */}
        <div className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-semibold">
            {cloud ? <Cloud size={18} /> : <CloudOff size={18} />} Cloud Sync
          </h3>
          {cloud ? (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {syncState === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
                  Connected to Supabase
                </span>
              </p>
              <p className="text-xs text-slate-400">Your data auto-saves to Supabase after every change and syncs to any device you sign in on.</p>
              <div className="mt-3 flex flex-col gap-2">
                <button className="btn-outline justify-start" onClick={() => syncNow()}><RefreshCw size={16} /> Push to cloud now</button>
                <button className="btn-outline justify-start" onClick={() => restoreFromCloud()}><DownloadCloud size={16} /> Restore latest from cloud</button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm text-slate-500">Running in <b>local mode</b> — data is stored only in this browser.</p>
              <p className="text-xs text-slate-400">To enable cloud sync across devices, add your Supabase URL &amp; anon key to a <code>.env</code> file and restart. See <code>.env.example</code> and <code>supabase/schema.sql</code>.</p>
            </>
          )}
        </div>

        {/* ---- Change login password (cloud) ---- */}
        {cloud && (
          <div className="card p-5">
            <h3 className="mb-1 flex items-center gap-2 font-semibold"><KeyRound size={18} /> Change Login Password</h3>
            <p className="mb-3 text-xs text-slate-400">Updates your Supabase login password (stored securely/encrypted). You can change it anytime.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="New password"><input className="input" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="At least 6 characters" /></Field>
              <Field label="Confirm new password"><input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
            </div>
            {pwMsg && <p className={`mt-2 text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{pwMsg.text}</p>}
            <button className="btn-primary mt-3" onClick={doChangePassword} disabled={pwBusy || !pw1 || !pw2}>
              <KeyRound size={16} /> {pwBusy ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}

        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Database size={18} /> Data</h3>
          <div className="flex flex-col gap-2">
            <button className="btn-outline justify-start" onClick={() => exportBackup(db)}><Database size={16} /> Export full backup (Excel)</button>
            <button className="btn-outline justify-start text-rose-600" onClick={() => setReset(true)}><RotateCcw size={16} /> Reset to demo data</button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Data is stored in this browser. Swap <code>src/lib/db.ts</code> for a cloud backend to sync across devices.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button className="btn-primary" onClick={save}><Save size={16} /> Save Settings</button>
        {saved && <span className="text-sm font-semibold text-emerald-600">Saved ✓</span>}
      </div>

      <Confirm open={reset} title="Reset to demo data?" message="This erases all current data and restores the seeded demo (2 firms + samples)."
        onCancel={() => setReset(false)} onConfirm={() => { resetDemo(); setReset(false) }} />
    </div>
  )
}
