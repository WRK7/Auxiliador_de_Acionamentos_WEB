import 'dotenv/config'
import { query, closePool } from '../db.js'

async function main() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS deletados_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tabela_origem VARCHAR(50) NOT NULL,
        registro_codigo VARCHAR(100) NOT NULL,
        registro_resumo TEXT,
        deletado_por_id INT NOT NULL,
        dono_original_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_deletados_usuario FOREIGN KEY (deletado_por_id)
          REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `)
    console.log('Tabela deletados_log criada/verificada com sucesso.')
  } catch (err) {
    console.error('Erro ao criar tabela deletados_log:', err.message)
  } finally {
    await closePool()
  }
}

main()
