import { accessEmail, canManageRoom, isSystemAdmin } from './auth'
import { QUESTION_AUDIO_MAX_BYTES, QUESTION_AUDIO_MIME_TYPE } from '../shared/utils/questionAudio'
import { isRoomConfig } from '../shared/utils/roomValidation'
import { UPLOADABLE_SLIDE_IMAGE_MIME_TYPES } from '../shared/utils/slideMedia'
import { json, notFound } from './http'
import { createRoom, findRoom, listRooms, roomConfig, updateRoom } from './roomRepository'
import type { Env } from './types'

function audioKey(roomId: string, objectName: string) {
  return `audio/${roomId}/${objectName}`
}

function contentRangeHeader(object: R2ObjectBody) {
  if (!object.range) return undefined
  const range = object.range
  if ('suffix' in range) {
    const start = object.size - range.suffix
    return `bytes ${start}-${object.size - 1}/${object.size}`
  }
  const offset = range.offset ?? 0
  const length = range.length ?? (object.size - offset)
  return `bytes ${offset}-${offset + length - 1}/${object.size}`
}

function audioResponse(object: R2ObjectBody, status = 200) {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  if (!headers.has('cache-control')) headers.set('cache-control', 'private, max-age=3600')
  const contentRange = contentRangeHeader(object)
  if (contentRange) headers.set('content-range', contentRange)
  return new Response(object.body, { status, headers })
}

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

async function handleAudio(
  request: Request,
  env: Env,
  roomId: string,
  objectName?: string,
) {
  if (!env.IMAGES) return json({ error: 'R2がまだ有効化されていません' }, { status: 503 })

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType !== QUESTION_AUDIO_MIME_TYPE) {
      return json({ error: 'MP3ファイルを選択してください' }, { status: 415 })
    }
    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (contentLength > QUESTION_AUDIO_MAX_BYTES) {
      return json({ error: '音声ファイルは20MB以下にしてください' }, { status: 413 })
    }
    const objectKey = `${crypto.randomUUID()}.mp3`
    const key = audioKey(roomId, objectKey)
    await env.IMAGES.put(key, request.body, {
      httpMetadata: { contentType: QUESTION_AUDIO_MIME_TYPE, cacheControl: 'private, max-age=3600' },
    })
    const displayName = request.headers.get('x-audio-filename')?.trim()
      || request.headers.get('x-file-name')?.trim()
      || 'audio.mp3'
    return json({
      audioUrl: `/api/admin/audio/${roomId}/${objectKey}`,
      name: displayName,
    }, { status: 201 })
  }

  if (!objectName) return undefined

  const key = audioKey(roomId, objectName)
  if (request.method === 'GET') {
    const range = request.headers.get('range')
    const object = await env.IMAGES.get(key, range ? { range: request.headers } : undefined)
    if (!object) return notFound('音声が見つかりません')
    return audioResponse(object, range ? 206 : 200)
  }

  if (request.method === 'DELETE') {
    await env.IMAGES.delete(key)
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

  const audioMatch = pathname.match(/^\/api\/admin\/audio\/([^/]+)(?:\/(.+))?$/)
  if (audioMatch) {
    return await handleAudio(
      request,
      env,
      decodeURIComponent(audioMatch[1]!),
      audioMatch[2] ? decodeURIComponent(audioMatch[2]) : undefined,
    ) ?? notFound()
  }
  return notFound()
}
