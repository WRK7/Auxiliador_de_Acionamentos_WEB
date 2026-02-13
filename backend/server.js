import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { ping } from './db.js'
import usuariosRouter from './routes/usuarios.js'

const app = express()
const PORT = process.env.PORT || 3089
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3088'

app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json())
app.use('/api/usuarios', usuariosRouter)

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
