/**
 * Autenticação: login via API (tabela usuarios no banco) e dados no localStorage
 */
import { apiBaseUrl } from '../api/config'

const STORAGE_KEY = 'auth_user'

/**
 * Faz login chamando a API e salva o usuário no localStorage
 * @param {string} usuario - Login (ex.: e-mail)
 * @param {string} senha - Senha em texto
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function login(usuario, senha) {
  const usuarioTrim = usuario?.trim() ?? ''
  const senhaTrim = senha?.trim() ?? ''
  if (!usuarioTrim || !senhaTrim) {
    return { success: false, error: 'Usuário e senha são obrigatórios' }
  }
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuarioTrim, senha: senhaTrim }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      return { success: false, error: data.error || 'Usuário ou senha incorretos' }
    }
    const userData = {
      id: data.user.id,
      nome: data.user.nome,
      usuario: data.user.usuario,
      perfil: data.user.perfil,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Erro ao conectar. Verifique se o backend está rodando.' }
  }
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
 * Verifica se o usuário é admin ou admin supremo
 */
export function isAdmin() {
  const user = getUser()
  const p = user?.perfil
  return p === 'admin' || p === 'admin_supremo'
}

/**
 * Verifica se o usuário é admin supremo
 */
export function isAdminSupremo() {
  return getUser()?.perfil === 'admin_supremo'
}

/**
 * Verifica se o usuário é conciliador
 */
export function isConciliador() {
  return getUser()?.perfil === 'conciliador'
}

/**
 * Retorna o perfil do usuário atual (conciliador | admin | admin_supremo)
 */
export function getUserRole() {
  return getUser()?.perfil ?? null
}
