import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function StockPosition() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | low | zero | ok

  useEffect(() => { load() }, [])

  async function load() {
    const [entries, sold, products] = await Promise.all([
      supabase.from('stock_entries').select('sku, quantity'),
      supabase.from('sale_items').select('sku, quantity'),
      supabase.from('products').select('sku, description, unit_price, group_id, category_id, groups(name), categories(name)').order('description'),
    ])

    // Soma entradas por SKU
    const inMap = {}
    ;(entries.data || []).forEach(e => { inMap[e.sku] = (inMap[e.sku] || 0) + e.quantity })

    // Soma saídas por SKU
    const outMap = {}
    ;(sold.data || []).forEach(s => { outMap[s.sku] = (outMap[s.sku] || 0) + s.quantity })

    const result = (products.data || []).map(p => {
      const totalIn = inMap[p.sku] || 0
      const totalOut = outMap[p.sku] || 0
      const balance = totalIn - totalOut
      return {
        sku: p.sku,
        description: p.description,
        group: p.groups?.name || '—',
        category: p.categories?.name || '—',
        unit_price: p.unit_price,
        total_in: totalIn,
        total_out: totalOut,
        balance,
        stock_value: balance * p.unit_price,
      }
    })

    setRows(result)
    setLoading(false)
  }

  const filtered = rows.filter(r => {
    const matchSearch = !search ||
      r.sku.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'zero' ? r.balance <= 0 :
      filter === 'low' ? r.balance > 0 && r.balance < 5 :
      filter === 'ok' ? r.balance >= 5 : true
    return matchSearch && matchFilter
  })

  const totalValue = filtered.reduce((s, r) => s + Math.max(0, r.stock_value), 0)
  const totalUnits = filtered.reduce((s, r) => s + Math.max(0, r.balance), 0)
  const zeroCount = rows.filter(r => r.balance <= 0).length
  const lowCount = rows.filter(r => r.balance > 0 && r.balance < 5).length

  function statusBadge(bal) {
    if (bal <= 0) return <span className="badge red">Zerado</span>
    if (bal < 5)  return <span className="badge amber">Baixo</span>
    return <span className="badge green">Normal</span>
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
          <div className="kpi-item-icon purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Itens em Estoque</div>
            <div className="kpi-item-value">{totalUnits}</div>
            <span className="kpi-delta neutral">unidades disponíveis</span>
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Valor do Estoque</div>
            <div className="kpi-item-value">{fmt(totalValue)}</div>
            <span className="kpi-delta neutral">a preço de venda</span>
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Estoque Baixo</div>
            <div className="kpi-item-value" style={{ color: lowCount > 0 ? 'var(--warning)' : undefined }}>{lowCount}</div>
            <span className="kpi-delta neutral">produtos &lt; 5 unidades</span>
          </div>
        </div>

        <div className="kpi-item-sep" />

        <div className="kpi-item">
          <div className="kpi-item-icon red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="kpi-item-body">
            <div className="kpi-item-label">Sem Estoque</div>
            <div className="kpi-item-value" style={{ color: zeroCount > 0 ? 'var(--danger)' : undefined }}>{zeroCount}</div>
            <span className={`kpi-delta ${zeroCount > 0 ? 'down' : 'neutral'}`}>produtos zerados</span>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="card-header">
          <h3>Posição de Estoque ({filtered.length} produtos)</h3>
          <div className="card-header-actions">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="SKU ou descrição..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}>
              <option value="all">Todos</option>
              <option value="ok">Normal (≥ 5)</option>
              <option value="low">Baixo (1–4)</option>
              <option value="zero">Zerado</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={load}>↻ Atualizar</button>
          </div>
        </div>

        <div className="table-wrap">
          {filtered.length === 0 ? (
            <div className="empty-state"><p>Nenhum produto encontrado</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descrição</th>
                  <th>Grupo</th>
                  <th>Categoria</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Saldo</th>
                  <th>Preço</th>
                  <th>Valor Estoque</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.sku}>
                    <td><span className="sku-tag">{r.sku}</span></td>
                    <td><strong>{r.description}</strong></td>
                    <td className="text-muted text-sm">{r.group}</td>
                    <td className="text-muted text-sm">{r.category}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>+{r.total_in}</td>
                    <td style={{ color: r.total_out > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {r.total_out > 0 ? `-${r.total_out}` : '0'}
                    </td>
                    <td>
                      <strong style={{ color: r.balance <= 0 ? 'var(--danger)' : r.balance < 5 ? 'var(--warning)' : 'var(--success)', fontSize: 15 }}>
                        {r.balance}
                      </strong>
                    </td>
                    <td className="text-muted">{fmt(r.unit_price)}</td>
                    <td><strong>{fmt(Math.max(0, r.stock_value))}</strong></td>
                    <td>{statusBadge(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--primary)', fontWeight: 700 }}>
                  <td colSpan={6} style={{ padding: '12px 18px', fontSize: 11, color: 'rgba(255,255,255,.70)', textTransform: 'uppercase', letterSpacing: '.8px' }}>Total</td>
                  <td style={{ padding: '12px 18px', fontSize: 15, color: '#ffffff', fontWeight: 800 }}>{totalUnits} un.</td>
                  <td></td>
                  <td style={{ padding: '12px 18px', fontSize: 15, color: '#ffffff', fontWeight: 800 }}>{fmt(totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
