/**
 * Cria a tabela de solicitações de cadastro (registro público).
 * Rode da pasta backend: node scripts/criar-tabela-solicitacoes.js
 */
import 'dotenv/config'
import { query } from '../db.js'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS solicitacoes_cadastro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  status ENUM('pendente', 'aprovado', 'rejeitado') NOT NULL DEFAULT 'pendente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`.trim()

async function main() {
  try {
    await query(CREATE_TABLE)
    console.log('Tabela solicitacoes_cadastro criada ou já existente.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
