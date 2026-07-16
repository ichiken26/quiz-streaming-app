# クラウド構成・運用仕様書

## 1. 構成概要

```text
Browser
├── HTTPS → Cloudflare Workers / Static Assets
│             ├── Worker API
│             ├── D1: ルーム設定・所有者
│             └── R2: アップロード画像
├── Firebase Web SDK → Realtime Database
│                       ├── 配信進行状態
│                       └── 参加者回答
└── Googleログイン → Cloudflare Zero Trust Access
                        └── 管理画面・管理APIの入口保護
```

### 1.1 確認範囲

- Worker、D1、R2、Firebaseの名称・バインディング・処理仕様は、リポジトリ内の設定と実装を正とする。
- 本番URL、Workerの本番デプロイ、D1疎通は2026-07-17に実環境で確認した。
- Cloudflare Zero TrustのApplication/Policy実体と、Firebase Console上で現在有効なRulesはリポジトリから取得できないため、本書ではリポジトリが要求する構成を記載する。運用時は各管理画面で適用状態を確認すること。
- 確認時の本番 `/api/health` は `{"status":"ok","d1":"connected"}` を返した。現行リポジトリのWorkerはこれにR2状態も返す実装であるため、本番デプロイとローカル実装に差分がある可能性がある。
- `quiz-streaming-app.kokage-studio.com` は同じアプリへ到達し、トップとヘルスチェックはHTTP 200。ただし確認時点では新ホストにCloudflare Accessが適用されていない。旧 `workers.dev` ホストのAccess設定はカスタムドメインへ自動継承されない。

## 2. Cloudflare Workers

| 項目 | 値 |
|---|---|
| Worker名 | `quiz-streaming-app` |
| 本番URL | `https://quiz-streaming-app.kokage-studio.com` |
| Cloudflare既定URL | `https://quiz-streaming-app.62ichiken.workers.dev` |
| エントリーポイント | `worker/index.ts` |
| compatibility date | `2026-07-16` |
| Static Assets | `.output/public` |
| Assets binding | `ASSETS` |
| SPA fallback | 有効 |
| Version Preview URL | 有効 |

2026-07-17確認時点の本番デプロイ:

- デプロイ作成: `2026-07-16T13:03:44.559Z`
- Version ID: `a6b815cd-6881-4d86-b0ec-3a6e27be798b`
- Author: `62ichiken@gmail.com`

カスタムドメインは `wrangler.jsonc` のCustom Domain routeとして管理する。

## 3. Cloudflareバインディング

### 3.1 D1

- binding: `DB`
- database: `quiz-streaming-app-db`
- database_id: `500fadfd-3c38-4682-a17a-dd915c0fda88`
- migrations directory: `migrations/`

### 3.2 R2

- binding: `IMAGES`
- bucket: `quiz-streaming-app-images`
- 用途: スライド・クイズ画像

### 3.3 Static Assets

- binding: `ASSETS`
- directory: `.output/public`
- Workerを先に実行する `run_worker_first=true`
- 存在しないHTMLルートはSPAとして処理する。

## 4. Firebase

### 4.1 用途

Firebase Realtime Databaseはブラウザ間の低遅延同期だけに使用する。

- 進行状態: `rooms/{roomId}/runtime`
- 回答: `rooms/{roomId}/answers/...`

ルーム設定・所有権はCloudflare D1が正本。

### 4.2 ビルド時環境変数

```dotenv
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_DATABASE_URL=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
```

これらはNuxtの公開ランタイム設定であり、ブラウザへ配布される。秘密鍵として扱う値ではないが、`.env` はGit管理しない。

### 4.3 Rules反映

```bash
npx firebase-tools login
npx firebase-tools deploy --only database
```

`.firebaserc` の既定プロジェクトは `quiz-streaming-app`、ルールファイルは `firebase.database.rules.json`。

## 5. Cloudflare Zero Trust Access

### 5.1 目的

Googleアカウントで管理画面と管理APIへの到達を制限し、認証済みメールアドレスをWorkerへ渡す。

### 5.2 保護対象

少なくとも次の2系統を保護する。

- `quiz-streaming-app.kokage-studio.com/admin*`
- `quiz-streaming-app.kokage-studio.com/api/admin/*`

Cloudflare既定URLを引き続き利用可能にする場合は、`quiz-streaming-app.62ichiken.workers.dev` にも同じ保護を維持する。

参加者向け `/`, `/room/*`, `/api/rooms/*` は公開する。

### 5.3 現行許可ユーザー

- `62ichiken@gmail.com`
- `ichinose.kenki@tbs.co.jp`

### 5.4 二段階認可

1. Cloudflare AccessのAllow policyでGoogleアカウントを許可する。
2. Workerの `ADMIN_EMAILS` で `Cf-Access-Authenticated-User-Email` を再検証する。

片方だけ変更しても管理機能は利用できない。Accessだけに追加するとWorkerが403を返し、コードだけに追加してもAccessが入口で拒否する。

## 6. 新しい管理ユーザーを追加する手順

### 6.1 前提

- 追加対象のGoogleアカウントのメールアドレスが確定していること。
- CloudflareアカウントでZero Trust設定を変更できること。
- 本リポジトリを本番デプロイできること。

現行実装では追加された管理ユーザーは全員「システム管理者」になる。つまり、`system_managed=1` の全ルームを共同管理でき、作成したルームも共同管理対象になる。特定ルームだけに権限を与える機能は未実装。

### 6.2 手順1: メールアドレスを正規化する

- 前後空白を除去する。
- 小文字表記で登録する。
- 個人アドレスか組織管理アドレスかを確認する。

例: `new-admin@example.com`

### 6.3 手順2: Workerの許可リストへ追加する

`worker/index.ts` の `ADMIN_EMAILS` に追加する。

```ts
const ADMIN_EMAILS = new Set([
  '62ichiken@gmail.com',
  'ichinose.kenki@tbs.co.jp',
  'new-admin@example.com',
])
```

### 6.4 手順3: Cloudflare Accessへ追加する

Cloudflare Dashboardで次を実施する。

1. Zero Trustを開く。
2. Access → Applicationsを開く。
3. 本アプリのSelf-hosted applicationを選択する。
4. `/admin*` と `/api/admin/*` を保護するアプリケーションまたはポリシーを確認する。
5. Allow policyのInclude条件へ、対象メールアドレスを追加する。
6. GoogleをIdentity providerとして利用できることを確認する。
7. 保存する。

メールアドレスを個別列挙せずGoogle GroupやIdPグループを使う場合も、現行Workerの `ADMIN_EMAILS` には各メールアドレスを追加する必要がある。

### 6.5 手順4: 検証する

```bash
npm install
npm run test:scoring
npm run typecheck
npm run deploy:dry-run
```

### 6.6 手順5: 本番デプロイする

Firebase公開設定値を `.env` に用意した状態で実行する。

```bash
npm run deploy
```

このコマンドは静的生成後、`wrangler deploy` でWorkerとStatic Assetsを本番へ反映する。

### 6.7 手順6: 追加後の受入確認

追加ユーザー本人のブラウザで次を確認する。

1. Googleの対象アカウントだけでログインする。複数アカウント利用時はシークレットウィンドウを推奨。
2. `/admin` を開ける。
3. 画面に対象メールアドレスと「システム管理者」が表示される。
4. `system_managed=1` の既存ルームが一覧に表示される。
5. 新規ルームを作成・編集できる。
6. `/admin/room/{roomId}` で配信操作できる。
7. 未許可アカウントが管理画面・管理APIへアクセスできない。

API確認例:

```text
GET /api/admin/session
→ { "email": "new-admin@example.com", "systemAdmin": true }
```

AccessヘッダーはCloudflareが付与するため、通常の `curl` でメールヘッダーだけを偽装して受入確認しない。インターネットからWorkerへ直接到達できる構成ではヘッダー偽装対策としてAccess保護範囲が重要になる。

### 6.8 管理ユーザー削除

追加と逆順で実施する。

1. Cloudflare AccessのAllow policyから削除し、即時に入口を閉じる。
2. `ADMIN_EMAILS` から削除する。
3. テスト・dry-run後に本番デプロイする。
4. 削除ユーザー所有のルームを残すか、D1上の `owner_email` を移管するか判断する。

`system_managed=1` のルームは残りのシステム管理者が管理できる。`system_managed=0` かつ削除ユーザー所有のルームは、所有者移管しないと管理不能になる。

## 7. デプロイ手順

### 7.1 初回準備

```bash
npm install
npx wrangler login
cp .env.example .env
```

`.env` にFirebase Webアプリ設定を入力する。

### 7.2 D1マイグレーション

未適用マイグレーションを確認してから本番へ適用する。

```bash
npx wrangler d1 migrations list quiz-streaming-app-db --remote
npx wrangler d1 migrations apply quiz-streaming-app-db --remote
```

通常の `npm run deploy` はD1マイグレーションを自動適用しない。

### 7.3 検証

```bash
npm run test:scoring
npm run typecheck
npm run deploy:dry-run
```

### 7.4 Preview

```bash
npm run deploy:preview
```

- 静的生成後に `wrangler versions upload --preview-alias prompt2` を実行する。
- 本番トラフィックは変更しない。
- Version Preview URLは都度Cloudflareの出力を記録する。

### 7.5 本番

```bash
npm run deploy
```

### 7.6 デプロイ後確認

```bash
curl -fsS https://quiz-streaming-app.kokage-studio.com/api/health
```

期待値:

```json
{ "status": "ok", "d1": "connected", "r2": "connected" }
```

`r2` がレスポンスに存在しない場合は、R2未接続ではなく、まず現行リポジトリより古いWorkerが本番にデプロイされていないかを確認する。現行コードでR2未バインドの場合の値は `"r2":"unconfigured"`。

続けて、トップ、公開ルーム、管理ログイン、画像表示、Firebase同期をブラウザで確認する。

## 8. 障害切り分け

| 症状 | 主な確認先 |
|---|---|
| 全画面が開かない | Worker deployment、workers.dev、Static Assets |
| `/api/health` が503 | D1 binding、D1障害・権限 |
| 画像アップロードが503 | R2 binding `IMAGES` |
| 画像が404 | R2キー、RoomConfig.imageUrl、静的フォールバック |
| 管理画面でAccess拒否 | Zero Trust application、Allow policy、Googleアカウント |
| 管理APIが403 | `ADMIN_EMAILS`、Accessメールヘッダー、保護パス |
| 参加者と同期しない | Firebase環境変数、Realtime Database、Rules |
| ルーム一覧に出ない | D1 owner_email、system_managed、ログインメール |

Wranglerで本番デプロイ状態を確認する。

```bash
npx wrangler deployments status
npx wrangler deployments list
npx wrangler whoami
```

## 9. バックアップ・データ保持

現行リポジトリには自動バックアップ、回答アーカイブ、保持期限、ルーム削除ジョブは定義されていない。

運用開始前に少なくとも次を別途決定する。

- D1のバックアップ・復旧手順
- R2画像の保持期限と孤立オブジェクト清掃
- Firebase過去回答の保持期限と削除手順
- 個人情報となり得るニックネームの扱い
- 管理者追加・削除の申請・承認・記録方法

## 10. セキュリティ上の現行制約

1. Firebase Authentication未導入のため、Realtime Databaseの `runtime` は公開書き込み可能。
2. 回答もパスとpayloadのparticipantId一致だけで書き込み可能。
3. 回答受付中・締切の判定はSecurity Rulesで強制されない。
4. 管理APIの画像操作はルーム所有権を検査しない。
5. `ADMIN_EMAILS` はコードへハードコードされ、ユーザー管理画面や監査ログはない。
6. Access保護を `/admin*` だけに設定し、`/api/admin/*` を保護しない構成は避ける。

本番で厳格な認可が必要な場合は、Firebase Authentication、Admin Custom Claimsまたは署名済みバックエンドAPI、Rulesによる管理者・受付時間検証を追加する。
