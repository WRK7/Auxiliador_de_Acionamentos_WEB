import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TIPOS_POR_CARTEIRA } from '../data/config'
import {
  MOCK_ACIONAMENTOS,
  getDevedorFromInformacoes,
  getValorFromInformacoes,
} from '../data/mockHistorico'
import { isAdmin } from '../utils/auth'
import Relogios from '../components/Relogios'
import './Dashboard.css'
import './Historico.css'

/** Hoje no formato YYYY-MM-DD (para input type="date"). */
function getHojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Converte data em número YYYYMMDD para comparação. Aceita DD/MM/YYYY ou YYYY-MM-DD. */
function dataParaComparavel(str) {
  if (!str || typeof str !== 'string' || str.trim().length < 10) return null
  const s = str.trim().slice(0, 10)
  if (s.includes('-')) {
    const num = parseInt(s.replace(/-/g, ''), 10)
    return Number.isNaN(num) ? null : num
  }
  const partes = s.split('/')
  if (partes.length !== 3) return null
  const dd = parseInt(partes[0], 10)
  const mm = parseInt(partes[1], 10)
  const aa = parseInt(partes[2], 10)
  if (!dd || !mm || !aa) return null
  return aa * 10000 + mm * 100 + dd
}

export default function Historico() {
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroCarteira, setFiltroCarteira] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState(getHojeISO())
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [detalheId, setDetalheId] = useState(null)

  const lista = useMemo(() => {
    let items = [...MOCK_ACIONAMENTOS]
    if (filtroTexto.trim()) {
      const q = filtroTexto.trim().toLowerCase()
      items = items.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.carteira.toLowerCase().includes(q) ||
          a.tipo.toLowerCase().includes(q) ||
          getDevedorFromInformacoes(a.informacoes).toLowerCase().includes(q) ||
          a.usuario.toLowerCase().includes(q) ||
          (a.modelo_gerado && a.modelo_gerado.toLowerCase().includes(q))
      )
    }
    if (filtroCarteira.trim()) {
      const c = filtroCarteira.trim()
      items = items.filter((a) => a.carteira === c)
    }
    if (filtroTipo.trim()) {
      items = items.filter((a) => a.tipo === filtroTipo.trim())
    }
    const inicioComp = filtroDataInicio ? dataParaComparavel(filtroDataInicio) : null
    const fimComp = filtroDataFim ? dataParaComparavel(filtroDataFim) : null
    if (inicioComp != null) {
      items = items.filter((a) => {
        const dataStr = (a.data_criacao || '').toString().trim().slice(0, 10)
        const recComp = dataParaComparavel(dataStr)
        if (recComp == null) return false
        if (fimComp != null) return recComp >= inicioComp && recComp <= fimComp
        return recComp === inicioComp
      })
    } else if (fimComp != null) {
      items = items.filter((a) => {
        const dataStr = (a.data_criacao || '').toString().trim().slice(0, 10)
        const recComp = dataParaComparavel(dataStr)
        if (recComp == null) return false
        return recComp <= fimComp
      })
    }
    return items.sort((a, b) => {
      const [da, ma, aa] = (a.data_criacao || '').split(' ')[0].split('/').map(Number)
      const [db, mb, ab] = (b.data_criacao || '').split(' ')[0].split('/').map(Number)
      if (aa !== ab) return ab - aa
      if (ma !== mb) return mb - ma
      return (db || 0) - (da || 0)
    })
  }, [filtroTexto, filtroCarteira, filtroTipo, filtroDataInicio, filtroDataFim])

  const carteirasUnicas = useMemo(() => {
    const set = new Set(MOCK_ACIONAMENTOS.map((a) => a.carteira))
    return Array.from(set).sort()
  }, [])

  /** Tipos no filtro: quando há carteira selecionada, todos os tipos dessa carteira (config); senão, todos os que aparecem nos mocks. */
  const tiposDisponiveis = useMemo(() => {
    if (filtroCarteira.trim()) {
      return TIPOS_POR_CARTEIRA[filtroCarteira.trim()] || []
    }
    const set = new Set(MOCK_ACIONAMENTOS.map((a) => a.tipo))
    return Array.from(set).sort()
  }, [filtroCarteira])

  const detalhe = detalheId ? MOCK_ACIONAMENTOS.find((a) => a.id === detalheId) : null

  return (
    <main className="dashboard-page historico-page">
      <aside className="dashboard-sidebar" aria-label="Menu principal">
        <div className="dashboard-menu-centro">
          <Link
            to="/dashboard"
            className="dashboard-menu-quadro"
            title="Gerar acionamento"
          >
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </Link>
          <span className="dashboard-menu-quadro dashboard-menu-quadro--ativo" title="Histórico">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          {isAdmin() && (
            <Link to="/usuarios" className="dashboard-menu-quadro" title="Usuários">
              <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

      <div className="dashboard-conteudo historico-conteudo">
        <Relogios />
        <div className="historico-header">
          <h1 className="dashboard-titulo">Histórico de acionamentos</h1>
          <p className="historico-subtitulo">Dados mockados para demonstração.</p>
        </div>

        <div className="historico-filtros">
          <input
            type="text"
            className="dashboard-filtro historico-filtro-texto"
            placeholder="Buscar por ID, carteira, tipo, devedor, usuário..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
          <select
            className="historico-filtro-carteira"
            value={filtroCarteira}
            onChange={(e) => {
              setFiltroCarteira(e.target.value)
              setFiltroTipo('')
            }}
            aria-label="Filtrar por carteira"
          >
            <option value="">Todas as carteiras</option>
            {carteirasUnicas.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {filtroCarteira && (
            <select
              className="historico-filtro-tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              aria-label="Filtrar por tipo de acionamento"
              title={filtroTipo || 'Todos os tipos'}
            >
              <option value="">Todos os tipos</option>
              {tiposDisponiveis.map((tipoCompleto) => (
                <option key={tipoCompleto} value={tipoCompleto} title={tipoCompleto}>
                  {tipoCompleto}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            className="historico-filtro-data"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            aria-label="Data início"
          />
          <span className="historico-filtro-data-sep" aria-hidden="true">–</span>
          <input
            type="date"
            className="historico-filtro-data"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            aria-label="Data fim"
          />
        </div>

        <div className="historico-tabela-wrap">
          <table className="historico-tabela" role="grid">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Carteira</th>
                <th>Tipo</th>
                <th>Devedor</th>
                <th>Valor</th>
                <th>Usuário</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={8} className="historico-vazio">
                    Nenhum acionamento encontrado.
                  </td>
                </tr>
              ) : (
                lista.map((a) => (
                  <tr key={a.id}>
                    <td className="historico-id">{a.id}</td>
                    <td className="historico-data">{a.data_criacao}</td>
                    <td>{a.carteira}</td>
                    <td>{a.tipo}</td>
                    <td>{getDevedorFromInformacoes(a.informacoes)}</td>
                    <td>{getValorFromInformacoes(a.informacoes)}</td>
                    <td>{a.usuario}</td>
                    <td>
                      <button
                        type="button"
                        className="historico-btn-detalhe"
                        onClick={() => setDetalheId(a.id)}
                        title="Ver detalhes"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalhe && (
        <div
          className="historico-modal-overlay"
          onClick={() => setDetalheId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="historico-modal-titulo"
        >
          <div
            className="historico-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="historico-modal-header">
              <h2 id="historico-modal-titulo" className="historico-modal-titulo">
                {detalhe.id} · {detalhe.carteira} · {detalhe.tipo}
              </h2>
              <button
                type="button"
                className="historico-modal-fechar"
                onClick={() => setDetalheId(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="historico-modal-body">
              <pre className="historico-modal-texto">{detalhe.modelo_gerado}</pre>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
