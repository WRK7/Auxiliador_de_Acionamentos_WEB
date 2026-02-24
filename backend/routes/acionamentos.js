import { Router } from 'express'
import { query } from '../db.js'
import { LABEL_TO_COLUMN, COLUNAS_ELEMENTOS } from '../lib/camposAcionamento.js'

const router = Router()

/**
 * Lê usuário atual dos headers (enviados pelo frontend até haver JWT).
 * RLS: conciliador só vê os seus; admin pode filtrar por usuario_id (ver como conciliador) ou ver todos.
 */
function getUserFromHeaders(req) {
  const id = req.headers['x-user-id']
  const perfil = req.headers['x-user-perfil']
  return id && perfil ? { id: Number(id), perfil } : null
}

/** Prefixo do codigo a partir do tipo (ex.: ACD - ACORDO -> ACD). */
function prefixoFromTipo(tipo) {
  if (!tipo || typeof tipo !== 'string') return 'ACD'
  const t = tipo.toUpperCase()
  if (t.startsWith('ACD')) return 'ACD'
  if (t.startsWith('ACV')) return 'ACV'
  if (t.startsWith('ACP')) return 'ACP'
  if (t.startsWith('VIA')) return 'VIA'
  if (t.startsWith('ACC')) return 'ACC'
  if (t.startsWith('ACF')) return 'ACF'
  if (t.startsWith('DDA')) return 'DDA'
  return 'ACD'
}

/**
 * POST /api/acionamentos — salva acionamento gerado no Dashboard.
 * Body: { carteira, tipo, modelo_gerado, informacoes?, devedor?, valor? }
 * Headers: X-User-Id, X-User-Perfil (obrigatório)
 */
router.post('/', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user) {
      return res.status(401).json({ error: 'Usuário não identificado. Faça login novamente.' })
    }

    const { carteira, tipo, modelo_gerado, informacoes, devedor, valor } = req.body
    if (!carteira?.trim() || !tipo?.trim() || !modelo_gerado?.trim()) {
      return res.status(400).json({ error: 'Carteira, tipo e modelo_gerado são obrigatórios.' })
    }

    const prefixo = prefixoFromTipo(tipo)
    const year = new Date().getFullYear()
    const like = `${prefixo}-${year}-%`
    const [maxRow] = await query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(codigo, '-', -1) AS UNSIGNED)), 0) AS n FROM acionamentos WHERE codigo LIKE ?",
      [like]
    )
    const nextSeq = (maxRow?.n ?? 0) + 1
    const codigo = `${prefixo}-${year}-${String(nextSeq).padStart(3, '0')}`

    const informacoesStr =
      informacoes != null && typeof informacoes === 'object'
        ? JSON.stringify(informacoes)
        : informacoes != null && typeof informacoes === 'string'
          ? informacoes
          : null

    // Valores por coluna de elemento (label do frontend → coluna na tabela)
    const valoresPorColuna = {}
    if (informacoes != null && typeof informacoes === 'object') {
      for (const [label, val] of Object.entries(informacoes)) {
        const col = LABEL_TO_COLUMN[label]
        if (col != null && val != null && String(val).trim() !== '') {
          valoresPorColuna[col] = String(val).trim().slice(0, 500)
        }
      }
    }

    const baseCols = ['codigo', 'carteira', 'tipo', 'modelo_gerado', 'informacoes', 'devedor', 'valor', 'usuario_id']
    const baseVals = [
      codigo,
      carteira.trim(),
      tipo.trim(),
      modelo_gerado.trim(),
      informacoesStr,
      devedor?.trim() || null,
      valor?.trim() || null,
      user.id,
    ]
    const todasColunas = [...baseCols, ...COLUNAS_ELEMENTOS]
    const todosValores = [...baseVals, ...COLUNAS_ELEMENTOS.map((c) => valoresPorColuna[c] ?? null)]
    const placeholders = todasColunas.map(() => '?').join(', ')
    const colList = todasColunas.map((c) => `\`${c}\``).join(', ')

    await query(
      `INSERT INTO acionamentos (${colList}) VALUES (${placeholders})`,
      todosValores
    )

    res.status(201).json({ ok: true, codigo, message: 'Acionamento salvo no histórico.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/acionamentos
 * Query: dataInicio (YYYY-MM-DD), dataFim (YYYY-MM-DD), carteira, tipo, q (busca texto), usuario_id (admin: filtrar por conciliador)
 * Headers: X-User-Id, X-User-Perfil (obrigatórios para RLS)
 */
router.get('/', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user) {
      return res.status(401).json({ error: 'Usuário não identificado. Faça login novamente.' })
    }

    const { dataInicio, dataFim, carteira, tipo, q, usuario_id: filtroUsuarioId } = req.query
    const params = []
    const conditions = ['1 = 1']

    if (user.perfil === 'conciliador') {
      conditions.push('a.usuario_id = ?')
      params.push(user.id)
    } else if (user.perfil === 'admin') {
      conditions.push("u.perfil != 'admin_supremo'")
      if (filtroUsuarioId && String(filtroUsuarioId).trim() !== '') {
        conditions.push('a.usuario_id = ?')
        params.push(Number(filtroUsuarioId))
      }
    } else if (filtroUsuarioId && String(filtroUsuarioId).trim() !== '') {
      conditions.push('a.usuario_id = ?')
      params.push(Number(filtroUsuarioId))
    }

    if (dataInicio && String(dataInicio).trim() !== '') {
      conditions.push('DATE(a.created_at) >= ?')
      params.push(String(dataInicio).trim().slice(0, 10))
    }
    if (dataFim && String(dataFim).trim() !== '') {
      conditions.push('DATE(a.created_at) <= ?')
      params.push(String(dataFim).trim().slice(0, 10))
    }
    if (carteira && String(carteira).trim() !== '') {
      conditions.push('a.carteira = ?')
      params.push(String(carteira).trim())
    }
    if (tipo && String(tipo).trim() !== '') {
      conditions.push('a.tipo = ?')
      params.push(String(tipo).trim())
    }
    if (q && String(q).trim() !== '') {
      const termo = `%${String(q).trim().toLowerCase()}%`
      conditions.push(`(
        LOWER(a.codigo) LIKE ? OR LOWER(a.carteira) LIKE ? OR LOWER(a.tipo) LIKE ?
        OR LOWER(a.devedor) LIKE ? OR LOWER(IFNULL(a.valor, '')) LIKE ?
        OR LOWER(a.modelo_gerado) LIKE ? OR LOWER(u.nome) LIKE ? OR LOWER(u.usuario) LIKE ?
      )`)
      for (let i = 0; i < 8; i++) params.push(termo)
    }

    const sql = `
      SELECT a.id, a.codigo, a.created_at, a.carteira, a.tipo, a.modelo_gerado, a.informacoes, a.devedor, a.valor, a.usuario_id,
             u.nome AS usuario_nome, u.usuario AS usuario_login
      FROM acionamentos a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
    `
    const rows = await query(sql, params)

    // Formatar created_at para DD/MM/YYYY HH:mm (frontend espera data_criacao nesse formato)
    const list = rows.map((r) => ({
      ...r,
      data_criacao: r.created_at
        ? new Date(r.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        : '',
      id: r.codigo,
      usuario: r.usuario_nome || r.usuario_login || '',
      informacoes: r.informacoes ? (typeof r.informacoes === 'string' ? JSON.parse(r.informacoes) : r.informacoes) : {},
    }))

    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/acionamentos/:id — por id numérico (PK) ou por codigo
 * RLS: conciliador só acessa os seus; admin acessa qualquer.
 */
router.get('/:id', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user) {
      return res.status(401).json({ error: 'Usuário não identificado. Faça login novamente.' })
    }

    const idParam = req.params.id
    const isNumeric = /^\d+$/.test(idParam)
    const sql = isNumeric
      ? `SELECT a.*, u.nome AS usuario_nome, u.usuario AS usuario_login
         FROM acionamentos a INNER JOIN usuarios u ON u.id = a.usuario_id WHERE a.id = ?`
      : `SELECT a.*, u.nome AS usuario_nome, u.usuario AS usuario_login
         FROM acionamentos a INNER JOIN usuarios u ON u.id = a.usuario_id WHERE a.codigo = ?`
    const params = [isNumeric ? Number(idParam) : idParam]

    const [row] = await query(sql, params)
    if (!row) {
      return res.status(404).json({ error: 'Acionamento não encontrado' })
    }

    if (user.perfil === 'conciliador' && row.usuario_id !== user.id) {
      return res.status(403).json({ error: 'Sem permissão para ver este acionamento' })
    }

    const item = {
      ...row,
      id: row.codigo,
      data_criacao: row.created_at
        ? new Date(row.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        : '',
      usuario: row.usuario_nome || row.usuario_login || '',
      informacoes: row.informacoes ? (typeof row.informacoes === 'string' ? JSON.parse(row.informacoes) : row.informacoes) : {},
    }

    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/acionamentos/:id
 * Dono pode deletar o próprio; admin_supremo pode deletar qualquer um.
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user) {
      return res.status(401).json({ error: 'Usuário não identificado. Faça login novamente.' })
    }

    const idParam = req.params.id
    const isNumeric = /^\d+$/.test(idParam)
    const findSql = isNumeric
      ? 'SELECT * FROM acionamentos WHERE id = ?'
      : 'SELECT * FROM acionamentos WHERE codigo = ?'
    const [row] = await query(findSql, [isNumeric ? Number(idParam) : idParam])

    if (!row) {
      return res.status(404).json({ error: 'Acionamento não encontrado.' })
    }

    const isOwner = row.usuario_id === user.id
    const isSupremo = user.perfil === 'admin_supremo'

    if (!isOwner && !isSupremo) {
      return res.status(403).json({ error: 'Sem permissão para deletar este acionamento.' })
    }

    await query(
      `INSERT INTO deletados_log (tabela_origem, registro_codigo, registro_resumo, deletado_por_id, dono_original_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'acionamentos',
        row.codigo || String(row.id),
        `${row.carteira || ''} | ${row.tipo || ''} | ${row.devedor || ''}`.slice(0, 500),
        user.id,
        row.usuario_id,
      ]
    )

    await query('DELETE FROM acionamentos WHERE id = ?', [row.id])

    res.json({ ok: true, message: 'Acionamento deletado.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
