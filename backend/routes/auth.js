import { Router } from 'express'
import { query } from '../db.js'
import bcrypt from 'bcryptjs'

const router = Router()

/**
 * POST /api/auth/login
 * Body: { usuario, senha }
 * Retorna: { ok: true, user: { id, nome, usuario, perfil } } ou { ok: false, error }
 */
router.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body
    if (!usuario?.trim() || !senha?.trim()) {
      return res.status(400).json({ ok: false, error: 'Usuário e senha são obrigatórios' })
    }
    const login = usuario.trim().toLowerCase()
    const [row] = await query(
      'SELECT id, nome, usuario, perfil, senha_hash, ativo FROM usuarios WHERE usuario = ? LIMIT 1',
      [login]
    )
    if (!row) {
      return res.status(401).json({ ok: false, error: 'Usuário ou senha incorretos' })
    }
    if (!row.ativo) {
      return res.status(401).json({ ok: false, error: 'Usuário inativo' })
    }
    const senhaOk = await bcrypt.compare(senha.trim(), row.senha_hash)
    if (!senhaOk) {
      return res.status(401).json({ ok: false, error: 'Usuário ou senha incorretos' })
    }
    const user = {
      id: row.id,
      nome: row.nome,
      usuario: row.usuario,
      perfil: row.perfil,
    }
    res.json({ ok: true, user })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

export default router
