import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Purchases from './pages/Purchases'
import PurchaseDetail from './pages/PurchaseDetail'
import Sales from './pages/Sales'
import SaleDetail from './pages/SaleDetail'
import Quotations from './pages/Quotations'
import Stock from './pages/Stock'
import Parties from './pages/Parties'
import Firms from './pages/Firms'
import Users from './pages/Users'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const { user, booting } = useStore()
  const loc = useLocation()

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm">Connecting to your cloud workspace…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: loc.pathname }} replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/purchases/:id" element={<PurchaseDetail />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/sales/:id" element={<SaleDetail />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/parties" element={<Parties />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/firms" element={<Firms />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
