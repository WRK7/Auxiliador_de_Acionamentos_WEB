/**
 * Configuração e regras de negócio – baseado em LOGICA_COMPLETA.md
 * Carteiras, tipos por carteira, campos por tipo, prazos e obrigatórios.
 */

export const CARTEIRAS = [
  'SENAC RJ',
  'SENAC MS',
  'SENAC BA',
  'CEDAE',
  'SESC',
  'CASSEMS',
  'UNIMED',
  'FIRJAN',
  'FIEB',
  'VUON CARD',
  'ÁGUAS GUARIROBA',
  'ANITA',
  'CAGECE',
]

/** Dias máximos entre hoje e Data de Vencimento. Default 7 se carteira não estiver no mapa. */
export const PRAZO_MAXIMO_POR_CARTEIRA = {
  'SENAC RJ': 7,
  'SENAC MS': 3,
  'SENAC BA': 7,
  'CEDAE': 7,
  'SESC': 7,
  'CASSEMS': 7,
  'UNIMED': 2,
  'FIRJAN': 7,
  'FIEB': 7,
  'VUON CARD': 40,
  'ANITA': 7,
  'CAGECE': 7,
}

/** Desconto máximo (%) no campo "Desconto (%)". Default 1000 quando não informado. ANITA: 100. */
export const DESCONTO_MAXIMO_POR_CARTEIRA = {
  'ANITA': 100,
  'CAGECE': 100,
}

/** Retorna o desconto máximo permitido para a carteira (campo Desconto (%)). */
export function getDescontoMaximo(carteira) {
  return DESCONTO_MAXIMO_POR_CARTEIRA[carteira] ?? 1000
}

/** Para cada carteira, lista de tipos de acionamento permitidos. */
export const TIPOS_POR_CARTEIRA = {
  'SENAC RJ': ['ACD - ACORDO', 'ACD - ACORDO PARCELADO'],
  'SENAC MS': ['ACD - ACORDO', 'ACD - ACORDO PARCELADO'],
  'SENAC BA': ['ACD - ACORDO'],
  'CEDAE': ['ACV - ACORDO À VISTA', 'ACP - ACORDO PARCELADO', 'VIA - SEGUNDA VIA'],
  'SESC': ['ACD - ACORDO', 'ACD - PARCELADO'],
  'CASSEMS': ['ACC - A VISTA', 'ACC - PARCELADO'],
  'UNIMED': ['ACD - ACORDO'],
  'FIRJAN': ['ACF - A VISTA', 'ACF - BOLETO'],
  'FIEB': ['ACD - A VISTA', 'ACD - BOLETO'],
  'VUON CARD': ['DDA - ACORDO À VISTA', 'ACD - ACORDO PARCELADO'],
  'ANITA': ['ACA - A VISTA', 'ACA - PARCELADO'],
  'CAGECE': ['ACD - ACORDO', 'ACD - ACORDO PARCELADO'],
}

/** Chave: "Carteira - Tipo". Valor: lista ordenada de nomes de campos. */
export const CAMPOS_POR_TIPO = {
  'SENAC RJ - ACD - ACORDO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'SENAC RJ - ACD - ACORDO PARCELADO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Entrada de', 'Quantidade de Parcelas', 'Valor das Parcelas', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'SENAC MS - ACD - ACORDO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Data de Vencimento', 'Valor Confirmado', 'Horário da Ligação', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'SENAC MS - ACD - ACORDO PARCELADO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Entrada de', 'Quantidade de Parcelas', 'Valor das Parcelas', 'Data de Vencimento', 'Valor Confirmado', 'Horário da Ligação', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'SENAC BA - ACD - ACORDO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Data de Vencimento', 'Forma de Pagamento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'CEDAE - ACV - ACORDO À VISTA': [
    'Matrícula', 'Gravação (Telefone)', 'Valor Original', 'Valor Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Data de Vencimento', 'Forma de Pagamento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'CEDAE - ACP - ACORDO PARCELADO': [
    'Matrícula', 'Gravação (Telefone)', 'Valor Original', 'Valor Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto para Parcelamento', 'Entrada (Boleto)', 'Qtd de Parcelas', 'Valor das Parcelas', 'Data de Vencimento', 'Forma de Pagamento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'CEDAE - VIA - SEGUNDA VIA': [
    'Nome', 'Matrícula', 'Fatura Vencida', 'Valor', 'Novo Vencimento', 'Telefone', 'E-mail',
  ],
  'SESC - ACD - ACORDO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'SESC - ACD - PARCELADO': [
    'Nome do Devedor', 'CPF/CNPJ', 'CRE/Contrato', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Entrada de', 'QUANT P', 'Valor das Parcelas', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'CASSEMS - ACC - A VISTA': [
    'Nome do Devedor', 'CPF/CNPJ', 'TITULO', 'Valor Original', 'Valor Total', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'CASSEMS - ACC - PARCELADO': [
    'Nome do Devedor', 'CPF/CNPJ', 'TITULO', 'Valor Original', 'Valor Total', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Entrada', 'Parcelas', 'Valor da Parcela', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'FIRJAN - ACF - A VISTA': [
    'Unidade', 'Nome do Devedor', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Valor Proposto', 'Forma de Pagamento', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'FIRJAN - ACF - BOLETO': [
    'Unidade', 'Nome do Devedor', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
    'Entrada', 'Quantidade de Parcelas', 'Valor de Cada Parcela', 'Forma de Pagamento', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'FIEB - ACD - A VISTA': [
    'Unidade', 'Nome do Devedor', 'CPF/CNPJ', 'Referência', 'Valor Original', 'Valor Total Atualizado', 'Desconto', 'Valor Proposto',
    'Data de Vencimento', 'Forma de Pagamento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'FIEB - ACD - BOLETO': [
    'Unidade', 'Nome do Devedor', 'CPF/CNPJ', 'Referência', 'Valor Original', 'Valor Total Atualizado', 'Desconto', 'Valor Proposto',
    'Valor da Entrada', 'Quantidade de Parcelas', 'Valor de Cada Parcela', 'Data de Vencimento', 'Forma de Pagamento', 'WhatsApp', 'E-mail', 'Observações',
  ],
  'UNIMED - ACD - ACORDO': [
    'Contratante', 'CPF/CNPJ', 'Faturas a Pagar', 'Títulos', 'Dias em Atraso', 'Forma de Pagamento', 'Data de Pagamento',
    'Valor Original', 'Valor Atualizado', 'Telefone',
  ],
  'VUON CARD - DDA - ACORDO À VISTA': [
    'Nome do Devedor', 'CPF/CNPJ', 'Valor da Dívida', 'Desconto (%)', 'Valor para Pagamento',
    'Data de Vencimento', 'WhatsApp', 'E-mail', 'Boleto Enviado?',
  ],
  'VUON CARD - ACD - ACORDO PARCELADO': [
    'Nome do Devedor', 'CPF/CNPJ', 'Valor da Dívida', 'Desconto (%)', 'Valor da Entrada',
    'Qtd de Parcelas', 'Valor da Parcela', 'Data de Vencimento', 'WhatsApp', 'E-mail', 'Boleto Enviado?',
  ],
  'ANITA - ACA - A VISTA': [
    'Nome', 'CPF/CNPJ', 'Valor da Dívida', 'Desconto (%)', 'Valor para Pagamento', 'Data de Vencimento', 'Forma de envio',
  ],
  'ANITA - ACA - PARCELADO': [
    'Nome', 'CPF/CNPJ', 'Valor da Dívida', 'Desconto (%)', 'Valor da Entrada', 'Qtd de Parcelas', 'Valor da Parcela', 'Data de Vencimento', 'Forma de envio',
  ],
  'CAGECE - ACD - ACORDO': [
    'Unidade', 'CPF/CNPJ', 'Titular', 'Telefone', 'Valor Proposto', 'Data de Vencimento', 'Enviar pelo Whats/E-mail', 'Observações',
  ],
  'CAGECE - ACD - ACORDO PARCELADO': [
    'Unidade', 'CPF/CNPJ', 'Titular', 'Telefone', 'Valor Desconto', 'Valor da Entrada', 'Quantidade de Parcelas', 'Valor de Cada Parcela', 'Data de Vencimento', 'Enviar pelo Whats/E-mail', 'Observações',
  ],
}

/** Campos que não podem ficar vazios na geração (marcados com * na doc). */
export const CAMPOS_OBRIGATORIOS = [
  'Nome do Devedor', 'CPF/CNPJ', 'Valor Total Atualizado', 'Desconto Principal', 'Desconto Juros', 'Desconto Multa',
  'Valor Proposto', 'Data de Vencimento', 'WhatsApp',
  'Nome', 'Matrícula', 'Gravação (Telefone)', 'Valor Original', 'Valor Atualizado', 'Valor', 'Novo Vencimento', 'Telefone',
  'CRE/Contrato', 'Valor Confirmado', 'Horário da Ligação', 'Entrada de', 'Quantidade de Parcelas', 'Valor das Parcelas',
  'Forma de Pagamento', 'Valor Proposto para Parcelamento', 'Entrada (Boleto)', 'Qtd de Parcelas', 'Fatura Vencida',
  'QUANT P', 'TITULO', 'Valor Total', 'Entrada', 'Parcelas', 'Valor da Parcela',
  'Unidade', 'Referência', 'Valor da Entrada', 'Quantidade de Parcelas', 'Valor de Cada Parcela',
  'Contratante', 'Faturas a Pagar', 'Títulos', 'Dias em Atraso', 'Data de Pagamento', 'E-mail',
  'Valor da Dívida', 'Desconto (%)', 'Valor para Pagamento', 'Valor da Entrada', 'Valor da Parcela',
  'Boleto Enviado?',
  'Forma de envio',
  'Titular', 'Valor Desconto', 'Enviar pelo Whats/E-mail',
]

/** Lista de opções (carteira + tipo) que têm formulário. Para os cardzinhos. */
export function getOpcoesCarteiraTipo() {
  const opcoes = []
  CARTEIRAS.forEach((carteira) => {
    const tipos = TIPOS_POR_CARTEIRA[carteira] || []
    tipos.forEach((tipo) => {
      const chave = `${carteira} - ${tipo}`
      if (CAMPOS_POR_TIPO[chave]?.length) {
        opcoes.push({ carteira, tipo, label: `${carteira} · ${tipo}` })
      }
    })
  })
  return opcoes
}

/** Para exibição: resumo das regras por carteira (prazo + tipos + qtd de campos). */
export function getRegrasPorCarteira() {
  return CARTEIRAS.map((carteira) => {
    const tipos = TIPOS_POR_CARTEIRA[carteira] || []
    const prazo = PRAZO_MAXIMO_POR_CARTEIRA[carteira] ?? 7
    const detalhes = tipos.map((tipo) => {
      const chave = `${carteira} - ${tipo}`
      const campos = CAMPOS_POR_TIPO[chave] || []
      return { tipo, campos }
    })
    return { carteira, prazo, detalhes }
  })
}

/** Retorna lista de campos para a chave "Carteira - Tipo"; fallback só "Tipo". */
export function getCamposPara(carteira, tipo) {
  if (!carteira || !tipo) return []
  const chave = `${carteira} - ${tipo}`
  return CAMPOS_POR_TIPO[chave] || CAMPOS_POR_TIPO[tipo] || []
}

/** Prazo máximo em dias para a carteira. */
export function getPrazoMaximo(carteira) {
  return PRAZO_MAXIMO_POR_CARTEIRA[carteira] ?? 7
}

export function isCampoObrigatorio(nomeCampo) {
  return CAMPOS_OBRIGATORIOS.includes(nomeCampo)
}

/** Formatação automática no blur: cpf_cnpj | data | moeda | porcentagem. Campo "Desconto" (FIEB) não é porcentagem. */
export const FORMATACAO_AUTOMATICA = {
  'CPF/CNPJ': 'cpf_cnpj',
  'Data de Vencimento': 'data',
  'Data de Pagamento': 'data',
  'Vencimento Acordo': 'data',
  'Referência': 'data',
  'Novo Vencimento': 'data',
  'Desconto Principal': 'porcentagem',
  'Desconto Juros': 'porcentagem',
  'Desconto Multa': 'porcentagem',
  'Nome do Devedor': null,
  'Matrícula': null,
  'Gravação (Telefone)': null,
  'Valor Original': 'moeda',
  'Valor Atualizado': 'moeda',
  'Valor Total Atualizado': 'moeda',
  'Valor Proposto': 'moeda',
  'Valor das Parcelas': 'moeda',
  'Valor da Parcela': 'moeda',
  'Valor de Cada Parcela': 'moeda',
  'Valor Proposto para Parcelamento': 'moeda',
  'Valor Total': 'moeda',
  'Valor': 'moeda',
  'Valor Confirmado': 'moeda',
  'Valor da Entrada': 'moeda',
  'Entrada de': 'moeda',
  'Entrada (Boleto)': 'moeda',
  'Entrada': 'moeda',
  'Forma de Pagamento': null,
  'WhatsApp': null,
  'E-mail': null,
  'Observações': null,
  'Unidade': null,
  'CRE/Contrato': null,
  'Horário da Ligação': null,
  'Quantidade de Parcelas': null,
  'Qtd de Parcelas': null,
  'QUANT P': null,
  'Parcelas': null,
  'TITULO': null,
  'Nome': null,
  'Titular': null,
  'Fatura Vencida': null,
  'Telefone': null,
  'Contratante': null,
  'Faturas a Pagar': null,
  'Títulos': null,
  'Dias em Atraso': null,
  'Desconto': null, // FIEB: único, sem formatação %
  'Valor da Dívida': 'moeda',
  'Desconto (%)': 'porcentagem_ampla',
  'Valor para Pagamento': 'moeda',
  'Boleto Enviado?': 'radio_sim_nao',
  'Forma de envio': null,
  'Valor Desconto': 'porcentagem_ampla',
  'Enviar pelo Whats/E-mail': null,
}

export function getTipoFormatacao(nomeCampo) {
  return FORMATACAO_AUTOMATICA[nomeCampo] ?? null
}
