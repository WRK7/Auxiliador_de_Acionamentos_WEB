import { Router } from 'express'
import { query } from '../db.js'
import { LISTA_CARTEIRAS } from '../lib/carteirasLista.js'

const router = Router()

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS carteiras (
  nome VARCHAR(100) NOT NULL PRIMARY KEY,
  ativo TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

async function garantirTabelaCarteiras() {
  await query(CREATE_TABLE)
  for (const nome of LISTA_CARTEIRAS) {
    await query('INSERT IGNORE INTO carteiras (nome, ativo) VALUES (?, 1)', [nome])
  }
}

function getUser(req) {
  const id = req.headers['x-user-id']
  const perfil = req.headers['x-user-perfil']
  return id && perfil ? { id: Number(id), perfil } : null
}

/** Lista todas as carteiras com estado ativo (1 ou 0). Se a tabela não existir, retorna todas ativas. */
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      'SELECT nome, ativo FROM carteiras ORDER BY nome'
    )
    const map = new Map(rows.map((r) => [r.nome, r.ativo]))
    const result = LISTA_CARTEIRAS.map((nome) => ({
      nome,
      ativo: map.has(nome) ? Boolean(map.get(nome)) : true,
    }))
    res.json(result)
  } catch (err) {
    const tabelaInexistente =
      err.code === 'ER_NO_SUCH_TABLE' ||
      err.errno === 1146 ||
      (err.message && String(err.message).includes("doesn't exist"))
    if (tabelaInexistente) {
      return res.json(LISTA_CARTEIRAS.map((nome) => ({ nome, ativo: true })))
    }
    res.status(500).json({ error: err.message })
  }
})

/** Atualiza ativo da carteira. Body: { ativo: true | false }. Apenas admin. */
router.patch('/:nome', async (req, res) => {
  try {
    const user = getUser(req)
    if (!user || (user.perfil !== 'admin' && user.perfil !== 'admin_supremo')) {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' })
    }
    const nome = decodeURIComponent(req.params.nome)
    const { ativo } = req.body
    if (!LISTA_CARTEIRAS.includes(nome)) {
      return res.status(404).json({ error: 'Carteira não encontrada' })
    }
    const ativoNum = ativo === true || ativo === 1 ? 1 : 0
    try {
      await query(
        'INSERT INTO carteiras (nome, ativo) VALUES (?, ?) ON DUPLICATE KEY UPDATE ativo = ?',
        [nome, ativoNum, ativoNum]
      )
    } catch (err) {
      const tabelaInexistente =
        err.code === 'ER_NO_SUCH_TABLE' ||
        err.errno === 1146 ||
        (err.message && String(err.message).includes("doesn't exist"))
      if (tabelaInexistente) {
        await garantirTabelaCarteiras()
        await query(
          'INSERT INTO carteiras (nome, ativo) VALUES (?, ?) ON DUPLICATE KEY UPDATE ativo = ?',
          [nome, ativoNum, ativoNum]
        )
      } else {
        throw err
      }
    }
    res.json({ nome, ativo: ativoNum === 1 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
