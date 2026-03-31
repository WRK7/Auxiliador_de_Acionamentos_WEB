import { Router } from 'express'
import { query, getConnection } from '../db.js'
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

/** Prefixo do codigo a partir do tipo (ex.: ACD - ACORDO -> ACD, ACA - A VISTA -> ACA). */
function prefixoFromTipo(tipo) {
  if (!tipo || typeof tipo !== 'string') return 'ACD'
  const t = tipo.toUpperCase()
  if (t.startsWith('ACA')) return 'ACA'
  if (t.startsWith('ACD')) return 'ACD'
  if (t.startsWith('ACV')) return 'ACV'
  if (t.startsWith('ACP')) return 'ACP'
  if (t.startsWith('VIA')) return 'VIA'
  if (t.startsWith('ACC')) return 'ACC'
  if (t.startsWith('ACF')) return 'ACF'
  if (t.startsWith('DDA')) return 'DDA'
  return 'ACD'
}

function isDuplicateKeyError(err, keyName = '') {
  if (!err) return false
  const duplicate = err.code === 'ER_DUP_ENTRY' || err.errno === 1062
  if (!duplicate) return false
  if (!keyName) return true
  return String(err.message || '').includes(keyName)
}

async function gerarCodigoAcionamento(prefixo, year) {
  let nextSeq
  const seqConn = await getConnection()
  try {
    await seqConn.query(
      'INSERT INTO codigo_sequencia (prefixo, ano, proximo) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE prefixo = prefixo',
      [prefixo, year]
    )
    await seqConn.query(
      'UPDATE codigo_sequencia SET proximo = LAST_INSERT_ID(proximo + 1) WHERE prefixo = ? AND ano = ?',
      [prefixo, year]
    )
    const [seqRow] = await seqConn.query('SELECT LAST_INSERT_ID() AS n')
    nextSeq = Math.max(1, Number(seqRow?.n ?? 1))
  } catch {
    const [maxRow] = await seqConn.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(codigo, '-', -1) AS UNSIGNED)), 0) AS n FROM acionamentos WHERE codigo LIKE ?",
      [`${prefixo}-${year}-%`]
    )
    nextSeq = Math.max(1, (maxRow?.n ?? 0) + 1)
  } finally {
    seqConn.release()
  }
  return `${prefixo}-${year}-${String(nextSeq).padStart(5, '0')}`
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
    const todasColunas = [...baseCols, ...COLUNAS_ELEMENTOS]
    const placeholders = todasColunas.map(() => '?').join(', ')
    const colList = todasColunas.map((c) => `\`${c}\``).join(', ')
    const valoresElementos = COLUNAS_ELEMENTOS.map((c) => valoresPorColuna[c] ?? null)

    const MAX_TENTATIVAS = 5
    let codigo = null
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
      codigo = await gerarCodigoAcionamento(prefixo, year)
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
      const todosValores = [...baseVals, ...valoresElementos]
      try {
        await query(
          `INSERT INTO acionamentos (${colList}) VALUES (${placeholders})`,
          todosValores
        )
        return res.status(201).json({ ok: true, codigo, message: 'Acionamento salvo no histórico.' })
      } catch (insertErr) {
        if (isDuplicateKeyError(insertErr, 'uk_codigo')) continue
        throw insertErr
      }
    }

    return res.status(409).json({
      error: 'Não foi possível gerar um código único para o acionamento. Tente novamente.',
      code: 'CODIGO_DUPLICADO',
      codigo_sugerido: codigo,
    })
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

    const sqlComValorPag = `
      SELECT a.id, a.codigo, a.created_at, a.carteira, a.tipo, a.modelo_gerado, a.informacoes, a.devedor, a.valor, a.usuario_id,
             a.\`valor_para_pagamento\`,
             u.nome AS usuario_nome, u.usuario AS usuario_login
      FROM acionamentos a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
    `
    const sqlSemValorPag = `
      SELECT a.id, a.codigo, a.created_at, a.carteira, a.tipo, a.modelo_gerado, a.informacoes, a.devedor, a.valor, a.usuario_id,
             u.nome AS usuario_nome, u.usuario AS usuario_login
      FROM acionamentos a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
    `
    let rows
    try {
      rows = await query(sqlComValorPag, params)
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054) {
        rows = await query(sqlSemValorPag, params)
        rows.forEach((r) => { r.valor_para_pagamento = null }) // coluna não existe
      } else throw e
    }

    const VALOR_KEYS = ['Valor para Pagamento', 'Valor Proposto', 'Valor Total Atualizado', 'Valor Atualizado', 'Valor']

    function valorFromInformacoes(info) {
      if (!info || typeof info !== 'object') return null
      for (const k of VALOR_KEYS) {
        if (info[k] != null && String(info[k]).trim() !== '') return String(info[k]).trim()
      }
      // Fallback: chave com nome parecido (ex. variação de espaço/unicode)
      const alvo = 'valor para pagamento'
      for (const [key, val] of Object.entries(info)) {
        if (val != null && String(val).trim() !== '' && key && key.toLowerCase().replace(/\s+/g, ' ').trim() === alvo) return String(val).trim()
      }
      return null
    }

    /** Fallback: extrai valor do JSON bruto quando a chave no objeto parseado não bate (ex.: encoding). */
    function valorFromRawJson(raw) {
      if (raw == null) return null
      const str = typeof raw === 'string' ? raw : (Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw))
      const m = str.match(/"Valor para Pagamento"\s*:\s*"([^"]*)"/)
      if (m && m[1] && m[1].trim()) return m[1].trim()
      const m2 = str.match(/"Valor Proposto"\s*:\s*"([^"]*)"/)
      if (m2 && m2[1] && m2[1].trim()) return m2[1].trim()
      return null
    }

    // Formatar created_at para DD/MM/YYYY HH:mm (frontend espera data_criacao nesse formato)
    const list = rows.map((r) => {
      let informacoes = {}
      try {
        const raw = r.informacoes
        if (raw != null) {
          informacoes = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (typeof informacoes !== 'object' || informacoes === null) informacoes = {}
        }
      } catch {
        informacoes = {}
      }
      const valorExtraido = valorFromInformacoes(informacoes)
      const valorFromRaw = valorFromRawJson(typeof r.informacoes === 'string' ? r.informacoes : null)
      const valorCol = r.valor_para_pagamento != null && String(r.valor_para_pagamento).trim() !== '' ? String(r.valor_para_pagamento).trim() : null
      const valorExibir = (r.valor != null && String(r.valor).trim() !== '') ? String(r.valor).trim() : (valorCol || valorExtraido || valorFromRaw || null)
      return {
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
        informacoes,
        valor: valorExibir,
      }
    })

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
