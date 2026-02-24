import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { ping } from './db.js'
import usuariosRouter from './routes/usuarios.js'
import authRouter from './routes/auth.js'
import solicitacoesRouter from './routes/solicitacoes.js'
import acionamentosRouter from './routes/acionamentos.js'
import aguasGuarirobaRouter from './routes/aguasGuariroba.js'
import deletadosLogRouter from './routes/deletadosLog.js'

const app = express()
const PORT = process.env.PORT || 3089
// Várias origens separadas por vírgula; aceita acesso por localhost ou IP da rede (ex.: 10.100.20.137:3088)
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3088,http://10.100.20.137:3088')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/solicitacoes', solicitacoesRouter)
app.use('/api/acionamentos', acionamentosRouter)
app.use('/api/aguas-guariroba', aguasGuarirobaRouter)
app.use('/api/deletados-log', deletadosLogRouter)

app.get('/api/health', async (req, res) => {
  const db = await ping()
  res.json({
    ok: true,
    message: 'Backend Auxiliador de Acionamentos',
    database: db.ok ? 'connected' : 'disconnected',
    ...(db.ok && { databaseName: db.databaseName ?? null }),
    ...(db.error && { databaseError: db.error }),
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend rodando em http://localhost:${PORT} (network: 0.0.0.0:${PORT})`)
})
