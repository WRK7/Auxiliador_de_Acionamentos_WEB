import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { validarCPF, validarCNPJ, formatarCpfCnpj, soDigitos } from '../utils/validators'
import { getUser, isAdmin, isAdminSupremo } from '../utils/auth'
import { apiBaseUrl } from '../api/config'
import Relogios from '../components/Relogios'
import ConfirmModal from '../components/ConfirmModal'
import './Dashboard.css'
import './AguasGuariroba.css'

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const parseMoney = (str) => {
  if (!str || !str.trim()) return 0
  const n = parseFloat(String(str).replace(/\D/g, '').replace(/(\d+)(\d{2})$/, '$1.$2')) / 100
  return Number.isNaN(n) ? 0 : n
}

function getMaxDiscountCash(days) {
  if (days <= 120) return 0
  if (days <= 180) return 15
  if (days <= 365) return 30
  if (days <= 730) return 50
  if (days <= 1095) return 60
  if (days <= 1460) return 70
  if (days <= 1825) return 80
  return 95
}

function getMaxDiscountInstallment(days) {
  if (days <= 180) return 0
  if (days <= 365) return 10
  if (days <= 730) return 25
  if (days <= 1095) return 35
  if (days <= 1460) return 45
  if (days <= 1825) return 55
  return 75
}

function suggestDiscountCash(days) { return getMaxDiscountCash(days) }
function suggestDiscountInstallment(days) { return getMaxDiscountInstallment(days) }

function getMaxInstallments(days) {
  if (days <= 90) return 24
  if (days <= 180) return 36
  if (days <= 365) return 48
  return 60
}

function getTodayYMD() { return new Date().toISOString().slice(0, 10) }
function getMaxDateYMD() { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().slice(0, 10) }
function ymdToDDMMYYYY(ymd) { if (!ymd) return ''; const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}` }

const MAX_DAYS = 14600
const MAX_DEBIT = 1e9
const STORAGE_PREFIX = 'ag_calc_tabs_'
const MAX_TABS = 10

function makeDefaultTab(num) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    num,
    screen: 'initial',
    debitInput: '', daysInput: '', debitValue: 0, daysOverdue: 0,
    discountCash: 0, discountInstallment: 0,
    matriculationStatus: 'ativa', matriculationNumber: '',
    documentType: 'cpf', documentNumber: '', holderName: '',
    updatedValue: '', negotiatedValue: '', dueDateYmd: '', contactMethod: '',
    instMatriculationStatus: 'ativa', instMatriculationNumber: '',
    instDocumentType: 'cpf', instDocumentNumber: '', instHolderName: '',
    instUpdatedValue: '', entryValue: '', installmentCount: 2,
    instDueDateYmd: '', instContactMethod: '', instNegotiatedValue: '',
    salvarStatus: '',
    salvarErro: '',
  }
}

function loadTabs(userId) {
  const key = STORAGE_PREFIX + (userId || 'anon')
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.tabs?.length) {
        const tabs = parsed.tabs.slice(0, MAX_TABS)
        const activeId = tabs.find((t) => t.id === parsed.activeId) ? parsed.activeId : tabs[0].id
        return { ...parsed, tabs, activeId }
      }
    }
  } catch { /* ignore */ }
  const first = makeDefaultTab(1)
  return { tabs: [first], activeId: first.id, nextNum: 2 }
}

function saveTabs(state, userId) {
  const key = STORAGE_PREFIX + (userId || 'anon')
  try { sessionStorage.setItem(key, JSON.stringify(state)) } catch { /* ignore */ }
}

const formatMoneyInput = (raw) => {
  const v = String(raw).replace(/\D/g, '')
  if (!v) return ''
  const n = parseFloat(v) / 100
  if (n > MAX_DEBIT) return MAX_DEBIT.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTabLabel(tab) {
  const name = tab.screen === 'installment' || tab.screen === 'action'
    ? (tab.holderName || tab.instHolderName || '').trim()
    : ''
  if (name) return name.length > 15 ? name.slice(0, 15) + '...' : name
  return `Calc ${tab.num}`
}

// ---------- Sub-component: one calculator instance ----------

function CalculadoraInstance({ tab, onChange, user }) {
  const t = tab
  const set = (field, value) => onChange(tab.id, field, value)
  const setMulti = (updates) => onChange(tab.id, updates)
  const [modal, setModal] = useState(null)
  const showAlert = (title, message, variant = 'warning') =>
    setModal({ mode: 'alert', title, message, variant })

  const docIsComplete = (val, type) => soDigitos(val).length === (type === 'cpf' ? 11 : 14)
  const docIsValid = (val, type) => type === 'cpf' ? validarCPF(val) : validarCNPJ(val)
  const getDocValidationClass = (val, type) => {
    if (!val || soDigitos(val).length < 4) return ''
    if (!docIsComplete(val, type)) return 'ag-input-typing'
    return docIsValid(val, type) ? 'ag-input-valid' : 'ag-input-invalid'
  }

  const finalValueCash = t.debitValue - (t.debitValue * t.discountCash) / 100
  const finalValueInstallment = t.debitValue - (t.debitValue * t.discountInstallment) / 100
  const minEntry = finalValueInstallment * 0.1
  const suggestedEntry = finalValueInstallment * 0.3
  const entryNum = parseMoney(t.entryValue)
  const instNegotiatedNum = parseMoney(t.instNegotiatedValue) || finalValueInstallment
  const parcelValue = entryNum > 0 && t.installmentCount > 0 && instNegotiatedNum > entryNum
    ? (instNegotiatedNum - entryNum) / t.installmentCount : 0

  const maxInstallments = getMaxInstallments(t.daysOverdue)
  const installmentOptions = []
  for (let i = 2; i <= maxInstallments; i += 2) installmentOptions.push(i)

  const goDiscount = () => {
    const debit = parseMoney(t.debitInput)
    const days = parseInt(t.daysInput, 10) || 0
    if (debit <= 0) { showAlert('Valor inválido', 'Por favor, insira um valor de débito válido.'); return }
    const sug = Math.min(getMaxDiscountCash(days), suggestDiscountCash(days))
    setMulti({ debitValue: debit, daysOverdue: days, discountCash: sug, screen: 'discount' })
  }

  const goInstallment = () => {
    const debit = parseMoney(t.debitInput)
    const days = parseInt(t.daysInput, 10) || 0
    if (debit <= 0) { showAlert('Valor inválido', 'Por favor, insira um valor de débito válido.'); return }
    const sug = Math.min(getMaxDiscountInstallment(days), suggestDiscountInstallment(days))
    const finalVal = debit - (debit * sug) / 100
    setMulti({
      debitValue: debit, daysOverdue: days, discountInstallment: sug,
      entryValue: (finalVal * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      instNegotiatedValue: finalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      screen: 'installment',
    })
  }

  const goAction = () => {
    setMulti({
      negotiatedValue: finalValueCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      screen: 'action',
    })
  }

  const validateActionFields = () => {
    const required = [t.matriculationNumber.trim(), t.documentNumber.trim(), t.holderName.trim(),
      t.updatedValue.trim(), t.negotiatedValue.trim(), t.dueDateYmd, t.contactMethod.trim()]
    if (required.some((r) => !r)) { showAlert('Campos obrigatórios', 'Por favor, preencha todos os campos obrigatórios.'); return false }
    if (!(t.documentType === 'cpf' ? validarCPF(t.documentNumber) : validarCNPJ(t.documentNumber))) {
      showAlert('Documento inválido', `${t.documentType.toUpperCase()} inválido. Verifique.`); return false
    }
    return true
  }

  const validateInstallmentFields = () => {
    const required = [t.instMatriculationNumber.trim(), t.instDocumentNumber.trim(), t.instHolderName.trim(),
      t.instUpdatedValue.trim(), t.instNegotiatedValue.trim(), t.entryValue.trim(),
      t.installmentCount >= 2, t.instDueDateYmd, t.instContactMethod.trim()]
    if (required.some((r) => !r)) { showAlert('Campos obrigatórios', 'Por favor, preencha todos os campos obrigatórios.'); return false }
    if (!(t.instDocumentType === 'cpf' ? validarCPF(t.instDocumentNumber) : validarCNPJ(t.instDocumentNumber))) {
      showAlert('Documento inválido', `${t.instDocumentType.toUpperCase()} inválido. Verifique.`); return false
    }
    return true
  }

  const generateActionText = () => {
    const matText = t.matriculationStatus === 'ativa' ? 'MATRICULA ATIVA' : 'MATRICULA INATIVA'
    return `PORTES ADV. ASSESSORIA DE COBRANCA
UNIDADE: AGUAS GUARIROBA
TITULAR: ${t.holderName.toUpperCase()}
${t.documentType.toUpperCase()}: ${t.documentNumber}
${matText}: ${t.matriculationNumber}
VALOR ORIGINAL: ${formatCurrency(t.debitValue)}
DESCONTO: ${t.discountCash}%
VALOR ATUALIZADO: ${formatCurrency(parseMoney(t.updatedValue))}
VALOR NEGOCIADO: ${formatCurrency(parseMoney(t.negotiatedValue))}
VENCIMENTO: ${ymdToDDMMYYYY(t.dueDateYmd)}
ENVIAR PELO WHATS/E-MAIL: ${t.contactMethod}`
  }

  const generateInstallmentActionText = () => {
    const matText = t.instMatriculationStatus === 'ativa' ? 'MATRICULA ATIVA' : 'MATRICULA INATIVA'
    return `PORTES ADV. ASSESSORIA DE COBRANCA
UNIDADE: AGUAS GUARIROBA
TITULAR: ${t.instHolderName.toUpperCase()}
${t.instDocumentType.toUpperCase()}: ${t.instDocumentNumber}
${matText}: ${t.instMatriculationNumber}
VALOR ORIGINAL: ${formatCurrency(t.debitValue)}
DESCONTO: ${t.discountInstallment}%
VALOR ATUALIZADO: ${formatCurrency(parseMoney(t.instUpdatedValue))}
VALOR NEGOCIADO: ${formatCurrency(parseMoney(t.instNegotiatedValue))}
ENTRADA: ${formatCurrency(entryNum)}
NUMERO DE PARCELAS: ${t.installmentCount}x
VALOR DA PARCELA: ${formatCurrency(parcelValue)}
VENCIMENTO: ${ymdToDDMMYYYY(t.instDueDateYmd)}
ENVIAR PELO WHATS/E-MAIL: ${t.instContactMethod}`
  }

  const copyToClipboard = (text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
  }
  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea')
    ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px'
    document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy') } catch { /* noop */ }
    document.body.removeChild(ta)
  }

  async function copiarESalvar() {
    if (t.screen === 'action') {
      if (!validateActionFields()) return
      copyToClipboard(generateActionText())
    } else if (t.screen === 'installment') {
      if (!validateInstallmentFields()) return
      copyToClipboard(generateInstallmentActionText())
    } else { return }

    if (!user?.id) {
      showAlert('Sessão expirada', 'Sessão inválida. Faça login novamente.', 'danger')
      return
    }

    set('salvarStatus', 'salvando')
    set('salvarErro', '')
    try {
      const body = t.screen === 'action'
        ? {
            tipo: 'a_vista', valorDebito: t.debitValue, diasAtraso: t.daysOverdue,
            descontoPercentual: t.discountCash,
            valorAtualizado: parseMoney(t.updatedValue) || null,
            valorNegociado: parseMoney(t.negotiatedValue) || null,
            matriculaSituacao: t.matriculationStatus, matriculaNumero: t.matriculationNumber.trim() || null,
            documentoTipo: t.documentType, documentoNumero: t.documentNumber.trim() || null,
            titular: t.holderName.trim() || null, vencimento: t.dueDateYmd || null,
            contato: t.contactMethod.trim() || null, modeloGerado: generateActionText(),
          }
        : {
            tipo: 'parcelado', valorDebito: t.debitValue, diasAtraso: t.daysOverdue,
            descontoPercentual: t.discountInstallment,
            valorAtualizado: parseMoney(t.instUpdatedValue) || null,
            valorNegociado: parseMoney(t.instNegotiatedValue) || null,
            matriculaSituacao: t.instMatriculationStatus, matriculaNumero: t.instMatriculationNumber.trim() || null,
            documentoTipo: t.instDocumentType, documentoNumero: t.instDocumentNumber.trim() || null,
            titular: t.instHolderName.trim() || null, vencimento: t.instDueDateYmd || null,
            contato: t.instContactMethod.trim() || null,
            valorEntrada: entryNum || null, numeroParcelas: t.installmentCount || null,
            valorParcela: parcelValue || null, modeloGerado: generateInstallmentActionText(),
          }
      const res = await fetch(`${apiBaseUrl}/api/aguas-guariroba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(user.id), 'X-User-Perfil': user.perfil || '' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Falha ao salvar (${res.status})`)
      set('salvarStatus', 'ok')
      set('salvarErro', '')
      setTimeout(() => { set('salvarStatus', ''); set('salvarErro', '') }, 3000)
    } catch (err) {
      const msg = err.message || 'Erro ao salvar. Verifique se o backend está rodando em localhost:3089.'
      set('salvarStatus', 'erro')
      set('salvarErro', msg)
      setTimeout(() => { set('salvarStatus', ''); set('salvarErro', '') }, 5000)
      showAlert('Erro ao salvar', msg, 'danger')
    }
  }

  const radioPrefix = `tab-${t.id}`

  return (
    <div className="ag-container">
      {t.screen === 'initial' && (
        <div className="ag-screen ag-screen-active ag-screen--initial">
          <div className="ag-header">
            <h1 className="ag-project-name">Urania</h1>
            <p className="ag-project-desc">Calculadora e Acionador da Águas Guariroba</p>
          </div>
          <div className="ag-initial-row">
            <div className="ag-input-group">
              <label>Valor do Débito (R$)</label>
              <input type="text" value={t.debitInput} onChange={(e) => set('debitInput', formatMoneyInput(e.target.value))} placeholder="0,00" />
            </div>
            <div className="ag-input-group">
              <label>Dias em Atraso</label>
              <input type="number" value={t.daysInput} onChange={(e) => {
                let v = parseInt(e.target.value, 10) || 0
                if (v < 0) v = 0; if (v > MAX_DAYS) v = MAX_DAYS
                setMulti({ daysInput: String(v), daysOverdue: v })
              }} placeholder="0" min={0} max={MAX_DAYS} />
            </div>
          </div>
          <div className="ag-button-group">
            <button type="button" className="ag-btn ag-btn-primary" onClick={goDiscount}>À Vista</button>
            <button type="button" className="ag-btn ag-btn-secondary" onClick={goInstallment}>Parcelado</button>
          </div>
        </div>
      )}

      {t.screen === 'discount' && (
        <div className="ag-screen ag-screen-active ag-screen--mid">
          <div className="ag-header">
            <h1 className="ag-project-name">Urania</h1>
            <p className="ag-project-desc">Calculadora e Acionador da Águas Guariroba</p>
          </div>
          <div className="ag-panel-grid">
            <div className="ag-panel ag-panel--data">
              <div className="ag-panel-title">Dados do Débito</div>
              <div className="ag-info-display">
                <div className="ag-info-item"><h3>Valor do Débito</h3><p>{formatCurrency(t.debitValue)}</p></div>
                <div className="ag-info-item"><h3>Dias de Atraso</h3><p>{t.daysOverdue} dias</p></div>
              </div>
            </div>
            <div className="ag-panel ag-panel--client">
              <div className="ag-panel-title">Desconto À Vista</div>
              <div className="ag-discount-control">
                <h3>Desconto: {t.discountCash}%</h3>
                <input type="range" className="ag-slider" min={0} max={getMaxDiscountCash(t.daysOverdue)} value={t.discountCash} onChange={(e) => set('discountCash', Number(e.target.value))} />
              </div>
              <div className="ag-calculation-results">
                <div className="ag-result-item"><span>Valor a pagar:</span><span>{formatCurrency(t.debitValue - (t.debitValue * t.discountCash) / 100)}</span></div>
                <div className="ag-result-item"><span>Economia:</span><span>{formatCurrency((t.debitValue * t.discountCash) / 100)}</span></div>
              </div>
            </div>
          </div>
          <div className="ag-panel-actions">
            <button type="button" className="ag-btn ag-btn-back" onClick={() => set('screen', 'initial')}>Voltar</button>
            <button type="button" className="ag-btn ag-btn-action" onClick={goAction}>Acionamento</button>
          </div>
        </div>
      )}

      {t.screen === 'action' && (
        <div className="ag-screen ag-screen-active ag-screen--wide">
          <div className="ag-header">
            <h1 className="ag-project-name">Urania</h1>
            <p className="ag-project-desc">Calculadora e Acionador da Águas Guariroba</p>
          </div>
          <div className="ag-panel-grid ag-panel-grid--action">
            <div className="ag-panel ag-panel--data">
              <div className="ag-panel-title">Resumo da Negociação</div>
              <div className="ag-info-display ag-info-display--stack">
                <div className="ag-info-item"><h3>Valor Original</h3><p>{formatCurrency(t.debitValue)}</p></div>
                <div className="ag-info-item"><h3>Desconto</h3><p>{t.discountCash}%</p></div>
                <div className="ag-info-item ag-info-item--accent"><h3>Valor Proposto</h3><p>{formatCurrency(finalValueCash)}</p></div>
                <div className="ag-info-item"><h3>Economia</h3><p>{formatCurrency((t.debitValue * t.discountCash) / 100)}</p></div>
              </div>
            </div>
            <div className="ag-panel ag-panel--client">
              <div className="ag-panel-title">Dados do Cliente</div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Situação da Matrícula</label>
                  <select className="ag-select" value={t.matriculationStatus} onChange={(e) => set('matriculationStatus', e.target.value)}>
                    <option value="ativa">Ativa</option><option value="inativa">Inativa</option>
                  </select>
                </div>
                <div className="ag-input-group"><label>Número da Matrícula</label><input type="text" value={t.matriculationNumber} onChange={(e) => set('matriculationNumber', e.target.value)} placeholder="Número da matrícula" /></div>
              </div>
              <div className="ag-radio-group">
                <span className="ag-radio-label">Tipo de Documento</span>
                <div className="ag-radio-options">
                  <label className="ag-radio-option"><input type="radio" name={`${radioPrefix}-doc`} value="cpf" checked={t.documentType === 'cpf'} onChange={() => setMulti({ documentType: 'cpf', documentNumber: '' })} /><span>CPF</span></label>
                  <label className="ag-radio-option"><input type="radio" name={`${radioPrefix}-doc`} value="cnpj" checked={t.documentType === 'cnpj'} onChange={() => setMulti({ documentType: 'cnpj', documentNumber: '' })} /><span>CNPJ</span></label>
                </div>
              </div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>{t.documentType.toUpperCase()}</label>
                  <input type="text" className={getDocValidationClass(t.documentNumber, t.documentType)} value={t.documentNumber} onChange={(e) => set('documentNumber', formatarCpfCnpj(e.target.value))} placeholder={t.documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} maxLength={t.documentType === 'cpf' ? 14 : 18} />
                  {docIsComplete(t.documentNumber, t.documentType) && !docIsValid(t.documentNumber, t.documentType) && <span className="ag-doc-error">{t.documentType.toUpperCase()} inválido</span>}
                </div>
                <div className="ag-input-group"><label>Titular</label><input type="text" value={t.holderName} onChange={(e) => set('holderName', e.target.value)} placeholder="Nome do titular" /></div>
              </div>
              <div className="ag-panel-title" style={{marginTop: 12}}>Valores e Envio</div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Valor Atualizado (R$)</label><input type="text" value={t.updatedValue} onChange={(e) => set('updatedValue', formatMoneyInput(e.target.value))} placeholder="0,00" /></div>
                <div className="ag-input-group"><label>Valor Negociado (R$)</label><input type="text" value={t.negotiatedValue} onChange={(e) => set('negotiatedValue', formatMoneyInput(e.target.value))} placeholder="0,00" /></div>
              </div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Vencimento</label><input type="date" value={t.dueDateYmd} onChange={(e) => set('dueDateYmd', e.target.value)} min={getTodayYMD()} max={getMaxDateYMD()} /></div>
                <div className="ag-input-group"><label>WhatsApp/E-mail</label><input type="text" value={t.contactMethod} onChange={(e) => set('contactMethod', e.target.value)} placeholder="WhatsApp ou e-mail" /></div>
              </div>
            </div>
          </div>
          <div className="ag-panel-actions">
            <button type="button" className="ag-btn ag-btn-back" onClick={() => set('screen', 'discount')}>Voltar</button>
            <button type="button" className={`ag-btn ag-btn-action${t.salvarStatus === 'ok' ? ' ag-btn-action--ok' : t.salvarStatus === 'erro' ? ' ag-btn-action--erro' : ''}`} onClick={copiarESalvar} disabled={t.salvarStatus === 'salvando'}>
              {t.salvarStatus === 'salvando' ? 'Salvando...' : t.salvarStatus === 'ok' ? '✓ Copiado e Salvo!' : 'Copiar Acionamento'}
            </button>
          </div>
          {t.salvarStatus === 'ok' && <div className="ag-toast">Acionamento copiado e salvo com sucesso!</div>}
          {t.salvarErro && <p className="ag-salvar-erro">{t.salvarErro}</p>}
        </div>
      )}

      {t.screen === 'installment' && (
        <div className="ag-screen ag-screen-active ag-screen--wide">
          <div className="ag-header">
            <h1 className="ag-project-name">Urania</h1>
            <p className="ag-project-desc">Calculadora e Acionador da Águas Guariroba</p>
          </div>
          <div className="ag-panel-grid ag-panel-grid--3">
            <div className="ag-panel ag-panel--data">
              <div className="ag-panel-title">Resumo da Negociação</div>
              <div className="ag-info-display">
                <div className="ag-info-item"><h3>Valor do Débito</h3><p>{formatCurrency(t.debitValue)}</p></div>
                <div className="ag-info-item"><h3>Dias de Atraso</h3><p>{t.daysOverdue}</p></div>
              </div>
              <div className="ag-discount-control">
                <h3>Desconto: {t.discountInstallment}%</h3>
                <input type="range" className="ag-slider" min={0} max={getMaxDiscountInstallment(t.daysOverdue)} value={t.discountInstallment} onChange={(e) => set('discountInstallment', Number(e.target.value))} />
              </div>
              <div className="ag-calculation-results">
                <div className="ag-result-item"><span>Valor a pagar:</span><span>{formatCurrency(finalValueInstallment)}</span></div>
                <div className="ag-result-item"><span>Desconto:</span><span>{formatCurrency((t.debitValue * t.discountInstallment) / 100)}</span></div>
                <div className="ag-result-item"><span>Entrada mín. 10%:</span><span>{formatCurrency(minEntry)}</span></div>
                <div className="ag-result-item"><span>Entrada sug. 30%:</span><span>{formatCurrency(suggestedEntry)}</span></div>
              </div>
            </div>
            <div className="ag-panel ag-panel--parcelas">
              <div className="ag-panel-title">Parcelamento</div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Valor da Entrada</label><input type="text" value={t.entryValue} onChange={(e) => set('entryValue', formatMoneyInput(e.target.value))} placeholder="0,00" /></div>
                <div className="ag-input-group"><label>Parcelas</label>
                  <select className="ag-select" value={t.installmentCount} onChange={(e) => set('installmentCount', Number(e.target.value))}>
                    {installmentOptions.map((n) => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              </div>
              <div className="ag-result-item ag-result-highlight"><span>Valor da parcela:</span><span>{formatCurrency(parcelValue)}</span></div>
              <div className="ag-panel-title" style={{marginTop: 16}}>Valores</div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Valor Atualizado (R$)</label><input type="text" value={t.instUpdatedValue} onChange={(e) => set('instUpdatedValue', formatMoneyInput(e.target.value))} placeholder="0,00" /></div>
                <div className="ag-input-group"><label>Valor Negociado (R$)</label><input type="text" value={t.instNegotiatedValue} onChange={(e) => set('instNegotiatedValue', formatMoneyInput(e.target.value))} placeholder="0,00" /></div>
              </div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Vencimento</label><input type="date" value={t.instDueDateYmd} onChange={(e) => set('instDueDateYmd', e.target.value)} min={getTodayYMD()} max={getMaxDateYMD()} /></div>
                <div className="ag-input-group"><label>Enviar pelo WhatsApp/E-mail</label><input type="text" value={t.instContactMethod} onChange={(e) => set('instContactMethod', e.target.value)} placeholder="WhatsApp ou e-mail" /></div>
              </div>
            </div>
            <div className="ag-panel ag-panel--client">
              <div className="ag-panel-title">Dados do Cliente</div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>Situação da Matrícula</label>
                  <select className="ag-select" value={t.instMatriculationStatus} onChange={(e) => set('instMatriculationStatus', e.target.value)}>
                    <option value="ativa">Ativa</option><option value="inativa">Inativa</option>
                  </select>
                </div>
                <div className="ag-input-group"><label>Número da Matrícula</label><input type="text" value={t.instMatriculationNumber} onChange={(e) => set('instMatriculationNumber', e.target.value)} placeholder="Número da matrícula" /></div>
              </div>
              <div className="ag-radio-group">
                <span className="ag-radio-label">Tipo de Documento</span>
                <div className="ag-radio-options">
                  <label className="ag-radio-option"><input type="radio" name={`${radioPrefix}-inst-doc`} value="cpf" checked={t.instDocumentType === 'cpf'} onChange={() => setMulti({ instDocumentType: 'cpf', instDocumentNumber: '' })} /><span>CPF</span></label>
                  <label className="ag-radio-option"><input type="radio" name={`${radioPrefix}-inst-doc`} value="cnpj" checked={t.instDocumentType === 'cnpj'} onChange={() => setMulti({ instDocumentType: 'cnpj', instDocumentNumber: '' })} /><span>CNPJ</span></label>
                </div>
              </div>
              <div className="ag-form-row">
                <div className="ag-input-group"><label>{t.instDocumentType.toUpperCase()}</label>
                  <input type="text" className={getDocValidationClass(t.instDocumentNumber, t.instDocumentType)} value={t.instDocumentNumber} onChange={(e) => set('instDocumentNumber', formatarCpfCnpj(e.target.value))} placeholder={t.instDocumentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} maxLength={t.instDocumentType === 'cpf' ? 14 : 18} />
                  {docIsComplete(t.instDocumentNumber, t.instDocumentType) && !docIsValid(t.instDocumentNumber, t.instDocumentType) && <span className="ag-doc-error">{t.instDocumentType.toUpperCase()} inválido</span>}
                </div>
                <div className="ag-input-group"><label>Titular</label><input type="text" value={t.instHolderName} onChange={(e) => set('instHolderName', e.target.value)} placeholder="Nome do titular" /></div>
              </div>
            </div>
          </div>
          <div className="ag-panel-actions">
            <button type="button" className="ag-btn ag-btn-back" onClick={() => set('screen', 'initial')}>Voltar</button>
            <button type="button" className={`ag-btn ag-btn-action${t.salvarStatus === 'ok' ? ' ag-btn-action--ok' : t.salvarStatus === 'erro' ? ' ag-btn-action--erro' : ''}`} onClick={copiarESalvar} disabled={t.salvarStatus === 'salvando'}>
              {t.salvarStatus === 'salvando' ? 'Salvando...' : t.salvarStatus === 'ok' ? '✓ Copiado e Salvo!' : 'Copiar Acionamento'}
            </button>
          </div>
          {t.salvarStatus === 'ok' && <div className="ag-toast">Acionamento copiado e salvo com sucesso!</div>}
          {t.salvarErro && <p className="ag-salvar-erro">{t.salvarErro}</p>}
        </div>
      )}

      <ConfirmModal
        open={!!modal}
        title={modal?.title || ''}
        message={modal?.message || ''}
        mode={modal?.mode || 'alert'}
        variant={modal?.variant || 'default'}
        confirmLabel="OK"
        onConfirm={() => setModal(null)}
        onCancel={modal?.mode === 'confirm' ? () => setModal(null) : undefined}
      />
    </div>
  )
}

// ---------- Main page component with tabs ----------

export default function AguasGuariroba() {
  const navigate = useNavigate()
  const user = getUser()

  useEffect(() => { if (!user) navigate('/login') }, [user, navigate])

  const [state, setState] = useState(() => loadTabs(user?.id))

  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state; saveTabs(state, user?.id) }, [state, user?.id])

  const addTab = () => {
    setState((prev) => {
      if (prev.tabs.length >= MAX_TABS) return prev
      const newTab = makeDefaultTab(prev.nextNum)
      return { tabs: [...prev.tabs, newTab], activeId: newTab.id, nextNum: prev.nextNum + 1 }
    })
  }

  const closeTab = (id) => {
    setState((prev) => {
      if (prev.tabs.length <= 1) return prev
      const idx = prev.tabs.findIndex((t) => t.id === id)
      const newTabs = prev.tabs.filter((t) => t.id !== id)
      let newActiveId = prev.activeId
      if (prev.activeId === id) {
        const newIdx = Math.min(idx, newTabs.length - 1)
        newActiveId = newTabs[newIdx].id
      }
      return { ...prev, tabs: newTabs, activeId: newActiveId }
    })
  }

  const selectTab = (id) => {
    setState((prev) => ({ ...prev, activeId: id }))
  }

  const handleChange = useCallback((tabId, fieldOrUpdates, value) => {
    setState((prev) => {
      const newTabs = prev.tabs.map((t) => {
        if (t.id !== tabId) return t
        if (typeof fieldOrUpdates === 'object') return { ...t, ...fieldOrUpdates }
        return { ...t, [fieldOrUpdates]: value }
      })
      return { ...prev, tabs: newTabs }
    })
  }, [])

  if (!user) return null

  const activeTab = state.tabs.find((t) => t.id === state.activeId) || state.tabs[0]

  return (
    <main className="dashboard-page aguas-guariroba-page">
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
          <span className="dashboard-menu-quadro dashboard-menu-quadro--ativo" title="Águas Guariroba">
            <svg className="dashboard-menu-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <circle cx="8" cy="10" r="1.5" /><circle cx="12" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" />
              <circle cx="8" cy="14" r="1.5" /><circle cx="12" cy="14" r="1.5" /><circle cx="16" cy="14" r="1.5" />
              <circle cx="8" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
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

        <div className="ag-tabs-bar">
          {state.tabs.map((tab) => (
            <div
              key={tab.id}
              className={`ag-tab ${tab.id === state.activeId ? 'ag-tab--active' : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              <span className="ag-tab-label">{getTabLabel(tab)}</span>
              {state.tabs.length > 1 && (
                <button
                  className="ag-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  title="Fechar calculadora"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          {state.tabs.length < MAX_TABS && (
            <button className="ag-tab ag-tab--add" onClick={addTab} title="Nova calculadora">+</button>
          )}
        </div>

        <CalculadoraInstance key={activeTab.id} tab={activeTab} onChange={handleChange} user={user} />

        <div className="ag-watermark">Criado por Wesley Gomes para PORTES ADVOGADOS</div>
      </div>
    </main>
  )
}
