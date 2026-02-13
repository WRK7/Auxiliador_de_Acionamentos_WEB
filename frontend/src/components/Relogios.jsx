import { useState, useEffect } from 'react'
import './Relogios.css'

/** Brasília: GMT-3 (Horário de Brasília). Campo Grande (MS): GMT-4 (America/Cuiaba). */
const TIMEZONE_BRASILIA = 'America/Sao_Paulo'
const TIMEZONE_CAMPO_GRANDE = 'America/Cuiaba'

/** Busca a hora oficial do servidor e retorna o offset em ms (servidor - local). */
async function buscarOffsetServidor() {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo')
    if (!res.ok) return null
    const data = await res.json()
    const serverTime = new Date(data.datetime)
    return serverTime.getTime() - Date.now()
  } catch {
    return null
  }
}

function formatarHora(d, timeZone) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}

export default function Relogios() {
  const [offsetMs, setOffsetMs] = useState(null)
  const [tick, setTick] = useState(Date.now())

  useEffect(() => {
    let mounted = true
    buscarOffsetServidor().then((off) => {
      if (mounted && off != null) setOffsetMs(off)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const agora = new Date(tick + (offsetMs ?? 0))

  return (
    <div className="relogios" role="timer" aria-live="polite">
      <div className="relogio-item">
        <span className="relogio-label">Campo Grande (MS)</span>
        <span className="relogio-hora">{formatarHora(agora, TIMEZONE_CAMPO_GRANDE)}</span>
      </div>
      <div className="relogio-item">
        <span className="relogio-label">Brasília</span>
        <span className="relogio-hora">{formatarHora(agora, TIMEZONE_BRASILIA)}</span>
      </div>
    </div>
  )
}
