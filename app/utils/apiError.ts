export function apiErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  const data = 'data' in error ? error.data : undefined
  if (!data || typeof data !== 'object' || !('error' in data)) return fallback
  return typeof data.error === 'string' ? data.error : fallback
}
