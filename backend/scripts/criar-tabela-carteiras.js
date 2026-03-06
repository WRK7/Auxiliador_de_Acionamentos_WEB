/**
 * Cria a tabela carteiras (nome, ativo) e insere as carteiras padrão com ativo=1.
 * Rode da pasta backend: node scripts/criar-tabela-carteiras.js
 */
import 'dotenv/config'
import { query } from '../db.js'
import { LISTA_CARTEIRAS } from '../lib/carteirasLista.js'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS carteiras (
  nome VARCHAR(100) NOT NULL PRIMARY KEY,
  ativo TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

async function main() {
  try {
    await query(CREATE_TABLE)
    console.log('Tabela carteiras criada ou já existente.')

    for (const nome of LISTA_CARTEIRAS) {
      await query(
        'INSERT IGNORE INTO carteiras (nome, ativo) VALUES (?, 1)',
        [nome]
      )
    }
    console.log('Carteiras padrão inseridas (ativas) onde não existiam.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
