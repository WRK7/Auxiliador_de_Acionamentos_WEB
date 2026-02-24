import { Router } from 'express'
import { query } from '../db.js'
import bcrypt from 'bcryptjs'

const router = Router()
const SALT_ROUNDS = 10

/** Lista solicitações (todas ou só pendentes). Query: ?status=pendente */
router.get('/', async (req, res) => {
  try {
    const status = req.query.status
    let sql = 'SELECT id, nome, usuario, status, created_at FROM solicitacoes_cadastro'
    const params = []
    if (status === 'pendente' || status === 'aprovado' || status === 'rejeitado') {
      sql += ' WHERE status = ?'
      params.push(status)
    }
    sql += ' ORDER BY created_at DESC'
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Cria solicitação de cadastro (público – tela de registro). Body: { nome, usuario, senha } */
router.post('/', async (req, res) => {
  try {
    const { nome, usuario, senha } = req.body
    if (!nome?.trim() || !usuario?.trim() || !senha?.trim()) {
      return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' })
    }
    const senhaHash = await bcrypt.hash(senha.trim(), SALT_ROUNDS)
    await query(
      'INSERT INTO solicitacoes_cadastro (nome, usuario, senha_hash) VALUES (?, ?, ?)',
      [nome.trim(), usuario.trim().toLowerCase(), senhaHash]
    )
    res.status(201).json({ ok: true, message: 'Solicitação enviada. Aguarde aprovação de um administrador.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Aprovar: cria usuário conciliador e marca solicitação como aprovada. */
router.patch('/:id/aprovar', async (req, res) => {
  try {
    const id = req.params.id
    const [sol] = await query(
      'SELECT id, nome, usuario, senha_hash FROM solicitacoes_cadastro WHERE id = ? AND status = ?',
      [id, 'pendente']
    )
    if (!sol) {
      return res.status(404).json({ error: 'Solicitação não encontrada ou já foi processada' })
    }
    const [existe] = await query('SELECT id FROM usuarios WHERE usuario = ?', [sol.usuario])
    if (existe) {
      return res.status(409).json({ error: 'Já existe um usuário com este login. Rejeite a solicitação se não for válida.' })
    }
    await query(
      'INSERT INTO usuarios (nome, usuario, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [sol.nome, sol.usuario, sol.senha_hash, 'conciliador']
    )
    await query('UPDATE solicitacoes_cadastro SET status = ? WHERE id = ?', ['aprovado', id])
    res.json({ ok: true, message: 'Solicitação aprovada e usuário criado.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Rejeitar: marca solicitação como rejeitada. */
router.patch('/:id/rejeitar', async (req, res) => {
  try {
    const id = req.params.id
    const result = await query(
      'UPDATE solicitacoes_cadastro SET status = ? WHERE id = ? AND status = ?',
      ['rejeitado', id, 'pendente']
    )
    const affected = result?.affectedRows ?? (typeof result === 'number' ? result : 0)
    if (!affected) {
      return res.status(404).json({ error: 'Solicitação não encontrada ou já foi processada' })
    }
    res.json({ ok: true, message: 'Solicitação rejeitada.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
