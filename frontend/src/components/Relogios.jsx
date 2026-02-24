import { useState, useEffect } from 'react'
import './Relogios.css'

/** Brasília: GMT-3. Campo Grande (MS): GMT-4 (America/Cuiaba). Sem chamada externa para evitar ERR_CONNECTION_RESET. */
const TIMEZONE_BRASILIA = 'America/Sao_Paulo'
const TIMEZONE_CAMPO_GRANDE = 'America/Cuiaba'

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
  const [tick, setTick] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const agora = new Date(tick)

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
