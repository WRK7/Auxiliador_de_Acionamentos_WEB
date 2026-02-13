/**
 * Adiciona a coluna perfil na tabela usuarios.
 * Perfis: conciliador (pode tudo menos usuários), admin (tudo menos admin supremo e outros admins), admin_supremo (pode tudo).
 * Rode da pasta backend: node scripts/adicionar-perfil-usuarios.js
 */
import 'dotenv/config'
import { query } from '../db.js'

async function main() {
  try {
    await query(`
      ALTER TABLE usuarios
      ADD COLUMN perfil ENUM('conciliador', 'admin', 'admin_supremo') NOT NULL DEFAULT 'conciliador'
      AFTER ativo
    `)
    console.log('Coluna perfil adicionada à tabela usuarios.')
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Coluna perfil já existe.')
      process.exit(0)
      return
    }
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
