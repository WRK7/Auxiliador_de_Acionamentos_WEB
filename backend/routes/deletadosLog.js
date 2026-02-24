import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

function getUserFromHeaders(req) {
  const id = req.headers['x-user-id']
  const perfil = req.headers['x-user-perfil']
  return id && perfil ? { id: Number(id), perfil } : null
}

/**
 * GET /api/deletados-log
 * Somente admin_supremo pode acessar.
 * Query: dataInicio, dataFim, q (busca)
 */
router.get('/', async (req, res) => {
  try {
    const user = getUserFromHeaders(req)
    if (!user || user.perfil !== 'admin_supremo') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador supremo.' })
    }

    const { dataInicio, dataFim, q } = req.query
    const params = []
    const conditions = ['1 = 1']

    if (dataInicio && String(dataInicio).trim() !== '') {
      conditions.push('DATE(d.created_at) >= ?')
      params.push(String(dataInicio).trim().slice(0, 10))
    }
    if (dataFim && String(dataFim).trim() !== '') {
      conditions.push('DATE(d.created_at) <= ?')
      params.push(String(dataFim).trim().slice(0, 10))
    }
    if (q && String(q).trim() !== '') {
      const termo = `%${String(q).trim().toLowerCase()}%`
      conditions.push(`(
        LOWER(d.registro_codigo) LIKE ? OR LOWER(d.registro_resumo) LIKE ?
        OR LOWER(d.tabela_origem) LIKE ? OR LOWER(u_del.nome) LIKE ?
        OR LOWER(u_del.usuario) LIKE ? OR LOWER(IFNULL(u_dono.nome, '')) LIKE ?
      )`)
      for (let i = 0; i < 6; i++) params.push(termo)
    }

    const sql = `
      SELECT d.*,
             u_del.nome AS deletado_por_nome, u_del.usuario AS deletado_por_login,
             u_dono.nome AS dono_nome, u_dono.usuario AS dono_login
      FROM deletados_log d
      LEFT JOIN usuarios u_del ON u_del.id = d.deletado_por_id
      LEFT JOIN usuarios u_dono ON u_dono.id = d.dono_original_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY d.created_at DESC
    `
    const rows = await query(sql, params)

    const list = rows.map((r) => ({
      ...r,
      data_exclusao: r.created_at
        ? new Date(r.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          })
        : '',
      deletado_por: r.deletado_por_nome || r.deletado_por_login || `ID ${r.deletado_por_id}`,
      dono_original: r.dono_nome || r.dono_login || (r.dono_original_id ? `ID ${r.dono_original_id}` : '-'),
    }))

    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
