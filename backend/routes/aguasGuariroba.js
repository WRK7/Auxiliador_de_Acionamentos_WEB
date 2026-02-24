import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

function getUserFromHeaders(req) {
  const id = req.headers['x-user-id']
  const perfil = req.headers['x-user-perfil']
  return id && perfil ? { id: Number(id), perfil } : null
}

/**
 * POST /api/aguas-guariroba — salva acionamento da calculadora Águas Guariroba.
 */
router.post('/', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user) {
      return res.status(401).json({ error: 'Usuário não identificado. Faça login novamente.' })
    }

    const {
      tipo,
      valorDebito,
      diasAtraso,
      descontoPercentual,
      valorAtualizado,
      valorNegociado,
      matriculaSituacao,
      matriculaNumero,
      documentoTipo,
      documentoNumero,
      titular,
      vencimento,
      contato,
      valorEntrada,
      numeroParcelas,
      valorParcela,
      modeloGerado,
    } = req.body

    if (!tipo || !['a_vista', 'parcelado'].includes(String(tipo))) {
      return res.status(400).json({ error: 'tipo deve ser a_vista ou parcelado.' })
    }
    const valorDebitoNum = Number(valorDebito)
    const diasAtrasoNum = Number(diasAtraso)
    const descontoNum = Number(descontoPercentual)
    if (Number.isNaN(valorDebitoNum) || valorDebitoNum < 0 || Number.isNaN(diasAtrasoNum) || diasAtrasoNum < 0) {
      return res.status(400).json({ error: 'Valor do débito e dias em atraso são obrigatórios e devem ser válidos.' })
    }

    const year = new Date().getFullYear()
    const prefix = `AG-${year}-`
    const rows = await query(
      "SELECT COUNT(*) AS total FROM aguas_guariroba WHERE codigo LIKE ?",
      [`${prefix}%`]
    )
    const nextSeq = Number(rows?.[0]?.total ?? 0) + 1
    const codigo = `${prefix}${String(nextSeq).padStart(3, '0')}`

    const vencimentoDate = vencimento && /^\d{4}-\d{2}-\d{2}$/.test(String(vencimento).trim()) ? String(vencimento).trim() : null
    const valorAtualizadoNum = valorAtualizado != null && valorAtualizado !== '' ? Number(valorAtualizado) : null
    const valorNegociadoNum = valorNegociado != null && valorNegociado !== '' ? Number(valorNegociado) : null
    const valorEntradaNum = valorEntrada != null && valorEntrada !== '' ? Number(valorEntrada) : null
    const numeroParcelasInt = numeroParcelas != null && numeroParcelas !== '' ? parseInt(numeroParcelas, 10) : null
    const valorParcelaNum = valorParcela != null && valorParcela !== '' ? Number(valorParcela) : null

    await query(
      `INSERT INTO aguas_guariroba (
        codigo, usuario_id, tipo, valor_debito, dias_atraso, desconto_percentual,
        valor_atualizado, valor_negociado, matricula_situacao, matricula_numero,
        documento_tipo, documento_numero, titular, vencimento, contato,
        valor_entrada, numero_parcelas, valor_parcela, modelo_gerado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        user.id,
        String(tipo).trim(),
        valorDebitoNum,
        diasAtrasoNum,
        Number.isNaN(descontoNum) ? 0 : descontoNum,
        valorAtualizadoNum,
        valorNegociadoNum,
        matriculaSituacao?.trim() || null,
        matriculaNumero?.trim() || null,
        documentoTipo?.trim() || null,
        documentoNumero?.trim() || null,
        titular?.trim() || null,
        vencimentoDate,
        contato?.trim() || null,
        valorEntradaNum,
        numeroParcelasInt,
        valorParcelaNum,
        modeloGerado?.trim() || null,
      ]
    )

    res.status(201).json({ ok: true, codigo, message: 'Salvo no histórico da Águas Guariroba.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/aguas-guariroba — lista com RLS (conciliador vê os seus; admin pode filtrar por usuario_id).
 * Query: dataInicio, dataFim, tipo, q (busca), usuario_id (admin)
 */
router.get('/', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user) {
      return res.status(401).json({ error: 'Usuário não identificado. Faça login novamente.' })
    }

    const { dataInicio, dataFim, tipo, q, usuario_id: filtroUsuarioId } = req.query
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
    if (tipo && String(tipo).trim() !== '') {
      conditions.push('a.tipo = ?')
      params.push(String(tipo).trim())
    }
    if (q && String(q).trim() !== '') {
      const termo = `%${String(q).trim().toLowerCase()}%`
      conditions.push(`(
        LOWER(a.codigo) LIKE ? OR LOWER(a.titular) LIKE ? OR LOWER(a.documento_numero) LIKE ?
        OR LOWER(a.matricula_numero) LIKE ? OR LOWER(a.contato) LIKE ?
      )`)
      for (let i = 0; i < 5; i++) params.push(termo)
    }

    const sql = `
      SELECT a.*, u.nome AS usuario_nome, u.usuario AS usuario_login
      FROM aguas_guariroba a
      INNER JOIN usuarios u ON u.id = a.usuario_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
    `
    const rows = await query(sql, params)

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
    }))

    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/aguas-guariroba/:id
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
      ? 'SELECT * FROM aguas_guariroba WHERE id = ?'
      : 'SELECT * FROM aguas_guariroba WHERE codigo = ?'
    const [row] = await query(findSql, [isNumeric ? Number(idParam) : idParam])

    if (!row) {
      return res.status(404).json({ error: 'Registro não encontrado.' })
    }

    const isOwner = row.usuario_id === user.id
    const isSupremo = user.perfil === 'admin_supremo'

    if (!isOwner && !isSupremo) {
      return res.status(403).json({ error: 'Sem permissão para deletar este registro.' })
    }

    await query(
      `INSERT INTO deletados_log (tabela_origem, registro_codigo, registro_resumo, deletado_por_id, dono_original_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'aguas_guariroba',
        row.codigo || String(row.id),
        `AG | ${row.tipo || ''} | ${row.titular || ''}`.slice(0, 500),
        user.id,
        row.usuario_id,
      ]
    )

    await query('DELETE FROM aguas_guariroba WHERE id = ?', [row.id])

    res.json({ ok: true, message: 'Registro deletado.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
