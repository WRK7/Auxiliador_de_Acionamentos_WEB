import { Router } from 'express'
import { query } from '../db.js'
import bcrypt from 'bcryptjs'

const router = Router()
const SALT_ROUNDS = 10

const CAMPOS_USUARIO = 'id, nome, usuario, perfil, ativo, created_at, updated_at'

/** Lista todos os usuários (sem expor senha). Se a tabela ou coluna não existir, retorna [] para a página carregar. */
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT ${CAMPOS_USUARIO} FROM usuarios ORDER BY FIELD(perfil, 'admin_supremo', 'admin', 'conciliador'), nome`
    )
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

/** Busca um usuário por id. */
router.get('/:id', async (req, res) => {
  try {
    const [row] = await query(
      `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = ?`,
      [req.params.id]
    )
    if (!row) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Valida perfil. */
function perfilValido(p) {
  return p === 'conciliador' || p === 'admin' || p === 'admin_supremo'
}

/** Cria usuário. Body: { nome, usuario, senha, perfil? } */
router.post('/', async (req, res) => {
  try {
    const { nome, usuario, senha, perfil } = req.body
    if (!nome?.trim() || !usuario?.trim() || !senha?.trim()) {
      return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' })
    }
    const perfilFinal = perfilValido(perfil) ? perfil : 'conciliador'
    const senhaHash = await bcrypt.hash(senha.trim(), SALT_ROUNDS)
    const result = await query(
      'INSERT INTO usuarios (nome, usuario, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [nome.trim(), usuario.trim().toLowerCase(), senhaHash, perfilFinal]
    )
    const [inserted] = await query(
      `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = ?`,
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

/** Atualiza usuário. Body: { nome?, usuario?, senha?, ativo?, perfil? } */
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { nome, usuario, senha, ativo, perfil } = req.body
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
    if (perfil !== undefined && perfilValido(perfil)) {
      updates.push('perfil = ?')
      params.push(perfil)
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
        `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = ?`,
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
      `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = ?`,
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

/** Remove usuário. Sem ?forcar=1: não permite se houver histórico (retorna 409). Com ?forcar=1: exclui mesmo assim (registros ficam com usuario_id NULL). */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const forcar = req.query.forcar === '1' || req.query.forcar === 'true'

    const [userExists] = await query('SELECT 1 FROM usuarios WHERE id = ?', [id])
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    if (!forcar) {
      const [temAcionamentos] = await query(
        'SELECT 1 FROM acionamentos WHERE usuario_id = ? LIMIT 1',
        [id]
      )
      const [temAguasGuariroba] = await query(
        'SELECT 1 FROM aguas_guariroba WHERE usuario_id = ? LIMIT 1',
        [id]
      )
      if (temAcionamentos || temAguasGuariroba) {
        return res.status(409).json({
          error:
            'Não é possível excluir: existem acionamentos ou registros da calculadora vinculados a este usuário. Desative o usuário em vez de excluí-lo.',
        })
      }
    }

    const result = await query('DELETE FROM usuarios WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    res.status(204).send()
  } catch (err) {
    if (err.errno === 1451) {
      return res.status(409).json({
        error:
          'Não é possível excluir: existem registros vinculados. Rode o script alter-usuario-id-set-null.js no backend e tente excluir com "Excluir mesmo assim".',
      })
    }
    res.status(500).json({ error: err.message })
  }
})

export default router
