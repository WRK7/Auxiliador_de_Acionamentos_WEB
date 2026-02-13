/**
 * Utilitários de autenticação simples usando localStorage
 */

const STORAGE_KEY = 'auth_user'
const ROLE_ADMIN = 'admin'
const ROLE_CONCILIADOR = 'conciliador'

/**
 * Credenciais válidas (hardcoded para desenvolvimento)
 */
export const CREDENCIAIS = {
  conciliador: {
    email: 'conciliador@teste.com',
    senha: '123456',
    role: ROLE_CONCILIADOR,
  },
  admin: {
    email: 'wesley@teste.com',
    senha: 'w1234567',
    role: ROLE_ADMIN,
  },
}

/**
 * Faz login e salva no localStorage
 */
export function login(email, senha) {
  const emailTrim = email.trim().toLowerCase()
  const senhaTrim = senha.trim()

  // Verifica credenciais de conciliador
  if (emailTrim === CREDENCIAIS.conciliador.email && senhaTrim === CREDENCIAIS.conciliador.senha) {
    const userData = {
      email: CREDENCIAIS.conciliador.email,
      role: CREDENCIAIS.conciliador.role,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return { success: true, role: CREDENCIAIS.conciliador.role }
  }

  // Verifica credenciais de admin
  if (emailTrim === CREDENCIAIS.admin.email && senhaTrim === CREDENCIAIS.admin.senha) {
    const userData = {
      email: CREDENCIAIS.admin.email,
      role: CREDENCIAIS.admin.role,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return { success: true, role: CREDENCIAIS.admin.role }
  }

  return { success: false, error: 'Usuário ou senha incorretos' }
}

/**
 * Faz logout removendo do localStorage
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Obtém dados do usuário logado
 */
export function getUser() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Verifica se o usuário está autenticado
 */
export function isAuthenticated() {
  return getUser() !== null
}

/**
 * Verifica se o usuário é admin
 */
export function isAdmin() {
  const user = getUser()
  return user?.role === ROLE_ADMIN
}

/**
 * Verifica se o usuário é conciliador
 */
export function isConciliador() {
  const user = getUser()
  return user?.role === ROLE_CONCILIADOR
}

/**
 * Obtém o role do usuário atual
 */
export function getUserRole() {
  const user = getUser()
  return user?.role || null
}
