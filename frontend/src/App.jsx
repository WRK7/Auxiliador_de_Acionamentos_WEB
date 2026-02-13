import { Routes, Route } from 'react-router-dom'
import Hero from './pages/Hero'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Historico from './pages/Historico'
import Usuarios from './pages/Usuarios'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/historico" element={<Historico />} />
      <Route path="/usuarios" element={<Usuarios />} />
    </Routes>
  )
}

export default App
