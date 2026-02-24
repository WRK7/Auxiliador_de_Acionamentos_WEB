/**
 * Cria a tabela de histórico da calculadora Águas Guariroba.
 * Colunas específicas: tipo (à vista/parcelado), valores, matrícula, documento, titular, vencimento, parcelas etc.
 * Rode da pasta backend: node scripts/criar-tabela-aguas-guariroba.js
 */
import 'dotenv/config'
import { query } from '../db.js'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS aguas_guariroba (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  codigo VARCHAR(50) NOT NULL,
  usuario_id INT NOT NULL,
  tipo VARCHAR(20) NOT NULL COMMENT 'a_vista ou parcelado',
  valor_debito DECIMAL(15,2) NOT NULL,
  dias_atraso INT NOT NULL,
  desconto_percentual DECIMAL(5,2) NOT NULL,
  valor_atualizado DECIMAL(15,2) NULL,
  valor_negociado DECIMAL(15,2) NULL,
  matricula_situacao VARCHAR(20) NULL,
  matricula_numero VARCHAR(50) NULL,
  documento_tipo VARCHAR(10) NULL,
  documento_numero VARCHAR(20) NULL,
  titular VARCHAR(255) NULL,
  vencimento DATE NULL,
  contato VARCHAR(255) NULL,
  valor_entrada DECIMAL(15,2) NULL,
  numero_parcelas INT NULL,
  valor_parcela DECIMAL(15,2) NULL,
  modelo_gerado TEXT NULL,
  UNIQUE KEY uk_aguas_guariroba_codigo (codigo),
  KEY idx_aguas_guariroba_usuario_id (usuario_id),
  KEY idx_aguas_guariroba_created_at (created_at),
  KEY idx_aguas_guariroba_tipo (tipo),
  CONSTRAINT fk_aguas_guariroba_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`.trim()

async function main() {
  try {
    await query(CREATE_TABLE)
    console.log('Tabela aguas_guariroba criada ou já existente.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
