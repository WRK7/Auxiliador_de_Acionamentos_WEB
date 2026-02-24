/**
 * Validação e formatação – baseado em LOGICA_COMPLETA.md (seção 4).
 * CPF, CNPJ, datas, moeda, porcentagem, obrigatórios.
 */

/** Extrai só dígitos de uma string. */
export function soDigitos(s) {
  return (s || '').replace(/\D/g, '')
}

// --- CPF ---
function calcularDigitoCPF(base, pesos) {
  let soma = 0
  for (let i = 0; i < pesos.length; i++) soma += base[i] * pesos[i]
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function validarCPF(cpf) {
  const d = soDigitos(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // sequência repetida
  const base = d.split('').map(Number)
  const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
  const p2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  if (calcularDigitoCPF(base, p1) !== base[9]) return false
  if (calcularDigitoCPF(base, p2) !== base[10]) return false
  return true
}

// --- CNPJ ---
function calcularDigitoCNPJ(base, pesos) {
  let soma = 0
  for (let i = 0; i < pesos.length; i++) soma += base[i] * pesos[i]
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function validarCNPJ(cnpj) {
  const d = soDigitos(cnpj)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false
  const base = d.split('').map(Number)
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  if (calcularDigitoCNPJ(base, p1) !== base[12]) return false
  if (calcularDigitoCNPJ(base, p2) !== base[13]) return false
  return true
}

export function formatarCpfCnpj(valor) {
  const d = soDigitos(valor)
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4').replace(/-(\d)$/, '-$1')
  }
  return d
    .slice(0, 14)
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
    .replace(/-(\d)$/, '-$1')
}

export function obterTipoDocumento(valor) {
  const d = soDigitos(valor)
  if (d.length === 11) return 'CPF'
  if (d.length === 14) return 'CNPJ'
  return 'INDEFINIDO'
}

// --- Data DD/MM/AAAA ---
export function validarData(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return false
  const m = dataStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return false
  const d = parseInt(m[1], 10)
  const mes = parseInt(m[2], 10)
  const a = parseInt(m[3], 10)
  if (mes < 1 || mes > 12) return false
  const data = new Date(a, mes - 1, d)
  return data.getFullYear() === a && data.getMonth() === mes - 1 && data.getDate() === d
}

/** Hoje à meia-noite (UTC-3 simplificado). */
function hoje() {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

/** Converte DD/MM/AAAA em Date. */
function parseDataBR(str) {
  const m = (str || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10))
}

export function validarDataVencimento(dataStr, carteira, prazoMaximoPorCarteira) {
  if (!validarData(dataStr)) return { ok: false, mensagem: 'Data inválida. Use DD/MM/AAAA.' }
  const data = parseDataBR(dataStr)
  const h = hoje()
  if (data < h) return { ok: false, mensagem: 'Data de vencimento deve ser hoje ou futura.' }
  const prazo = prazoMaximoPorCarteira[carteira] ?? 7
  const limite = new Date(h)
  limite.setDate(limite.getDate() + prazo)
  if (data > limite) return { ok: false, mensagem: `Vencimento deve ser no máximo ${prazo} dias a partir de hoje.` }
  return { ok: true, mensagem: '' }
}

export function validarDataFutura(dataStr) {
  if (!validarData(dataStr)) return { ok: false, mensagem: 'Data inválida. Use DD/MM/AAAA.' }
  const data = parseDataBR(dataStr)
  if (data < hoje()) return { ok: false, mensagem: 'Data deve ser hoje ou futura.' }
  return { ok: true, mensagem: '' }
}

/** 8 dígitos -> DD/MM/AAAA */
export function formatarData(valor) {
  const d = soDigitos(valor).slice(0, 8)
  if (d.length < 8) return valor
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`
}

/** Formata data conforme o usuário digita (só dígitos, insere / após DD e MM). */
export function formatarDataEnquantoDigita(valor) {
  const d = soDigitos(valor).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`
}

/** Converte DD/MM/AAAA para YYYY-MM-DD (para input type="date"). Retorna '' se inválido. */
export function ddMmYyyyToYyyyMmDd(str) {
  const v = (str || '').trim()
  if (!v) return ''
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, dd, mm, aaaa] = m
  const d = new Date(parseInt(aaaa, 10), parseInt(mm, 10) - 1, parseInt(dd, 10))
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m2 = String(d.getMonth() + 1).padStart(2, '0')
  const d2 = String(d.getDate()).padStart(2, '0')
  return `${y}-${m2}-${d2}`
}

/** Converte YYYY-MM-DD para DD/MM/AAAA (valor exibido e armazenado). Retorna '' se inválido. */
export function yyyyMmDdToDdMmYyyy(str) {
  const v = (str || '').trim()
  if (!v) return ''
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  const [, aaaa, mm, dd] = m
  const d = new Date(parseInt(aaaa, 10), parseInt(mm, 10) - 1, parseInt(dd, 10))
  if (Number.isNaN(d.getTime())) return ''
  return `${dd}/${mm}/${aaaa}`
}

// --- Moeda ---
export function formatarMoeda(valor) {
  const s = (valor || '').toString().replace(/\s/g, '').replace(/[R$\s]/gi, '')
  const num = parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// --- Porcentagem ---
export function formatarPorcentagem(valor) {
  const s = (valor || '').toString().replace(/%/g, '').trim()
  const num = parseFloat(s.replace(',', '.')) || 0
  const fixed = Math.min(100, Math.max(0, num))
  const str = fixed.toFixed(2).replace('.', ',')
  return str + '%'
}

export function validarPorcentagem(valor) {
  const s = (valor || '').toString().replace(/%/g, '').replace(',', '.').trim()
  if (!s) return false
  const num = parseFloat(s)
  if (Number.isNaN(num)) return false
  if (num < 0 || num > 100) return false
  if (/[a-zA-Z]/.test((valor || '').toString())) return false
  return true
}

/** Remove não-dígitos e vírgula para obter número da porcentagem. */
export function limparPorcentagem(valor) {
  return (valor || '').toString().replace(/[^\d,]/g, '').replace(',', '.')
}
