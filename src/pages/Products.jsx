import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const empty = { sku: '', description: '', unit_price: '', quantity: '', group_id: '', category_id: '' }

export default function Products() {
  const { toast, session } = useApp()
  const [items, setItems] = useState([])
  const [groups, setGroups] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [p, g, c] = await Promise.all([
      supabase.from('products').select('*, groups(name), categories(name)').order('description'),
      supabase.from('groups').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setItems(p.data || [])
    setGroups(g.data || [])
    setCategories(c.data || [])
    setLoading(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function openCreate() { setForm(empty); setModal('create') }
  function openEdit(item) {
    setForm({ sku: item.sku, description: item.description, unit_price: item.unit_price, quantity: item.quantity, group_id: item.group_id || '', category_id: item.category_id || '' })
    setModal({ type: 'edit', id: item.id })
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const data = { sku: form.sku.trim(), description: form.description.trim(), unit_price: parseFloat(form.unit_price) || 0, quantity: parseInt(form.quantity) || 0, group_id: form.group_id || null, category_id: form.category_id || null }
    let error
    if (modal === 'create') {
      ;({ error } = await supabase.from('products').insert({ ...data, user_id: session.user.id }))
    } else {
      ;({ error } = await supabase.from('products').update(data).eq('id', modal.id))
    }
    if (error) toast(error.message, 'error')
    else { toast(modal === 'create' ? 'Produto criado!' : 'Produto atualizado!'); setModal(null); loadAll() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Excluir este produto?')) return
    setDeleting(id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Produto excluído!'); loadAll() }
    setDeleting(null)
  }

  const filtered = items.filter(x => !search || x.description.toLowerCase().includes(search.toLowerCase()) || x.sku.toLowerCase().includes(search.toLowerCase()))
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  const catFiltered = form.group_id ? categories.filter(c => c.group_id === form.group_id) : categories

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Produtos ({filtered.length})</h3>
          <div className="card-header-actions">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Buscar produto ou SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ Novo Produto</button>
          </div>
        </div>

        {loading ? <div className="page-loading"><span className="spinner" style={{ color: 'var(--primary)' }} /></div> : (
          <div className="table-wrap">
            {filtered.length === 0 ? (
              <div className="empty-state"><p>Nenhum produto encontrado</p></div>
            ) : (
              <table>
                <thead><tr><th>SKU</th><th>Descrição</th><th>Grupo</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td><span className="sku-tag">{p.sku}</span></td>
                      <td><strong>{p.description}</strong></td>
                      <td>{p.groups?.name || <span className="text-muted">—</span>}</td>
                      <td>{p.categories?.name || <span className="text-muted">—</span>}</td>
                      <td>{fmt(p.unit_price)}</td>
                      <td>
                        <span className={`badge ${p.quantity <= 0 ? 'red' : p.quantity < 5 ? 'amber' : 'green'}`}>
                          {p.quantity} un.
                        </span>
                      </td>
                      <td><strong>{fmt(p.total_value)}</strong></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEdit(p)} title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon danger" onClick={() => remove(p.id)} disabled={deleting === p.id} title="Excluir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'create' ? 'Novo Produto' : 'Editar Produto'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>SKU *</label>
                    <input placeholder="Ex: CAM-001" value={form.sku} onChange={set('sku')} required />
                  </div>
                  <div className="form-group">
                    <label>Preço de Venda *</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00" value={form.unit_price} onChange={set('unit_price')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição *</label>
                  <input placeholder="Nome do produto" value={form.description} onChange={set('description')} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Grupo</label>
                    <select value={form.group_id} onChange={set('group_id')}>
                      <option value="">Sem grupo</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select value={form.category_id} onChange={set('category_id')}>
                      <option value="">Sem categoria</option>
                      {catFiltered.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Estoque inicial</label>
                  <input type="number" min="0" placeholder="0" value={form.quantity} onChange={set('quantity')} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
