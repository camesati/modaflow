import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtCompact = v => {
  if (v >= 1000000) return `R$${(v/1000000).toFixed(2)}M`
  if (v >= 1000) return `R$${(v/1000).toFixed(1)}k`
  return fmt(v)
}
const today = () => new Date().toISOString().split('T')[0]
const monthStart = () => today().slice(0, 7) + '-01'

const CHART_COLORS = ['#6c3eb5','#f59e0b','#10b981','#3b82f6','#8b5cf6','#f87171','#34d399','#60a5fa']

function CssBar({ value, max, color, label, sub }) {
  const pct = max > 0 ? (value / max * 100) : 0
  return (
    <div className="rpt-bar-row">
      <div className="rpt-bar-meta">
        <span className="rpt-bar-label">{label}</span>
        <span className="rpt-bar-value">{fmt(value)}</span>
      </div>
      <div className="rpt-bar-track">
        <div className="rpt-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {sub && <span className="rpt-bar-sub">{sub}</span>}
    </div>
  )
}

export default function Reports() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [summary, setSummary] = useState({ total: 0, count: 0, ticket: 0 })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoaded(false)
    const { data } = await supabase
      .from('sales')
      .select('id, total_amount, created_at, notes, customers(name), sellers(name), payment_methods(name), sale_items(sku, description, quantity, unit_price, total_price)')
      .gte('created_at', from + 'T00:00:00')
      .lte('created_at', to + 'T23:59:59')
      .order('created_at', { ascending: false })

    const rows = data || []
    const total = rows.reduce((s, x) => s + Number(x.total_amount), 0)
    setSales(rows)
    setSummary({ total, count: rows.length, ticket: rows.length ? total / rows.length : 0 })
    setLoading(false)
    setTimeout(() => setLoaded(true), 30)
  }

  const bySeller = sales.reduce((acc, s) => {
    const name = s.sellers?.name || 'Sem vendedor'
    acc[name] = (acc[name] || 0) + Number(s.total_amount)
    return acc
  }, {})

  const byPayment = sales.reduce((acc, s) => {
    const name = s.payment_methods?.name || 'Sem info'
    acc[name] = (acc[name] || 0) + Number(s.total_amount)
    return acc
  }, {})

  const byProduct = sales.flatMap(s => s.sale_items || []).reduce((acc, item) => {
    const key = item.sku
    if (!acc[key]) acc[key] = { sku: item.sku, description: item.description, qty: 0, total: 0 }
    acc[key].qty += item.quantity
    acc[key].total += Number(item.total_price)
    return acc
  }, {})

  const topProducts = Object.values(byProduct).sort((a, b) => b.total - a.total).slice(0, 8)

  const sellerEntries = Object.entries(bySeller).sort((a, b) => b[1] - a[1])
  const paymentEntries = Object.entries(byPayment).sort((a, b) => b[1] - a[1])
  const maxSeller = sellerEntries[0]?.[1] || 1
  const maxPayment = paymentEntries[0]?.[1] || 1
  const maxProduct = topProducts[0]?.total || 1

  const dateLabel = (() => {
    const f = new Date(from + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const t = new Date(to + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    return `${f} — ${t}`
  })()

  return (
    <div className={`rpt-root ${loaded ? 'rpt-loaded' : ''}`}>

      {/* ── FILTER BAR ── */}
      <div className="rpt-filter">
        <div className="rpt-filter-inner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="rpt-filter-label">De</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rpt-date-input" />
          <div className="rpt-filter-sep" />
          <span className="rpt-filter-label">Até</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rpt-date-input" />
          <button className="rpt-filter-btn" onClick={load} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Gerar
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── HERO BANNER ── */}
      <div className="rpt-hero">
        <div className="rpt-hero-bg" />
        <div className="rpt-hero-content">
          <div className="rpt-hero-left">
            <div className="rpt-period-tag">{dateLabel}</div>
            <div className="rpt-hero-label">Receita Total</div>
            <div className="rpt-hero-value">
              {loading ? '—' : fmtCompact(summary.total)}
            </div>
            <div className="rpt-hero-exact">{loading ? '' : fmt(summary.total)}</div>
          </div>
          <div className="rpt-hero-right">
            <div className="rpt-hero-stat">
              <span className="rpt-hero-stat-n">{summary.count}</span>
              <span className="rpt-hero-stat-l">vendas</span>
            </div>
            <div className="rpt-hero-divider" />
            <div className="rpt-hero-stat">
              <span className="rpt-hero-stat-n">{loading ? '—' : fmtCompact(summary.ticket)}</span>
              <span className="rpt-hero-stat-l">ticket médio</span>
            </div>
            <div className="rpt-hero-divider" />
            <div className="rpt-hero-stat">
              <span className="rpt-hero-stat-n">{topProducts.length}</span>
              <span className="rpt-hero-stat-l">SKUs vendidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANALYSIS GRID ── */}
      <div className="rpt-analysis-grid">

        {/* Vendedores */}
        <div className="rpt-section">
          <div className="rpt-section-header">
            <div className="rpt-section-accent" />
            <span className="rpt-section-title">Performance por Vendedor</span>
            <span className="rpt-section-count">{sellerEntries.length}</span>
          </div>
          {sellerEntries.length === 0 ? (
            <div className="rpt-empty">Sem dados no período</div>
          ) : sellerEntries.map(([name, val], i) => (
            <CssBar
              key={name}
              label={name}
              value={val}
              max={maxSeller}
              color={CHART_COLORS[i % CHART_COLORS.length]}
              sub={`${((val / summary.total) * 100).toFixed(1)}% do total`}
            />
          ))}
        </div>

        {/* Pagamentos */}
        <div className="rpt-section">
          <div className="rpt-section-header">
            <div className="rpt-section-accent" style={{ background: '#f59e0b' }} />
            <span className="rpt-section-title">Forma de Pagamento</span>
            <span className="rpt-section-count">{paymentEntries.length}</span>
          </div>
          {paymentEntries.length === 0 ? (
            <div className="rpt-empty">Sem dados no período</div>
          ) : paymentEntries.map(([name, val], i) => (
            <CssBar
              key={name}
              label={name}
              value={val}
              max={maxPayment}
              color={CHART_COLORS[(i + 2) % CHART_COLORS.length]}
              sub={`${((val / summary.total) * 100).toFixed(1)}%`}
            />
          ))}
        </div>

      </div>

      {/* ── TOP PRODUTOS ── */}
      {topProducts.length > 0 && (
        <div className="rpt-products">
          <div className="rpt-section-header">
            <div className="rpt-section-accent" style={{ background: '#10b981' }} />
            <span className="rpt-section-title">Top Produtos por Receita</span>
            <span className="rpt-section-count">{topProducts.length} SKUs</span>
          </div>
          <div className="rpt-products-grid">
            {topProducts.map((p, i) => (
              <div className="rpt-product-card" key={p.sku} style={{ '--delay': `${i * 40}ms` }}>
                <div className="rpt-product-rank">#{String(i + 1).padStart(2, '0')}</div>
                <div className="rpt-product-info">
                  <span className="rpt-product-sku">{p.sku}</span>
                  <span className="rpt-product-name">{p.description}</span>
                </div>
                <div className="rpt-product-stats">
                  <div className="rpt-product-total">{fmt(p.total)}</div>
                  <div className="rpt-product-qty">{p.qty} un.</div>
                </div>
                <div className="rpt-product-bar">
                  <div className="rpt-product-bar-fill" style={{
                    width: `${(p.total / maxProduct * 100).toFixed(1)}%`,
                    background: CHART_COLORS[i % CHART_COLORS.length]
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETALHAMENTO ── */}
      <div className="rpt-detail">
        <div className="rpt-section-header">
          <div className="rpt-section-accent" style={{ background: '#3b82f6' }} />
          <span className="rpt-section-title">Detalhamento das Vendas</span>
          <span className="rpt-section-count">{sales.length} registros</span>
        </div>
        {sales.length === 0 ? (
          <div className="rpt-empty">Nenhuma venda no período selecionado</div>
        ) : (
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Pagamento</th>
                  <th>Itens</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s, i) => {
                  const dt = new Date(s.created_at)
                  return (
                    <tr key={s.id} style={{ '--row-delay': `${i * 20}ms` }}>
                      <td>
                        <div className="rpt-datetime">
                          <span className="rpt-date">{dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                          <span className="rpt-time">{dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>{s.customers?.name || <span className="rpt-na">Consumidor Final</span>}</td>
                      <td>
                        {s.sellers?.name
                          ? <span className="rpt-seller-tag">{s.sellers.name}</span>
                          : <span className="rpt-na">—</span>}
                      </td>
                      <td>{s.payment_methods?.name || <span className="rpt-na">—</span>}</td>
                      <td><span className="rpt-items-count">{(s.sale_items || []).length}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <strong className="rpt-row-total">{fmt(s.total_amount)}</strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingTop: 16 }}>Total do Período</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: 'var(--primary)', paddingTop: 16 }}>{fmt(summary.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
