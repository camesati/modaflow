import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtShort = v => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`

const PIE_COLORS = ['#6c3eb5','#f59e0b','#10b981','#3b82f6','#8b5cf6','#f87171','#34d399','#60a5fa']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0f5', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(30,27,75,.12)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ fontWeight: 700, marginBottom: 4, fontSize: 12, color: '#4b4869' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{fmt(p.value)}</p>
      ))}
    </div>
  )
}

function pct(curr, prev) {
  if (!prev) return null
  return ((curr - prev) / prev * 100)
}

function Delta({ value, label }) {
  if (value === null) return <span className="kpi-delta neutral">— vs {label}</span>
  const up = value >= 0
  const arrow = up ? '↑' : '↓'
  return (
    <span className={`kpi-delta ${up ? 'up' : 'down'}`}>
      {arrow} {Math.abs(value).toFixed(1)}% vs {label}
    </span>
  )
}

export default function Dashboard() {
  const [kpis, setKpis] = useState({ today: 0, month: 0, prevMonth: 0, yesterday: 0, products: 0, customers: 0, lowStock: 0, salesCount: 0, prevCount: 0, ticket: 0, prevTicket: 0 })
  const [recentSales, setRecentSales] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [paymentData, setPaymentData] = useState([])
  const [sellerData, setSellerData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'

    const prevD = new Date(monthStart); prevD.setMonth(prevD.getMonth() - 1)
    const prevMonthStart = prevD.toISOString().slice(0, 7) + '-01'

    const yesterdayD = new Date(today); yesterdayD.setDate(yesterdayD.getDate() - 1)
    const yesterday = yesterdayD.toISOString().split('T')[0]

    const d7 = new Date(); d7.setDate(d7.getDate() - 6)
    const week7Start = d7.toISOString().split('T')[0]

    const [salesRes, todayRes, prevMonthRes, yesterdayRes, productsRes, customersRes, stockRes, recentRes, weekRes] = await Promise.all([
      supabase.from('sales').select('total_amount').gte('created_at', monthStart + 'T00:00:00'),
      supabase.from('sales').select('total_amount').gte('created_at', today + 'T00:00:00'),
      supabase.from('sales').select('total_amount').gte('created_at', prevMonthStart + 'T00:00:00').lt('created_at', monthStart + 'T00:00:00'),
      supabase.from('sales').select('total_amount').gte('created_at', yesterday + 'T00:00:00').lt('created_at', today + 'T00:00:00'),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('quantity').lt('quantity', 5),
      supabase.from('sales')
        .select('id, total_amount, created_at, customers(name), sellers(name), payment_methods(name)')
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('sales')
        .select('total_amount, created_at, payment_methods(name), sellers(name)')
        .gte('created_at', week7Start + 'T00:00:00'),
    ])

    const monthTotal   = (salesRes.data     || []).reduce((s, x) => s + Number(x.total_amount), 0)
    const todayTotal   = (todayRes.data     || []).reduce((s, x) => s + Number(x.total_amount), 0)
    const prevTotal    = (prevMonthRes.data  || []).reduce((s, x) => s + Number(x.total_amount), 0)
    const yestTotal    = (yesterdayRes.data  || []).reduce((s, x) => s + Number(x.total_amount), 0)
    const salesCount   = (salesRes.data     || []).length
    const prevCount    = (prevMonthRes.data  || []).length

    setKpis({
      today: todayTotal, yesterday: yestTotal,
      month: monthTotal, prevMonth: prevTotal,
      products: productsRes.count || 0,
      customers: customersRes.count || 0,
      lowStock: (stockRes.data || []).length,
      salesCount, prevCount,
      ticket: salesCount ? monthTotal / salesCount : 0,
      prevTicket: prevCount ? prevTotal / prevCount : 0,
    })
    setRecentSales(recentRes.data || [])

    // Gráfico de vendas — últimos 7 dias
    const salesByDay = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
      salesByDay[key] = { label, total: 0 }
    }
    ;(weekRes.data || []).forEach(s => {
      const key = s.created_at.split('T')[0]
      if (salesByDay[key]) salesByDay[key].total += Number(s.total_amount)
    })
    setDailyData(Object.values(salesByDay).map(d => ({ name: d.label, Vendas: d.total })))

    // Gráfico de pizza — por forma de pagamento
    const pmMap = {}
    ;(weekRes.data || []).forEach(s => {
      const name = s.payment_methods?.name || 'Outros'
      pmMap[name] = (pmMap[name] || 0) + Number(s.total_amount)
    })
    setPaymentData(Object.entries(pmMap).map(([name, value]) => ({ name, value })))

    // Gráfico de barras — por vendedor (mês)
    const sellerMap = {}
    ;(salesRes.data || []).forEach(s => {})
    // Re-fetch com seller info para o mês
    const { data: monthSales } = await supabase.from('sales')
      .select('total_amount, sellers(name)')
      .gte('created_at', monthStart + 'T00:00:00')
    ;(monthSales || []).forEach(s => {
      const name = s.sellers?.name || 'Sem vendedor'
      sellerMap[name] = (sellerMap[name] || 0) + Number(s.total_amount)
    })
    setSellerData(Object.entries(sellerMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, Vendas: value })))

    setLoading(false)
  }

  if (loading) return (
    <div className="page-loading">
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, color: 'var(--primary)' }} />
    </div>
  )

  return (
    <>
      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-item">
          <div className="kpi-item-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Vendas Hoje</div>
            <div className="kpi-item-value">{fmt(kpis.today)}</div>
            <Delta value={pct(kpis.today, kpis.yesterday)} label="ontem" />
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Vendas no Mês</div>
            <div className="kpi-item-value">{fmt(kpis.month)}</div>
            <Delta value={pct(kpis.month, kpis.prevMonth)} label="mês anterior" />
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Ticket Médio</div>
            <div className="kpi-item-value">{fmt(kpis.ticket)}</div>
            <Delta value={pct(kpis.ticket, kpis.prevTicket)} label="mês anterior" />
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Pedidos no Mês</div>
            <div className="kpi-item-value">{kpis.salesCount}</div>
            <Delta value={pct(kpis.salesCount, kpis.prevCount)} label="mês anterior" />
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon neutral">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Produtos</div>
            <div className="kpi-item-value">{kpis.products}</div>
            <span className="kpi-delta neutral">cadastrados</span>
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon neutral">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Clientes</div>
            <div className="kpi-item-value">{kpis.customers}</div>
            <span className="kpi-delta neutral">cadastrados</span>
          </div>
        </div>

        {kpis.lowStock > 0 && (
          <>
            <div className="kpi-item-sep" />
            <div className="kpi-item">
              <div className="kpi-item-icon red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="kpi-item-body">
                <div className="kpi-item-label">Estoque Baixo</div>
                <div className="kpi-item-value" style={{ color: 'var(--danger)' }}>{kpis.lowStock}</div>
                <span className="kpi-delta down">produtos &lt; 5 un.</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Gráficos — linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Barras: vendas últimos 7 dias */}
        <div className="card">
          <div className="card-header"><h3>Vendas — Últimos 7 Dias</h3></div>
          <div style={{ padding: '8px 16px 20px' }}>
            {dailyData.every(d => d.Vendas === 0) ? (
              <div className="empty-state" style={{ padding: 32 }}><p>Nenhuma venda nos últimos 7 dias</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData} barSize={32}>
                  <defs>
                    <linearGradient id="barGradPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6c3eb5" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e0f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#6b7280' }} width={60} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,62,181,.06)' }} />
                  <Bar dataKey="Vendas" fill="url(#barGradPurple)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pizza: por forma de pagamento */}
        <div className="card">
          <div className="card-header"><h3>Por Forma de Pgto.</h3></div>
          <div style={{ padding: '8px 0 20px' }}>
            {paymentData.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><p>Sem dados</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    dataKey="value" paddingAngle={4} strokeWidth={0}>
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico: ranking vendedores no mês */}
      {sellerData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Ranking de Vendedores — Mês Atual</h3></div>
          <div style={{ padding: '8px 16px 20px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sellerData} layout="vertical" barSize={20}>
                <defs>
                  <linearGradient id="barGradGreen" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.90} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0f5" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#4b4869' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,.06)' }} />
                <Bar dataKey="Vendas" fill="url(#barGradGreen)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Últimas vendas */}
      <div className="card">
        <div className="card-header"><h3>Últimas Vendas</h3></div>
        {recentSales.length === 0 ? (
          <div className="empty-state"><p>Nenhuma venda registrada ainda</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Cliente</th><th>Vendedor</th><th>Pgto.</th><th>Valor</th><th>Data</th></tr></thead>
              <tbody>
                {recentSales.map((s, i) => (
                  <tr key={s.id}>
                    <td><span className="sku-tag">#{i + 1}</span></td>
                    <td>{s.customers?.name || <span className="text-muted">—</span>}</td>
                    <td>{s.sellers?.name || <span className="text-muted">—</span>}</td>
                    <td>{s.payment_methods?.name || <span className="text-muted">—</span>}</td>
                    <td><strong>{fmt(s.total_amount)}</strong></td>
                    <td className="text-muted text-sm">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
