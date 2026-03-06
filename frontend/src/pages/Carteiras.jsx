import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../api/config'
import { isAdmin, isAdminSupremo, getUser } from '../utils/auth'
import Relogios from '../components/Relogios'
import './Dashboard.css'
import './Carteiras.css'

export default function Carteiras() {
  const navigate = useNavigate()
  const user = getUser()
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [alterando, setAlterando] = useState(null)

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard')
    }
  }, [navigate])

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`${apiBaseUrl}/api/carteiras`)
      if (!res.ok) throw new Error('Falha ao carregar carteiras')
      const data = await res.json()
      setLista(Array.isArray(data) ? data : [])
    } catch (e) {
      setErro(e.message)
      setLista([])
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (isAdmin()) carregar()
  }, [])

  async function toggleAtivo(nome, ativoAtual) {
    if (!user) return
    setAlterando(nome)
    const novoAtivo = !ativoAtual
    try {
      const res = await fetch(`${apiBaseUrl}/api/carteiras/${encodeURIComponent(nome)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-User-Perfil': user.perfil || '',
        },
        body: JSON.stringify({ ativo: novoAtivo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar')
      setLista((prev) =>
        prev.map((c) => (c.nome === nome ? { ...c, ativo: novoAtivo } : c))
      )
    } catch (e) {
      setErro(e.message)
    } finally {
      setAlterando(null)
    }
  }

  if (!isAdmin()) return null

  return (
    <main className="dashboard-page carteiras-page" role="main">
      <aside className="dashboard-sidebar" aria-label="Menu principal">
        <div className="dashboard-menu-centro">
          <Link to="/dashboard" className="dashboard-menu-quadro" title="Gerar acionamento">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </Link>
          <Link to="/historico" className="dashboard-menu-quadro" title="Histórico">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </Link>
          <Link to="/aguas-guariroba" className="dashboard-menu-quadro" title="Calculadora Urania">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <circle cx="8" cy="10" r="1.5" />
              <circle cx="12" cy="10" r="1.5" />
              <circle cx="16" cy="10" r="1.5" />
              <circle cx="8" cy="14" r="1.5" />
              <circle cx="12" cy="14" r="1.5" />
              <circle cx="16" cy="14" r="1.5" />
              <circle cx="8" cy="18" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
              <circle cx="16" cy="18" r="1.5" />
            </svg>
          </Link>
          <Link to="/usuarios" className="dashboard-menu-quadro" title="Usuários">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </Link>
          <span className="dashboard-menu-quadro dashboard-menu-quadro--ativo" title="Carteiras">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
            </svg>
          </span>
          {isAdminSupremo() && (
            <Link to="/exclusoes" className="dashboard-menu-quadro" title="Log de Exclusões">
              <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </Link>
          )}
        </div>
        <Link to="/login" className="dashboard-menu-quadro dashboard-menu-quadro--sair" title="Sair">
          <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </Link>
      </aside>

      <div className="dashboard-conteudo">
        <Relogios />
        <div className="carteiras-conteudo">
          <div className="carteiras-header">
            <h1 className="dashboard-titulo">Carteiras</h1>
            <p className="carteiras-subtitulo">Ative ou desative as carteiras exibidas na tela de gerar acionamento e no histórico.</p>
          </div>

          {erro && (
            <div className="carteiras-erro" role="alert">
              {erro}
            </div>
          )}

          {carregando ? (
            <p className="carteiras-carregando">Carregando...</p>
          ) : (
            <div className="carteiras-lista">
              {lista.map((c) => (
                <div key={c.nome} className="carteiras-item">
                  <span className="carteiras-item-nome">{c.nome}</span>
                  <label className="carteiras-toggle">
                    <input
                      type="checkbox"
                      checked={!!c.ativo}
                      disabled={alterando === c.nome}
                      onChange={() => toggleAtivo(c.nome, c.ativo)}
                      aria-label={`${c.ativo ? 'Desativar' : 'Ativar'} ${c.nome}`}
                    />
                    <span className="carteiras-toggle-slider" />
                  </label>
                  <span className="carteiras-item-status" aria-hidden="true">
                    {alterando === c.nome ? 'Salvando...' : c.ativo ? 'Visível' : 'Oculta'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
