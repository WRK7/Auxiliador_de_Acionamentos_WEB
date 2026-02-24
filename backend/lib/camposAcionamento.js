/**
 * Elementos (campos) de acionamentos por modelo (Carteira - Tipo).
 * Mapeamento label do formulário → nome de coluna na tabela (snake_case).
 * Usado pelo script da tabela e pela rota POST para gravar uma coluna por elemento.
 */

/** Converte label do frontend em nome de coluna SQL (snake_case, sem caracteres especiais). */
function labelToColumnName(label) {
  if (label == null || typeof label !== 'string') return null
  const normalized = label
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s*\/\s*/g, '_')
    .replace(/\s*\(\s*/g, '_')
    .replace(/\s*\)\s*/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
  if (!normalized) return null
  if (normalized === 'valor') return 'valor_fatura'
  if (normalized === 'e_mail') return 'email'
  return normalized.replace(/_+/g, '_').replace(/_$/, '')
}

/** Lista única de todos os labels que aparecem em CAMPOS_POR_TIPO (frontend). */
const TODOS_OS_LABELS = [
  'Nome do Devedor',
  'CPF/CNPJ',
  'Valor Total Atualizado',
  'Desconto Principal',
  'Desconto Juros',
  'Desconto Multa',
  'Valor Proposto',
  'Data de Vencimento',
  'WhatsApp',
  'E-mail',
  'Observações',
  'Entrada de',
  'Quantidade de Parcelas',
  'Valor das Parcelas',
  'CRE/Contrato',
  'Valor Confirmado',
  'Horário da Ligação',
  'Forma de Pagamento',
  'Matrícula',
  'Gravação (Telefone)',
  'Valor Original',
  'Valor Atualizado',
  'Valor Proposto para Parcelamento',
  'Entrada (Boleto)',
  'Qtd de Parcelas',
  'Nome',
  'Fatura Vencida',
  'Valor',
  'Novo Vencimento',
  'Telefone',
  'QUANT P',
  'TITULO',
  'Valor Total',
  'Entrada',
  'Parcelas',
  'Valor da Parcela',
  'Unidade',
  'Referência',
  'Desconto',
  'Valor da Entrada',
  'Valor de Cada Parcela',
  'Contratante',
  'Faturas a Pagar',
  'Títulos',
  'Dias em Atraso',
  'Data de Pagamento',
  'Valor da Dívida',
  'Desconto (%)',
  'Valor para Pagamento',
  'Boleto Enviado?',
]

/** Mapeamento label → nome de coluna (para INSERT/SELECT). */
const LABEL_TO_COLUMN = Object.fromEntries(
  TODOS_OS_LABELS.map((l) => [l, labelToColumnName(l)]).filter(([, col]) => col != null)
)

/** Lista de nomes de colunas (elementos) para a tabela acionamentos. */
const COLUNAS_ELEMENTOS = [...new Set(Object.values(LABEL_TO_COLUMN))].sort()

export { labelToColumnName, TODOS_OS_LABELS, LABEL_TO_COLUMN, COLUNAS_ELEMENTOS }
