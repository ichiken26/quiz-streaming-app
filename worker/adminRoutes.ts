import { accessEmail, canManageRoom, isSystemAdmin } from './auth'
import { isRoomConfig } from '../shared/utils/roomValidation'
import { UPLOADABLE_SLIDE_IMAGE_MIME_TYPES } from '../shared/utils/slideMedia.ts'
import { json, notFound } from './http'
import { createRoom, findRoom, listRooms, roomConfig, updateRoom } from './roomRepository'
import type { Env } from './types'

async function requestRoom(request: Request) {
  const body = await request.json<{ room?: unknown }>().catch(() => undefined)
  return body?.room
}

async function handleRoomCollection(request: Request, env: Env, email: string) {
  if (request.method === 'GET') {
    const result = await listRooms(env, email, isSystemAdmin(env, email))
    return json({
      rooms: result.results.map(row => ({
        author: roomConfig(row).author,
        roomId: row.room_id,
        title: row.room_name,
        updatedAt: row.updated_at,
      })),
    })
  }
  if (request.method !== 'POST') return undefined

  const room = await requestRoom(request)
  if (!isRoomConfig(room)) return json({ error: '入力内容が不正です' }, { status: 400 })
  if (await findRoom(env, room.roomId)) {
    return json({ error: 'このルームIDは既に使用されています' }, { status: 409 })
  }
  await createRoom(env, room, email, isSystemAdmin(env, email))
  return json({ roomId: room.roomId }, { status: 201 })
}

async function handleRoomItem(
  request: Request,
  env: Env,
  email: string,
  originalRoomId: string,
) {
  const existing = await findRoom(env, originalRoomId)
  if (!existing || !canManageRoom(env, existing, email)) {
    return notFound('ルームが見つかりません')
  }
  if (request.method === 'GET') return json(roomConfig(existing))
  if (request.method !== 'PATCH') return undefined

  const room = await requestRoom(request)
  if (!isRoomConfig(room)) return json({ error: '入力内容が不正です' }, { status: 400 })
  if (room.roomId !== originalRoomId && await findRoom(env, room.roomId)) {
    return json({ error: 'このルームIDは既に使用されています' }, { status: 409 })
  }
  await updateRoom(env, existing, room)
  return json({ roomId: room.roomId })
}

async function handleImage(
  request: Request,
  env: Env,
  roomId: string,
  objectName?: string,
) {
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') ?? ''
    if (!(UPLOADABLE_SLIDE_IMAGE_MIME_TYPES as readonly string[]).includes(contentType)) {
      return json({ error: 'JPEGまたはPNG画像を選択してください' }, { status: 415 })
    }
    const extension = contentType.split('/')[1]
      ?.replace('svg+xml', 'svg')
      .replace(/[^a-z0-9]/gi, '') || 'bin'
    const key = `slides/${roomId}/${crypto.randomUUID()}.${extension}`
    await env.IMAGES.put(key, request.body, {
      httpMetadata: { contentType, cacheControl: 'public, max-age=3600' },
    })
    return json({ imageUrl: `/${key}` }, { status: 201 })
  }
  if (request.method === 'DELETE' && objectName) {
    await env.IMAGES.delete(`slides/${roomId}/${objectName}`)
    return new Response(null, { status: 204 })
  }
  return undefined
}

export async function handleAdminRequest(request: Request, env: Env, pathname: string) {
  const email = accessEmail(request)
  if (!email) return json({ error: 'アクセス権限がありません' }, { status: 403 })
  if (pathname === '/api/admin/session' && request.method === 'GET') {
    return json({ email, systemAdmin: isSystemAdmin(env, email) })
  }
  if (pathname === '/api/admin/rooms') {
    return await handleRoomCollection(request, env, email) ?? notFound()
  }

  const roomMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)$/)
  if (roomMatch) {
    return await handleRoomItem(request, env, email, decodeURIComponent(roomMatch[1]!)) ?? notFound()
  }

  const imageMatch = pathname.match(/^\/api\/admin\/images\/([^/]+)(?:\/(.+))?$/)
  if (imageMatch) {
    return await handleImage(
      request,
      env,
      decodeURIComponent(imageMatch[1]!),
      imageMatch[2] ? decodeURIComponent(imageMatch[2]) : undefined,
    ) ?? notFound()
  }
  return notFound()
}
