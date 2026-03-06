import { Routes, Route, Navigate } from 'react-router-dom'
import Hero from './pages/Hero'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import Historico from './pages/Historico'
import Usuarios from './pages/Usuarios'
import Carteiras from './pages/Carteiras'
import AguasGuariroba from './pages/AguasGuariroba'
import Exclusoes from './pages/Exclusoes'
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
      <Route path="/registro" element={<Registro />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/historico" element={<Historico />} />
      <Route path="/aguas-guariroba" element={<AguasGuariroba />} />
      <Route path="/usuarios" element={<ProtectedAdminRoute><Usuarios /></ProtectedAdminRoute>} />
      <Route path="/carteiras" element={<ProtectedAdminRoute><Carteiras /></ProtectedAdminRoute>} />
      <Route path="/exclusoes" element={<Exclusoes />} />
    </Routes>
  )
}

export default App
