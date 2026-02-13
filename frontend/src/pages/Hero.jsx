import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import './Hero.css'

const RIPPLE_COUNT = 6

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

export default function Hero() {
  const rippleStyles = useMemo(() =>
    Array.from({ length: RIPPLE_COUNT }, () => ({
      left: `${randomBetween(8, 92)}%`,
      top: `${randomBetween(8, 92)}%`,
      animationDuration: `${randomBetween(3, 5).toFixed(1)}s`,
      animationDelay: `${randomBetween(0, 4).toFixed(1)}s`,
    })),
    []
  )

  return (
    <main className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-orbs" aria-hidden="true">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-orb hero-orb-4" />
      </div>
      <div className="hero-ripples" aria-hidden="true">
        {rippleStyles.map((style, i) => (
          <div key={i} className="hero-ripple" style={style} />
        ))}
      </div>
      <div className="hero-content">
        <div className="hero-badge">Auxiliador de Acionamentos</div>
        <h1 className="hero-title">
          Suporte inteligente para <span className="hero-highlight">conciliadores</span>
        </h1>
        <p className="hero-subtitle">
          Organize processos, acompanhe prazos e centralize informações em um só lugar.
          Feito para quem atua na conciliação no dia a dia.
        </p>
        <Link to="/login" className="hero-cta">
          Acessar o sistema
        </Link>
      </div>
    </main>
  )
}
