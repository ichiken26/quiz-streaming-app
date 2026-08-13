export const ROOM_IDENTIFIER_PATTERN_SOURCE = '[A-Za-z0-9._~-]+'
export const ROOM_IDENTIFIER_PATTERN = new RegExp(`^${ROOM_IDENTIFIER_PATTERN_SOURCE}$`)

export const QUIZ_EDITOR_LIMITS = {
  minChoices: 2,
  maxChoices: 6,
  defaultTimeLimitSeconds: 20,
  pdfRenderScale: 2,
  saveAttempts: 5,
  autosaveDelayMs: 1000,
  saveMessageDurationMs: 2800,
  qrCodeWidth: 320,
  qrCodeMargin: 2,
} as const

export const MAX_WINNER_RANK = 10
export const ADMIN_AUTHOR_STORAGE_KEY = 'quiz-streaming-admin-author'

export function isValidRoomIdentifier(value: string) {
  return ROOM_IDENTIFIER_PATTERN.test(value.trim())
}
