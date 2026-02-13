import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CARTEIRAS,
  TIPOS_POR_CARTEIRA,
  getCamposPara,
  getPrazoMaximo,
  isCampoObrigatorio,
  getTipoFormatacao,
} from '../data/config'
import { formatarDataEnquantoDigita } from '../utils/validators'
import {
  validarCampoComMensagem,
  aplicarFormatacaoAutomatica,
  limitarEntradaPorcentagem,
  validacaoCompletaParaGerar,
} from '../utils/fieldValidators'
import Relogios from '../components/Relogios'
import './Dashboard.css'

export default function Dashboard() {
  const [carteira, setCarteira] = useState('')
  const [tipo, setTipo] = useState('')
  const [filtro, setFiltro] = useState('')
  const [valores, setValores] = useState({})
  const [errosCampos, setErrosCampos] = useState({})

  const carteirasFiltradas = useMemo(() => {
    if (!filtro.trim()) return CARTEIRAS
    const q = filtro.trim().toLowerCase()
    return CARTEIRAS.filter((c) => c.toLowerCase().includes(q))
  }, [filtro])

  const tiposDaCarteira = carteira ? (TIPOS_POR_CARTEIRA[carteira] || []) : []
  const campos = useMemo(() => getCamposPara(carteira, tipo), [carteira, tipo])
  const prazoMax = getPrazoMaximo(carteira)

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
    const formatado = aplicarFormatacaoAutomatica(nome, valor)
    if (formatado !== valor) setCampo(nome, formatado)
    const { ok, mensagem } = validarCampoComMensagem(nome, formatado || valor, carteira)
    setErrosCampos((prev) => (ok ? { ...prev, [nome]: '' } : { ...prev, [nome]: mensagem }))
  }

  function handleKeyDown(nome, e) {
    const tipoFmt = getTipoFormatacao(nome)
    if (tipoFmt === 'porcentagem') limitarEntradaPorcentagem(e)
  }

  function handleGerarModelo() {
    if (!carteira || !tipo) return
    const linhas = campos.map((c) => `${c}: ${valores[c] ?? ''}`)
    return linhas.join('\n')
  }

  const [modeloTexto, setModeloTexto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [toastCopiado, setToastCopiado] = useState(false)

  function gerar() {
    if (!carteira || !tipo) return
    const { ok, erros } = validacaoCompletaParaGerar(campos, valores, carteira)
    if (!ok) {
      setModeloTexto('Erros de validação:\n\n' + erros.join('\n'))
      return
    }
    setModeloTexto(handleGerarModelo())
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
          <Link to="/usuarios" className="dashboard-menu-quadro" title="Usuários">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </Link>
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
                onClick={() => selecionarCarteira(c)}
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
                {campos.map((nome) => (
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
                ))}
              </div>
            </section>

            <section className="dashboard-modelo">
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
