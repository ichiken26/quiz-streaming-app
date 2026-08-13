export type Env = Cloudflare.Env

export interface RoomRow {
  room_id: string
  owner_email: string
  room_name: string
  config_json: string
  system_managed: number
  created_at: string
  updated_at: string
}

export type RoomSummaryRow = Pick<
  RoomRow,
  'room_id' | 'owner_email' | 'room_name' | 'config_json' | 'updated_at'
>
