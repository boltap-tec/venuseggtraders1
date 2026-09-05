import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Egg, LogIn } from 'lucide-react'
import { useStore } from '../lib/store'

export default function Login() {
  const { login, cloud, sendPasswordReset } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState(cloud ? '' : 'admin@venus.app')
  const [password, setPassword] = useState(cloud ? '' : 'admin123')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setInfo(null)
    const error = await login(email, password)
    setBusy(false)
    if (error) setErr(error)
    else nav('/')
  }

  async function forgot() {
    setErr(null); setInfo(null)
    if (!email.trim()) { setErr('Enter your email above first, then click "Forgot password?".'); return }
    const error = await sendPasswordReset(email)
    if (error) setErr(error)
    else setInfo('Password-reset email sent. Open the link in it, then set a new password in Settings → Change Login Password.')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-orange-500 to-amber-400 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur"><Egg size={24} /></div>
          <span className="text-lg font-bold">Egg Traders Suite</span>
        </div>
        <div>
          <h1 className="text-4xl font-black leading-tight">Buy smart.<br />Sell smarter.</h1>
          <p className="mt-4 max-w-md text-white/90">
            One place to run purchases, sales, stock and billing across every firm — with margin tracking built for mediators.
          </p>
        </div>
        <p className="text-sm text-white/70">Venus Egg Traders · Ram Egg Traders · and more</p>
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-80 w-80 rounded-full bg-white/10" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-sm p-7">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-amber-400 text-white"><Egg size={18} /></div>
            <span className="font-bold">Egg Traders Suite</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}
            {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30">{info}</p>}
            <button className="btn-primary w-full" type="submit" disabled={busy}><LogIn size={18} /> {busy ? 'Signing in…' : 'Sign in'}</button>
            {cloud && (
              <button type="button" onClick={forgot} className="w-full text-center text-sm font-semibold text-brand-600 hover:underline">
                Forgot password?
              </button>
            )}
          </div>

          {cloud ? (
            <div className="mt-6 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <p className="font-semibold">☁️ Connected to Supabase</p>
              <p className="mt-1">Sign in with the email &amp; password you created in your Supabase project (Authentication → Users).</p>
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60">
              <p className="font-semibold text-slate-600 dark:text-slate-300">Demo logins (local mode)</p>
              <p className="mt-1">Admin — admin@venus.app / admin123</p>
              <p>Operator — operator@venus.app / operator123</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
