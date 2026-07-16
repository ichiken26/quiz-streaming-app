# DBスキーマ定義書

## 1. データストア構成

| ストア | 用途 | 永続データ |
|---|---|---|
| Cloudflare D1 | ルーム所有・ルーム設定 | `rooms` テーブル |
| Firebase Realtime Database | 配信中の進行状態・参加者回答 | `rooms/{roomId}/runtime`, `answers` |
| Cloudflare R2 | アップロード画像 | `slides/{roomId}/{UUID}.{ext}` |
| Cloudflare Static Assets | 初期ルームJSON・初期画像・SPA | `public/` の生成物 |
| ブラウザ localStorage | 参加者識別・再回答防止 | ニックネーム、参加者ID、ローカル回答 |

## 2. Cloudflare D1

### 2.1 データベース

- バインディング名: `DB`
- データベース名: `quiz-streaming-app-db`
- database_id: `500fadfd-3c38-4682-a17a-dd915c0fda88`
- マイグレーション: `migrations/`

### 2.2 roomsテーブル

```sql
CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  room_name TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE rooms ADD COLUMN system_managed INTEGER NOT NULL DEFAULT 0;
```

| カラム | SQLite型 | NULL | 既定値 | キー・制約 | 説明 |
|---|---|---|---|---|---|
| `room_id` | TEXT | 不可 | なし | PRIMARY KEY | URL・Firebase・R2でも使用するルーム識別子 |
| `owner_email` | TEXT | 不可 | なし | なし | 作成した管理者の小文字化メールアドレス |
| `room_name` | TEXT | 不可 | なし | なし | 一覧表示用ルーム名。RoomConfig.titleのtrim値 |
| `config_json` | TEXT | 不可 | なし | なし | RoomConfig全体のJSON文字列 |
| `created_at` | TEXT | 不可 | `CURRENT_TIMESTAMP` | なし | 作成日時（UTC） |
| `updated_at` | TEXT | 不可 | `CURRENT_TIMESTAMP` | なし | 更新日時（UTC） |
| `system_managed` | INTEGER | 不可 | `0` | 論理値 | 1ならシステム管理者間の共同管理対象 |

`system_managed` はSQLite上のBOOLEANではなく、`0` または `1` を意図したINTEGER。CHECK制約はない。

### 2.3 インデックス

```sql
CREATE INDEX IF NOT EXISTS rooms_owner_email_updated_at
  ON rooms (owner_email, updated_at DESC);
```

所有者別の更新日時降順一覧を補助する。システム管理者一覧の `system_managed = 1 OR owner_email = ?` 専用インデックスはない。

### 2.4 config_json構造

```text
RoomConfig
├── roomId: string
├── title: string
├── description?: string
├── initialSlideIndex: number
├── slides: Slide[]
│   ├── id: string
│   ├── type: slide | question | answer | result
│   ├── title: string
│   ├── imageUrl: string
│   └── questionId?: string
└── questions: Question[]
    ├── id: string
    ├── type: single | multiple
    ├── text: string
    ├── choices: Choice[]
    │   ├── id: string
    │   ├── label: string
    │   └── text: string
    ├── correctChoiceId?: string
    ├── correctChoiceIds?: string[]
    └── timeLimitSeconds: number
```

### 2.5 整合性ルール

- `rooms.room_id` と `config_json.roomId` はアプリケーション処理で一致させる。
- `rooms.room_name` と `config_json.title` はアプリケーション処理で同期する。
- `Slide.questionId` は `Question.id` を論理参照するが、DB外部キーはない。
- `Choice.id`、`Slide.id`、`Question.id` の一意性はDBで保証しない。
- JSON SchemaやSQLite JSON CHECK制約はない。

### 2.6 マイグレーション

| ファイル | 内容 |
|---|---|
| `0001_rooms.sql` | `rooms` テーブルと所有者一覧用インデックス作成 |
| `0002_system_managed_rooms.sql` | `system_managed` 追加、サンプルルーム投入、共同管理化 |

サンプルルーム `2026_GD_welcomeParty` は所有者 `62ichiken@gmail.com`、`system_managed=1`。

## 3. Firebase Realtime Database

### 3.1 プロジェクト

- Firebaseプロジェクトエイリアス: `quiz-streaming-app`
- ブラウザSDKから直接接続する。
- Firebase Authenticationは現行実装で使用していない。

### 3.2 データツリー

```text
rooms
└── {roomId}
    ├── runtime
    │   ├── sessionId: string | null
    │   ├── currentSlideIndex: number
    │   ├── mode: string
    │   ├── currentQuestionId: string | null
    │   ├── questionOpen: boolean
    │   ├── questionClosed: boolean
    │   ├── hasVisitedFinalSlide: boolean
    │   ├── questionStartedAt: number | null
    │   └── winnerReveal: object | null
    └── answers
        └── {questionId}
            └── {participantId}
                ├── participantId: string
                ├── nickname: string
                ├── sessionId: string | null
                ├── choiceId: string
                ├── choiceIds: string[]
                └── answeredAt: number
```

### 3.3 runtime

| フィールド | 型 | 説明 |
|---|---|---|
| `sessionId` | string / null | 配信セッションUUID。回答集計の世代管理 |
| `currentSlideIndex` | number | 0始まりの現在スライド位置 |
| `mode` | string | `slide`, `question`, `closed`, `answer`, `result` |
| `currentQuestionId` | string / null | 現在の問題ID |
| `questionOpen` | boolean | 回答受付中か |
| `questionClosed` | boolean | 現在の問題で「回答締切」が実行済みか。次スライドへの進行条件 |
| `hasVisitedFinalSlide` | boolean | 現在のセッションで最終スライドを一度表示したか。「最後へ」の有効化条件 |
| `questionStartedAt` | number / null | 回答開始Firebaseサーバー時刻（Unixミリ秒） |
| `winnerReveal` | WinnerReveal / null | 優勝者発表状態 |

WinnerReveal:

```json
{
  "open": true,
  "winners": [
    { "nickname": "クイズ太郎", "score": 5, "totalQuestions": 5 }
  ],
  "revealedAt": 1784221200000
}
```

### 3.4 answers

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `participantId` | string | 必須 | ブラウザで生成したUUID。パス末尾と同値を期待 |
| `nickname` | string | 必須 | 1～30文字 |
| `sessionId` | string / null | 任意相当 | 回答時の配信セッション |
| `choiceId` | string | 必須 | 先頭の選択肢ID。後方互換・必須検証用 |
| `choiceIds` | string[] | 実装上送信 | 全選択肢ID。複数選択対応 |
| `answeredAt` | number | 必須 | Firebaseサーバー時刻 |

配列はRealtime Databaseでは数値キーを持つJSON配列として格納される。

### 3.5 Security Rules

現行ルールの要点:

| パス | read | write | validate |
|---|---|---|---|
| `rooms/{roomId}/runtime` | 全員 | 全員 | なし |
| `rooms/{roomId}/answers/{questionId}` | 全員 | 子ノード単位 | 下記条件 |

回答書き込み条件:

- パスの `{participantId}` と書き込みデータの `participantId` が一致する。
- `participantId`, `nickname`, `choiceId`, `answeredAt` が存在する。
- `nickname` が文字列で1～30文字。

現行ルールで検証されない主な項目:

- Firebase Authenticationのユーザー
- 管理者権限
- roomId、questionId、choiceIdの実在性
- `choiceIds` の型・件数
- `answeredAt` がサーバー時刻か
- 回答受付中か、締切済みか
- 1人1回答か

したがって、このルールはMVP用であり、クライアントを介さない直接操作を防止しない。

### 3.6 セッションリセットと保持

- リセット時は `runtime.sessionId` を新しいUUIDへ変更する。
- 過去の `answers` は物理削除しない。
- 画面側が現在の `sessionId` と一致する回答だけを表示・採点する。
- 長期運用では回答データが増え続けるため、別途削除・アーカイブ方針が必要。

## 4. Cloudflare R2

### 4.1 バケット

- バインディング名: `IMAGES`
- バケット名: `quiz-streaming-app-images`

### 4.2 キー規則

```text
slides/{roomId}/{UUID}.{extension}
```

例:

```text
slides/event-room-01/550e8400-e29b-41d4-a716-446655440000.png
```

### 4.3 メタデータ

- `Content-Type`: アップロード時のリクエストContent-Type
- `Cache-Control`: `public, max-age=3600`
- 配信時に `ETag` を付与する。

### 4.4 参照・削除

- RoomConfigの `Slide.imageUrl` には `/{objectKey}` を保存する。
- 画像差し替え・コンテンツ削除時に、同一roomId配下のR2画像を削除する。
- D1とR2をまたぐトランザクションはない。保存失敗や途中離脱により孤立オブジェクトが残る可能性がある。
- ルームID変更時にオブジェクトキーは移行されない。

## 5. Static Assets

| パス | ソース | 用途 |
|---|---|---|
| `/data/rooms/{roomId}.json` | `public/data/rooms/` | D1にないルーム設定のフォールバック |
| `/slides/{roomId}/{file}` | `public/slides/` | R2にない初期画像のフォールバック |

R2オブジェクトと静的画像が同一キーの場合、R2を優先する。

## 6. ブラウザlocalStorage

| キー | 値 | 用途 |
|---|---|---|
| `quiz-nickname:{roomId}` | `{ nickname, sessionId }` JSON | ニックネーム保持 |
| `quiz-participant:{roomId}` | UUID文字列 | Firebase回答キー |
| `quiz-answer:{roomId}:{sessionId}:{questionId}` | StoredAnswer JSON | 同一端末の再回答防止 |

`sessionId` がない旧状態では `legacy` を使用する。localStorageは信頼できる認証・DBではなく、利用者が変更・削除できる。
