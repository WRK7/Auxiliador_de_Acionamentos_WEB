/**
 * Dados mockados para a tela de Histórico de acionamentos.
 * Estrutura alinhada a LOGICA_COMPLETA.md (seção 6.3 / 10.1).
 */

function buildModelo(informacoes) {
  return Object.entries(informacoes)
    .map(([k, v]) => `${k}: ${v ?? ''}`)
    .join('\n')
}

const nomes = [
  'Maria Santos Silva', 'João Pedro Oliveira', 'Ana Costa Lima', 'Carlos Eduardo Souza',
  'Fernanda Lima Rocha', 'Roberto Alves Mendes', 'Patrícia Gomes Ferreira', 'Marcos Paulo Santos',
  'Juliana Ribeiro Costa', 'André Luiz Pereira', 'Camila Nascimento Oliveira', 'Ricardo Martins Dias',
  'Luciana Ferreira Souza', 'Bruno Henrique Lima', 'Amanda Silva Costa', 'Felipe Oliveira Rocha',
  'Larissa Mendes Pereira', 'Rodrigo Santos Alves', 'Beatriz Costa Gomes', 'Thiago Lima Ferreira',
  'Mariana Oliveira Santos', 'Gabriel Souza Ribeiro', 'Isabela Costa Nascimento', 'Rafael Pereira Martins',
  'Carolina Alves Dias', 'Daniel Lima Ferreira', 'Letícia Santos Oliveira', 'Pedro Henrique Costa',
  'Natália Ribeiro Souza', 'Lucas Martins Pereira', 'Bruna Ferreira Gomes', 'Gustavo Oliveira Dias',
  'Renata Costa Alves', 'Vinícius Lima Santos', 'Priscila Souza Mendes', 'Leonardo Pereira Ribeiro',
  'Débora Oliveira Costa', 'Matheus Santos Ferreira', 'Aline Gomes Lima', 'Fábio Ribeiro Oliveira',
]

const carteirasTipos = [
  { carteira: 'SENAC RJ', tipo: 'ACD - ACORDO' },
  { carteira: 'SENAC RJ', tipo: 'ACD - ACORDO PARCELADO' },
  { carteira: 'SENAC MS', tipo: 'ACD - ACORDO' },
  { carteira: 'SENAC MS', tipo: 'ACD - ACORDO PARCELADO' },
  { carteira: 'SENAC BA', tipo: 'ACD - ACORDO' },
  { carteira: 'SENAC BA', tipo: 'ACD - ACORDO PARCELADO' },
  { carteira: 'CEDAE', tipo: 'ACV - ACORDO À VISTA' },
  { carteira: 'CEDAE', tipo: 'ACP - ACORDO PARCELADO' },
  { carteira: 'CEDAE', tipo: 'VIA - SEGUNDA VIA' },
  { carteira: 'SESC', tipo: 'ACD - ACORDO' },
  { carteira: 'SESC', tipo: 'ACD - PARCELADO' },
  { carteira: 'CASSEMS', tipo: 'ACC - A VISTA' },
  { carteira: 'CASSEMS', tipo: 'ACC - PARCELADO' },
  { carteira: 'UNIMED', tipo: 'ACD - ACORDO' },
  { carteira: 'FIRJAN', tipo: 'ACF - A VISTA' },
  { carteira: 'FIRJAN', tipo: 'ACF - BOLETO' },
  { carteira: 'FIEB', tipo: 'ACD - A VISTA' },
  { carteira: 'FIEB', tipo: 'ACD - BOLETO' },
]

const idsPrefixos = ['ACD', 'ACV', 'ACP', 'VIA', 'ACC', 'ACF']
const meses = ['01', '02']
const usuarios = ['conciliador', 'operador1', 'operador2']

function rnd(arr, seed) { return arr[seed % arr.length] }
function rndVal(min, max, step, seed) {
  const range = Math.floor((max - min) / step) + 1
  const n = min + (seed % range) * step
  return Number(n).toFixed(2).replace('.', ',')
}

function gerarInformacoesSENAC(nome, carteira, tipo, seed) {
  const base = {
    'Nome do Devedor': nome,
    'CPF/CNPJ': `${String((seed + 100) % 900 + 100).padStart(3, '0')}.${String((seed + 200) % 900 + 100).padStart(3, '0')}.${String((seed + 300) % 900 + 100).padStart(3, '0')}-${String((seed + 400) % 100).padStart(2, '0')}`,
    'Valor Total Atualizado': `R$ ${rndVal(800, 8000, 100, seed + 10)}`,
    'Desconto Principal': `${rnd([30, 40, 50, 60], seed)}%`,
    'Desconto Juros': `${rnd([80, 100], seed + 1)}%`,
    'Desconto Multa': `${rnd([50, 80, 100], seed + 2)}%`,
    'Valor Proposto': `R$ ${rndVal(500, 5000, 100, seed + 20)}`,
    'Data de Vencimento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'WhatsApp': `21${String(900000000 + (seed * 1234567) % 100000000)}`,
    'E-mail': nome.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    'Observações': '',
  }
  if (carteira === 'SENAC MS' || carteira === 'SENAC BA') {
    base['CRE/Contrato'] = `CRE-2024-${(seed % 9000) + 1000}`
  }
  if (carteira === 'SENAC MS') {
    base['Valor Confirmado'] = base['Valor Proposto']
    base['Horário da Ligação'] = rnd(['09h00', '10h30', '14h00', '15h45', '11h15'], seed)
  }
  if (carteira === 'SENAC BA') {
    base['Forma de Pagamento'] = rnd(['Boleto', 'PIX', 'Cartão'], seed)
  }
  if (tipo.includes('PARCELADO')) {
    base['Entrada de'] = `R$ ${rndVal(200, 1500, 100, seed + 30)}`
    base['Quantidade de Parcelas'] = String(rnd([2, 3, 4, 5], seed + 3))
    base['Valor das Parcelas'] = `R$ ${rndVal(300, 1200, 50, seed + 40)}`
  }
  return base
}

function gerarInformacoesCEDAE(nome, tipo, seed) {
  const base = {
    Nome: nome,
    Matrícula: `CED-${100000 + (seed % 900000)}`,
    'Gravação (Telefone)': `21${String(100000000 + (seed * 777) % 900000000)}`,
    'Valor Original': `R$ ${rndVal(400, 2000, 50, seed)}`,
    'Valor Atualizado': `R$ ${rndVal(500, 2500, 50, seed + 5)}`,
    'Desconto Principal': '50%',
    'Desconto Juros': '100%',
    'Desconto Multa': '0%',
    'Valor Proposto': `R$ ${rndVal(300, 1800, 50, seed + 10)}`,
    'Data de Vencimento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'Forma de Pagamento': rnd(['PIX', 'Boleto', 'CARTÃO DE CRÉDITO OU BOLETO'], seed),
    'WhatsApp': `21${String(100000000 + (seed * 777) % 900000000)}`,
    'E-mail': nome.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    'Observações': '',
  }
  if (tipo === 'ACP - ACORDO PARCELADO') {
    base['Valor Proposto para Parcelamento'] = base['Valor Proposto']
    base['Entrada (Boleto)'] = `R$ ${rndVal(150, 800, 50, seed + 15)}`
    base['Qtd de Parcelas'] = String(rnd([2, 3, 4], seed))
    base['Valor das Parcelas'] = `R$ ${rndVal(200, 600, 50, seed + 20)}`
  }
  if (tipo === 'VIA - SEGUNDA VIA') {
    return {
      Nome: nome,
      Matrícula: base.Matrícula,
      'Fatura Vencida': `FAT-${1000 + (seed % 9000)}`,
      Valor: base['Valor Atualizado'],
      'Novo Vencimento': base['Data de Vencimento'],
      Telefone: base['Gravação (Telefone)'],
      'E-mail': base['E-mail'],
    }
  }
  return base
}

function gerarInformacoesSESC(nome, tipo, seed) {
  const base = {
    'Nome do Devedor': nome,
    'CPF/CNPJ': `${String((seed + 100) % 900 + 100).padStart(3, '0')}.***.***-**`,
    'CRE/Contrato': `CRE-${10000 + (seed % 90000)}`,
    'Valor Total Atualizado': `R$ ${rndVal(1000, 6000, 200, seed)}`,
    'Desconto Principal': '40%',
    'Desconto Juros': '100%',
    'Desconto Multa': '0%',
    'Valor Proposto': `R$ ${rndVal(600, 4000, 100, seed + 7)}`,
    'Data de Vencimento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'WhatsApp': `21${String(100000000 + (seed * 111) % 900000000)}`,
    'E-mail': nome.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    'Observações': '',
  }
  if (tipo === 'ACD - PARCELADO') {
    base['Entrada de'] = `R$ ${rndVal(300, 1000, 100, seed + 11)}`
    base['QUANT P'] = String(rnd([2, 3, 4], seed))
    base['Valor das Parcelas'] = `R$ ${rndVal(400, 1200, 100, seed + 13)}`
  }
  return base
}

function gerarInformacoesCASSEMS(nome, tipo, seed) {
  const base = {
    'Nome do Devedor': nome,
    'CPF/CNPJ': `${String((seed + 50) % 900 + 100).padStart(3, '0')}.***.***-**`,
    TITULO: `TIT-${10000 + (seed % 90000)}`,
    'Valor Original': `R$ ${rndVal(800, 4000, 100, seed)}`,
    'Valor Total': `R$ ${rndVal(900, 4500, 100, seed + 9)}`,
    'Desconto Principal': '35%',
    'Desconto Juros': '100%',
    'Desconto Multa': '50%',
    'Valor Proposto': `R$ ${rndVal(500, 3000, 100, seed + 17)}`,
    'Data de Vencimento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'WhatsApp': `21${String(100000000 + (seed * 333) % 900000000)}`,
    'E-mail': nome.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    'Observações': '',
  }
  if (tipo === 'ACC - PARCELADO') {
    base['Entrada'] = `R$ ${rndVal(200, 1000, 100, seed + 21)}`
    base['Parcelas'] = String(rnd([2, 3], seed))
    base['Valor da Parcela'] = `R$ ${rndVal(300, 900, 50, seed + 23)}`
  }
  return base
}

function gerarInformacoesUNIMED(nome, seed) {
  return {
    Contratante: nome,
    'CPF/CNPJ': `${String((seed % 90) + 10).padStart(2, '0')}.${String((seed + 100) % 900 + 100).padStart(3, '0')}.${String((seed + 200) % 900 + 100).padStart(3, '0')}/0001-90`,
    'Faturas a Pagar': String(rnd([1, 2, 3], seed)),
    Títulos: `TIT-${(seed % 900) + 100}, TIT-${((seed + 1) % 900) + 100}`,
    'Dias em Atraso': String(rnd([30, 45, 60, 90], seed)),
    'Forma de Pagamento': rnd(['Boleto', 'PIX'], seed),
    'Data de Pagamento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'Valor Original': `R$ ${rndVal(2000, 8000, 200, seed)}`,
    'Valor Atualizado': `R$ ${rndVal(2200, 9000, 200, seed + 19)}`,
    Telefone: `21${String(100000000 + (seed * 555) % 900000000)}`,
  }
}

function gerarInformacoesFIRJAN(nome, tipo, seed) {
  const base = {
    Unidade: rnd(['Niterói', 'Rio de Janeiro', 'Petrópolis'], seed),
    'Nome do Devedor': nome,
    'CPF/CNPJ': `${String((seed + 70) % 900 + 100).padStart(3, '0')}.***.***-**`,
    'E-mail': nome.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    Telefone: `21${String(100000000 + (seed * 999) % 900000000)}`,
    'Valor Total Atualizado': `R$ ${rndVal(1500, 7000, 200, seed)}`,
    'Desconto Principal': '40%',
    'Desconto Juros': '100%',
    'Desconto Multa': '0%',
    'Valor Proposto': `R$ ${rndVal(900, 5000, 100, seed + 27)}`,
    'Forma de Pagamento': rnd(['Boleto', 'PIX', 'Cartão'], seed),
    'Data de Vencimento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'WhatsApp': `21${String(100000000 + (seed * 999) % 900000000)}`,
    'Observações': '',
  }
  if (tipo === 'ACF - BOLETO') {
    base['Entrada'] = `R$ ${rndVal(300, 1500, 100, seed + 31)}`
    base['Quantidade de Parcelas'] = String(rnd([2, 3, 4], seed))
    base['Valor de Cada Parcela'] = `R$ ${rndVal(400, 1200, 100, seed + 33)}`
  }
  return base
}

function gerarInformacoesFIEB(nome, tipo, seed) {
  const base = {
    Unidade: rnd(['Salvador', 'Feira de Santana', 'Lauro de Freitas'], seed),
    'Nome do Devedor': nome,
    'CPF/CNPJ': `${String((seed + 80) % 900 + 100).padStart(3, '0')}.***.***-**`,
    Referência: `${String((seed % 28) + 1).padStart(2, '0')}/01/2025`,
    'Valor Original': `R$ ${rndVal(1200, 5000, 100, seed)}`,
    'Valor Total Atualizado': `R$ ${rndVal(1300, 5500, 100, seed + 37)}`,
    Desconto: `${rnd([25, 30, 40], seed)}%`,
    'Valor Proposto': `R$ ${rndVal(800, 4000, 100, seed + 41)}`,
    'Data de Vencimento': `${String((seed % 28) + 1).padStart(2, '0')}/02/2025`,
    'Forma de Pagamento': rnd(['Boleto', 'PIX'], seed),
    'WhatsApp': `71${String(100000000 + (seed * 123) % 900000000)}`,
    'E-mail': nome.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    'Observações': '',
  }
  if (tipo === 'ACD - BOLETO') {
    base['Valor da Entrada'] = `R$ ${rndVal(200, 1000, 100, seed + 43)}`
    base['Quantidade de Parcelas'] = String(rnd([2, 3], seed))
    base['Valor de Cada Parcela'] = `R$ ${rndVal(350, 900, 50, seed + 47)}`
  }
  return base
}

function gerarInformacoes(carteira, tipo, nome, seed) {
  if (carteira.startsWith('SENAC')) return gerarInformacoesSENAC(nome, carteira, tipo, seed)
  if (carteira === 'CEDAE') return gerarInformacoesCEDAE(nome, tipo, seed)
  if (carteira === 'SESC') return gerarInformacoesSESC(nome, tipo, seed)
  if (carteira === 'CASSEMS') return gerarInformacoesCASSEMS(nome, tipo, seed)
  if (carteira === 'UNIMED') return gerarInformacoesUNIMED(nome, seed)
  if (carteira === 'FIRJAN') return gerarInformacoesFIRJAN(nome, tipo, seed)
  if (carteira === 'FIEB') return gerarInformacoesFIEB(nome, tipo, seed)
  return gerarInformacoesSENAC(nome, 'SENAC RJ', 'ACD - ACORDO', seed)
}

function gerarId(carteira, tipo, seq) {
  const prefixo = tipo.startsWith('ACD') ? 'ACD' : tipo.startsWith('ACV') ? 'ACV' : tipo.startsWith('ACP') ? 'ACP' : tipo.startsWith('VIA') ? 'VIA' : tipo.startsWith('ACC') ? 'ACC' : tipo.startsWith('ACF') ? 'ACF' : 'ACD'
  return `${prefixo}-2025-${String(seq).padStart(3, '0')}`
}

function gerarDataCriacao(diasAtras, horaMin, horaMax, seed) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  const h = String(((seed * 7) % (horaMax - horaMin + 1)) + horaMin).padStart(2, '0')
  const min = String((seed * 11) % 60).padStart(2, '0')
  const seg = String((seed * 13) % 60).padStart(2, '0')
  return `${dia}/${mes}/${ano} ${h}:${min}:${seg}`
}

const itens = []
let seq = 42
for (let i = 0; i < 40; i++) {
  const ct = rnd(carteirasTipos, i)
  const nome = nomes[i % nomes.length]
  const informacoes = gerarInformacoes(ct.carteira, ct.tipo, nome, i * 97 + 31)
  itens.push({
    id: gerarId(ct.carteira, ct.tipo, seq),
    data_criacao: gerarDataCriacao(i % 25, 8, 18, i),
    carteira: ct.carteira,
    tipo: ct.tipo,
    informacoes,
    modelo_gerado: buildModelo(informacoes),
    usuario: rnd(usuarios, i),
  })
  seq++
}

export const MOCK_ACIONAMENTOS = itens

/** Extrai nome do devedor (ou equivalente) das informacoes para exibição na tabela. */
export function getDevedorFromInformacoes(informacoes) {
  return (
    informacoes['Nome do Devedor'] ||
    informacoes['Nome'] ||
    informacoes['Contratante'] ||
    '—'
  )
}

/** Extrai um valor principal das informacoes para exibição na tabela. */
export function getValorFromInformacoes(informacoes) {
  return (
    informacoes['Valor Proposto'] ||
    informacoes['Valor Total Atualizado'] ||
    informacoes['Valor Atualizado'] ||
    informacoes['Valor'] ||
    '—'
  )
}
