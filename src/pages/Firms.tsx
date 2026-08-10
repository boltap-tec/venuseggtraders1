import { useState } from 'react'
import { Plus, Pencil, Building2, CheckCircle2, XCircle } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Firm, DocTemplate } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, Modal, Field, Pill } from '../components/ui'
import { initials } from '../lib/numbering'

const blankFirm = (): Firm => ({
  id: uid(), name: '', address: '', pincode: '', phone: '', email: '', gstin: '', stateCode: '33',
  invoicePrefix: '', quotePrefix: '', purchasePrefix: '', accent: '#ea580c', accent2: '#f59e0b',
  template: 'modern', fontFamily: 'Inter', terms: '', openingStockTrays: 0, signatoryName: '', isActive: true,
})

export default function Firms() {
  const { db, saveFirm, deleteFirm } = useStore()
  const [editing, setEditing] = useState<Firm | null>(null)
  const [isNew, setIsNew] = useState(false)

  function openNew() {
    const f = blankFirm()
    setEditing(f); setIsNew(true)
  }
  function onName(name: string) {
    if (!editing) return
    const ini = initials(name)
    const patch: Partial<Firm> = { name }
    if (isNew) { patch.invoicePrefix = `${ini}/`; patch.quotePrefix = `${ini}/Q/`; patch.purchasePrefix = `${ini}/P/` }
    setEditing({ ...editing, ...patch })
  }
  function save() {
    if (!editing) return
    saveFirm(editing)
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Firms" subtitle="Add unlimited firms — each with its own branding, GST, and numbering"
        actions={<button className="btn-primary" onClick={openNew}><Plus size={16} /> Add Firm</button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {db.firms.map((f) => (
          <div key={f.id} className="card overflow-hidden">
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${f.accent}, ${f.accent2})` }} />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl text-lg font-black text-white" style={{ background: f.accent }}>
                    {f.name.slice(0, 1) || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.address} - {f.pincode}</p>
                  </div>
                </div>
                <button className="btn-ghost !p-1.5" onClick={() => { setEditing({ ...f }); setIsNew(false) }}><Pencil size={16} /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Pill tone="slate">{f.template}</Pill>
                {f.gstin ? <Pill tone="teal">GST</Pill> : <Pill tone="slate">No GST</Pill>}
                <Pill tone="brand">{f.invoicePrefix}</Pill>
                {f.isActive
                  ? <span className="ml-auto inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={14} /> Active</span>
                  : <span className="ml-auto inline-flex items-center gap-1 text-slate-400"><XCircle size={14} /> Inactive</span>}
              </div>
              <div className="mt-3 flex justify-end">
                {f.isActive
                  ? <button className="btn-ghost text-xs text-rose-500" onClick={() => deleteFirm(f.id)}>Deactivate</button>
                  : <button className="btn-ghost text-xs text-emerald-600" onClick={() => saveFirm({ ...f, isActive: true })}>Reactivate</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/60">
        <Building2 size={14} className="mr-1 inline" /> Editing a firm never changes documents already generated — each bill/quote keeps a snapshot of the firm details at the time it was created.
      </p>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Add Firm' : 'Edit Firm'} wide>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Firm Name" className="col-span-2"><input className="input" value={editing.name} onChange={(e) => onName(e.target.value)} autoFocus /></Field>
            <Field label="Address"><input className="input" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
            <Field label="Pincode"><input className="input" value={editing.pincode} onChange={(e) => setEditing({ ...editing, pincode: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="GSTIN (blank = no GST)"><input className="input" value={editing.gstin || ''} onChange={(e) => setEditing({ ...editing, gstin: e.target.value })} /></Field>
            <Field label="State Code"><input className="input" value={editing.stateCode || ''} onChange={(e) => setEditing({ ...editing, stateCode: e.target.value })} /></Field>

            <Field label="Invoice Prefix"><input className="input" value={editing.invoicePrefix || ''} onChange={(e) => setEditing({ ...editing, invoicePrefix: e.target.value })} /></Field>
            <Field label="Quote Prefix"><input className="input" value={editing.quotePrefix || ''} onChange={(e) => setEditing({ ...editing, quotePrefix: e.target.value })} /></Field>
            <Field label="Purchase Prefix"><input className="input" value={editing.purchasePrefix || ''} onChange={(e) => setEditing({ ...editing, purchasePrefix: e.target.value })} /></Field>
            <Field label="Opening Stock (trays)"><input className="input" type="number" value={editing.openingStockTrays || ''} onChange={(e) => setEditing({ ...editing, openingStockTrays: parseFloat(e.target.value) || 0 })} /></Field>

            <Field label="Template">
              <select className="input" value={editing.template} onChange={(e) => setEditing({ ...editing, template: e.target.value as DocTemplate })}>
                <option value="modern">Modern</option><option value="classic">Classic</option><option value="minimal">Minimal</option>
              </select>
            </Field>
            <Field label="Font">
              <select className="input" value={editing.fontFamily} onChange={(e) => setEditing({ ...editing, fontFamily: e.target.value })}>
                <option>Inter</option><option>Libre Baskerville</option>
              </select>
            </Field>
            <Field label="Accent Colour"><input className="input h-10 p-1" type="color" value={editing.accent} onChange={(e) => setEditing({ ...editing, accent: e.target.value })} /></Field>
            <Field label="Accent 2"><input className="input h-10 p-1" type="color" value={editing.accent2} onChange={(e) => setEditing({ ...editing, accent2: e.target.value })} /></Field>

            <Field label="Eggs per Tray override (blank = global)"><input className="input" type="number" value={editing.eggsPerTrayOverride || ''} onChange={(e) => setEditing({ ...editing, eggsPerTrayOverride: parseFloat(e.target.value) || undefined })} /></Field>
            <Field label="Signatory"><input className="input" value={editing.signatoryName || ''} onChange={(e) => setEditing({ ...editing, signatoryName: e.target.value })} /></Field>
            <Field label="Bank Details" className="col-span-2"><input className="input" value={editing.bankDetails || ''} onChange={(e) => setEditing({ ...editing, bankDetails: e.target.value })} /></Field>
            <Field label="UPI ID"><input className="input" value={editing.upiId || ''} onChange={(e) => setEditing({ ...editing, upiId: e.target.value })} /></Field>
            <Field label="Terms & Footer" className="col-span-2"><textarea className="input" rows={2} value={editing.terms || ''} onChange={(e) => setEditing({ ...editing, terms: e.target.value })} /></Field>

            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={!editing.name || !editing.address} onClick={save}>Save Firm</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
