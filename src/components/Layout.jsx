import { useRef, useState } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const MENU = [
  { key: 'dashboard', label: 'Dashboard', section: 'VISÃO GERAL', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { key: 'pdv', label: 'PDV — Venda', section: 'OPERAÇÕES', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
  { key: 'stock', label: 'Entrada de Estoque', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  { key: 'stock_position', label: 'Posição de Estoque', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'reports', label: 'Relatórios', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { key: 'products', label: 'Produtos', section: 'CADASTROS', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
  { key: 'groups', label: 'Grupos e Categorias', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { key: 'customers', label: 'Clientes', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'sellers', label: 'Vendedores', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { key: 'payment_methods', label: 'Formas de Pgto.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
]

const PAGE_TITLES = { dashboard: 'Dashboard', pdv: 'PDV — Nova Venda', stock: 'Entrada de Estoque', stock_position: 'Posição de Estoque', reports: 'Relatórios', products: 'Produtos', groups: 'Grupos e Categorias', customers: 'Clientes', sellers: 'Vendedores', payment_methods: 'Formas de Pagamento' }

export default function Layout({ children, page, setPage }) {
  const { session, theme, toggleTheme } = useApp()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mf-sidebar-collapsed') === 'true')
  const email = session?.user?.email || ''
  const initials = email.slice(0, 2).toUpperCase()

  function toggleSidebar() {
    setCollapsed(c => {
      localStorage.setItem('mf-sidebar-collapsed', String(!c))
      return !c
    })
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const lastSectionRef = useRef(null)
  lastSectionRef.current = null
  return (
    <div className={`layout${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={toggleSidebar} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {collapsed
              ? <><span style={{ color: 'var(--accent)' }}>M</span>F</>
              : <>Moda<span>Flow</span></>}
          </h1>
          {!collapsed && <p>Gestão de Loja</p>}
        </div>
        <nav className="sidebar-nav">
          {MENU.map(item => {
            const showSection = item.section && item.section !== lastSectionRef.current
            if (item.section) lastSectionRef.current = item.section
            return (
              <div key={item.key}>
                {showSection && <div className="nav-section">{item.section}</div>}
                <button className={`nav-item ${page === item.key ? 'active' : ''}`} onClick={() => setPage(item.key)} title={collapsed ? item.label : ''}>
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                </button>
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{email}</span>
            <button className="btn-logout" onClick={logout} title="Sair">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{PAGE_TITLES[page] || page}</h2>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}>
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
