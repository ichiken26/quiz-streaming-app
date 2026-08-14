import { notFound, json } from './http'
import { sanitizePublicRoomConfig } from '../shared/utils/publicRoomConfig'
import { findRoom, roomConfig } from './roomRepository'
import type { Env } from './types'

export async function handlePublicRoom(
  request: Request,
  env: Env,
  author: string,
  roomId: string,
) {
  const row = await findRoom(env, roomId)
  if (row) {
    const room = roomConfig(row)
    return room.author === author
      ? json(sanitizePublicRoomConfig(room))
      : notFound('ルームが見つかりません')
  }

  const fallback = new URL(request.url)
  fallback.pathname = `/data/rooms/${encodeURIComponent(roomId)}.json`
  fallback.search = ''
  const response = await env.ASSETS.fetch(new Request(fallback, request))
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    return notFound('ルームが見つかりません')
  }
  const room = await response.json<import('../shared/types/quiz').RoomConfig>()
  return room.author === author
    ? json(sanitizePublicRoomConfig(room))
    : notFound('ルームが見つかりません')
}

export async function handleSlideAsset(env: Env, pathname: string) {
  const object = await env.IMAGES.get(pathname.slice(1))
  if (!object) return undefined
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=3600')
  return new Response(object.body, { headers })
}
