const segment = (value: string) => encodeURIComponent(value.trim())

export function participantRoomPath(author: string, roomId: string) {
  return `/room/${segment(author)}/${segment(roomId)}`
}

export function adminRoomPath(author: string, roomId: string) {
  return `/admin/room/${segment(author)}/${segment(roomId)}`
}

export function publicRoomApiPath(author: string, roomId: string) {
  return `/api/rooms/${segment(author)}/${segment(roomId)}`
}

export function adminRoomApiPath(roomId?: string) {
  return roomId ? `/api/admin/rooms/${segment(roomId)}` : '/api/admin/rooms'
}

export const ADMIN_SESSION_API_PATH = '/api/admin/session'

export function adminImageApiPath(roomId: string, objectName?: string) {
  const base = `/api/admin/images/${segment(roomId)}`
  return objectName ? `${base}/${segment(objectName)}` : base
}
