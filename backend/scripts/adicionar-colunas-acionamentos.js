/**
 * Adiciona as colunas de elementos na tabela acionamentos (quando ela já existe sem elas).
 * Usa TEXT para não estourar o limite de tamanho da linha (65535 bytes).
 * Rode da pasta backend: node scripts/adicionar-colunas-acionamentos.js
 */
import 'dotenv/config'
import { query } from '../db.js'
import { COLUNAS_ELEMENTOS } from '../lib/camposAcionamento.js'

const RENOMEAR_COLUNAS = [
  ['gravao_telefone', 'gravacao_telefone'],
  ['horrio_da_ligao', 'horario_da_ligacao'],
  ['matrcula', 'matricula'],
  ['observaes', 'observacoes'],
  ['referncia', 'referencia'],
  ['ttulos', 'titulos'],
]

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  return Array.isArray(rows) && rows.length > 0
}

async function main() {
  const tableName = 'acionamentos'

  for (const [antigo, novo] of RENOMEAR_COLUNAS) {
    const temAntigo = await columnExists(tableName, antigo)
    const temNovo = await columnExists(tableName, novo)
    if (temAntigo && !temNovo) {
      await query(`ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${antigo}\` \`${novo}\` TEXT NULL`)
      console.log('Coluna renomeada:', antigo, '->', novo)
    }
  }

  let added = 0
  for (const col of COLUNAS_ELEMENTOS) {
    const exists = await columnExists(tableName, col)
    if (!exists) {
      await query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` TEXT NULL`)
      console.log('Coluna adicionada:', col)
      added++
    }
  }
  if (added === 0) {
    console.log('Nenhuma coluna nova a adicionar.')
  } else {
    console.log('Total de colunas adicionadas:', added)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
