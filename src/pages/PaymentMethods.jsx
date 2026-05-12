import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const TYPE_LABELS = { credit: 'Crédito', debit: 'Débito', pix: 'Pix', cash: 'Dinheiro' }
const TYPE_COLORS = { credit: 'blue', debit: 'purple', pix: 'green', cash: 'amber' }
const empty = { name: '', type: 'credit', active: true }

export default function PaymentMethods() {
  const { toast } = useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('payment_methods').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: k === 'active' ? e.target.checked : e.target.value }))

  function openCreate() { setForm(empty); setModal('create') }
  function openEdit(item) { setForm({ name: item.name, type: item.type, active: item.active }); setModal({ type: 'edit', id: item.id }) }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const data = { name: form.name.trim(), type: form.type, active: form.active }
    let error
    if (modal === 'create') {
      ;({ error } = await supabase.from('payment_methods').insert(data))
    } else {
      ;({ error } = await supabase.from('payment_methods').update(data).eq('id', modal.id))
    }
    if (error) toast(error.message, 'error')
    else { toast(modal === 'create' ? 'Forma de pagamento criada!' : 'Atualizada!'); setModal(null); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Excluir forma de pagamento?')) return
    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Excluída!'); load() }
  }

  async function toggleActive(item) {
    await supabase.from('payment_methods').update({ active: !item.active }).eq('id', item.id)
    load()
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Formas de Pagamento ({items.length})</h3>
          <button className="btn btn-primary" onClick={openCreate}>+ Nova Forma</button>
        </div>
        {loading ? <div className="page-loading"><span className="spinner" style={{ color: 'var(--primary)' }} /></div> : (
          <div className="table-wrap">
            {items.length === 0 ? <div className="empty-state"><p>Nenhuma forma de pagamento cadastrada</p></div> : (
              <table>
                <thead><tr><th>Nome</th><th>Tipo</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {items.map(pm => (
                    <tr key={pm.id}>
                      <td><strong>{pm.name}</strong></td>
                      <td><span className={`badge ${TYPE_COLORS[pm.type] || 'gray'}`}>{TYPE_LABELS[pm.type] || pm.type}</span></td>
                      <td>
                        <button
                          className={`badge ${pm.active ? 'green' : 'gray'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => toggleActive(pm)}
                          title="Clique para alternar"
                        >
                          {pm.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEdit(pm)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon danger" onClick={() => remove(pm.id)}>
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
              <h3>{modal === 'create' ? 'Nova Forma de Pagamento' : 'Editar Forma de Pagamento'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome *</label>
                  <input placeholder="Ex: Crédito Visa" value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select value={form.type} onChange={set('type')}>
                    <option value="credit">Crédito</option>
                    <option value="debit">Débito</option>
                    <option value="pix">Pix</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: 'auto' }} />
                    Ativo
                  </label>
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
