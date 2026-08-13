import QRCode from 'qrcode'
import { computed, ref, type Ref } from 'vue'
import { QUIZ_EDITOR_LIMITS } from '#shared/constants/quiz'
import type { RoomConfig } from '#shared/types/quiz'
import { adminRoomPath, participantRoomPath } from '#shared/utils/roomRoutes'

export function useRoomEditorShare(
  room: RoomConfig,
  savedOnce: Readonly<Ref<boolean>>,
  notify: (message: string) => void,
) {
  const participantQr = ref('')
  const controlQr = ref('')
  const participantUrl = computed(() => import.meta.client && savedOnce.value
    ? `${location.origin}${participantRoomPath(room.author, room.roomId)}`
    : '')
  const controlUrl = computed(() => import.meta.client && savedOnce.value
    ? `${location.origin}${adminRoomPath(room.author, room.roomId)}`
    : '')

  async function refreshQrCodes() {
    if (!participantUrl.value) return
    const options = {
      width: QUIZ_EDITOR_LIMITS.qrCodeWidth,
      margin: QUIZ_EDITOR_LIMITS.qrCodeMargin,
    }
    ;[participantQr.value, controlQr.value] = await Promise.all([
      QRCode.toDataURL(participantUrl.value, options),
      QRCode.toDataURL(controlUrl.value, options),
    ])
  }

  async function copyUrl(value: string) {
    await navigator.clipboard.writeText(value)
    notify('URLをコピーしました')
  }

  function downloadQr(dataUrl: string, kind: 'participant' | 'admin') {
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `${room.roomId}-${kind}-qr.png`
    anchor.click()
  }

  return {
    participantUrl,
    controlUrl,
    participantQr,
    controlQr,
    refreshQrCodes,
    copyUrl,
    downloadQr,
  }
}
