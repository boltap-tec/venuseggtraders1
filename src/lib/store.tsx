import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Database, User, Firm, Party, Purchase, Sale, Quotation, StockAdjustment, Settings, Payment,
} from './types'
import { loadDB, saveDB, resetDB, freshSeed, uid } from './db'
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
    if (!currentFirmId && db.firms.length) setCurrentFirmId(db.firms[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.firms.length])

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
    }
    saveDB(cloud)
    setDb({ ...cloud })
    setUser(mapCloudUser(cloud, userId, email))
    if (cloud.firms.length) setCurrentFirmId(localStorage.getItem('vet.firm') || cloud.firms[0].id)
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
    if (cloud) { saveDB(cloud); setDb({ ...cloud }); setSyncState('saved') }
    else setSyncState('error')
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
    const next = { ...db }
    let rec = p
    if (isNew) {
      const firm = db.firms.find((f) => f.id === p.firmId)!
      const n = nextVoucher(db, firm, p.date)
      next.counters = {
        ...db.counters,
        voucherNo: n.global,
        firmVoucherSeq: { ...db.counters.firmVoucherSeq, [n.key]: n.seq },
      }
      rec = { ...p, voucherNo: n.global, firmVoucherNo: n.firmVoucherNo }
      next.purchases = [rec, ...db.purchases]
    } else {
      next.purchases = db.purchases.map((x) => (x.id === p.id ? p : x))
    }
    commit(next)
    return rec
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
    const next = { ...db }
    let rec = s
    if (isNew) {
      const firm = db.firms.find((f) => f.id === s.firmId)!
      const n = nextBill(db, firm, s.date)
      next.counters = {
        ...db.counters,
        billNo: n.global,
        firmBillSeq: { ...db.counters.firmBillSeq, [n.key]: n.seq },
      }
      rec = { ...s, billNo: n.global, firmBillNo: n.firmBillNo }
      next.sales = [rec, ...db.sales]
    } else {
      next.sales = db.sales.map((x) => (x.id === s.id ? s : x))
    }
    commit(next)
    return rec
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
    const next = { ...db }
    let rec = q
    if (isNew) {
      const firm = db.firms.find((f) => f.id === q.firmId)!
      const n = nextQuote(db, firm, q.date)
      next.counters = {
        ...db.counters,
        quoteNo: n.global,
        firmQuoteSeq: { ...db.counters.firmQuoteSeq, [n.key]: n.seq },
      }
      rec = { ...q, quoteNo: n.global, firmQuoteNo: n.firmQuoteNo }
      next.quotations = [rec, ...db.quotations]
    } else {
      next.quotations = db.quotations.map((x) => (x.id === q.id ? q : x))
    }
    commit(next)
    return rec
  }
  function deleteQuote(id: string) {
    commit({ ...db, quotations: db.quotations.map((q) => (q.id === id ? { ...q, deletedAt: new Date().toISOString() } : q)) })
  }
  function convertQuote(id: string): Sale | null {
    const q = db.quotations.find((x) => x.id === id)
    if (!q) return null
    const firm = db.firms.find((f) => f.id === q.firmId)!
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
      counters: { ...db.counters, billNo: n.global, firmBillSeq: { ...db.counters.firmBillSeq, [n.key]: n.seq } },
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
      cloud: isCloud, syncState, booting, syncNow, restoreFromCloud,
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
