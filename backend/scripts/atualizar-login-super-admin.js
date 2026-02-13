/**
 * Atualiza o login do super admin para "wesley" (por perfil, não depende do valor atual).
 * Rode: node scripts/atualizar-login-super-admin.js
 */
import 'dotenv/config'
import { query } from '../db.js'

const novoLogin = process.env.SUPER_ADMIN_NOVO_USUARIO || 'wesley'
const result = await query(
  "UPDATE usuarios SET usuario = ? WHERE perfil = 'admin_supremo' LIMIT 1",
  [novoLogin]
)
const n = result?.affectedRows ?? (typeof result === 'number' ? result : 0)
console.log(n ? `Login do admin supremo alterado para: ${novoLogin}` : 'Nenhuma linha alterada (verifique se existe usuário com perfil admin_supremo).')
process.exit(0)
