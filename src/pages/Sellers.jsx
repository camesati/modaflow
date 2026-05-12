import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const empty = { seller_code: '', name: '', active: true }

export default function Sellers() {
  const { toast } = useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('sellers').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: k === 'active' ? e.target.checked : e.target.value }))

  function openCreate() { setForm(empty); setModal('create') }
  function openEdit(item) { setForm({ seller_code: item.seller_code, name: item.name, active: item.active }); setModal({ type: 'edit', id: item.id }) }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const data = { seller_code: form.seller_code.trim(), name: form.name.trim(), active: form.active }
    let error
    if (modal === 'create') {
      ;({ error } = await supabase.from('sellers').insert(data))
    } else {
      ;({ error } = await supabase.from('sellers').update(data).eq('id', modal.id))
    }
    if (error) toast(error.message, 'error')
    else { toast(modal === 'create' ? 'Vendedor criado!' : 'Atualizado!'); setModal(null); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Excluir vendedor?')) return
    const { error } = await supabase.from('sellers').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Vendedor excluído!'); load() }
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Vendedores ({items.length})</h3>
          <button className="btn btn-primary" onClick={openCreate}>+ Novo Vendedor</button>
        </div>
        {loading ? <div className="page-loading"><span className="spinner" style={{ color: 'var(--primary)' }} /></div> : (
          <div className="table-wrap">
            {items.length === 0 ? <div className="empty-state"><p>Nenhum vendedor cadastrado</p></div> : (
              <table>
                <thead><tr><th>Código</th><th>Nome</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {items.map(s => (
                    <tr key={s.id}>
                      <td><span className="sku-tag">{s.seller_code}</span></td>
                      <td><strong>{s.name}</strong></td>
                      <td><span className={`badge ${s.active ? 'green' : 'gray'}`}>{s.active ? 'Ativo' : 'Inativo'}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEdit(s)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon danger" onClick={() => remove(s.id)}>
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
              <h3>{modal === 'create' ? 'Novo Vendedor' : 'Editar Vendedor'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Código *</label>
                    <input placeholder="Ex: V001" value={form.seller_code} onChange={set('seller_code')} required />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: 'auto' }} />
                      Ativo
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nome *</label>
                  <input placeholder="Nome completo" value={form.name} onChange={set('name')} required />
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
