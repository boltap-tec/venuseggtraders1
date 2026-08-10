import { useState } from 'react'
import { Plus, Pencil, Trash2, UserCog, Shield, User as UserIcon } from 'lucide-react'
import { useStore } from '../lib/store'
import type { User, Role } from '../lib/types'
import { uid } from '../lib/db'
import { PageHeader, Modal, Field, Confirm, Pill } from '../components/ui'

const blank = (): User => ({ id: uid(), name: '', email: '', role: 'Operator', password: '' })

export default function Users() {
  const { db, user, saveUser, deleteUser } = useStore()
  const [editing, setEditing] = useState<User | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage who can access the suite"
        actions={<button className="btn-primary" onClick={() => { setEditing(blank()); setIsNew(true) }}><Plus size={16} /> Add User</button>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {db.users.map((u) => (
          <div key={u.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl text-white ${u.role === 'Admin' ? 'bg-brand-600' : 'bg-slate-500'}`}>
                  {u.role === 'Admin' ? <Shield size={20} /> : <UserIcon size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
              <Pill tone={u.role === 'Admin' ? 'brand' : 'slate'}>{u.role}</Pill>
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <button className="btn-ghost !p-1.5" onClick={() => { setEditing({ ...u }); setIsNew(false) }}><Pencil size={16} /></button>
              {u.id !== user?.id && <button className="btn-ghost !p-1.5 text-rose-500" onClick={() => setDelId(u.id)}><Trash2 size={16} /></button>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Add User' : 'Edit User'}>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" className="col-span-2"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></Field>
            <Field label="Email" className="col-span-2"><input className="input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Role">
              <select className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>
                <option value="Admin">Admin</option><option value="Operator">Operator</option>
              </select>
            </Field>
            <Field label="Password"><input className="input" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></Field>
            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={!editing.name || !editing.email || !editing.password} onClick={() => { saveUser(editing); setEditing(null) }}>Save</button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!delId} title="Delete user?" message="This removes their login access."
        onCancel={() => setDelId(null)} onConfirm={() => { deleteUser(delId!); setDelId(null) }} />

      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800/60">
        <UserCog size={14} className="mr-1 inline" /> Demo auth is client-side. A production deployment should hash passwords on a server (see BUILD_PROMPT.md).
      </p>
    </div>
  )
}
