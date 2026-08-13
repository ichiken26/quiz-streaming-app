import type { Env, RoomRow } from './types'

export function accessEmail(request: Request) {
  return request.headers.get('cf-access-authenticated-user-email')?.trim().toLowerCase()
}

export function systemAdminEmails(env: Env) {
  const configured = env.SYSTEM_ADMIN_EMAILS
    ?.split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
  return new Set(configured)
}

export function isSystemAdmin(env: Env, email: string) {
  return systemAdminEmails(env).has(email)
}

export function canManageRoom(env: Env, row: RoomRow, email: string) {
  return row.owner_email === email || (row.system_managed === 1 && isSystemAdmin(env, email))
}
