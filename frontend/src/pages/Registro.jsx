import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiBaseUrl } from '../api/config'
import './Registro.css'

export default function Registro() {
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSucesso(false)
    if (!nome?.trim() || !usuario?.trim() || !senha?.trim()) {
      setErro('Preencha nome, usuário e senha.')
      return
    }
    setEnviando(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/solicitacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), usuario: usuario.trim(), senha }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data.error || 'Falha ao enviar solicitação.')
        return
      }
      setSucesso(true)
      setNome('')
      setUsuario('')
      setSenha('')
    } catch (err) {
      setErro(err.message || 'Erro ao conectar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="register-page">
      <div className="register-beam" aria-hidden="true">
        <span className="register-beam-depth" />
      </div>
      <div className="register-layout">
        <section className="register-welcome">
          <h1 className="register-welcome-title">Criar conta</h1>
          <p className="register-welcome-text register-welcome-text--desktop">
            Solicite seu cadastro no Auxiliador de Acionamentos. Um administrador aprovará sua solicitação.
          </p>
        </section>

        <section className="register-section">
          <div className="register-card">
            <Link to="/login" className="register-back">← Voltar</Link>
            <h2 className="register-title">Registre-se</h2>
            <p className="register-subtitle">Solicite acesso ao sistema</p>

            <form className="register-form" onSubmit={handleSubmit}>
              <label className="register-label" htmlFor="nome">Nome</label>
              <input
                id="nome"
                type="text"
                className="register-input"
                placeholder="seu nome completo"
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <label className="register-label" htmlFor="usuario">Usuário (login)</label>
              <input
                id="usuario"
                type="text"
                className="register-input"
                placeholder="seu usuário"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />

              <label className="register-label" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                className="register-input"
                placeholder="••••••••"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              {erro && <p className="register-erro">{erro}</p>}
              {sucesso && <p className="register-sucesso">Solicitação enviada! Aguarde a aprovação de um administrador.</p>}

              <button type="submit" className="register-submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Solicitar cadastro'}
              </button>
              <p className="register-login">
                Já possui conta? <Link to="/login" className="register-login-link">Entrar</Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
