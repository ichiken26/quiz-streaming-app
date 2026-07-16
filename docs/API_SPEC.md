# API仕様書

## 1. 共通仕様

- 本番ベースURL: `https://quiz-streaming-app.kokage-studio.com`
- 実装: Cloudflare Worker `worker/index.ts`
- 通信: HTTPS
- JSONレスポンスのContent-Type: `application/json; charset=utf-8`
- APIレスポンスのキャッシュ: `Cache-Control: no-store`
- 日時
  - D1の日時: SQLite `CURRENT_TIMESTAMP` 形式（UTC）
  - Firebaseの日時: Unixミリ秒

## 2. 認証・認可

### 2.1 公開API

`/api/health` と `GET /api/rooms/:roomId` は認証不要。

### 2.2 管理API

`/api/admin/*` はCloudflare Accessが付与する次のヘッダーを利用する。

```http
Cf-Access-Authenticated-User-Email: user@example.com
```

Workerは値をtrimし、小文字化して、コード内の `ADMIN_EMAILS` と完全一致する場合だけ許可する。ヘッダーなし、または許可リスト外の場合は `403`。

現行許可メールアドレス:

- `62ichiken@gmail.com`
- `ichinose.kenki@tbs.co.jp`

### 2.3 ルーム管理権限

- ルーム所有者は自身のルームを管理できる。
- `system_managed=1` のルームは、許可リストに含まれるシステム管理者全員が管理できる。
- 現行コードでは管理APIを利用できるメールアドレス全員がシステム管理者である。
- システム管理者が新規作成したルームは自動的に `system_managed=1` になる。

## 3. データ型

### 3.1 RoomConfig

```json
{
  "roomId": "event-room-01",
  "title": "社内クイズ大会",
  "description": "任意の説明",
  "initialSlideIndex": 0,
  "slides": [],
  "questions": []
}
```

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| `roomId` | string | 必須 | `^[A-Za-z0-9._~-]+$` |
| `title` | string | 必須 | 空文字不可。API保存時にtrim |
| `description` | string | 任意 | APIでは内容を検証しない |
| `initialSlideIndex` | number | 型上必須 | APIバリデーションでは検査しない |
| `slides` | array | 必須 | APIは配列であることだけを検査 |
| `questions` | array | 必須 | APIは配列であることだけを検査 |

APIのサーバー側バリデーションはルーム全体の詳細構造を検査しない。各スライド・問題の詳細制約は主に管理画面で検証される。

### 3.2 Slide

| フィールド | 型 | 必須 | 値 |
|---|---|---|---|
| `id` | string | 必須 | コンテンツ識別子 |
| `type` | string | 必須 | `slide`, `question`, `answer`, `result` |
| `title` | string | 必須 | 表示名・画像alt |
| `imageUrl` | string | 必須 | 静的またはR2画像パス |
| `questionId` | string | 任意 | 問題との関連キー |

### 3.3 Question

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | string | 必須 | 問題識別子 |
| `type` | string | 必須 | `single` または `multiple` |
| `text` | string | 必須 | 問題文 |
| `choices` | Choice[] | 必須 | 管理画面では2～6件 |
| `correctChoiceId` | string | 条件付き | 単一選択との後方互換用 |
| `correctChoiceIds` | string[] | 条件付き | 複数正解を含む正解ID群 |
| `timeLimitSeconds` | number | 必須 | 管理画面では1以上 |

## 4. エンドポイント一覧

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| GET | `/api/health` | 不要 | D1/R2状態確認 |
| GET | `/api/rooms/:roomId` | 不要 | 公開ルーム設定取得 |
| GET | `/api/admin/session` | 必要 | 管理セッション確認 |
| GET | `/api/admin/rooms` | 必要 | 管理可能ルーム一覧 |
| POST | `/api/admin/rooms` | 必要 | ルーム作成 |
| GET | `/api/admin/rooms/:roomId` | 必要 | 管理用ルーム設定取得 |
| PATCH | `/api/admin/rooms/:roomId` | 必要 | ルーム更新・ID変更 |
| POST | `/api/admin/images/:roomId` | 必要 | 画像アップロード |
| DELETE | `/api/admin/images/:roomId/:objectName` | 必要 | 画像削除 |

## 5. GET /api/health

D1接続とR2バインディングの有無を返す。

### 成功 200

```json
{
  "status": "ok",
  "d1": "connected",
  "r2": "connected"
}
```

R2が未バインドの場合、`r2` は `unconfigured`。

### 失敗 503

```json
{
  "status": "error",
  "d1": "unavailable"
}
```

## 6. GET /api/rooms/:roomId

公開用ルーム設定を取得する。

### 処理順

1. D1の `rooms.room_id` で検索する。
2. 存在すれば `config_json` をJSONとして返す。
3. 存在しなければ静的アセット `/data/rooms/{roomId}.json` を検索する。
4. JSONアセットが存在しなければ404。

### 成功 200

レスポンスは `RoomConfig`。

### 失敗 404

```json
{ "error": "ルームが見つかりません" }
```

## 7. GET /api/admin/session

現在の管理ユーザーを確認する。

### 成功 200

```json
{
  "email": "62ichiken@gmail.com",
  "systemAdmin": true
}
```

### 失敗 403

```json
{ "error": "アクセス権限がありません" }
```

## 8. GET /api/admin/rooms

管理可能なルームを更新日時降順で返す。

現行システム管理者は、`system_managed=1` または自身が所有するルームを取得する。

### 成功 200

```json
{
  "rooms": [
    {
      "roomId": "event-room-01",
      "title": "社内クイズ大会",
      "updatedAt": "2026-07-17 01:23:45"
    }
  ]
}
```

## 9. POST /api/admin/rooms

### リクエスト

```json
{
  "room": {
    "roomId": "event-room-01",
    "title": "社内クイズ大会",
    "initialSlideIndex": 0,
    "slides": [],
    "questions": []
  },
  "changes": []
}
```

`changes` は画面から送信されるが、現行APIでは保存・処理しない。

### 成功 201

```json
{ "roomId": "event-room-01" }
```

### エラー

| HTTP | 条件 | 本文 |
|---|---|---|
| 400 | RoomConfigの基本検証失敗 | `入力内容が不正です` |
| 403 | 認可失敗 | `アクセス権限がありません` |
| 409 | roomId重複 | `このルームIDは既に使用されています` |

## 10. GET /api/admin/rooms/:roomId

指定ルームの `RoomConfig` を返す。所有者またはシステム管理対象の管理者だけ取得できる。

存在しない場合と権限がない場合は、情報漏えい防止のため同じ404を返す。

```json
{ "error": "ルームが見つかりません" }
```

## 11. PATCH /api/admin/rooms/:roomId

指定ルームを更新する。URL側のroomIdは更新前ID、本文の `room.roomId` は更新後ID。

### 同一roomIdの更新

- `room_name`, `config_json` を更新する。
- `updated_at` を現在時刻に更新する。

### roomId変更

- 新しいroomIdの競合を確認する。
- 所有者、作成日時、`system_managed` を維持した新規行を作る。
- 更新日時は現在時刻にする。
- 旧roomIdの行を同一D1 batch内で削除する。
- R2オブジェクトとFirebaseデータは移動しない。

### 成功 200

```json
{ "roomId": "new-room-id" }
```

### エラー

POSTと同じ400/403/409に加え、対象なし・管理権限なしは404。

## 12. POST /api/admin/images/:roomId

画像本体をリクエストボディとしてR2へ保存する。multipart/form-dataではない。

### リクエスト例

```http
POST /api/admin/images/event-room-01
Content-Type: image/png

<binary>
```

### オブジェクトキー

`slides/{roomId}/{UUID}.{extension}`

拡張子はContent-Typeのサブタイプから生成する。`image/svg+xml` は `svg`。英数字以外を除去する。

### 成功 201

```json
{
  "imageUrl": "/slides/event-room-01/550e8400-e29b-41d4-a716-446655440000.png"
}
```

### エラー

| HTTP | 条件 | 本文 |
|---|---|---|
| 403 | 認可失敗 | `アクセス権限がありません` |
| 415 | Content-Typeが `image/` で始まらない | `画像ファイルを選択してください` |
| 503 | R2未バインド | `R2がまだ有効化されていません` |

現行APIは、パスのroomIdに対するルーム所有権やルーム存在を検査しない。

## 13. DELETE /api/admin/images/:roomId/:objectName

R2の `slides/{roomId}/{objectName}` を削除する。

### 成功 204

本文なし。対象が存在しない場合もR2 deleteの結果として204になる。

`objectName` は1つ以上のパス要素を受け付け、APIはルーム所有権・参照整合性を検査しない。

## 14. R2画像配信 GET /slides/*

APIではないがWorkerが動的に処理する。

1. R2がバインドされている場合、URLパスから先頭 `/` を除いたキーを検索する。
2. 存在すればR2メタデータ、ETag、キャッシュ設定とともに返す。
3. 存在しなければ静的アセットへフォールバックする。

既定キャッシュは `public, max-age=3600`。

## 15. 共通エラー

未定義の管理APIは次を返す。

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
```

```json
{ "error": "Not Found" }
```

Worker内で捕捉されないD1/R2/JSON解析エラーはCloudflare Workersのエラーレスポンスになる可能性がある。
