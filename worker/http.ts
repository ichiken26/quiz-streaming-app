export function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init?.headers,
    },
  })
}

export function notFound(message = 'Not Found') {
  return json({ error: message }, { status: 404 })
}
