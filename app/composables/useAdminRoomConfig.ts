import type { RoomConfig } from '#shared/types/quiz'
import { adminRoomApiPath } from '#shared/utils/roomRoutes'

export function useAdminRoomConfig(roomId: MaybeRefOrGetter<string>) {
  const configUrl = computed(() => adminRoomApiPath(toValue(roomId)))

  const result = useFetch<RoomConfig>(configUrl, {
    key: computed(() => `admin-room-config-${toValue(roomId)}`),
    server: false,
  })

  return {
    room: result.data,
    error: result.error,
    status: result.status,
    refresh: result.refresh,
  }
}
