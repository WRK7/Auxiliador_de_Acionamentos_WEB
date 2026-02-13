/**
 * Cria a tabela usuarios (se não existir), adiciona coluna perfil (se faltar)
 * e insere o super admin inicial.
 *
 * Rode da pasta backend: node scripts/criar-tabela-e-super-admin.js
 *
 * Credenciais padrão (podem ser sobrescritas por variáveis de ambiente):
 *   SUPER_ADMIN_USUARIO, SUPER_ADMIN_SENHA, SUPER_ADMIN_NOME
 *
 * O super admin pode alterar a própria senha em Usuários > Editar seu usuário.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'

const SALT_ROUNDS = 10

const SUPER_ADMIN_USUARIO = process.env.SUPER_ADMIN_USUARIO || 'wesleycruzgomes7@gmail.com'
const SUPER_ADMIN_SENHA = process.env.SUPER_ADMIN_SENHA || '#Wesley7Desenvolvedor'
const SUPER_ADMIN_NOME = process.env.SUPER_ADMIN_NOME || 'Wesley'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('conciliador', 'admin', 'admin_supremo') NOT NULL DEFAULT 'conciliador',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`.trim()

async function main() {
  try {
    await query(CREATE_TABLE)
    console.log('Tabela usuarios criada ou já existente.')

    try {
      await query(`
        ALTER TABLE usuarios
        ADD COLUMN perfil ENUM('conciliador', 'admin', 'admin_supremo') NOT NULL DEFAULT 'conciliador'
        AFTER senha_hash
      `)
      console.log('Coluna perfil adicionada.')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        // Coluna já existe
      } else {
        throw err
      }
    }

    const [existe] = await query(
      'SELECT id FROM usuarios WHERE usuario = ? LIMIT 1',
      [SUPER_ADMIN_USUARIO.trim().toLowerCase()]
    )
    if (existe) {
      console.log('Super admin já existe no banco. Nada a fazer.')
      process.exit(0)
      return
    }

    const senhaHash = await bcrypt.hash(SUPER_ADMIN_SENHA, SALT_ROUNDS)
    await query(
      'INSERT INTO usuarios (nome, usuario, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, ?)',
      [SUPER_ADMIN_NOME.trim(), SUPER_ADMIN_USUARIO.trim().toLowerCase(), senhaHash, 'admin_supremo', 1]
    )
    console.log('Super admin criado com sucesso.')
    console.log('  Usuário (login):', SUPER_ADMIN_USUARIO)
    console.log('  Para alterar a própria senha: acesse Usuários > Editar seu usuário.')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}

main()
