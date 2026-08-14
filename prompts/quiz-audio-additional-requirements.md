# クイズ音声再生機能 追加要件

## 1. 目的

クイズの各問題に音声ファイルを1つ紐づけ、管理者用配信画面から任意に再生・一時停止・停止できるようにする。

音声は参加者端末では再生せず、管理者端末からのみ再生する。

---

## 2. 対象構成

既存構成をそのまま利用する。

- フロントエンド: Nuxt
- API / 配信: Cloudflare Workers
- 永続データ: Cloudflare D1
- 音声ファイル保存: Cloudflare R2
- リアルタイム同期: Firebase Realtime Database
- 管理者認証: Cloudflare Access

音声再生状態は参加者と同期しないため、Firebase Realtime Databaseには音声関連データを保存しない。

---

## 3. 基本仕様

### 3.1 問題と音声の関係

- 1問につき音声ファイルを最大1つ設定できる。
- 音声は任意項目とする。
- 音声未設定の問題も従来どおり利用できる。
- 音声は管理者画面のみで再生可能とする。
- 参加者画面には音声プレイヤーを表示しない。

---

## 4. データモデル

既存の `Question` に音声情報を追加する。

```ts
export type Question = {
  id: string
  type: QuestionType
  text: string

  audio?: {
    url: string
    name: string
  }

  choices: Choice[]
  correctChoiceId?: string
  correctChoiceIds?: string[]
  timeLimitSeconds: number
}
```

### 4.1 保存先

音声ファイル本体はD1に保存しない。

D1の `rooms.config_json` に保存される `RoomConfig` 内には、R2上の音声ファイルを参照するURLのみ保持する。

例:

```json
{
  "audio": {
    "url": "/api/admin/audio/event-room-01/xxxxxxxx.mp3",
    "name": "question-01.mp3"
  }
}
```

既存の `config_json` にJSONとして保存するため、音声URL追加のみであれば原則としてD1 migrationは不要。

---

## 5. R2保存仕様

既存R2 Bucketをそのまま利用する。

現行の `IMAGES` Bindingは将来的に `MEDIA` 等へ改名してもよいが、本追加要件の実装時点では既存Bindingの利用を許容する。

保存構造:

```text
R2 Bucket
├── slides/
│   └── {roomId}/
│       └── ...
│
└── audio/
    └── {roomId}/
        └── {uuid}.mp3
```

### 5.1 ファイル形式

初期対応形式はMP3とする。

許可MIME Type:

```text
audio/mpeg
```

### 5.2 ファイルサイズ

1ファイルあたり最大20MBとする。

20MBを超える音声ファイルはアップロード時に拒否する。

---

## 6. 管理API

### 6.1 アップロード

```http
POST /api/admin/audio/:roomId
```

用途:

- 音声ファイルをR2へアップロードする。
- Cloudflare Access認証済み管理者のみ利用可能。
- `Content-Type: audio/mpeg` のみ受け付ける。
- 最大20MBまで。

成功レスポンス例:

```json
{
  "audioUrl": "/api/admin/audio/event-room-01/xxxxxxxx.mp3",
  "name": "question-01.mp3"
}
```

### 6.2 音声取得

```http
GET /api/admin/audio/:roomId/:objectName
```

用途:

- 管理者画面から音声を再生する。
- Cloudflare Access保護対象とする。
- 参加者向け公開APIとして提供しない。

#### Range Request対応

ブラウザの `<audio>` 要素によるシーク・途中再生・再開に対応するため、HTTP Range Requestをサポートする。

Workerは `Range` ヘッダーをR2取得時に反映し、必要に応じて `206 Partial Content` を返せる構成とする。

### 6.3 削除

```http
DELETE /api/admin/audio/:roomId/:objectName
```

用途:

- 問題から音声を削除した場合にR2上のオブジェクトも削除する。
- 音声差し替え時は、新規アップロード成功後に旧音声を削除する。

---

## 7. 管理者編集画面

各問題の編集UIに音声設定欄を追加する。

表示例:

```text
音声
[ ファイルを選択 ]

question-01.mp3
[ ▶ プレビュー ] [ 削除 ]
```

### 7.1 操作

管理者は以下を行える。

- MP3ファイルをアップロード
- 現在設定されている音声をプレビュー再生
- 音声を差し替え
- 音声を削除

### 7.2 アップロードエラー

以下の場合はエラー表示する。

- MP3以外のファイル
- 20MBを超えるファイル
- R2アップロード失敗
- Cloudflare Access認証失敗
- API通信失敗

---

## 8. 管理者配信画面

現在表示している問題に音声が設定されている場合のみ、音声コントロールを表示する。

表示例:

```text
AUDIO

[ ▶ 再生 ] [ ⏸ 一時停止 ] [ ■ 停止 ]

00:14 / 00:32
```

### 8.1 必須操作

- 再生
- 一時停止
- 停止
- 再生位置表示
- 総再生時間表示
- シーク

### 8.2 問題切り替え

別の問題またはスライドへ移動した場合、現在再生中の音声は自動停止する。

再生位置も0秒へ戻す。

### 8.3 回答タイマーとの関係

初期仕様では、音声再生と問題の回答タイマーは独立させる。

つまり、

- 音声再生開始
- 回答受付開始

は別操作とする。

将来的に必要であれば、

- 音声終了後に回答受付開始
- 音声再生と同時に回答受付開始

などを追加できる設計とする。

---

## 9. 参加者画面

参加者画面への変更は原則行わない。

参加者には以下を公開しない。

- 音声URL
- 音声プレイヤー
- 音声再生状態
- 音声再生時間

公開用 `RoomConfig` へ音声URLを含める場合でも、実ファイル取得APIは `/api/admin/audio/*` 配下とし、Cloudflare Accessで保護する。

---

## 10. Firebase Realtime Database

音声機能追加によるRealtime Databaseの変更は行わない。

既存の同期対象:

- `currentSlideIndex`
- `mode`
- `currentQuestionId`
- `questionOpen`
- `questionClosed`
- `questionStartedAt`
- `winnerReveal`
- その他既存runtime state

音声については管理者ブラウザ内のローカル状態として管理する。

---

## 11. 容量・負荷方針

音声ファイルはR2に保存する。

想定用途はクイズ中に使用する数十秒〜数分程度の音声であり、参加者には直接配信しない。

そのため音声配信の主な通信先は管理者端末1台となる。

参加人数の増加によって音声ファイルのR2読み込み回数が直接増加する設計にはしない。

---

## 12. セキュリティ要件

- アップロードAPIは `/api/admin/*` 配下とする。
- 音声取得APIも `/api/admin/*` 配下とする。
- Cloudflare Access認証済みユーザーのみ利用可能とする。
- Worker側でも既存の管理者認証処理を通す。
- R2 Bucketを直接Public公開しない。
- ファイル名はユーザー入力値をそのままR2キーに利用せず、UUIDを使用する。
- MIME Typeとファイルサイズをサーバー側でも検証する。

---

## 13. 実装対象候補

### Shared

- `shared/types/quiz.ts`
  - `Question.audio` を追加

### Nuxt

- 問題編集UI
  - 音声ファイル選択
  - プレビュー
  - 削除
- 管理者配信画面
  - Audio Player
  - 再生 / 一時停止 / 停止 / シーク

### Worker

- 音声アップロードAPI
- 音声取得API
- Range Request対応
- 音声削除API

### R2

- `audio/{roomId}/{uuid}.mp3` に保存

### D1

- Schema変更なし
- `RoomConfig` の `config_json` に音声メタデータを保存

### Firebase Realtime Database

- 変更なし

---

## 14. 完了条件

以下をすべて満たした時点で実装完了とする。

- 管理者編集画面からMP3をアップロードできる。
- 20MB超過ファイルを拒否できる。
- MP3以外を拒否できる。
- 音声URLがRoomConfigへ保存される。
- 既存ルームも音声未設定のまま正常動作する。
- 管理者配信画面から再生できる。
- 一時停止・停止・シークができる。
- 問題切り替え時に再生中音声が停止する。
- 音声差し替え時に旧R2オブジェクトが削除される。
- 音声削除時にR2オブジェクトも削除される。
- 参加者画面では音声が再生されない。
- 音声取得APIへ未認証ユーザーがアクセスできない。
- Range Requestを利用した途中再生が正常に動作する。
- 既存のクイズ回答・タイマー・Firebase同期機能を壊さない。
