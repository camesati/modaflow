import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const empty = { name: '', cpf: '', birth_date: '', email: '', profession: '' }

export default function Customers() {
  const { toast } = useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function openCreate() { setForm(empty); setModal('create') }
  function openEdit(item) {
    setForm({ name: item.name, cpf: item.cpf || '', birth_date: item.birth_date || '', email: item.email || '', profession: item.profession || '' })
    setModal({ type: 'edit', id: item.id })
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const data = { name: form.name.trim(), cpf: form.cpf || null, birth_date: form.birth_date || null, email: form.email || null, profession: form.profession || null }
    let error
    if (modal === 'create') {
      ;({ error } = await supabase.from('customers').insert(data))
    } else {
      ;({ error } = await supabase.from('customers').update(data).eq('id', modal.id))
    }
    if (error) toast(error.message, 'error')
    else { toast(modal === 'create' ? 'Cliente criado!' : 'Atualizado!'); setModal(null); load() }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Excluir cliente?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Cliente excluído!'); load() }
  }

  const filtered = items.filter(x => !search || x.name.toLowerCase().includes(search.toLowerCase()) || (x.cpf || '').includes(search))

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Clientes ({filtered.length})</h3>
          <div className="card-header-actions">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ Novo Cliente</button>
          </div>
        </div>
        {loading ? <div className="page-loading"><span className="spinner" style={{ color: 'var(--primary)' }} /></div> : (
          <div className="table-wrap">
            {filtered.length === 0 ? <div className="empty-state"><p>Nenhum cliente encontrado</p></div> : (
              <table>
                <thead><tr><th>Nome</th><th>CPF</th><th>E-mail</th><th>Profissão</th><th>Nasc.</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td className="text-muted">{c.cpf || '—'}</td>
                      <td className="text-muted">{c.email || '—'}</td>
                      <td className="text-muted">{c.profession || '—'}</td>
                      <td className="text-muted">{c.birth_date ? new Date(c.birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEdit(c)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon danger" onClick={() => remove(c.id)}>
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
              <h3>{modal === 'create' ? 'Novo Cliente' : 'Editar Cliente'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome *</label>
                  <input placeholder="Nome completo" value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>CPF</label>
                    <input placeholder="000.000.000-00" value={form.cpf} onChange={set('cpf')} />
                  </div>
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" value={form.birth_date} onChange={set('birth_date')} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" placeholder="cliente@email.com" value={form.email} onChange={set('email')} />
                  </div>
                  <div className="form-group">
                    <label>Profissão</label>
                    <input placeholder="Profissão" value={form.profession} onChange={set('profession')} />
                  </div>
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
