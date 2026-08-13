import type { RoomConfig } from '../shared/types/quiz'
import type { Env, RoomRow, RoomSummaryRow } from './types'

const ROOM_SUMMARY_COLUMNS = 'room_id, owner_email, room_name, config_json, updated_at'

export async function findRoom(env: Env, roomId: string) {
  return env.DB.prepare('SELECT * FROM rooms WHERE room_id = ?')
    .bind(roomId)
    .first<RoomRow>()
}

export function roomConfig(row: Pick<RoomRow, 'config_json' | 'owner_email'>): RoomConfig {
  const config = JSON.parse(row.config_json) as RoomConfig
  if (!config.author) {
    config.author = row.owner_email.split('@')[0]?.replace(/[^A-Za-z0-9._~-]/g, '-') || 'legacy'
  }
  config.winnerLastRank ??= 1
  return config
}

export async function listRooms(env: Env, email: string, includeSystemManaged: boolean) {
  const query = includeSystemManaged
    ? `SELECT ${ROOM_SUMMARY_COLUMNS} FROM rooms
       WHERE system_managed = 1 OR owner_email = ? ORDER BY updated_at DESC`
    : `SELECT ${ROOM_SUMMARY_COLUMNS} FROM rooms
       WHERE owner_email = ? ORDER BY updated_at DESC`
  return env.DB.prepare(query).bind(email).all<RoomSummaryRow>()
}

export async function createRoom(env: Env, room: RoomConfig, email: string, systemManaged: boolean) {
  await env.DB.prepare(
    `INSERT INTO rooms (room_id, owner_email, room_name, config_json, system_managed)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(
    room.roomId,
    email,
    room.title.trim(),
    JSON.stringify(room),
    systemManaged ? 1 : 0,
  ).run()
}

export async function updateRoom(env: Env, existing: RoomRow, room: RoomConfig) {
  if (room.roomId === existing.room_id) {
    await env.DB.prepare(
      `UPDATE rooms SET room_name = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE room_id = ?`,
    ).bind(room.title.trim(), JSON.stringify(room), existing.room_id).run()
    return
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO rooms (
         room_id, owner_email, room_name, config_json, created_at, updated_at, system_managed
       ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    ).bind(
      room.roomId,
      existing.owner_email,
      room.title.trim(),
      JSON.stringify(room),
      existing.created_at,
      existing.system_managed,
    ),
    env.DB.prepare('DELETE FROM rooms WHERE room_id = ?').bind(existing.room_id),
  ])
}
