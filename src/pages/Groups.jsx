import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

export default function Groups() {
  const { toast, session } = useApp()
  const [groups, setGroups] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [groupModal, setGroupModal] = useState(null)   // null | 'create' | { type:'edit', id }
  const [catModal, setCatModal] = useState(null)        // null | { groupId } | { type:'edit', id, groupId }
  const [groupForm, setGroupForm] = useState({ name: '' })
  const [catForm, setCatForm] = useState({ name: '', group_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [g, c] = await Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setGroups(g.data || [])
    setCategories(c.data || [])
    setLoading(false)
  }

  /* ── GRUPOS ── */
  function openCreateGroup() { setGroupForm({ name: '' }); setGroupModal('create') }
  function openEditGroup(g) { setGroupForm({ name: g.name }); setGroupModal({ type: 'edit', id: g.id }) }

  async function saveGroup(e) {
    e.preventDefault(); setSaving(true)
    const data = { name: groupForm.name.trim() }
    let error
    if (groupModal === 'create') {
      ;({ error } = await supabase.from('groups').insert({ ...data, user_id: session.user.id }))
    } else {
      ;({ error } = await supabase.from('groups').update(data).eq('id', groupModal.id))
    }
    if (error) toast(error.message, 'error')
    else { toast(groupModal === 'create' ? 'Grupo criado!' : 'Grupo atualizado!'); setGroupModal(null); loadAll() }
    setSaving(false)
  }

  async function deleteGroup(id) {
    if (!confirm('Excluir grupo? As categorias vinculadas ficarão sem grupo.')) return
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Grupo excluído!'); loadAll() }
  }

  /* ── CATEGORIAS ── */
  function openCreateCat(groupId) { setCatForm({ name: '', group_id: groupId || '' }); setCatModal({ type: 'create', groupId }) }
  function openEditCat(cat) { setCatForm({ name: cat.name, group_id: cat.group_id || '' }); setCatModal({ type: 'edit', id: cat.id }) }

  async function saveCat(e) {
    e.preventDefault(); setSaving(true)
    const data = { name: catForm.name.trim(), group_id: catForm.group_id || null }
    let error
    if (catModal.type === 'create') {
      ;({ error } = await supabase.from('categories').insert({ ...data, user_id: session.user.id }))
    } else {
      ;({ error } = await supabase.from('categories').update(data).eq('id', catModal.id))
    }
    if (error) toast(error.message, 'error')
    else { toast(catModal.type === 'create' ? 'Categoria criada!' : 'Categoria atualizada!'); setCatModal(null); loadAll() }
    setSaving(false)
  }

  async function deleteCat(id) {
    if (!confirm('Excluir categoria?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Categoria excluída!'); loadAll() }
  }

  const catsOf = (groupId) => categories.filter(c => c.group_id === groupId)
  const orphanCats = categories.filter(c => !c.group_id)

  if (loading) return <div className="page-loading"><span className="spinner" style={{ color: 'var(--primary)' }} /></div>

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── COLUNA GRUPOS ── */}
        <div className="card">
          <div className="card-header">
            <h3>Grupos ({groups.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={openCreateGroup}>+ Novo Grupo</button>
          </div>
          {groups.length === 0 ? (
            <div className="empty-state"><p>Nenhum grupo cadastrado</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Categorias</th><th></th></tr></thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g.id}>
                      <td><strong>{g.name}</strong></td>
                      <td>
                        <span className="badge purple">{catsOf(g.id).length} cat.</span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEditGroup(g)} title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon danger" onClick={() => deleteGroup(g.id)} title="Excluir">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── COLUNA CATEGORIAS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Por grupo */}
          {groups.map(g => (
            <div className="card" key={g.id}>
              <div className="card-header">
                <h3 style={{ fontSize: 14 }}>{g.name}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => openCreateCat(g.id)}>+ Categoria</button>
              </div>
              {catsOf(g.id).length === 0 ? (
                <div style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Nenhuma categoria neste grupo
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nome</th><th></th></tr></thead>
                    <tbody>
                      {catsOf(g.id).map(cat => (
                        <tr key={cat.id}>
                          <td>{cat.name}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn-icon" onClick={() => openEditCat(cat)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button className="btn-icon danger" onClick={() => deleteCat(cat.id)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Sem grupo */}
          {orphanCats.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sem grupo</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => openCreateCat('')}>+ Categoria</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th></th></tr></thead>
                  <tbody>
                    {orphanCats.map(cat => (
                      <tr key={cat.id}>
                        <td>{cat.name}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn-icon" onClick={() => openEditCat(cat)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="btn-icon danger" onClick={() => deleteCat(cat.id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {groups.length === 0 && orphanCats.length === 0 && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 14 }}>Categorias</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => openCreateCat('')}>+ Categoria</button>
              </div>
              <div className="empty-state"><p>Crie um grupo primeiro</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Modal — Grupo */}
      {groupModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setGroupModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>{groupModal === 'create' ? 'Novo Grupo' : 'Editar Grupo'}</h3>
              <button className="modal-close" onClick={() => setGroupModal(null)}>✕</button>
            </div>
            <form onSubmit={saveGroup}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome do Grupo *</label>
                  <input placeholder="Ex: Roupas, Calçados..." value={groupForm.name}
                    onChange={e => setGroupForm({ name: e.target.value })} required autoFocus />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setGroupModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Categoria */}
      {catModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCatModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>{catModal.type === 'create' ? 'Nova Categoria' : 'Editar Categoria'}</h3>
              <button className="modal-close" onClick={() => setCatModal(null)}>✕</button>
            </div>
            <form onSubmit={saveCat}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome da Categoria *</label>
                  <input placeholder="Ex: Moda Masculina..." value={catForm.name}
                    onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
                </div>
                <div className="form-group">
                  <label>Grupo</label>
                  <select value={catForm.group_id} onChange={e => setCatForm(f => ({ ...f, group_id: e.target.value }))}>
                    <option value="">Sem grupo</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCatModal(null)}>Cancelar</button>
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
