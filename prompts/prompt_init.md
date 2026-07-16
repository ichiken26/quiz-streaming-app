Nuxt 4で、クイズ大会用の静的MVPアプリを実装してください。

目的は、将来的に「管理者がスライド進行を操作し、参加者全員のスマホに同じスライドを表示し、任意のタイミングでクイズ回答を受け付ける」Webアプリに拡張することです。

ただし、今回のMVPではAPIやDBは使わず、静的サイトとして公開できる構成にしてください。
現時点では、部屋情報・スライド情報・クイズ情報はローカルJSONをfetchして読み込みます。

## 前提

* Framework: Nuxt 4
* Language: TypeScript
* Styling: CSS / SCSS / Tailwind のどれでも可。ただし追加ライブラリを増やしすぎないこと
* API実装は不要
* DB実装は不要
* 認証実装は不要
* 静的サイトとして `nuxi generate` で公開できること
* roomIdは `2026_GD_welcomeParty`
* 画像スライドは `public/slides/2026_GD_welcomeParty/` 配下に置く前提
* JSONは `public/data/rooms/2026_GD_welcomeParty.json` に置く前提

## ルーティング

以下のページを作成してください。

### 参加者画面

`/room/[roomId]`

例:

`/room/2026_GD_welcomeParty`

参加者がスマホで開く画面です。

### 管理者画面

`/admin/room/[roomId]`

例:

`/admin/room/2026_GD_welcomeParty`

管理者が進行確認・プレビューする画面です。

今回の静的MVPでは、管理者画面で操作した内容を他端末の参加者画面へリアルタイム同期する必要はありません。
ただし、将来的にAPIやFirebase等で同期できるように、状態管理部分は差し替えやすい構成にしてください。

## JSON仕様

`public/data/rooms/2026_GD_welcomeParty.json` を作成してください。

以下のような構造にしてください。

```json
{
  "roomId": "2026_GD_welcomeParty",
  "title": "2026 GD Welcome Party",
  "description": "Welcome party quiz event",
  "initialSlideIndex": 0,
  "slides": [
    {
      "id": "opening",
      "type": "slide",
      "title": "Opening",
      "imageUrl": "/slides/2026_GD_welcomeParty/001-opening.png"
    },
    {
      "id": "q1",
      "type": "question",
      "title": "Question 1",
      "imageUrl": "/slides/2026_GD_welcomeParty/002-q1.png",
      "questionId": "q1"
    },
    {
      "id": "q1-answer",
      "type": "answer",
      "title": "Question 1 Answer",
      "imageUrl": "/slides/2026_GD_welcomeParty/003-q1-answer.png",
      "questionId": "q1"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "第1問：サンプル問題です。正しいものを1つ選んでください。",
      "choices": [
        {
          "id": "a",
          "label": "A",
          "text": "選択肢A"
        },
        {
          "id": "b",
          "label": "B",
          "text": "選択肢B"
        },
        {
          "id": "c",
          "label": "C",
          "text": "選択肢C"
        },
        {
          "id": "d",
          "label": "D",
          "text": "選択肢D"
        }
      ],
      "correctChoiceId": "b",
      "timeLimitSeconds": 20
    }
  ]
}
```

## 型定義

TypeScriptで以下のような型を定義してください。

```ts
type SlideType = 'slide' | 'question' | 'answer' | 'result'

type QuestionType = 'single'

type Choice = {
  id: string
  label: string
  text: string
}

type Question = {
  id: string
  type: QuestionType
  text: string
  choices: Choice[]
  correctChoiceId?: string
  timeLimitSeconds: number
}

type Slide = {
  id: string
  type: SlideType
  title: string
  imageUrl: string
  questionId?: string
}

type RoomConfig = {
  roomId: string
  title: string
  description?: string
  initialSlideIndex: number
  slides: Slide[]
  questions: Question[]
}
```

ファイル配置は任せますが、`types/quiz.ts` や `utils/room.ts` など、あとから拡張しやすい構成にしてください。

## 参加者画面の仕様

`/room/[roomId]` では以下を実装してください。

### 基本表示

* URLの `roomId` から `/data/rooms/{roomId}.json` をfetchする
* JSONが取得できない場合はエラー表示を出す
* 現在のスライド画像を画面中央に表示する
* スマホ表示を重視する
* 背景は黒基調で、画像は `object-fit: contain` にする
* 画像が読み込めない場合でも画面が壊れないようにする

### スライド操作

今回のMVPではリアルタイム同期はしないため、参加者画面にもデバッグ用の簡易操作を入れてください。

* 前へ
* 次へ
* 現在のスライド番号表示
* 現在のスライドID表示

ただし、将来的にはこの操作UIは非表示にできるよう、コンポーネントを分けるか、コメントで明示してください。

### クイズ表示

現在のスライドが `type: "question"` で `questionId` を持っている場合、そのquestionIdに対応するクイズを表示してください。

クイズはラジオボタンの単一選択です。

* question.text を表示
* choices をラジオボタンで表示
* 回答ボタンを表示
* 未選択の場合は回答できない
* 回答後は「回答済み」と表示し、同じ問題には再回答できないようにする
* 回答内容はAPIではなく `localStorage` に保存する
* 保存キーは `quiz-answer:{roomId}:{questionId}` のようにする

### 制限時間

questionの `timeLimitSeconds` に従って、参加者画面でカウントダウンを表示してください。

* 問題スライドに入ったタイミングでカウントダウン開始
* 残り秒数を表示
* 0秒になったら回答不可にする
* 0秒後は「回答時間が終了しました」と表示
* 回答済みの場合もそれ以上変更できない

今回のMVPでは、タイマーは各端末で独立して動いて構いません。
将来的に管理者画面から回答開始タイミングを同期する想定なので、タイマー処理は composable 等に分けて差し替えやすくしてください。

## 管理者画面の仕様

`/admin/room/[roomId]` では以下を実装してください。

### 基本表示

* URLの `roomId` から `/data/rooms/{roomId}.json` をfetchする
* 部屋タイトル、roomId、現在のスライド情報を表示する
* 現在のスライド画像をプレビュー表示する
* 現在のスライドがquestionの場合、対応するクイズ情報を表示する

### 管理者操作

今回のMVPでは管理者画面の操作は管理者画面内だけで完結して構いません。

以下のボタンを実装してください。

* 前へ
* 次へ
* 最初へ
* 最後へ
* 回答受付開始
* 回答締切
* 正解表示
* 集計表示

ただし、今回の静的MVPでは実際の参加者回答集計はできないため、以下のようにしてください。

* 回答受付開始: 管理者画面内のmodeを `question` にする
* 回答締切: modeを `closed` にする
* 正解表示: 現在のquestionの正解を表示する
* 集計表示: 「静的MVPでは参加者回答の集計は未実装です」と表示する

将来的にAPI化しやすいよう、管理者画面の状態として以下のようなものを用意してください。

```ts
type RoomMode = 'slide' | 'question' | 'closed' | 'answer' | 'result'

type RoomRuntimeState = {
  currentSlideIndex: number
  mode: RoomMode
  currentQuestionId?: string
  questionOpen: boolean
}
```

管理者画面の操作は、この `RoomRuntimeState` を更新する形にしてください。

## コンポーネント設計

最低限、以下のようなコンポーネント/Composableに分けてください。

* `components/SlideViewer.vue`

  * スライド画像を表示する
* `components/SingleChoiceQuestion.vue`

  * 単一選択クイズを表示する
* `components/SlideControls.vue`

  * 前へ/次へなどの操作ボタン
* `components/AdminControls.vue`

  * 管理者用操作ボタン
* `composables/useRoomConfig.ts`

  * roomIdからJSONをfetchしてRoomConfigを返す
* `composables/useQuestionTimer.ts`

  * timeLimitSecondsを受け取り、残り秒数・終了状態を返す
* `composables/useLocalAnswer.ts`

  * localStorageに回答を保存/取得する

完全にこの名前でなくてもよいですが、責務は分けてください。

## UI方針

デザインは簡単でよいですが、クイズ大会でスマホ表示する前提で以下を満たしてください。

* スマホで見やすい
* 黒背景
* スライド画像は画面内に収まる
* 回答ボタン/ラジオボタンはタップしやすい
* 管理者画面はPCでもスマホでも操作できる
* 重要な状態が見える

  * 現在のスライド番号
  * スライドID
  * mode
  * 回答受付中かどうか
  * 制限時間

## ダミー画像について

実際の画像ファイルはまだない可能性があります。
そのため、画像が存在しなくても画面が崩れないようにしてください。

可能なら、`public/slides/2026_GD_welcomeParty/` に簡易SVGまたはプレースホルダー画像を作成してください。

例:

* `001-opening.svg`
* `002-q1.svg`
* `003-q1-answer.svg`

JSONのimageUrlも、実ファイルがあるプレースホルダーに合わせて構いません。
ただし、あとからpngに差し替えやすい命名にしてください。

## 将来拡張を意識したコメント

コード内に、以下の将来拡張ポイントがわかるコメントを入れてください。

* 管理者操作をAPI/Firebaseに送信する箇所
* 参加者画面が現在のRoomRuntimeStateを購読する箇所
* 参加者回答をAPI/DBへ送信する箇所
* 回答集計をAPI/DBから取得する箇所

ただし、現時点では実装しないでください。

## 受け入れ条件

以下を満たしてください。

1. `/room/2026_GD_welcomeParty` にアクセスすると、JSONを読み込んでスライドが表示される
2. 参加者画面で前へ/次へができる
3. questionスライドでは単一選択のラジオボタンが表示される
4. questionスライドではJSON指定の制限時間でカウントダウンされる
5. 回答するとlocalStorageに保存され、再回答できない
6. 時間切れになると回答できない
7. `/admin/room/2026_GD_welcomeParty` にアクセスすると、管理者画面が表示される
8. 管理者画面で前へ/次へ/最初へ/最後へができる
9. 管理者画面で回答受付開始/回答締切/正解表示/集計表示のmode切り替えができる
10. API/DBなしで静的サイトとして動く
11. 将来的にAPIやFirebase等へ差し替えやすい構成になっている

## 注意点

* 今回はリアルタイム同期は実装しない
* 今回は参加者回答の管理者側集計は実装しない
* 今回は認証は実装しない
* 管理者URLは存在するが、セキュリティ保護はまだしない
* ただし、今後API化・認証追加・同期追加しやすい構成にする
* なるべくシンプルに実装し、過剰設計にしない
