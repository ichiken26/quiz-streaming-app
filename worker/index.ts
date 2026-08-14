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

function isSpaNavigation(request: Request, pathname: string) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (pathname.startsWith('/api/') || pathname.startsWith('/slides/')) return false
  // Static files keep their own 404; app routes are extensionless.
  const lastSegment = pathname.split('/').pop() ?? ''
  if (lastSegment.includes('.') && !lastSegment.endsWith('.html')) return false
  const accept = request.headers.get('accept') ?? ''
  return accept.includes('text/html') || accept.includes('*/*') || accept === ''
}

async function staticAsset(request: Request, env: Env) {
  const url = new URL(request.url)
  const asset = await env.ASSETS.fetch(request)
  if (asset.status !== 404 || !isSpaNavigation(request, url.pathname)) return asset

  // Serve the SPA shell. Browser URL stays as the deep link for client routing.
  return env.ASSETS.fetch(new URL('/index.html', url.origin))
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
