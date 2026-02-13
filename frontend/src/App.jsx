import { Routes, Route, Navigate } from 'react-router-dom'
import Hero from './pages/Hero'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Historico from './pages/Historico'
import Usuarios from './pages/Usuarios'
import { isAdmin } from './utils/auth'
import './App.css'

// Componente para proteger rotas de admin
function ProtectedAdminRoute({ children }) {
  return isAdmin() ? children : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/historico" element={<Historico />} />
      <Route path="/usuarios" element={<ProtectedAdminRoute><Usuarios /></ProtectedAdminRoute>} />
    </Routes>
  )
}

export default App
