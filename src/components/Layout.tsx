import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Receipt, FileText, Boxes, Users2, Building2,
  UserCog, BarChart3, Settings as SettingsIcon, LogOut, Moon, Sun, Menu, Egg, ChevronDown,
  Cloud, CloudOff, RefreshCw, HardDrive,
} from 'lucide-react'
import { useStore } from '../lib/store'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart, adminOnly: false },
  { to: '/sales', label: 'Sales / Billing', icon: Receipt, adminOnly: false },
  { to: '/quotations', label: 'Quotations', icon: FileText, adminOnly: false },
  { to: '/stock', label: 'Stock', icon: Boxes, adminOnly: false },
  { to: '/parties', label: 'Parties', icon: Users2, adminOnly: false },
  { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: false },
  { to: '/firms', label: 'Firms', icon: Building2, adminOnly: true },
  { to: '/users', label: 'Users', icon: UserCog, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
]

function SyncBadge() {
  const { cloud, syncState } = useStore()
  if (!cloud) {
    return (
      <span className="hidden items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex" title="Data saved in this browser">
        <HardDrive size={14} /> Local
      </span>
    )
  }
  const map = {
    idle: { icon: <Cloud size={14} />, text: 'Cloud', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    saved: { icon: <Cloud size={14} />, text: 'Saved', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    syncing: { icon: <RefreshCw size={14} className="animate-spin" />, text: 'Syncing…', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    error: { icon: <CloudOff size={14} />, text: 'Sync error', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    local: { icon: <HardDrive size={14} />, text: 'Local', cls: 'bg-slate-100 text-slate-500' },
  }[syncState]
  return <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${map.cls}`} title="Cloud sync status">{map.icon}<span className="hidden sm:inline">{map.text}</span></span>
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { db, user, logout, currentFirmId, setCurrentFirmId } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('vet.dark') === '1')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('vet.dark', dark ? '1' : '0')
  }, [dark])

  const isAdmin = user?.role === 'Admin'
  const items = NAV.filter((n) => !n.adminOnly || isAdmin)
  const firms = db.firms.filter((f) => f.isActive)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-amber-400 text-white shadow-sm">
            <Egg size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Egg Traders</p>
            <p className="text-[11px] text-slate-400">Mediator Suite</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <button className="btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>

          {/* Firm switcher */}
          <div className="relative">
            <select
              value={currentFirmId || ''}
              onChange={(e) => setCurrentFirmId(e.target.value)}
              className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {firms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SyncBadge />
            <button className="btn-ghost !p-2" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name}</p>
              <p className="text-[11px] text-slate-400">{user?.role}</p>
            </div>
            <button className="btn-outline !px-2.5" onClick={() => { logout(); nav('/login') }} title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
