# URL仕様書

## 1. ベースURL

| 環境 | URL |
|---|---|
| 本番（カスタムドメイン） | `https://quiz-streaming-app.kokage-studio.com` |
| Cloudflare既定ドメイン | `https://quiz-streaming-app.62ichiken.workers.dev` |
| ローカル開発 | `http://localhost:3000` |
| Version Preview | Cloudflareが発行するバージョン別URL。固定URLではない |

本番ルートと `/api/health` は2026-07-17時点でHTTP 200を確認済み。

## 2. URL設計原則

- すべての本番通信はHTTPS。
- 画面はNuxt SPAとして配信する。
- 未生成の画面URLへのGETで `Accept: text/html` がある場合、Workerは `/` を返してクライアントルーティングを成立させる。
- API、R2画像、静的アセットはSPAフォールバック対象外。
- `roomId` は半角英数字と `.`, `_`, `~`, `-` のみ。
- 動的値はURLエンコードする。

## 3. 画面URL

| URL | 公開範囲 | 説明 |
|---|---|---|
| `/` | 公開 | ルーム参加トップ |
| `/room/{roomId}` | 公開 | 参加者用クイズルーム |
| `/admin` | 管理者 | 管理ルーム一覧 |
| `/admin/edit` | 管理者 | 新規ルーム作成 |
| `/admin/edit?q={roomId}` | 管理者 | 既存ルーム編集。正規の編集クエリ |
| `/admin/edit?roomId={roomId}` | 管理者 | 既存ルーム編集。互換入力として受付 |
| `/admin/room/{roomId}` | 管理者 | 配信・進行操作 |

### 3.1 具体例

- 参加者: `https://quiz-streaming-app.kokage-studio.com/room/2026_GD_welcomeParty`
- 管理者配信: `https://quiz-streaming-app.kokage-studio.com/admin/room/2026_GD_welcomeParty`
- 編集: `https://quiz-streaming-app.kokage-studio.com/admin/edit?q=2026_GD_welcomeParty`

### 3.2 Cloudflare Access保護範囲

Cloudflare Zero TrustのSelf-hosted applicationで、本番ホスト `quiz-streaming-app.kokage-studio.com` の `/admin/*` を保護する。実運用では `/admin` 自体も保護対象に含める必要があるため、アプリケーションのパス設定が `/admin*` 相当になっていることを確認する。

2026-07-17の確認時点では、旧 `workers.dev` ホストはAccessログインへ転送されるが、カスタムドメインは転送されない。カスタムドメインを正式運用する前にZero Trust Applicationへ新ホストを追加すること。

参加者URL `/` と `/room/*` は公開する。

## 4. API URL

| メソッド | URL | 公開範囲 |
|---|---|---|
| GET | `/api/health` | 公開 |
| GET | `/api/rooms/{roomId}` | 公開 |
| GET | `/api/admin/session` | Worker許可リスト |
| GET | `/api/admin/rooms` | Worker許可リスト |
| POST | `/api/admin/rooms` | Worker許可リスト |
| GET | `/api/admin/rooms/{roomId}` | Worker許可リスト + ルーム権限 |
| PATCH | `/api/admin/rooms/{roomId}` | Worker許可リスト + ルーム権限 |
| POST | `/api/admin/images/{roomId}` | Worker許可リスト |
| DELETE | `/api/admin/images/{roomId}/{objectName}` | Worker許可リスト |

重要: Zero Trustのパスが `/admin/*` だけの場合、`/api/admin/*` はAccessの対象外になり得る。Worker側のメールヘッダー検証は必須であり、クラウド設定では `/api/admin/*` もAccess保護対象にする。

## 5. 画像・静的データURL

| URL | 解決順 | 説明 |
|---|---|---|
| `/slides/{roomId}/{fileName}` | R2 → Static Assets | スライド・クイズ画像 |
| `/data/rooms/{roomId}.json` | Static Assets | 初期ルームJSON。通常は公開API経由で利用 |
| `/favicon.ico` | Static Assets | favicon |
| `/robots.txt` | Static Assets | crawler設定 |

R2アップロード画像のURL形式:

```text
/slides/{roomId}/{UUID}.{extension}
```

## 6. Firebaseデータパス

HTTP URLではないが、画面間同期で次のRealtime Databaseパスを使用する。

| パス | 用途 |
|---|---|
| `rooms/{roomId}/runtime` | 進行状態 |
| `rooms/{roomId}/answers/{questionId}/{participantId}` | 回答 |

## 7. roomId変更時の影響

管理画面でroomIdを変更すると、D1のルーム主キーと `config_json.roomId` は更新され、新しい画面URLが発行される。ただし次は自動移行しない。

- Firebase `rooms/{oldRoomId}` のruntime・answers
- R2 `slides/{oldRoomId}/...` のオブジェクトキー
- 参加者端末の旧roomId用localStorage
- 外部へ配布済みのURL・QRコード

画像URLが旧roomId配下を指したままなら表示自体は継続できるが、編集画面の削除処理は新roomIdプレフィックスだけを削除対象とする。

## 8. URL別レスポンス方針

| 対象 | 存在しない場合 |
|---|---|
| HTML画面GET | `/` のHTMLへSPAフォールバック |
| 公開ルームAPI | JSON 404 |
| 管理API | JSON 404 |
| R2画像 | 静的アセットへフォールバック。なければ404 |
| その他静的アセット | 404 |

## 9. 命名時の注意

- roomIdはURL、D1主キー、Firebaseパス、R2キーの一部になるため、作成後の変更は避ける。
- 個人情報、秘密情報、イベントの非公開情報をroomIdへ含めない。
- URLは大文字小文字を区別するため、運用上は小文字とハイフン中心を推奨する。
