import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'

const CREDENCIAIS_TESTE = {
  email: 'conciliador@teste.com',
  senha: '123456',
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    const emailTrim = email.trim().toLowerCase()
    const senhaTrim = senha.trim()

    if (emailTrim === CREDENCIAIS_TESTE.email && senhaTrim === CREDENCIAIS_TESTE.senha) {
      navigate('/dashboard')
      return
    }

    setErro('Usuário ou senha incorretos. Use: conciliador@teste.com / 123456')
  }

  return (
    <main className="login-page">
      <div className="login-beam" aria-hidden="true">
        <span className="login-beam-depth" />
      </div>
      <div className="login-layout">
        <section className="login-welcome">
          <h1 className="login-welcome-title">Bem-vindo, Conciliador(a)</h1>
          <p className="login-welcome-text login-welcome-text--desktop">
            Que bom ter você por aqui. Faça login e continue organizando seus acionamentos com mais facilidade.
          </p>
        </section>

        <section className="login-section">
          <div className="login-card">
            <Link to="/" className="login-back">← Voltar</Link>
            <h2 className="login-title">Entrar</h2>
            <p className="login-subtitle">Acesse o Auxiliador de Acionamentos</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-label" htmlFor="usuario">Usuário</label>
              <input
                id="usuario"
                type="text"
                className="login-input"
                placeholder="seu usuário"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label className="login-label" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              {erro && <p className="login-erro">{erro}</p>}

              <button type="submit" className="login-submit">
                Entrar
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
