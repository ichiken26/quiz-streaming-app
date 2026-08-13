import type { RoomConfig } from '#shared/types/quiz'
import { publicRoomApiPath } from '#shared/utils/roomRoutes'

export function useRoomConfig(
  author: MaybeRefOrGetter<string>,
  roomId: MaybeRefOrGetter<string>,
) {
  const configUrl = computed(() => publicRoomApiPath(toValue(author), toValue(roomId)))

  const result = useFetch<RoomConfig>(configUrl, {
    key: `room-config-${toValue(author)}-${toValue(roomId)}`,
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
