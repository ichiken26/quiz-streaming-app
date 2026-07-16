# Quiz Streaming App

Nuxt 4とFirebase Realtime Databaseで構築したクイズ大会向けアプリです。Nuxt本体は静的生成でき、端末間同期だけをFirebaseが担当します。

## Documentation

- [画面仕様書](./docs/SCREEN_SPEC.md)
- [API仕様書](./docs/API_SPEC.md)
- [DBスキーマ定義書](./docs/DATABASE_SCHEMA.md)
- [URL仕様書](./docs/URL_SPEC.md)
- [クラウド構成・運用仕様書](./docs/CLOUD_SPEC.md)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`にFirebase Webアプリの設定値を入力してください。

```dotenv
NUXT_PUBLIC_FIREBASE_API_KEY=...
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NUXT_PUBLIC_FIREBASE_DATABASE_URL=https://PROJECT_ID-default-rtdb.firebaseio.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=...
NUXT_PUBLIC_FIREBASE_APP_ID=...
```

Realtime Databaseには[firebase.database.rules.json](./firebase.database.rules.json)のRulesを設定します。このRulesは認証未実装のMVP用で、管理者URLを知るユーザーによるruntime更新を防げません。本番運用前にFirebase Authenticationと管理者権限の検証が必要です。

- 参加者: <http://localhost:3000/room/2026_GD_welcomeParty>
- 管理者: <http://localhost:3000/admin/room/2026_GD_welcomeParty>

## Static generation

```bash
npm run typecheck
npm run generate
npm run preview
```

生成物は`.output/public/`に出力されます。

## Cloudflare Workers deployment

Cloudflare Workers Static Assetsとしてデプロイします。初回のみ`npx wrangler login`で
Cloudflareへログインし、Firebaseの公開設定値を`.env`へ設定してから実行してください。

### Workers Builds (Git連携)

Dashboardの Build command は `npm run build` のままで問題ありません。
このリポジトリの `build` は静的生成 (`nuxt generate`) を実行し、`.output/public` を用意します。
その後 Deploy command の `npx wrangler deploy` が Worker と Static Assets を公開します。

Build Variables には Firebase 公開設定を入れてください（ビルド時にフロントへ埋め込まれます）。

```text
NUXT_PUBLIC_FIREBASE_API_KEY
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NUXT_PUBLIC_FIREBASE_DATABASE_URL
NUXT_PUBLIC_FIREBASE_PROJECT_ID
NUXT_PUBLIC_FIREBASE_APP_ID
```

Node は `.nvmrc` で 22 を指定しています。

### 手動デプロイ

```bash
npm run typecheck
npm run deploy
```

Worker名は`quiz-streaming-app`、配信対象は`.output/public/`です。設定は
[`wrangler.jsonc`](./wrangler.jsonc)にあります。設定だけを検証する場合は
`npm run deploy:dry-run`を使用します。

本番トラフィックへ反映せず、Version Preview URLへアップロードする場合は
`npm run deploy:preview`を使用します。

### Cloudflare services

- D1: `quiz-streaming-app-db`を`DB`としてWorkerへバインドします。接続確認は
  `/api/health`で行えます。スキーマ変更は`migrations/`で管理します。
- R2: 画像用バケット`quiz-streaming-app-images`を`IMAGES`としてバインドします。
  Workerは`/slides/*`をR2から取得できる実装済みで、R2未設定またはオブジェクトが
  存在しない間は既存の静的画像へフォールバックします。
- Firebase Realtime Database: 進行状態と回答のリアルタイム同期だけに使用します。
- Cloudflare Zero Trust Access: 参加者画面は公開し、`/admin/*`だけをSelf-hosted
  applicationのパスとして保護します。許可対象には管理者のメールアドレスまたは
  組織のIdPグループを指定してください。

Zero Trust Accessは管理画面へのアクセスを保護しますが、Firebaseへの直接書き込みを
認可するものではありません。本番運用ではFirebase Authenticationを有効にし、
Realtime Database Rulesでも管理者の更新権限を検証してください。

初回のD1マイグレーションは次のコマンドで適用します。

```bash
npx wrangler d1 migrations apply quiz-streaming-app-db --remote
```

管理APIはCloudflare Accessが付与する`Cf-Access-Authenticated-User-Email`を確認し、
`62ichiken@gmail.com`と`ichinose.kenki@tbs.co.jp`だけを許可します。
この2名はシステム管理者であり、`system_managed = 1`のルームを共同管理します。
システム管理者が作成したルームは自動的に共同管理対象になります。

## Structure

- `layers/streaming/`: スライド表示、読み取り専用進行表示、管理者操作、layout
- `layers/quiz/`: 参加者回答UI、同期タイマー、管理者用問題表示・回答集計表示
- `layers/realtime/`: Firebase接続、RoomRuntimeState購読・更新、回答送信・購読
- `shared/types/quiz.ts`: 設定と実行時状態の共通型
- `public/data/rooms/`: 部屋ごとのローカルJSON
- `public/slides/`: R2移行前の部屋ごとのスライド画像

ルーム編集画面では通常画像コンテンツだけでなく、各クイズにも任意の画像を設定できます。
クイズ画像はR2へ保存され、問題文・選択肢・解答設定とは独立して差し替え・削除できます。

新しいroomIdの画面はWorkersのSPAフォールバックで配信され、ルーム設定はD1から取得されます。

## Realtime behavior

- 参加者はルームごとにニックネームを入力し、回答には匿名participantIdと
  ニックネームの両方を保存します。
- 参加者画面は`rooms/{roomId}/runtime`を購読するだけで、スライド操作はできません。
- 管理者画面の操作だけがruntimeを更新します。
- 回答受付開始時のFirebaseサーバー時刻を全参加者のタイマー基準にします。
- 参加者回答は`rooms/{roomId}/answers/{questionId}/{participantId}`へ保存され、管理画面で選択肢別件数をリアルタイム表示します。
- 回答時間が0秒になった時点で未送信の選択肢がある場合、その瞬間の選択内容を自動送信します。
  未選択の場合は未回答のままとし、手動送信と自動送信の二重実行は防止します。
- 管理画面は全問題をニックネーム単位で採点し、最終スライドの`GO`で最高得点者を
  `runtime.winnerReveal`へ公開します。同点者は全員を同率優勝として同期表示します。
- 管理画面のセッションリセットは`runtime.sessionId`を更新し、以前の回答を集計対象外にします。
  参加中の端末はこの変更を購読し、ルーム別のニックネーム、participantId、回答済み状態を
  localStorageから削除します。
- localStorageは匿名participantIdと同一端末からの再回答防止だけに使用します。
