import { Router } from 'express'
import { query } from '../db.js'
import bcrypt from 'bcryptjs'

const router = Router()
const SALT_ROUNDS = 10

/** Lista todos os usuários (sem expor senha). */
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, nome, usuario, ativo, created_at, updated_at FROM usuarios ORDER BY nome'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Busca um usuário por id. */
router.get('/:id', async (req, res) => {
  try {
    const [row] = await query(
      'SELECT id, nome, usuario, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
      [req.params.id]
    )
    if (!row) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Cria usuário. Body: { nome, usuario, senha } */
router.post('/', async (req, res) => {
  try {
    const { nome, usuario, senha } = req.body
    if (!nome?.trim() || !usuario?.trim() || !senha?.trim()) {
      return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' })
    }
    const senhaHash = await bcrypt.hash(senha.trim(), SALT_ROUNDS)
    const result = await query(
      'INSERT INTO usuarios (nome, usuario, senha_hash) VALUES (?, ?, ?)',
      [nome.trim(), usuario.trim().toLowerCase(), senhaHash]
    )
    const [inserted] = await query(
      'SELECT id, nome, usuario, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
      [result.insertId]
    )
    res.status(201).json(inserted)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Usuário (login) já existe' })
    }
    res.status(500).json({ error: err.message })
  }
})

/** Atualiza usuário. Body: { nome?, usuario?, senha?, ativo? } */
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { nome, usuario, senha, ativo } = req.body
    const updates = []
    const params = []
    if (nome !== undefined) {
      updates.push('nome = ?')
      params.push(nome.trim())
    }
    if (usuario !== undefined) {
      updates.push('usuario = ?')
      params.push(usuario.trim().toLowerCase())
    }
    if (senha !== undefined && senha !== '') {
      updates.push('senha_hash = ?')
      params.push(await bcrypt.hash(senha.trim(), SALT_ROUNDS))
    }
    if (ativo !== undefined) {
      updates.push('ativo = ?')
      params.push(ativo ? 1 : 0)
    }
    if (updates.length === 0) {
      const [row] = await query(
        'SELECT id, nome, usuario, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
        [id]
      )
      if (!row) return res.status(404).json({ error: 'Usuário não encontrado' })
      return res.json(row)
    }
    params.push(id)
    await query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
      params
    )
    const [row] = await query(
      'SELECT id, nome, usuario, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
      [id]
    )
    if (!row) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(row)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Usuário (login) já existe' })
    }
    res.status(500).json({ error: err.message })
  }
})

/** Remove usuário. */
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM usuarios WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
