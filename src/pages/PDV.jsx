import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function Receipt({ sale, onClose }) {
  const date = new Date(sale.created_at).toLocaleString('pt-BR')

  function print() { window.print() }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h3>Cupom da Venda</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" id="receipt-content">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', letterSpacing: -0.5 }}>
              Moda<span style={{ color: 'var(--accent)' }}>Flow</span>
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sistema de Gestão de Loja</p>
          </div>

          <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '10px 0', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span className="text-muted">Data:</span><span>{date}</span>
            </div>
            {sale.customer && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span className="text-muted">Cliente:</span><span>{sale.customer}</span>
              </div>
            )}
            {sale.seller && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span className="text-muted">Vendedor:</span><span>{sale.seller}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="text-muted">Pagamento:</span><span>{sale.payment}</span>
            </div>
          </div>

          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 700 }}>Produto</th>
                <th style={{ textAlign: 'center', padding: '4px 0', fontWeight: 700 }}>Qtd</th>
                <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '5px 0' }}>
                    <div style={{ fontWeight: 600 }}>{item.description}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.sku} · {fmt(item.unit_price)} un.</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.qty}x</td>
                  <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 700 }}>{fmt(item.unit_price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: 'var(--primary)', color: 'white', borderRadius: 8, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>TOTAL</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(sale.total)}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
              {sale.items.reduce((s, x) => s + x.qty, 0)} itens
            </div>
          </div>

          {sale.notes && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Obs.: {sale.notes}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 11, textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px dashed #ccc', paddingTop: 10 }}>
            Obrigado pela preferência!
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={print}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          .modal-overlay { position: static !important; background: none !important; }
          .modal { box-shadow: none !important; max-width: 100% !important; }
          .modal-header button, .modal-footer { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default function PDV() {
  const { toast, session } = useApp()
  const [products, setProducts] = useState([])
  const [sellers, setSellers] = useState([])
  const [customers, setCustomers] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState([])
  const [sale, setSale] = useState({ customer_id: '', seller_id: '', payment_method_id: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const searchRef = useRef()

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!search.trim()) { setFiltered([]); return }
    const q = search.toLowerCase()
    setFiltered(products.filter(p => p.sku.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)).slice(0, 8))
  }, [search, products])

  async function loadData() {
    const [p, s, c, pm] = await Promise.all([
      supabase.from('products').select('id, sku, description, unit_price, quantity').order('description'),
      supabase.from('sellers').select('*').eq('active', true).order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('payment_methods').select('*').eq('active', true).order('name'),
    ])
    setProducts(p.data || [])
    setSellers(s.data || [])
    setCustomers(c.data || [])
    setPaymentMethods(pm.data || [])
  }

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(x => x.product_id === product.id)
      if (existing) return prev.map(x => x.product_id === product.id ? { ...x, qty: x.qty + 1 } : x)
      return [...prev, { product_id: product.id, sku: product.sku, description: product.description, unit_price: product.unit_price, qty: 1 }]
    })
    setSearch(''); setFiltered([])
    searchRef.current?.focus()
  }

  function updateQty(idx, val) {
    setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: Math.max(1, parseInt(val) || 1) } : x))
  }

  function updatePrice(idx, val) {
    setItems(prev => prev.map((x, i) => i === idx ? { ...x, unit_price: parseFloat(val) || 0 } : x))
  }

  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  const total = items.reduce((s, x) => s + x.unit_price * x.qty, 0)
  const setSaleField = k => e => setSale(f => ({ ...f, [k]: e.target.value }))

  async function finalize(e) {
    e.preventDefault()
    if (items.length === 0) { toast('Adicione pelo menos um item!', 'error'); return }
    if (!sale.payment_method_id) { toast('Selecione a forma de pagamento!', 'error'); return }
    setSaving(true)

    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
      customer_id: sale.customer_id || null,
      seller_id: sale.seller_id || null,
      payment_method_id: sale.payment_method_id,
      total_amount: total,
      notes: sale.notes || null,
      user_id: session.user.id,
    }).select().single()

    if (saleErr) { toast(saleErr.message, 'error'); setSaving(false); return }

    const saleItems = items.map(x => ({
      sale_id: saleData.id,
      product_id: x.product_id,
      sku: x.sku,
      description: x.description,
      quantity: x.qty,
      unit_price: x.unit_price,
      user_id: session.user.id,
    }))

    const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems)
    if (itemsErr) { toast(itemsErr.message, 'error'); setSaving(false); return }

    for (const item of items) {
      const prod = products.find(p => p.id === item.product_id)
      if (prod) await supabase.from('products').update({ quantity: Math.max(0, prod.quantity - item.qty) }).eq('id', prod.id)
    }

    // Monta dados do cupom
    const customerName = sale.customer_id ? customers.find(c => c.id === sale.customer_id)?.name : null
    const sellerName = sale.seller_id ? sellers.find(s => s.id === sale.seller_id)?.name : null
    const paymentName = paymentMethods.find(pm => pm.id === sale.payment_method_id)?.name

    setReceipt({
      created_at: saleData.created_at,
      customer: customerName,
      seller: sellerName,
      payment: paymentName,
      total,
      notes: sale.notes,
      items: items.map(x => ({ sku: x.sku, description: x.description, unit_price: x.unit_price, qty: x.qty })),
    })

    toast(`Venda finalizada! Total: ${fmt(total)}`)
    setItems([])
    setSale({ customer_id: '', seller_id: '', payment_method_id: '', notes: '' })
    loadData()
    setSaving(false)
  }

  return (
    <>
      <form onSubmit={finalize}>
        <div className="pdv-grid">

          {/* ── COLUNA ESQUERDA ── */}
          <div className="pdv-left">
            {/* Buscar Produto */}
            <div className="card" style={{ overflow: 'visible' }}>
              <div className="card-header"><h3>Buscar Produto</h3></div>
              <div style={{ padding: 16, position: 'relative' }}>
                <div className="search-input">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input ref={searchRef} placeholder="Digite SKU ou nome do produto..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                </div>
                {filtered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 16, right: 16, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden' }}>
                    {filtered.map(p => (
                      <div key={p.id} onClick={() => addItem(p)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <span><span className="sku-tag">{p.sku}</span><strong style={{ marginLeft: 8 }}>{p.description}</strong></span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmt(p.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Itens da Venda */}
            <div className="pdv-items">
              <div className="card-header"><h3>Itens da Venda ({items.length})</h3></div>
              {items.length === 0 ? (
                <div className="empty-state"><p>Nenhum item adicionado</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>SKU</th><th>Produto</th><th style={{ width: 80 }}>Qtd.</th><th style={{ width: 110 }}>Preço Unit.</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td><span className="sku-tag">{item.sku}</span></td>
                          <td>{item.description}</td>
                          <td><input type="number" min="1" value={item.qty} onChange={e => updateQty(idx, e.target.value)} style={{ width: 60, textAlign: 'center', padding: '4px 6px' }} /></td>
                          <td><input type="number" step="0.01" min="0" value={item.unit_price} onChange={e => updatePrice(idx, e.target.value)} style={{ width: 90, padding: '4px 6px' }} /></td>
                          <td><strong>{fmt(item.unit_price * item.qty)}</strong></td>
                          <td>
                            <button type="button" className="btn-icon danger" onClick={() => removeItem(idx)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── COLUNA DIREITA ── */}
          <div className="pdv-right">
            {/* Total — alinha com Buscar Produto */}
            <div className="pdv-total">
              <p>Total da Venda</p>
              <h2>{fmt(total)}</h2>
              <p style={{ marginTop: 4 }}>{items.reduce((s, x) => s + x.qty, 0)} itens</p>
            </div>

            {/* Formulário — sticky panel abaixo do total */}
            <div className="pdv-panel">
              <div className="form-group">
                <label>Forma de Pagamento *</label>
                <select value={sale.payment_method_id} onChange={setSaleField('payment_method_id')} required>
                  <option value="">Selecione...</option>
                  {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Vendedor</label>
                <select value={sale.seller_id} onChange={setSaleField('seller_id')}>
                  <option value="">Selecione...</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Cliente</label>
                <select value={sale.customer_id} onChange={setSaleField('customer_id')}>
                  <option value="">Consumidor final</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea placeholder="Opcional..." value={sale.notes} onChange={setSaleField('notes')} rows={2} />
              </div>

              <button type="submit" className="btn btn-success w-full" style={{ justifyContent: 'center', padding: 14, fontSize: 15 }} disabled={saving || items.length === 0}>
                {saving ? <span className="spinner" /> : '✓ Finalizar Venda'}
              </button>

              <button type="button" className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}
                onClick={() => { setItems([]); setSale({ customer_id: '', seller_id: '', payment_method_id: '', notes: '' }) }}>
                Limpar
              </button>
            </div>
          </div>

        </div>
      </form>

      {receipt && <Receipt sale={receipt} onClose={() => setReceipt(null)} />}
    </>
  )
}
