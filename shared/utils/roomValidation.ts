import { MAX_WINNER_RANK, isValidRoomIdentifier } from '../constants/quiz'
import type { RoomConfig } from '../types/quiz'

export function isRoomConfig(value: unknown): value is RoomConfig {
  if (!value || typeof value !== 'object') return false
  const room = value as Partial<RoomConfig>
  return typeof room.roomId === 'string'
    && isValidRoomIdentifier(room.roomId)
    && typeof room.author === 'string'
    && isValidRoomIdentifier(room.author)
    && typeof room.title === 'string'
    && Boolean(room.title.trim())
    && typeof room.winnerLastRank === 'number'
    && Number.isInteger(room.winnerLastRank)
    && room.winnerLastRank >= 1
    && room.winnerLastRank <= MAX_WINNER_RANK
    && Array.isArray(room.slides)
    && Array.isArray(room.questions)
}
