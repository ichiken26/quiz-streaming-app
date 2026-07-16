interface Env {
  ASSETS: Fetcher
  DB: D1Database
  IMAGES?: R2Bucket
}

interface RoomRow {
  room_id: string
  owner_email: string
  room_name: string
  config_json: string
  system_managed: number
  created_at: string
  updated_at: string
}

interface RoomConfigPayload {
  roomId: string
  title: string
  initialSlideIndex: number
  slides: unknown[]
  questions: unknown[]
  description?: string
}

const ADMIN_EMAILS = new Set([
  '62ichiken@gmail.com',
  'ichinose.kenki@tbs.co.jp',
])

const json = (body: unknown, init?: ResponseInit) => new Response(
  JSON.stringify(body),
  {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init?.headers,
    },
  },
)

function accessEmail(request: Request) {
  return request.headers.get('cf-access-authenticated-user-email')?.trim().toLowerCase()
}

function authorizedEmail(request: Request) {
  const email = accessEmail(request)
  return email && ADMIN_EMAILS.has(email) ? email : undefined
}

function isSystemAdmin(email: string) {
  return ADMIN_EMAILS.has(email)
}

function canManageRoom(row: RoomRow, email: string) {
  return row.owner_email === email || (row.system_managed === 1 && isSystemAdmin(email))
}

function isRoomConfig(value: unknown): value is RoomConfigPayload {
  if (!value || typeof value !== 'object') return false
  const room = value as Partial<RoomConfigPayload>
  return Boolean(
    typeof room.roomId === 'string'
    && /^[A-Za-z0-9._~-]+$/.test(room.roomId)
    && typeof room.title === 'string'
    && room.title.trim()
    && Array.isArray(room.slides)
    && Array.isArray(room.questions),
  )
}

async function findRoom(env: Env, roomId: string) {
  return env.DB.prepare('SELECT * FROM rooms WHERE room_id = ?')
    .bind(roomId)
    .first<RoomRow>()
}

async function publicRoom(request: Request, env: Env, roomId: string) {
  const row = await findRoom(env, roomId)
  if (row) return json(JSON.parse(row.config_json))

  const fallback = new URL(request.url)
  fallback.pathname = `/data/rooms/${encodeURIComponent(roomId)}.json`
  fallback.search = ''
  const response = await env.ASSETS.fetch(new Request(fallback, request))
  if (response.ok && response.headers.get('content-type')?.includes('application/json')) return response
  return json({ error: 'ルームが見つかりません' }, { status: 404 })
}

async function adminApi(request: Request, env: Env, pathname: string) {
  const email = authorizedEmail(request)
  if (!email) return json({ error: 'アクセス権限がありません' }, { status: 403 })

  if (pathname === '/api/admin/session' && request.method === 'GET') {
    return json({ email, systemAdmin: isSystemAdmin(email) })
  }

  if (pathname === '/api/admin/rooms' && request.method === 'GET') {
    const result = isSystemAdmin(email)
      ? await env.DB.prepare(
          `SELECT room_id, room_name, updated_at FROM rooms
           WHERE system_managed = 1 OR owner_email = ? ORDER BY updated_at DESC`,
        ).bind(email).all<Pick<RoomRow, 'room_id' | 'room_name' | 'updated_at'>>()
      : await env.DB.prepare(
          `SELECT room_id, room_name, updated_at FROM rooms
           WHERE owner_email = ? ORDER BY updated_at DESC`,
        ).bind(email).all<Pick<RoomRow, 'room_id' | 'room_name' | 'updated_at'>>()
    return json({
      rooms: result.results.map(row => ({
        roomId: row.room_id,
        title: row.room_name,
        updatedAt: row.updated_at,
      })),
    })
  }

  if (pathname === '/api/admin/rooms' && request.method === 'POST') {
    const body = await request.json().catch(() => undefined)
    const room = (body as { room?: unknown } | undefined)?.room
    if (!isRoomConfig(room)) return json({ error: '入力内容が不正です' }, { status: 400 })
    const existing = await findRoom(env, room.roomId)
    if (existing) return json({ error: 'このルームIDは既に使用されています' }, { status: 409 })
    await env.DB.prepare(
      `INSERT INTO rooms (room_id, owner_email, room_name, config_json, system_managed)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      room.roomId,
      email,
      room.title.trim(),
      JSON.stringify(room),
      isSystemAdmin(email) ? 1 : 0,
    ).run()
    return json({ roomId: room.roomId }, { status: 201 })
  }

  const roomMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)$/)
  if (roomMatch) {
    const originalRoomId = decodeURIComponent(roomMatch[1]!)
    const existing = await findRoom(env, originalRoomId)
    if (!existing || !canManageRoom(existing, email)) {
      return json({ error: 'ルームが見つかりません' }, { status: 404 })
    }

    if (request.method === 'GET') return json(JSON.parse(existing.config_json))

    if (request.method === 'PATCH') {
      const body = await request.json().catch(() => undefined)
      const room = (body as { room?: unknown } | undefined)?.room
      if (!isRoomConfig(room)) return json({ error: '入力内容が不正です' }, { status: 400 })
      if (room.roomId !== originalRoomId) {
        const conflict = await findRoom(env, room.roomId)
        if (conflict) return json({ error: 'このルームIDは既に使用されています' }, { status: 409 })
        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO rooms (
               room_id, owner_email, room_name, config_json, created_at, updated_at, system_managed
             ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          ).bind(
            room.roomId,
            existing.owner_email,
            room.title.trim(),
            JSON.stringify(room),
            existing.created_at,
            existing.system_managed,
          ),
          env.DB.prepare('DELETE FROM rooms WHERE room_id = ?')
            .bind(originalRoomId),
        ])
      }
      else {
        await env.DB.prepare(
          `UPDATE rooms SET room_name = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP
           WHERE room_id = ?`,
        ).bind(room.title.trim(), JSON.stringify(room), originalRoomId).run()
      }
      return json({ roomId: room.roomId })
    }
  }

  const imageMatch = pathname.match(/^\/api\/admin\/images\/([^/]+)(?:\/(.+))?$/)
  if (imageMatch) {
    if (!env.IMAGES) return json({ error: 'R2がまだ有効化されていません' }, { status: 503 })
    const roomId = decodeURIComponent(imageMatch[1]!)
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') ?? ''
      if (!contentType.startsWith('image/')) return json({ error: '画像ファイルを選択してください' }, { status: 415 })
      const extension = contentType.split('/')[1]?.replace('svg+xml', 'svg')?.replace(/[^a-z0-9]/gi, '') || 'bin'
      const key = `slides/${roomId}/${crypto.randomUUID()}.${extension}`
      await env.IMAGES.put(key, request.body, { httpMetadata: { contentType, cacheControl: 'public, max-age=3600' } })
      return json({ imageUrl: `/${key}` }, { status: 201 })
    }
    if (request.method === 'DELETE' && imageMatch[2]) {
      await env.IMAGES.delete(`slides/${roomId}/${imageMatch[2]}`)
      return new Response(null, { status: 204 })
    }
  }

  return json({ error: 'Not Found' }, { status: 404 })
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      try {
        await env.DB.prepare('SELECT 1').first()
        return json({ status: 'ok', d1: 'connected', r2: env.IMAGES ? 'connected' : 'unconfigured' })
      }
      catch {
        return json({ status: 'error', d1: 'unavailable' }, { status: 503 })
      }
    }

    const publicRoomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/)
    if (publicRoomMatch && request.method === 'GET') {
      return publicRoom(request, env, decodeURIComponent(publicRoomMatch[1]!))
    }

    if (url.pathname.startsWith('/api/admin/')) {
      return adminApi(request, env, url.pathname)
    }

    if (url.pathname.startsWith('/slides/') && env.IMAGES) {
      const object = await env.IMAGES.get(url.pathname.slice(1))
      if (object) {
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=3600')
        return new Response(object.body, { headers })
      }
    }

    const asset = await env.ASSETS.fetch(request)
    if (
      asset.status === 404
      && request.method === 'GET'
      && request.headers.get('accept')?.includes('text/html')
    ) {
      const fallback = new URL(request.url)
      fallback.pathname = '/'
      fallback.search = ''
      return env.ASSETS.fetch(new Request(fallback, request))
    }
    return asset
  },
} satisfies ExportedHandler<Env>
