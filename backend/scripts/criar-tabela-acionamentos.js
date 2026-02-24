/**
 * Cria a tabela de histórico de acionamentos com suporte a RLS e uma coluna por elemento.
 * RLS é aplicado na aplicação: conciliador vê apenas registros onde usuario_id = seu id;
 * admin e admin_supremo veem todos.
 *
 * Rode da pasta backend: node scripts/criar-tabela-acionamentos.js
 */
import 'dotenv/config'
import { query } from '../db.js'
import { COLUNAS_ELEMENTOS } from '../lib/camposAcionamento.js'

const COLS_BASE = 'id INT AUTO_INCREMENT PRIMARY KEY, codigo VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, carteira VARCHAR(100) NOT NULL, tipo VARCHAR(100) NOT NULL, modelo_gerado TEXT NOT NULL, informacoes LONGTEXT NULL, devedor VARCHAR(255) NULL, valor VARCHAR(100) NULL, usuario_id INT NOT NULL'

const COLS_ELEMENTOS = COLUNAS_ELEMENTOS.map((c) => '`' + c + '` TEXT NULL').join(', ')

const CREATE_TABLE =
  'CREATE TABLE IF NOT EXISTS acionamentos (' +
  COLS_BASE + ', ' + COLS_ELEMENTOS + ', ' +
  'UNIQUE KEY uk_codigo (codigo), KEY idx_acionamentos_usuario_id (usuario_id), KEY idx_acionamentos_created_at (created_at), KEY idx_acionamentos_carteira (carteira), KEY idx_acionamentos_tipo (tipo), CONSTRAINT fk_acionamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT' +
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'

async function main() {
  try {
    await query(CREATE_TABLE)
    console.log('Tabela acionamentos criada ou já existente (com colunas por elemento).')
    console.log('RLS: conciliador vê apenas linhas onde usuario_id = seu id; admin/admin_supremo veem todos.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
