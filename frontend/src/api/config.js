/**
 * URL base da API. Em dev com proxy (padrão): '' = mesmo origem, Vite repassa /api ao backend.
 * Para apontar direto ao backend: defina VITE_API_URL (ex.: http://localhost:3089).
 */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim() || ''
