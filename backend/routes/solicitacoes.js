import { Router } from 'express'
import { query } from '../db.js'
import bcrypt from 'bcryptjs'

const router = Router()
const SALT_ROUNDS = 10

/** Lista solicitações (todas ou só pendentes). Query: ?status=pendente. Se tabela não existir, retorna [] para a página carregar. */
router.get('/', async (req, res) => {
  try {
    const status = req.query.status
    if (status === 'pendente') {
      try {
        const rows = await query(
          `SELECT s.id, s.nome, s.usuario, s.status, s.created_at
           FROM solicitacoes_cadastro s
           LEFT JOIN usuarios u ON u.usuario = s.usuario
           WHERE s.status = ? AND u.id IS NULL
           ORDER BY s.created_at DESC`,
          ['pendente']
        )
        return res.json(rows)
      } catch (joinErr) {
        const tabelaFaltando = joinErr.code === 'ER_NO_SUCH_TABLE' || joinErr.errno === 1146
        if (tabelaFaltando) {
          try {
            const rows = await query(
              'SELECT id, nome, usuario, status, created_at FROM solicitacoes_cadastro WHERE status = ? ORDER BY created_at DESC',
              ['pendente']
            )
            return res.json(rows)
          } catch {
            return res.json([])
          }
        }
        throw joinErr
      }
    }
    let sql = 'SELECT id, nome, usuario, status, created_at FROM solicitacoes_cadastro'
    const params = []
    if (status === 'aprovado' || status === 'rejeitado') {
      sql += ' WHERE status = ?'
      params.push(status)
    }
    sql += ' ORDER BY created_at DESC'
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    const schemaFaltando =
      err.code === 'ER_NO_SUCH_TABLE' ||
      err.code === 'ER_BAD_FIELD_ERROR' ||
      err.errno === 1146 ||
      err.errno === 1054
    if (schemaFaltando) return res.json([])
    res.status(500).json({ error: err.message })
  }
})

/** Cria solicitação de cadastro (público – tela de registro). Body: { nome, usuario, senha }. Bloqueia se já existir usuário ou solicitação pendente com o mesmo login. */
router.post('/', async (req, res) => {
  try {
    const { nome, usuario, senha } = req.body
    if (!nome?.trim() || !usuario?.trim() || !senha?.trim()) {
      return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' })
    }
    const login = usuario.trim().toLowerCase()

    const [existeUsuario] = await query('SELECT id FROM usuarios WHERE usuario = ?', [login])
    if (existeUsuario) {
      return res.status(409).json({
        error: 'Já existe uma conta com este usuário (login). Faça login ou use outro usuário para solicitar cadastro.',
      })
    }

    const [solicitacaoPendente] = await query(
      'SELECT id FROM solicitacoes_cadastro WHERE usuario = ? AND status = ?',
      [login, 'pendente']
    )
    if (solicitacaoPendente) {
      return res.status(409).json({
        error: 'Já existe uma solicitação pendente com este usuário. Aguarde a aprovação de um administrador.',
      })
    }

    const senhaHash = await bcrypt.hash(senha.trim(), SALT_ROUNDS)
    await query(
      'INSERT INTO solicitacoes_cadastro (nome, usuario, senha_hash) VALUES (?, ?, ?)',
      [nome.trim(), login, senhaHash]
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
