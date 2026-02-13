import mariadb from 'mariadb'

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auxiliador_acionamentos',
  connectionLimit: 10,
  allowPublicKeyRetrieval: true,
})

/**
 * Obtém uma conexão do pool. Use com try/finally para liberar.
 * @returns {Promise<mariadb.PoolConnection>}
 */
export async function getConnection() {
  return pool.getConnection()
}

/**
 * Executa uma query usando uma conexão do pool (pega e libera automaticamente).
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>}
 */
export async function query(sql, params = []) {
  let conn
  try {
    conn = await pool.getConnection()
    const rows = await conn.query(sql, params)
    return rows
  } finally {
    if (conn) conn.release()
  }
}

/**
 * Testa a conexão e retorna o nome do banco atual (para health check).
 * @returns {Promise<{ ok: boolean, databaseName?: string, error?: string }>}
 */
export async function ping() {
  try {
    const conn = await pool.getConnection()
    await conn.ping()
    const rows = await conn.query('SELECT DATABASE() AS db')
    conn.release()
    const row = rows?.[0]
    const databaseName = row?.db ?? row?.DB ?? (row ? Object.values(row)[0] : null)
    return { ok: true, databaseName: databaseName ?? null }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Encerra o pool (chamar no shutdown do processo).
 */
export async function closePool() {
  await pool.end()
}

export default pool
