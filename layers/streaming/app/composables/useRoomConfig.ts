import type { RoomConfig } from '#shared/types/quiz'

export function useRoomConfig(roomId: MaybeRefOrGetter<string>) {
  const configUrl = computed(
    () => `/api/rooms/${encodeURIComponent(toValue(roomId))}`,
  )

  const result = useFetch<RoomConfig>(configUrl, {
    key: `room-config-${toValue(roomId)}`,
    // Room configuration is loaded from D1 by the Worker, with static fallback.
    server: false,
  })

  return {
    room: result.data,
    error: result.error,
    status: result.status,
    refresh: result.refresh,
  }
}
