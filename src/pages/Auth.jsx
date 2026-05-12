import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth() {
  const [view, setView] = useState('login') // login | register | forgot
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) setMsg({ type: 'error', text: error.message })
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.full_name } }
    })
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Conta criada! Verifique seu e-mail para confirmar.' })
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(form.email)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'E-mail de recuperação enviado!' })
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Moda<span>Flow</span></h1>
          <p>Sistema de Gestão para Loja de Roupas</p>
        </div>

        {view === 'login' && (
          <>
            <h2>Entrar</h2>
            <p className="sub">Acesse sua conta para continuar</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
              </div>
              {msg && <div className={`toast ${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Entrar'}
              </button>
            </form>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="auth-link" onClick={() => { setView('register'); setMsg(null) }}>Criar conta</button>
              <button className="auth-link" onClick={() => { setView('forgot'); setMsg(null) }}>Esqueci a senha</button>
            </div>
          </>
        )}

        {view === 'register' && (
          <>
            <h2>Criar conta</h2>
            <p className="sub">Cadastre sua loja gratuitamente</p>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Nome completo</label>
                <input placeholder="Seu nome" value={form.full_name} onChange={set('full_name')} required />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
              {msg && <div className={`toast ${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Criar conta'}
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button className="auth-link" onClick={() => { setView('login'); setMsg(null) }}>Já tenho conta</button>
            </div>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h2>Recuperar senha</h2>
            <p className="sub">Enviaremos um link para seu e-mail</p>
            <form onSubmit={handleForgot}>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
              </div>
              {msg && <div className={`toast ${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Enviar link'}
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button className="auth-link" onClick={() => { setView('login'); setMsg(null) }}>Voltar ao login</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
