UPDATE rooms
SET config_json = json_set(
  config_json,
  '$.author',
  CASE room_id
    WHEN 'demo-legal' THEN 'koharu'
    WHEN 'demo_streaming' THEN 'kokage'
    WHEN '2026_GD_welcomeParty' THEN 'kokage'
  END
)
WHERE room_id IN ('demo-legal', 'demo_streaming', '2026_GD_welcomeParty');

UPDATE rooms
SET config_json = json_set(config_json, '$.winnerLastRank', 1)
WHERE json_extract(config_json, '$.winnerLastRank') IS NULL;
