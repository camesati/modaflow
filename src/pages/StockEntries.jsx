import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const empty = { sku: '', description: '', quantity: '', unit_cost: '', notes: '' }
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function StockEntries() {
  const { toast, session } = useApp()
  const [entries, setEntries] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [skuSearch, setSkuSearch] = useState('')
  const [skuResults, setSkuResults] = useState([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [e, p] = await Promise.all([
      supabase.from('stock_entries').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('id, sku, description, unit_price').order('description'),
    ])
    setEntries(e.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (!skuSearch.trim()) { setSkuResults([]); return }
    const q = skuSearch.toLowerCase()
    setSkuResults(products.filter(p => p.sku.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)).slice(0, 6))
  }, [skuSearch, products])

  function selectProduct(p) {
    setForm(f => ({ ...f, sku: p.sku, description: p.description, unit_cost: p.unit_price }))
    setSkuSearch('')
    setSkuResults([])
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const data = { sku: form.sku.trim(), description: form.description.trim(), quantity: parseInt(form.quantity), unit_cost: parseFloat(form.unit_cost) || 0, notes: form.notes || null, user_id: session.user.id }

    const { error: entryErr } = await supabase.from('stock_entries').insert(data)
    if (entryErr) { toast(entryErr.message, 'error'); setSaving(false); return }

    // Atualiza quantidade no produto
    const prod = products.find(p => p.sku === form.sku)
    if (prod) {
      await supabase.from('products').update({ quantity: prod.quantity + data.quantity }).eq('id', prod.id)
    }

    toast('Entrada registrada!'); setModal(false); setForm(empty); loadAll()
    setSaving(false)
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Entradas de Estoque</h3>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setModal(true) }}>+ Nova Entrada</button>
        </div>
        {loading ? <div className="page-loading"><span className="spinner" style={{ color: 'var(--primary)' }} /></div> : (
          <div className="table-wrap">
            {entries.length === 0 ? <div className="empty-state"><p>Nenhuma entrada registrada</p></div> : (
              <table>
                <thead><tr><th>Data</th><th>SKU</th><th>Descrição</th><th>Qtd.</th><th>Custo Unit.</th><th>Total</th><th>Obs.</th></tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td className="text-muted text-sm">{new Date(e.created_at).toLocaleString('pt-BR')}</td>
                      <td><span className="sku-tag">{e.sku}</span></td>
                      <td>{e.description}</td>
                      <td><span className="badge green">+{e.quantity} un.</span></td>
                      <td>{fmt(e.unit_cost)}</td>
                      <td><strong>{fmt(e.unit_cost * e.quantity)}</strong></td>
                      <td className="text-muted text-sm">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Nova Entrada de Estoque</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Buscar Produto</label>
                  <input placeholder="Digite SKU ou nome..." value={skuSearch} onChange={e => setSkuSearch(e.target.value)} />
                  {skuResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, zIndex: 100, boxShadow: 'var(--shadow-md)' }}>
                      {skuResults.map(p => (
                        <div key={p.id} onClick={() => selectProduct(p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <span className="sku-tag">{p.sku}</span> <strong style={{ marginLeft: 6 }}>{p.description}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>SKU *</label>
                    <input value={form.sku} onChange={set('sku')} required placeholder="SKU" />
                  </div>
                  <div className="form-group">
                    <label>Quantidade *</label>
                    <input type="number" min="1" value={form.quantity} onChange={set('quantity')} required placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição *</label>
                  <input value={form.description} onChange={set('description')} required placeholder="Descrição do produto" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Custo Unitário</label>
                    <input type="number" step="0.01" min="0" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0,00" />
                  </div>
                  <div className="form-group">
                    <label>Observações</label>
                    <input value={form.notes} onChange={set('notes')} placeholder="Opcional" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
