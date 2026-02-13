/**
 * URL base da API (lida do .env no build).
 * Use: import { apiBaseUrl } from '@/api/config' ou de 'api/config'
 */
export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3089'
