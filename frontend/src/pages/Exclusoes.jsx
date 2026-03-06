import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, isAdmin, isAdminSupremo } from '../utils/auth'
import { apiBaseUrl } from '../api/config'
import Relogios from '../components/Relogios'
import './Dashboard.css'
import './Exclusoes.css'

function getHojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Exclusoes() {
  const navigate = useNavigate()
  const user = getUser()
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  useEffect(() => {
    if (!user || !isAdminSupremo()) navigate('/dashboard')
  }, [user, navigate])

  async function carregar() {
    if (!user) return
    setCarregando(true)
    setErro('')
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': String(user.id),
        'X-User-Perfil': user.perfil || '',
      }
      const params = new URLSearchParams()
      if (filtroDataInicio) params.set('dataInicio', filtroDataInicio)
      if (filtroDataFim) params.set('dataFim', filtroDataFim)
      if (filtroTexto.trim()) params.set('q', filtroTexto.trim())

      const res = await fetch(`${apiBaseUrl}/api/deletados-log?${params.toString()}`, { headers })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erro ${res.status}`)
      }
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
    if (user && isAdminSupremo()) carregar()
  }, [user?.id, filtroDataInicio, filtroDataFim, filtroTexto])

  if (!user || !isAdminSupremo()) return null

  return (
    <main className="dashboard-page exclusoes-page">
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
          <Link to="/aguas-guariroba" className="dashboard-menu-quadro" title="Águas Guariroba">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <circle cx="8" cy="10" r="1.5" /><circle cx="12" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" />
              <circle cx="8" cy="14" r="1.5" /><circle cx="12" cy="14" r="1.5" /><circle cx="16" cy="14" r="1.5" />
              <circle cx="8" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
            </svg>
          </Link>
          {isAdmin() && (
            <>
              <Link to="/usuarios" className="dashboard-menu-quadro" title="Usuários">
                <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </Link>
              <Link to="/carteiras" className="dashboard-menu-quadro" title="Carteiras">
                <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                </svg>
              </Link>
            </>
          )}
          <span className="dashboard-menu-quadro dashboard-menu-quadro--ativo" title="Log de Exclusões">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </span>
        </div>
        <Link to="/login" className="dashboard-menu-quadro dashboard-menu-quadro--sair" title="Sair">
          <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </Link>
      </aside>

      <div className="dashboard-conteudo exclusoes-conteudo">
        <Relogios />
        <div className="exclusoes-header">
          <h1 className="dashboard-titulo">Log de Exclusões</h1>
          <p className="exclusoes-subtitulo">Registro de todos os acionamentos que foram excluídos do sistema.</p>
        </div>

        {erro && <div className="exclusoes-erro" role="alert">{erro}</div>}

        <div className="exclusoes-filtros">
          <input
            type="text"
            className="dashboard-filtro exclusoes-filtro-texto"
            placeholder="Buscar por código, resumo, usuário..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
          <input
            type="date"
            className="exclusoes-filtro-data"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            aria-label="Data início"
          />
          <span className="exclusoes-filtro-sep">–</span>
          <input
            type="date"
            className="exclusoes-filtro-data"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            aria-label="Data fim"
          />
        </div>

        <div className="exclusoes-tabela-wrap">
          {carregando ? (
            <p className="exclusoes-carregando">Carregando...</p>
          ) : (
            <table className="exclusoes-tabela" role="grid">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Código</th>
                  <th>Origem</th>
                  <th>Resumo</th>
                  <th>Excluído por</th>
                  <th>Dono original</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="exclusoes-vazio">Nenhuma exclusão registrada.</td>
                  </tr>
                ) : (
                  lista.map((item) => (
                    <tr key={item.id}>
                      <td className="exclusoes-data">{item.data_exclusao}</td>
                      <td className="exclusoes-codigo">{item.registro_codigo}</td>
                      <td>{item.tabela_origem === 'aguas_guariroba' ? 'Águas Guariroba' : 'Acionamento'}</td>
                      <td className="exclusoes-resumo">{item.registro_resumo}</td>
                      <td className="exclusoes-usuario-del">{item.deletado_por}</td>
                      <td>{item.dono_original}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
