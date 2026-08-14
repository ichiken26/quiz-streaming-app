import type { RoomConfig } from '../types/quiz'

export function sanitizePublicRoomConfig(room: RoomConfig): RoomConfig {
  return {
    ...room,
    questions: room.questions.map(({ audio: _audio, ...question }) => question),
  }
}
