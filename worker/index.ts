import { handleAdminRequest } from './adminRoutes'
import { json } from './http'
import { handlePublicRoom, handleSlideAsset } from './publicRoutes'
import type { Env } from './types'

async function health(env: Env) {
  try {
    await env.DB.prepare('SELECT 1').first()
    return json({ status: 'ok', d1: 'connected', r2: 'connected' })
  }
  catch {
    return json({ status: 'error', d1: 'unavailable' }, { status: 503 })
  }
}

async function staticAsset(request: Request, env: Env) {
  const asset = await env.ASSETS.fetch(request)
  if (
    asset.status !== 404
    || request.method !== 'GET'
    || !request.headers.get('accept')?.includes('text/html')
  ) return asset

  const fallback = new URL(request.url)
  fallback.pathname = '/'
  fallback.search = ''
  return env.ASSETS.fetch(new Request(fallback, request))
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/health') return health(env)

    const publicRoomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/([^/]+)$/)
    if (publicRoomMatch && request.method === 'GET') {
      return handlePublicRoom(
        request,
        env,
        decodeURIComponent(publicRoomMatch[1]!),
        decodeURIComponent(publicRoomMatch[2]!),
      )
    }
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminRequest(request, env, url.pathname)
    }
    if (url.pathname.startsWith('/slides/')) {
      const image = await handleSlideAsset(env, url.pathname)
      if (image) return image
    }
    return staticAsset(request, env)
  },
} satisfies ExportedHandler<Env>
