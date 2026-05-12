import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const today = () => new Date().toISOString().split('T')[0]
const monthStart = () => today().slice(0, 7) + '-01'

export default function Reports() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ total: 0, count: 0, ticket: 0 })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
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
  }

  // Resumo por vendedor
  const bySeller = sales.reduce((acc, s) => {
    const name = s.sellers?.name || 'Sem vendedor'
    acc[name] = (acc[name] || 0) + Number(s.total_amount)
    return acc
  }, {})

  // Resumo por forma de pagamento
  const byPayment = sales.reduce((acc, s) => {
    const name = s.payment_methods?.name || 'Sem info'
    acc[name] = (acc[name] || 0) + Number(s.total_amount)
    return acc
  }, {})

  // Resumo por produto (itens)
  const byProduct = sales.flatMap(s => s.sale_items || []).reduce((acc, item) => {
    const key = item.sku
    if (!acc[key]) acc[key] = { sku: item.sku, description: item.description, qty: 0, total: 0 }
    acc[key].qty += item.quantity
    acc[key].total += Number(item.total_price)
    return acc
  }, {})

  const topProducts = Object.values(byProduct).sort((a, b) => b.total - a.total).slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filtros */}
      <div className="card">
        <div className="card-header">
          <h3>Relatório de Vendas</h3>
          <div className="card-header-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ margin: 0, whiteSpace: 'nowrap' }}>De:</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Até:</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} />
            </div>
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Filtrar'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs do período */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div className="kpi-label">Total do Período</div>
          <div className="kpi-value">{fmt(summary.total)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div className="kpi-label">Nº de Vendas</div>
          <div className="kpi-value">{summary.count}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
          <div className="kpi-label">Ticket Médio</div>
          <div className="kpi-value">{fmt(summary.ticket)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Por vendedor */}
        <div className="card">
          <div className="card-header"><h3>Por Vendedor</h3></div>
          <div className="table-wrap">
            {Object.keys(bySeller).length === 0 ? <div className="empty-state"><p>Sem dados</p></div> : (
              <table>
                <thead><tr><th>Vendedor</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {Object.entries(bySeller).sort((a, b) => b[1] - a[1]).map(([name, val]) => (
                    <tr key={name}><td>{name}</td><td className="text-right"><strong>{fmt(val)}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Por forma de pagamento */}
        <div className="card">
          <div className="card-header"><h3>Por Forma de Pagamento</h3></div>
          <div className="table-wrap">
            {Object.keys(byPayment).length === 0 ? <div className="empty-state"><p>Sem dados</p></div> : (
              <table>
                <thead><tr><th>Forma</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {Object.entries(byPayment).sort((a, b) => b[1] - a[1]).map(([name, val]) => (
                    <tr key={name}><td>{name}</td><td className="text-right"><strong>{fmt(val)}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Top produtos */}
      <div className="card">
        <div className="card-header"><h3>Produtos Mais Vendidos (Top 10)</h3></div>
        <div className="table-wrap">
          {topProducts.length === 0 ? <div className="empty-state"><p>Sem dados no período</p></div> : (
            <table>
              <thead><tr><th>SKU</th><th>Produto</th><th>Qtd. Vendida</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {topProducts.map(p => (
                  <tr key={p.sku}>
                    <td><span className="sku-tag">{p.sku}</span></td>
                    <td>{p.description}</td>
                    <td><span className="badge purple">{p.qty} un.</span></td>
                    <td className="text-right"><strong>{fmt(p.total)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detalhamento das vendas */}
      <div className="card">
        <div className="card-header"><h3>Detalhamento das Vendas ({sales.length})</h3></div>
        <div className="table-wrap">
          {sales.length === 0 ? <div className="empty-state"><p>Nenhuma venda no período selecionado</p></div> : (
            <table>
              <thead><tr><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Pgto.</th><th>Itens</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td className="text-muted text-sm">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                    <td>{s.customers?.name || <span className="text-muted">Consumidor Final</span>}</td>
                    <td>{s.sellers?.name || <span className="text-muted">—</span>}</td>
                    <td>{s.payment_methods?.name || <span className="text-muted">—</span>}</td>
                    <td>{(s.sale_items || []).length} itens</td>
                    <td className="text-right"><strong>{fmt(s.total_amount)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
