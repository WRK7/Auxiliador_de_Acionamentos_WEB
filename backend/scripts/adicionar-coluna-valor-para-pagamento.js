/**
 * Adiciona a coluna valor_para_pagamento na tabela acionamentos (para exibir valor VUON no histórico).
 * Rode uma vez: node scripts/adicionar-coluna-valor-para-pagamento.js
 */
import 'dotenv/config'
import { query } from '../db.js'

const SQL = `
ALTER TABLE acionamentos ADD COLUMN \`valor_para_pagamento\` TEXT NULL AFTER \`valor\`
`.trim()

async function main() {
  try {
    await query(SQL)
    console.log('Coluna valor_para_pagamento adicionada em acionamentos.')
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
      console.log('Coluna valor_para_pagamento já existe. Nada a fazer.')
    } else {
      console.error(err)
      process.exit(1)
    }
  }
  process.exit(0)
}

main()
