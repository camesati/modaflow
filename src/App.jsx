import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './supabase'
import Auth from './pages/Auth'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sellers from './pages/Sellers'
import Customers from './pages/Customers'
import PaymentMethods from './pages/PaymentMethods'
import PDV from './pages/PDV'
import StockEntries from './pages/StockEntries'
import StockPosition from './pages/StockPosition'
import Reports from './pages/Reports'
import Groups from './pages/Groups'

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

let toastId = 0
export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('dashboard')
  const [toasts, setToasts] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem('mf-theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mf-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  function toast(msg, type = 'success') {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  if (session === undefined) return null

  const pages = { dashboard: Dashboard, products: Products, sellers: Sellers, customers: Customers, payment_methods: PaymentMethods, pdv: PDV, stock: StockEntries, stock_position: StockPosition, reports: Reports, groups: Groups }
  const Page = pages[page] || Dashboard

  return (
    <AppContext.Provider value={{ session, toast, setPage, theme, toggleTheme }}>
      {!session ? (
        <Auth />
      ) : (
        <Layout page={page} setPage={setPage}>
          <Page />
        </Layout>
      )}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </AppContext.Provider>
  )
}
