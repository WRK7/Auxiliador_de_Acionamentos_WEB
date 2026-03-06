/**
 * Cria a tabela de sequência para geração de códigos (DDA-2026-00001, ACD-2026-00002, etc.).
 * Rode uma vez: node scripts/criar-tabela-codigo-sequencia.js
 */
import 'dotenv/config'
import { query } from '../db.js'

const SQL = `
CREATE TABLE IF NOT EXISTS codigo_sequencia (
  prefixo VARCHAR(10) NOT NULL,
  ano INT NOT NULL,
  proximo INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (prefixo, ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`.trim()

async function main() {
  try {
    await query(SQL)
    console.log('Tabela codigo_sequencia criada ou já existente.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
