/**
 * Validação por campo (UI) – baseado em LOGICA_COMPLETA.md 4.2 e 4.3.
 * validarCampo, validarCampoComMensagem, aplicarFormatacaoAutomatica.
 */

import {
  validarCPF,
  validarCNPJ,
  soDigitos,
  validarData,
  validarDataVencimento,
  validarDataFutura,
  validarPorcentagem,
  formatarCpfCnpj,
  formatarData,
  formatarMoeda,
  formatarPorcentagem,
} from './validators'
import { isCampoObrigatorio, getTipoFormatacao, PRAZO_MAXIMO_POR_CARTEIRA } from '../data/config'

/** Valida um campo (valor + nome) para exibir ✓/✗. Retorna true se válido ou vazio (e não obrigatório). */
export function validarCampo(nomeCampo, valor, carteira) {
  const v = (valor || '').toString().trim()
  if (!v) return !isCampoObrigatorio(nomeCampo)

  if (nomeCampo === 'CPF/CNPJ') {
    const d = soDigitos(v)
    if (d.length === 11) return validarCPF(v)
    if (d.length === 14) return validarCNPJ(v)
    return false
  }

  if (nomeCampo === 'Data de Vencimento' || nomeCampo === 'Data de Pagamento' || nomeCampo === 'Vencimento Acordo') {
    return validarDataVencimento(v, carteira, PRAZO_MAXIMO_POR_CARTEIRA).ok
  }

  if (nomeCampo === 'Novo Vencimento') {
    return validarDataFutura(v).ok
  }

  if (nomeCampo === 'Referência' || nomeCampo === 'Data de Pagamento') {
    if (nomeCampo === 'Data de Pagamento') {
      return validarDataVencimento(v, carteira, PRAZO_MAXIMO_POR_CARTEIRA).ok
    }
    return validarData(v)
  }

  if (nomeCampo === 'Desconto Principal' || nomeCampo === 'Desconto Juros' || nomeCampo === 'Desconto Multa') {
    return validarPorcentagem(v)
  }

  return true
}

/** Retorna { ok, mensagem } para tooltip / erro. */
export function validarCampoComMensagem(nomeCampo, valor, carteira) {
  const v = (valor || '').toString().trim()
  if (!v) {
    if (isCampoObrigatorio(nomeCampo)) return { ok: false, mensagem: 'Campo obrigatório.' }
    return { ok: true, mensagem: '' }
  }

  if (nomeCampo === 'CPF/CNPJ') {
    const d = soDigitos(v)
    if (d.length !== 11 && d.length !== 14) return { ok: false, mensagem: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.' }
    if (d.length === 11 && !validarCPF(v)) return { ok: false, mensagem: 'CPF inválido.' }
    if (d.length === 14 && !validarCNPJ(v)) return { ok: false, mensagem: 'CNPJ inválido.' }
    return { ok: true, mensagem: '' }
  }

  if (nomeCampo === 'Data de Vencimento' || nomeCampo === 'Vencimento Acordo') {
    const r = validarDataVencimento(v, carteira, PRAZO_MAXIMO_POR_CARTEIRA)
    return { ok: r.ok, mensagem: r.mensagem }
  }

  if (nomeCampo === 'Data de Pagamento') {
    const r = validarDataVencimento(v, carteira, PRAZO_MAXIMO_POR_CARTEIRA)
    return { ok: r.ok, mensagem: r.mensagem }
  }

  if (nomeCampo === 'Novo Vencimento') {
    const r = validarDataFutura(v)
    return { ok: r.ok, mensagem: r.mensagem }
  }

  if (nomeCampo === 'Referência') {
    if (!validarData(v)) return { ok: false, mensagem: 'Data inválida. Use DD/MM/AAAA.' }
    return { ok: true, mensagem: '' }
  }

  if (nomeCampo === 'Desconto Principal' || nomeCampo === 'Desconto Juros' || nomeCampo === 'Desconto Multa') {
    if (!validarPorcentagem(v)) return { ok: false, mensagem: 'Porcentagem inválida (0 a 100).' }
    return { ok: true, mensagem: '' }
  }

  return { ok: true, mensagem: '' }
}

/** Aplica formatação no blur. Retorna valor formatado ou o próprio valor. */
export function aplicarFormatacaoAutomatica(nomeCampo, valor) {
  const tipo = getTipoFormatacao(nomeCampo)
  const v = (valor || '').toString().trim()
  if (!v) return v

  if (tipo === 'cpf_cnpj') {
    const d = soDigitos(v)
    if (d.length === 0) return v
    return formatarCpfCnpj(v)
  }

  if (tipo === 'data') {
    const d = soDigitos(v)
    if (d.length === 8) return formatarData(v)
    return v
  }

  if (tipo === 'moeda') {
    if (/^R\s*\$\s*/i.test(v)) return v
    return formatarMoeda(v)
  }

  if (tipo === 'porcentagem') {
    if (v.endsWith('%')) return v
    const num = parseFloat((v || '').replace(',', '.').replace(/%/g, ''))
    if (Number.isNaN(num)) return v
    return formatarPorcentagem(v)
  }

  return v
}

/**
 * Validação completa antes de gerar modelo (ModelGenerator).
 * Retorna { ok, erros: string[] }.
 */
export function validacaoCompletaParaGerar(campos, valores, carteira) {
  const erros = []
  const prazoMap = PRAZO_MAXIMO_POR_CARTEIRA

  for (const nome of campos) {
    const valor = (valores[nome] ?? '').toString().trim()

    if (isCampoObrigatorio(nome) && !valor) {
      erros.push(`${nome}: obrigatório.`)
      continue
    }

    if (!valor) continue

    if (nome === 'CPF/CNPJ') {
      const d = soDigitos(valor)
      if (d.length !== 11 && d.length !== 14) {
        erros.push('CPF/CNPJ: deve ter 11 (CPF) ou 14 (CNPJ) dígitos.')
      } else if (d.length === 11 && !validarCPF(valor)) {
        erros.push('CPF/CNPJ: CPF inválido.')
      } else if (d.length === 14 && !validarCNPJ(valor)) {
        erros.push('CPF/CNPJ: CNPJ inválido.')
      }
      continue
    }

    if (nome === 'Data de Vencimento' || nome === 'Vencimento Acordo' || nome === 'Data de Pagamento') {
      const r = validarDataVencimento(valor, carteira, prazoMap)
      if (!r.ok) erros.push(`${nome}: ${r.mensagem}`)
      continue
    }

    if (nome === 'Novo Vencimento') {
      const r = validarDataFutura(valor)
      if (!r.ok) erros.push(`${nome}: ${r.mensagem}`)
      continue
    }

    if (nome === 'Referência') {
      if (!validarData(valor)) erros.push(`${nome}: data inválida. Use DD/MM/AAAA.`)
      continue
    }

    if (nome === 'Desconto Principal' || nome === 'Desconto Juros' || nome === 'Desconto Multa') {
      if (!validarPorcentagem(valor)) erros.push(`${nome}: porcentagem inválida (0 a 100).`)
    }
  }

  return { ok: erros.length === 0, erros }
}

/** Limitar teclas em porcentagem: só dígitos, vírgula, ponto (ponto vira vírgula). */
export function limitarEntradaPorcentagem(e) {
  const key = e.key
  if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight') return
  if (key === ',' || key === '.') {
    e.preventDefault()
    const target = e.target
    if (target.value.includes(',')) return
    const pos = target.selectionStart
    const v = target.value
    target.value = v.slice(0, pos) + ',' + v.slice(pos)
    target.setSelectionRange(pos + 1, pos + 1)
    target.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }
  if (!/^\d$/.test(key)) e.preventDefault()
}
