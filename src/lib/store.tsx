import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Database, User, Firm, Party, Purchase, Sale, Quotation, StockAdjustment, Settings, Payment,
} from './types'
import { loadDB, saveDB, resetDB, freshSeed, migrate, uid } from './db'
import { nextVoucher, nextBill, nextQuote } from './numbering'
import { supabase, isCloud } from './supabase'
import { pullState, pushState } from './remote'

export type SyncState = 'local' | 'idle' | 'syncing' | 'saved' | 'error'

interface StoreValue {
  db: Database
  user: User | null
  currentFirmId: string | null
  setCurrentFirmId: (id: string | null) => void
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void

  // cloud
  cloud: boolean
  syncState: SyncState
  booting: boolean
  syncNow: () => Promise<void>
  restoreFromCloud: () => Promise<void>
  changePassword: (newPassword: string) => Promise<string | null>
  sendPasswordReset: (email: string) => Promise<string | null>

  // firms
  saveFirm: (f: Firm) => void
  deleteFirm: (id: string) => void

  // parties
  saveParty: (p: Party) => void
  deleteParty: (id: string) => void

  // purchases
  savePurchase: (p: Purchase, isNew: boolean) => Purchase
  deletePurchase: (id: string) => void
  addPurchasePayment: (id: string, pay: Payment) => void

  // sales
  saveSale: (s: Sale, isNew: boolean) => Sale
  deleteSale: (id: string) => void
  addSalePayment: (id: string, pay: Payment) => void

  // quotations
  saveQuote: (q: Quotation, isNew: boolean) => Quotation
  deleteQuote: (id: string) => void
  convertQuote: (id: string) => Sale | null

  // stock
  addAdjustment: (a: StockAdjustment) => void

  // settings + users
  saveSettings: (s: Settings) => void
  saveUser: (u: User) => void
  deleteUser: (id: string) => void

  resetDemo: () => void
  reload: () => void
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDB())
  const [user, setUser] = useState<User | null>(() => {
    if (isCloud) return null // cloud sessions are restored via the boot effect
    const raw = localStorage.getItem('vet.user')
    return raw ? JSON.parse(raw) : null
  })
  const [currentFirmId, setCurrentFirmIdState] = useState<string | null>(() => {
    return localStorage.getItem('vet.firm') || null
  })
  const [syncState, setSyncState] = useState<SyncState>(isCloud ? 'idle' : 'local')
  const [booting, setBooting] = useState<boolean>(isCloud)
  const cloudUserId = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Keep the selected firm valid: if it's missing or points to a firm that no
    // longer exists (e.g. a stale id left over after switching to cloud data),
    // fall back to the first available firm.
    const active = db.firms.filter((f) => f.isActive)
    if (active.length && !active.some((f) => f.id === currentFirmId)) {
      setCurrentFirmId(active[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.firms, currentFirmId])

  // ---------- cloud boot: restore an existing Supabase session ----------
  useEffect(() => {
    if (!isCloud || !supabase) return
    let active = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const sess = data.session
      if (sess && active) {
        cloudUserId.current = sess.user.id
        await hydrateFromCloud(sess.user.id, sess.user.email || '')
      }
      if (active) setBooting(false)
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function hydrateFromCloud(userId: string, email: string) {
    setSyncState('syncing')
    let cloud = await pullState(userId)
    if (!cloud) {
      // brand-new workspace — seed it and push
      cloud = freshSeed()
      await pushState(userId, cloud)
    } else {
      cloud = migrate(cloud) // bring older cloud data up to date (e.g. In_account)
    }
    saveDB(cloud)
    setDb({ ...cloud })
    setUser(mapCloudUser(cloud, userId, email))
    if (cloud.firms.length) {
      const saved = localStorage.getItem('vet.firm')
      setCurrentFirmId(cloud.firms.some((f) => f.id === saved) ? saved! : cloud.firms[0].id)
    }
    setSyncState('saved')
  }

  function mapCloudUser(database: Database, userId: string, email: string): User {
    const known = database.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    return { id: userId, name: known?.name || email.split('@')[0], email, role: known?.role || 'Admin', password: '' }
  }

  function scheduleCloudPush(next: Database) {
    if (!isCloud || !cloudUserId.current) return
    setSyncState('syncing')
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      const err = await pushState(cloudUserId.current!, next)
      setSyncState(err ? 'error' : 'saved')
    }, 800)
  }

  function commit(next: Database) {
    saveDB(next) // local cache (also offline copy in cloud mode)
    setDb({ ...next })
    scheduleCloudPush(next)
  }

  function setCurrentFirmId(id: string | null) {
    setCurrentFirmIdState(id)
    if (id) localStorage.setItem('vet.firm', id)
    else localStorage.removeItem('vet.firm')
  }

  async function login(email: string, password: string): Promise<string | null> {
    if (isCloud && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error || !data.user) return error?.message || 'Sign-in failed.'
      cloudUserId.current = data.user.id
      await hydrateFromCloud(data.user.id, data.user.email || email)
      return null
    }
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase().trim())
    if (!u || u.password !== password) return 'Invalid email or password.'
    setUser(u)
    localStorage.setItem('vet.user', JSON.stringify(u))
    return null
  }
  function logout() {
    if (isCloud && supabase) { supabase.auth.signOut(); cloudUserId.current = null }
    setUser(null)
    localStorage.removeItem('vet.user')
  }

  async function syncNow() {
    if (!isCloud || !cloudUserId.current) return
    setSyncState('syncing')
    const err = await pushState(cloudUserId.current, db)
    setSyncState(err ? 'error' : 'saved')
  }
  async function restoreFromCloud() {
    if (!isCloud || !cloudUserId.current) return
    setSyncState('syncing')
    const cloud = await pullState(cloudUserId.current)
    if (cloud) { const m = migrate(cloud); saveDB(m); setDb({ ...m }); setSyncState('saved') }
    else setSyncState('error')
  }

  // Change the signed-in user's password (Supabase Auth — stored hashed, not plain).
  async function changePassword(newPassword: string): Promise<string | null> {
    if (!isCloud || !supabase) return 'Password change needs cloud mode (Supabase).'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }
  // Send a password-reset email (for the login screen "Forgot password?").
  async function sendPasswordReset(email: string): Promise<string | null> {
    if (!isCloud || !supabase) return 'Password reset needs cloud mode (Supabase).'
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    return error ? error.message : null
  }

  // ---------- firms ----------
  function saveFirm(f: Firm) {
    const exists = db.firms.some((x) => x.id === f.id)
    const firms = exists ? db.firms.map((x) => (x.id === f.id ? f : x)) : [...db.firms, f]
    commit({ ...db, firms })
  }
  function deleteFirm(id: string) {
    commit({ ...db, firms: db.firms.map((f) => (f.id === id ? { ...f, isActive: false } : f)) })
  }

  // ---------- parties ----------
  function saveParty(p: Party) {
    const exists = db.parties.some((x) => x.id === p.id)
    const parties = exists ? db.parties.map((x) => (x.id === p.id ? p : x)) : [...db.parties, p]
    commit({ ...db, parties })
  }
  function deleteParty(id: string) {
    commit({ ...db, parties: db.parties.filter((p) => p.id !== id) })
  }

  // ---------- purchases ----------
  function savePurchase(p: Purchase, isNew: boolean): Purchase {
    try {
      const next = { ...db }
      let rec = p
      if (isNew) {
        const firm = db.firms.find((f) => f.id === p.firmId)
        if (!firm) {
          console.error('[savePurchase] Firm not found for id:', p.firmId, 'Available firms:', db.firms.map(f => f.id))
          // Fallback: save without firm-specific numbering
          const fallbackNo = (db.counters.voucherNo || 0) + 1
          next.counters = { ...db.counters, voucherNo: fallbackNo }
          rec = { ...p, voucherNo: fallbackNo, firmVoucherNo: `P/${String(fallbackNo).padStart(3, '0')}` }
          next.purchases = [rec, ...db.purchases]
        } else {
          const n = nextVoucher(db, firm, p.date)
          // Respect a user-entered Voucher No; otherwise use the auto "last + 1".
          const firmVoucherNo = p.firmVoucherNo && p.firmVoucherNo.trim() ? p.firmVoucherNo.trim() : n.firmVoucherNo
          next.counters = { ...db.counters, voucherNo: n.global }
          rec = { ...p, voucherNo: n.global, firmVoucherNo }
          next.purchases = [rec, ...db.purchases]
        }
      } else {
        next.purchases = db.purchases.map((x) => (x.id === p.id ? p : x))
      }
      commit(next)
      return rec
    } catch (err) {
      console.error('[savePurchase] Failed to save purchase:', err)
      // Still try to save even if numbering fails
      const fallback = { ...db }
      fallback.purchases = isNew ? [p, ...db.purchases] : db.purchases.map((x) => (x.id === p.id ? p : x))
      commit(fallback)
      return p
    }
  }
  function deletePurchase(id: string) {
    commit({ ...db, purchases: db.purchases.map((p) => (p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p)) })
  }
  function addPurchasePayment(id: string, pay: Payment) {
    commit({
      ...db,
      purchases: db.purchases.map((p) => {
        if (p.id !== id) return p
        const payments = [...p.payments, pay]
        return { ...p, payments, receivedAmount: payments.reduce((s, x) => s + x.amount, 0), updatedAt: new Date().toISOString() }
      }),
    })
  }

  // ---------- sales ----------
  function saveSale(s: Sale, isNew: boolean): Sale {
    try {
      const next = { ...db }
      let rec = s
      if (isNew) {
        const firm = db.firms.find((f) => f.id === s.firmId)
        if (!firm) {
          console.error('[saveSale] Firm not found for id:', s.firmId, 'Available firms:', db.firms.map(f => f.id))
          // Fallback: save without firm-specific numbering
          const fallbackNo = (db.counters.billNo || 0) + 1
          next.counters = { ...db.counters, billNo: fallbackNo }
          rec = { ...s, billNo: fallbackNo, firmBillNo: `BILL/${String(fallbackNo).padStart(3, '0')}` }
          next.sales = [rec, ...db.sales]
        } else {
          const n = nextBill(db, firm, s.date)
          // Respect a user-entered Bill No; otherwise use the auto "last + 1".
          const firmBillNo = s.firmBillNo && s.firmBillNo.trim() ? s.firmBillNo.trim() : n.firmBillNo
          next.counters = { ...db.counters, billNo: n.global }
          rec = { ...s, billNo: n.global, firmBillNo }
          next.sales = [rec, ...db.sales]
        }
      } else {
        next.sales = db.sales.map((x) => (x.id === s.id ? s : x))
      }
      commit(next)
      return rec
    } catch (err) {
      console.error('[saveSale] Failed to save sale:', err)
      // Still try to save even if numbering fails
      const fallback = { ...db }
      fallback.sales = isNew ? [s, ...db.sales] : db.sales.map((x) => (x.id === s.id ? s : x))
      commit(fallback)
      return s
    }
  }
  function deleteSale(id: string) {
    commit({ ...db, sales: db.sales.map((s) => (s.id === id ? { ...s, deletedAt: new Date().toISOString() } : s)) })
  }
  function addSalePayment(id: string, pay: Payment) {
    commit({
      ...db,
      sales: db.sales.map((s) => {
        if (s.id !== id) return s
        const payments = [...s.payments, pay]
        return { ...s, payments, receivedAmount: payments.reduce((a, x) => a + x.amount, 0), updatedAt: new Date().toISOString() }
      }),
    })
  }

  // ---------- quotations ----------
  function saveQuote(q: Quotation, isNew: boolean): Quotation {
    try {
      const next = { ...db }
      let rec = q
      if (isNew) {
        const firm = db.firms.find((f) => f.id === q.firmId)
        if (!firm) {
          console.error('[saveQuote] Firm not found for id:', q.firmId)
          const fallbackNo = (db.counters.quoteNo || 0) + 1
          next.counters = { ...db.counters, quoteNo: fallbackNo }
          rec = { ...q, quoteNo: fallbackNo, firmQuoteNo: `Q/${String(fallbackNo).padStart(3, '0')}` }
          next.quotations = [rec, ...db.quotations]
        } else {
          const n = nextQuote(db, firm, q.date)
          next.counters = { ...db.counters, quoteNo: n.global }
          rec = { ...q, quoteNo: n.global, firmQuoteNo: n.firmQuoteNo }
          next.quotations = [rec, ...db.quotations]
        }
      } else {
        next.quotations = db.quotations.map((x) => (x.id === q.id ? q : x))
      }
      commit(next)
      return rec
    } catch (err) {
      console.error('[saveQuote] Failed to save quotation:', err)
      const fallback = { ...db }
      fallback.quotations = isNew ? [q, ...db.quotations] : db.quotations.map((x) => (x.id === q.id ? q : x))
      commit(fallback)
      return q
    }
  }
  function deleteQuote(id: string) {
    commit({ ...db, quotations: db.quotations.map((q) => (q.id === id ? { ...q, deletedAt: new Date().toISOString() } : q)) })
  }
  function convertQuote(id: string): Sale | null {
    const q = db.quotations.find((x) => x.id === id)
    if (!q) return null
    const firm = db.firms.find((f) => f.id === q.firmId)
    if (!firm) { console.error('[convertQuote] Firm not found'); return null }
    const date = new Date().toISOString().slice(0, 10)
    const n = nextBill(db, firm, date)
    const sale: Sale = {
      id: uid(),
      billNo: n.global,
      firmBillNo: n.firmBillNo,
      date,
      firmId: q.firmId,
      sellerType: q.sellerType,
      sellerName: q.sellerName,
      sellerId: q.sellerId,
      sellerAddress: q.sellerAddress,
      sellerPhone: q.sellerPhone,
      sellerGstin: q.sellerGstin,
      items: q.items.map((it) => ({ ...it, id: uid() })),
      discountAmount: q.discountAmount,
      discountIsPercent: q.discountIsPercent,
      gstEnabled: q.gstEnabled,
      gstInclusive: q.gstInclusive,
      billingType: 'Credit',
      payments: [],
      receivedAmount: 0,
      docStatus: 'Finalized',
      createdBy: user?.email || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    commit({
      ...db,
      counters: { ...db.counters, billNo: n.global },
      sales: [sale, ...db.sales],
      quotations: db.quotations.map((x) => (x.id === id ? { ...x, status: 'Converted', convertedSaleId: sale.id } : x)),
    })
    return sale
  }

  // ---------- stock ----------
  function addAdjustment(a: StockAdjustment) {
    commit({ ...db, adjustments: [a, ...db.adjustments] })
  }

  // ---------- settings + users ----------
  function saveSettings(s: Settings) {
    commit({ ...db, settings: s })
  }
  function saveUser(u: User) {
    const exists = db.users.some((x) => x.id === u.id)
    const users = exists ? db.users.map((x) => (x.id === u.id ? u : x)) : [...db.users, u]
    commit({ ...db, users })
  }
  function deleteUser(id: string) {
    commit({ ...db, users: db.users.filter((u) => u.id !== id) })
  }

  function resetDemo() {
    const fresh = resetDB()
    setDb(fresh)
    setCurrentFirmId(fresh.firms[0]?.id || null)
    scheduleCloudPush(fresh)
  }
  function reload() {
    setDb(loadDB())
  }

  const value = useMemo<StoreValue>(
    () => ({
      db, user, currentFirmId, setCurrentFirmId, login, logout,
      cloud: isCloud, syncState, booting, syncNow, restoreFromCloud, changePassword, sendPasswordReset,
      saveFirm, deleteFirm, saveParty, deleteParty,
      savePurchase, deletePurchase, addPurchasePayment,
      saveSale, deleteSale, addSalePayment,
      saveQuote, deleteQuote, convertQuote,
      addAdjustment, saveSettings, saveUser, deleteUser, resetDemo, reload,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, user, currentFirmId, syncState, booting],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}
