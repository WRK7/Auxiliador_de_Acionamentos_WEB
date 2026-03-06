import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CARTEIRAS,
  TIPOS_POR_CARTEIRA,
  getCamposPara,
  getPrazoMaximo,
  isCampoObrigatorio,
  getTipoFormatacao,
} from '../data/config'
import { formatarDataEnquantoDigita, ddMmYyyyToYyyyMmDd, yyyyMmDdToDdMmYyyy } from '../utils/validators'
import {
  validarCampoComMensagem,
  aplicarFormatacaoAutomatica,
  limitarEntradaPorcentagem,
  validacaoCompletaParaGerar,
} from '../utils/fieldValidators'
import { isAdmin, isAdminSupremo, getUser } from '../utils/auth'
import { getDevedorFromInformacoes, getValorFromInformacoes } from '../data/mockHistorico'
import { apiBaseUrl } from '../api/config'
import Relogios from '../components/Relogios'
import './Dashboard.css'

const CARTEIRA_URANIA = 'ÁGUAS GUARIROBA'

export default function Dashboard() {
  const navigate = useNavigate()
  const [carteirasAtivas, setCarteirasAtivas] = useState([])
  const [carteira, setCarteira] = useState('')
  const [tipo, setTipo] = useState('')
  const [filtro, setFiltro] = useState('')
  const [valores, setValores] = useState({})
  const [errosCampos, setErrosCampos] = useState({})

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/carteiras`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const ativas = Array.isArray(data) ? data.filter((c) => c.ativo).map((c) => c.nome) : []
        setCarteirasAtivas(ativas)
      })
      .catch(() => setCarteirasAtivas([]))
  }, [])

  const carteirasDisponiveis = useMemo(() => {
    if (carteirasAtivas.length === 0) return CARTEIRAS
    return CARTEIRAS.filter((c) => carteirasAtivas.includes(c))
  }, [carteirasAtivas])

  const carteirasFiltradas = useMemo(() => {
    if (!filtro.trim()) return carteirasDisponiveis
    const q = filtro.trim().toLowerCase()
    return carteirasDisponiveis.filter((c) => c.toLowerCase().includes(q))
  }, [filtro, carteirasDisponiveis])

  const tiposDaCarteira = carteira ? (TIPOS_POR_CARTEIRA[carteira] || []) : []
  const campos = useMemo(() => getCamposPara(carteira, tipo), [carteira, tipo])
  const prazoMax = getPrazoMaximo(carteira)

  /** Campos de data que usam prazo máximo da carteira (hoje até hoje+N dias). Os demais campos data só exigem >= hoje. */
  const CAMPOS_DATA_COM_PRAZO = ['Data de Vencimento', 'Data de Pagamento', 'Vencimento Acordo']

  function getDataMinYyyyMmDd() {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }

  function getDataMaxYyyyMmDd() {
    const t = new Date()
    t.setDate(t.getDate() + prazoMax)
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }

  function selecionarCarteira(nomeCarteira) {
    setCarteira(nomeCarteira)
    setTipo('')
    setValores({})
    setErrosCampos({})
  }

  function selecionarTipo(nomeTipo) {
    setTipo(nomeTipo)
    setValores({})
    setErrosCampos({})
  }

  function setCampo(nome, valor) {
    setValores((prev) => ({ ...prev, [nome]: valor }))
  }

  function handleChangeCampo(nome, valorDigitado) {
    const tipoFmt = getTipoFormatacao(nome)
    const valor =
      tipoFmt === 'data' ? formatarDataEnquantoDigita(valorDigitado) : valorDigitado
    setCampo(nome, valor)
  }

  function handleBlur(nome) {
    const valor = valores[nome] ?? ''
    const formatado = aplicarFormatacaoAutomatica(nome, valor, carteira)
    if (formatado !== valor) setCampo(nome, formatado)
    const { ok, mensagem } = validarCampoComMensagem(nome, formatado || valor, carteira)
    setErrosCampos((prev) => (ok ? { ...prev, [nome]: '' } : { ...prev, [nome]: mensagem }))
  }

  function handleKeyDown(nome, e) {
    const tipoFmt = getTipoFormatacao(nome)
    if (tipoFmt === 'porcentagem' || tipoFmt === 'porcentagem_ampla') limitarEntradaPorcentagem(e)
  }

  function handleGerarModelo() {
    if (!carteira || !tipo) return
    const linhas = campos.map((c) => `${c}: ${valores[c] ?? ''}`)
    return linhas.join('\n')
  }

  const [modeloTexto, setModeloTexto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [toastCopiado, setToastCopiado] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')

  async function gerar() {
    if (!carteira || !tipo) return
    const { ok, erros } = validacaoCompletaParaGerar(campos, valores, carteira)
    if (!ok) {
      setModeloTexto('Erros de validação:\n\n' + erros.join('\n'))
      return
    }
    const texto = handleGerarModelo()
    setModeloTexto(texto)
    setErroSalvar('')

    const user = getUser()
    if (!user?.id) return

    try {
      const res = await fetch(`${apiBaseUrl}/api/acionamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-User-Perfil': user.perfil || '',
        },
        body: JSON.stringify({
          carteira,
          tipo,
          modelo_gerado: texto,
          informacoes: valores,
          devedor: getDevedorFromInformacoes(valores) || undefined,
          valor: (() => { const v = getValorFromInformacoes(valores); return (v && v !== '—' ? v : undefined) })(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErroSalvar(data.error || 'Não foi possível salvar no histórico.')
      }
    } catch (e) {
      setErroSalvar(e.message || 'Erro ao salvar no histórico.')
    }
  }

  function copiar() {
    if (!modeloTexto) return
    const concluir = () => {
      setCopiado(true)
      setToastCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
      setTimeout(() => setToastCopiado(false), 2800)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(modeloTexto).then(concluir).catch(() => copiarFallback())
    } else {
      copiarFallback()
    }
    function copiarFallback() {
      const el = document.createElement('textarea')
      el.value = modeloTexto
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try {
        document.execCommand('copy')
        concluir()
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  function limparTudo() {
    setCarteira('')
    setTipo('')
    setValores({})
    setErrosCampos({})
    setModeloTexto('')
    setFiltro('')
    setErroSalvar('')
  }

  return (
    <main className="dashboard-page" role="main">
      {toastCopiado && (
        <div className="dashboard-toast" role="status" aria-live="polite">
          <span className="dashboard-toast-icone" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>Copiado para a área de transferência!</span>
        </div>
      )}
      {/* Menu lateral: Gerar e Histórico no centro, Sair embaixo */}
      <aside className="dashboard-sidebar" aria-label="Menu principal">
        <div className="dashboard-menu-centro">
          <span className="dashboard-menu-quadro dashboard-menu-quadro--ativo" title="Gerar acionamento">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </span>
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
        {/* Passo 1: cards só com nome da carteira */}
        <div className="dashboard-cards-wrap">
          <h1 className="dashboard-titulo">Escolha a carteira</h1>
          <input
            type="text"
            className="dashboard-filtro"
            placeholder="Filtrar por carteira..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <div className="dashboard-cards">
            {carteirasFiltradas.map((c) => (
              <button
                key={c}
                type="button"
                className={`dashboard-card ${carteira === c ? 'dashboard-card--ativo' : ''}`}
                onClick={() => {
                  if (c === CARTEIRA_URANIA) {
                    navigate('/aguas-guariroba')
                    return
                  }
                  selecionarCarteira(c)
                }}
              >
                <span className="dashboard-card-nome">{c}</span>
              </button>
            ))}
          </div>
          {carteirasFiltradas.length === 0 && (
            <p className="dashboard-cards-vazio">Nenhuma carteira encontrada para &quot;{filtro}&quot;</p>
          )}
        </div>

        {/* Passo 2: escolher tipo de acionamento (quando carteira selecionada) */}
        {carteira && (
          <div className="dashboard-tipos-wrap">
            <h2 className="dashboard-subtitulo">Tipo de acionamento</h2>
            <div className="dashboard-tipos">
              {tiposDaCarteira.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`dashboard-card dashboard-card--tipo ${tipo === t ? 'dashboard-card--ativo' : ''}`}
                  onClick={() => selecionarTipo(t)}
                >
                  <span className="dashboard-card-nome">{t}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Passo 3: campos de preenchimento (quando carteira + tipo selecionados) */}
        {carteira && tipo && (
          <div className="dashboard-form-wrap">
            <div className="dashboard-form-header">
              <h2 className="dashboard-form-titulo">{carteira} · {tipo}</h2>
              <span className="dashboard-prazo-badge">Prazo venc.: {prazoMax} dias</span>
            </div>

            <section className="dashboard-campos">
              <div className="dashboard-campos-grid">
                {campos.map((nome) => {
                  const isCampoData = getTipoFormatacao(nome) === 'data'
                  const usaCalendario = isCampoData
                  const temPrazoMax = usaCalendario && CAMPOS_DATA_COM_PRAZO.includes(nome)
                  if (usaCalendario) {
                    const valueDate = ddMmYyyyToYyyyMmDd(valores[nome] ?? '')
                    return (
                      <label key={nome} className="dashboard-campo">
                        <span className="dashboard-campo-label">
                          {nome}
                          {isCampoObrigatorio(nome) && <span className="campo-obrigatorio"> *</span>}
                          {temPrazoMax && (
                            <span className="dashboard-campo-prazo-hint" title={`Máximo ${prazoMax} dias a partir de hoje`}>
                              {' '}(máx. {prazoMax} dias)
                            </span>
                          )}
                        </span>
                        <input
                          type="date"
                          className={`dashboard-input dashboard-input-date ${errosCampos[nome] ? 'dashboard-input--erro' : ''}`}
                          value={valueDate}
                          min={getDataMinYyyyMmDd()}
                          max={temPrazoMax ? getDataMaxYyyyMmDd() : undefined}
                          onChange={(e) => {
                            const ddMm = yyyyMmDdToDdMmYyyy(e.target.value)
                            setCampo(nome, ddMm)
                            if (ddMm) {
                              const { ok, mensagem } = validarCampoComMensagem(nome, ddMm, carteira)
                              setErrosCampos((prev) => (ok ? { ...prev, [nome]: '' } : { ...prev, [nome]: mensagem }))
                            } else {
                              setErrosCampos((prev) => ({ ...prev, [nome]: '' }))
                            }
                          }}
                          onBlur={() => handleBlur(nome)}
                          title={errosCampos[nome] || (temPrazoMax ? `Entre hoje e daqui a ${prazoMax} dias` : 'Selecione a data')}
                        />
                        {errosCampos[nome] && (
                          <span className="dashboard-campo-erro" role="alert">{errosCampos[nome]}</span>
                        )}
                      </label>
                    )
                  }
                  if (getTipoFormatacao(nome) === 'radio_sim_nao') {
                    return (
                      <div key={nome} className="dashboard-campo">
                        <span className="dashboard-campo-label">
                          {nome}
                          {isCampoObrigatorio(nome) && <span className="campo-obrigatorio"> *</span>}
                        </span>
                        <div className="dashboard-radio-group">
                          <label className="dashboard-radio-option">
                            <input type="radio" name={`radio-${nome}`} value="Sim" checked={valores[nome] === 'Sim'} onChange={() => setCampo(nome, 'Sim')} />
                            <span>Sim</span>
                          </label>
                          <label className="dashboard-radio-option">
                            <input type="radio" name={`radio-${nome}`} value="Não" checked={valores[nome] === 'Não'} onChange={() => setCampo(nome, 'Não')} />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <label key={nome} className="dashboard-campo">
                      <span className="dashboard-campo-label">
                        {nome}
                        {isCampoObrigatorio(nome) && <span className="campo-obrigatorio"> *</span>}
                      </span>
                      <input
                        type="text"
                        className={`dashboard-input ${errosCampos[nome] ? 'dashboard-input--erro' : ''}`}
                        placeholder={nome}
                        value={valores[nome] ?? ''}
                        onChange={(e) => handleChangeCampo(nome, e.target.value)}
                        onBlur={() => handleBlur(nome)}
                        onKeyDown={(e) => handleKeyDown(nome, e)}
                        title={errosCampos[nome] || undefined}
                      />
                      {errosCampos[nome] && (
                        <span className="dashboard-campo-erro" role="alert">{errosCampos[nome]}</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="dashboard-modelo">
              {erroSalvar && (
                <p className="dashboard-modelo-erro" role="alert">{erroSalvar}</p>
              )}
              <div className="dashboard-modelo-actions">
                <button type="button" className="dashboard-btn dashboard-btn-primary" onClick={gerar}>
                  Gerar modelo
                </button>
                <button
                  type="button"
                  className="dashboard-btn"
                  onClick={copiar}
                  disabled={!modeloTexto}
                  title="Copiar para a área de transferência"
                >
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
                <button type="button" className="dashboard-btn dashboard-btn-outline" onClick={limparTudo}>
                  Limpar
                </button>
              </div>
              <textarea
                className="dashboard-textarea"
                placeholder="Preencha os campos e clique em Gerar modelo."
                value={modeloTexto}
                readOnly
                rows={10}
              />
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
