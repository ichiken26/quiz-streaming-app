function errorObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function numericStatus(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d{3}$/.test(value)) return Number(value)
  return undefined
}

export function apiErrorStatus(error: unknown) {
  const object = errorObject(error)
  if (!object) return undefined

  const direct = numericStatus(object.statusCode) ?? numericStatus(object.status)
  if (direct) return direct

  const response = errorObject(object.response)
  return numericStatus(response?.status)
}

export function apiErrorMessage(error: unknown, fallback: string) {
  const object = errorObject(error)
  if (!object) return fallback
  const data = errorObject(object.data)
  if (!data || typeof data.error !== 'string') return fallback
  return data.error
}

export function apiErrorDisplayMessage(error: unknown, fallback: string) {
  const message = apiErrorMessage(error, fallback)
  const status = apiErrorStatus(error)
  return status ? `HTTP ${status}: ${message}` : message
}
