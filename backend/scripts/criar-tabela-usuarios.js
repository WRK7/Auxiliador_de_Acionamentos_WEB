/**
 * Cria a tabela usuarios no banco (rode da pasta backend: node scripts/criar-tabela-usuarios.js)
 */
import 'dotenv/config'
import { query } from '../db.js'

const SQL = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`.trim()

async function main() {
  try {
    await query(SQL)
    console.log('Tabela usuarios criada ou já existente.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
