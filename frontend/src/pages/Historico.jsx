import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CARTEIRAS, TIPOS_POR_CARTEIRA } from '../data/config'
import { getDevedorFromInformacoes, getValorFromInformacoes } from '../data/mockHistorico'
import { isAdmin, getUser, isAdminSupremo as isSupremo } from '../utils/auth'
import { apiBaseUrl } from '../api/config'
import Relogios from '../components/Relogios'
import ConfirmModal from '../components/ConfirmModal'
import './Dashboard.css'
import './Historico.css'

/** Hoje no formato YYYY-MM-DD (para input type="date"). */
function getHojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Historico() {
  const navigate = useNavigate()
  const user = getUser()
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroCarteira, setFiltroCarteira] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState(getHojeISO())
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [conciliadorId, setConciliadorId] = useState('')
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [conciliadores, setConciliadores] = useState([])
  const [carteirasAtivas, setCarteirasAtivas] = useState([])
  const [detalheId, setDetalheId] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/carteiras`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const ativas = Array.isArray(data) ? data.filter((c) => c.ativo).map((c) => c.nome) : []
        setCarteirasAtivas(ativas)
      })
      .catch(() => setCarteirasAtivas([]))
  }, [])

  async function carregarConciliadores() {
    if (!isAdmin()) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/usuarios`, {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) return
      const data = await res.json()
      setConciliadores(data.filter((u) => u.perfil === 'conciliador'))
    } catch {
      setConciliadores([])
    }
  }

  useEffect(() => {
    if (isAdmin()) carregarConciliadores()
  }, [])

  async function carregarAcionamentos() {
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
      if (filtroCarteira) params.set('carteira', filtroCarteira)
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroTexto.trim()) params.set('q', filtroTexto.trim())
      if (isAdmin() && conciliadorId !== '') params.set('usuario_id', conciliadorId)

      const agParams = new URLSearchParams()
      if (filtroDataInicio) agParams.set('dataInicio', filtroDataInicio)
      if (filtroDataFim) agParams.set('dataFim', filtroDataFim)
      if (filtroTexto.trim()) agParams.set('q', filtroTexto.trim())
      if (isAdmin() && conciliadorId !== '') agParams.set('usuario_id', conciliadorId)

      const isFilteringAG = !filtroCarteira || filtroCarteira === 'ÁGUAS GUARIROBA'
      const isFilteringRegular = !filtroCarteira || filtroCarteira !== 'ÁGUAS GUARIROBA'

      const safeFetch = (url, opts) =>
        fetch(url, opts)
          .then(async (r) => {
            const data = await r.json().catch(() => null)
            return r.ok && Array.isArray(data) ? data : []
          })
          .catch(() => [])

      const [regularData, agData] = await Promise.all([
        isFilteringRegular
          ? safeFetch(`${apiBaseUrl}/api/acionamentos?${params.toString()}`, { headers })
          : [],
        isFilteringAG && !filtroTipo
          ? safeFetch(`${apiBaseUrl}/api/aguas-guariroba?${agParams.toString()}`, { headers })
          : [],
      ])

      const regularList = regularData
      const agList = agData.map((a) => ({
        ...a,
        carteira: 'ÁGUAS GUARIROBA',
        tipo: a.tipo === 'a_vista' ? 'À Vista' : 'Parcelado',
        devedor: a.titular || '',
        valor: a.valor_negociado
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(a.valor_negociado)
          : '',
      }))

      const combined = [...regularList, ...agList].sort((a, b) => {
        const da = a.created_at || a.data_criacao || ''
        const db = b.created_at || b.data_criacao || ''
        return da > db ? -1 : da < db ? 1 : 0
      })

      setLista(combined)
    } catch (e) {
      setErro(e.message)
      setLista([])
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (user) carregarAcionamentos()
  }, [user?.id, filtroDataInicio, filtroDataFim, filtroCarteira, filtroTipo, filtroTexto, conciliadorId])

  function pedirConfirmacaoExclusao(item) {
    const codigo = item.codigo || item.id
    const descricao = `${codigo} — ${item.carteira || ''} — ${item.devedor || item.titular || ''}`
    setModal({
      mode: 'confirm',
      title: 'Excluir acionamento',
      message: `Tem certeza que deseja excluir?\n\n${descricao}\n\nEssa ação não pode ser desfeita.`,
      variant: 'danger',
      confirmLabel: 'Excluir',
      onConfirm: () => { setModal(null); executarExclusao(item) },
    })
  }

  async function executarExclusao(item) {
    const codigo = item.codigo || item.id
    const isAG = item.carteira === 'ÁGUAS GUARIROBA'
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': String(user.id),
        'X-User-Perfil': user.perfil || '',
      }
      const endpoint = isAG ? 'aguas-guariroba' : 'acionamentos'
      const res = await fetch(`${apiBaseUrl}/api/${endpoint}/${encodeURIComponent(codigo)}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setModal({ mode: 'alert', title: 'Erro', message: data.error || `Erro ao deletar (${res.status})`, variant: 'danger' })
        return
      }
      setLista((prev) => prev.filter((a) => String(a.codigo || a.id) !== String(codigo)))
      if (detalheId && String(detalheId) === String(codigo)) setDetalheId(null)
    } catch (err) {
      setModal({ mode: 'alert', title: 'Erro', message: err.message || 'Falha de conexão', variant: 'danger' })
    }
  }

  function podeExcluir(item) {
    if (isSupremo()) return true
    return item.usuario_id === user?.id
  }

  const tiposDisponiveis = useMemo(() => {
    if (filtroCarteira.trim()) {
      return TIPOS_POR_CARTEIRA[filtroCarteira.trim()] || []
    }
    return []
  }, [filtroCarteira])

  const detalhe = useMemo(() => {
    if (!detalheId) return null
    const id = String(detalheId)
    return lista.find((a) => String(a.id) === id || String(a.codigo) === id) || null
  }, [detalheId, lista])

  if (!user) {
    return null
  }

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
          <Link to="/aguas-guariroba" className="dashboard-menu-quadro" title="Águas Guariroba">
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
          {isSupremo() && (
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

      <div className="dashboard-conteudo historico-conteudo">
        <Relogios />
        <div className="historico-header">
          <h1 className="dashboard-titulo">Histórico de acionamentos</h1>
          <p className="historico-subtitulo">
            {isAdmin() ? 'Selecione um conciliador para ver os acionamentos dele ou "Todos".' : 'Seus acionamentos com filtros por data, carteira e tipo.'}
          </p>
        </div>

        {isAdmin() && (
          <div className="historico-filtro-conciliador">
            <label htmlFor="historico-conciliador" className="historico-filtro-conciliador-label">
              Ver acionamentos de:
            </label>
            <select
              id="historico-conciliador"
              className="historico-filtro-conciliador-select"
              value={conciliadorId}
              onChange={(e) => setConciliadorId(e.target.value)}
              aria-label="Conciliador"
            >
              <option value="">Todos</option>
              {conciliadores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.usuario})
                </option>
              ))}
            </select>
          </div>
        )}

        {erro && (
          <div className="historico-erro" role="alert">
            {erro}
          </div>
        )}

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
            {(carteirasAtivas.length > 0 ? CARTEIRAS.filter((c) => carteirasAtivas.includes(c)) : CARTEIRAS).map((c) => (
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
          {carregando ? (
            <p className="historico-carregando">Carregando...</p>
          ) : (
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
                    <tr key={a.codigo || a.id}>
                      <td className="historico-id">{a.codigo || a.id}</td>
                      <td className="historico-data">{a.data_criacao}</td>
                      <td>{a.carteira}</td>
                      <td>{a.tipo}</td>
                      <td>{a.devedor || getDevedorFromInformacoes(a.informacoes || {})}</td>
                      <td>{a.valor || getValorFromInformacoes(a.informacoes || {})}</td>
                      <td>{a.usuario}</td>
                      <td className="historico-acoes">
                        <button
                          type="button"
                          className="historico-btn-detalhe"
                          onClick={() => setDetalheId(String(a.codigo || a.id))}
                          title="Ver detalhes"
                        >
                          Ver detalhes
                        </button>
                        {podeExcluir(a) && (
                          <button
                            type="button"
                            className="historico-btn-deletar"
                            onClick={() => pedirConfirmacaoExclusao(a)}
                            title="Excluir"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detalhe && (
        <div
          className="historico-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="historico-modal-titulo"
        >
          <div className="historico-modal">
            <div className="historico-modal-header">
              <h2 id="historico-modal-titulo" className="historico-modal-titulo">
                {detalhe.codigo || detalhe.id} · {detalhe.carteira || ''} · {detalhe.tipo || ''}
              </h2>
              <div className="historico-modal-header-actions">
                {podeExcluir(detalhe) && (
                  <button
                    type="button"
                    className="historico-btn-deletar"
                    onClick={() => pedirConfirmacaoExclusao(detalhe)}
                    title="Excluir este acionamento"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className="historico-modal-fechar"
                  onClick={() => setDetalheId(null)}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="historico-modal-body">
              {detalhe.modelo_gerado ? (
                <pre className="historico-modal-texto">{detalhe.modelo_gerado}</pre>
              ) : detalhe.carteira === 'ÁGUAS GUARIROBA' ? (
                <div className="historico-modal-campos">
                  <p><strong>Código:</strong> {detalhe.codigo}</p>
                  <p><strong>Titular:</strong> {detalhe.titular || '-'}</p>
                  <p><strong>Documento:</strong> {detalhe.documento_tipo?.toUpperCase()} {detalhe.documento_numero || '-'}</p>
                  <p><strong>Matrícula:</strong> {detalhe.matricula_situacao === 'ativa' ? 'Ativa' : 'Inativa'} — {detalhe.matricula_numero || '-'}</p>
                  <p><strong>Valor Original:</strong> {detalhe.valor_debito != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detalhe.valor_debito) : '-'}</p>
                  <p><strong>Dias em Atraso:</strong> {detalhe.dias_atraso ?? '-'}</p>
                  <p><strong>Desconto:</strong> {detalhe.desconto_percentual != null ? `${detalhe.desconto_percentual}%` : '-'}</p>
                  <p><strong>Valor Atualizado:</strong> {detalhe.valor_atualizado != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detalhe.valor_atualizado) : '-'}</p>
                  <p><strong>Valor Negociado:</strong> {detalhe.valor_negociado != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detalhe.valor_negociado) : '-'}</p>
                  {detalhe.tipo === 'À Vista' || detalhe.tipo === 'a_vista' ? null : (
                    <>
                      <p><strong>Entrada:</strong> {detalhe.valor_entrada != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detalhe.valor_entrada) : '-'}</p>
                      <p><strong>Parcelas:</strong> {detalhe.numero_parcelas ? `${detalhe.numero_parcelas}x` : '-'}</p>
                      <p><strong>Valor Parcela:</strong> {detalhe.valor_parcela != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(detalhe.valor_parcela) : '-'}</p>
                    </>
                  )}
                  <p><strong>Vencimento:</strong> {detalhe.vencimento ? new Date(detalhe.vencimento).toLocaleDateString('pt-BR') : '-'}</p>
                  <p><strong>Contato:</strong> {detalhe.contato || '-'}</p>
                  <p><strong>Usuário:</strong> {detalhe.usuario || '-'}</p>
                  <p><strong>Data:</strong> {detalhe.data_criacao || '-'}</p>
                </div>
              ) : (
                <pre className="historico-modal-texto">{`Código: ${detalhe.codigo || detalhe.id}\nCarteira: ${detalhe.carteira || ''}\nTipo: ${detalhe.tipo || ''}\nData: ${detalhe.data_criacao || ''}`}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!modal}
        title={modal?.title || ''}
        message={modal?.message || ''}
        mode={modal?.mode || 'alert'}
        variant={modal?.variant || 'default'}
        confirmLabel={modal?.confirmLabel || 'OK'}
        onConfirm={modal?.onConfirm || (() => setModal(null))}
        onCancel={() => setModal(null)}
      />
    </main>
  )
}
