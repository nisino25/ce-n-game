# データの取得・更新ポイント一覧（API・DB）

- 作成日: 2026-10-03
- 目的: このアプリが「どこから・どのデータを取ってきて（取得）」「どこに書き込んでいるか（更新）」を一覧にする
- 対象: `cave-adventure`（main: PR #14 マージ時点のコード）

---

## 1. 全体の構成

このアプリには**専用のサーバー（バックエンド）がありません**。ブラウザ（画面のコード）から、次のサービスを直接呼び出しています。

```
            ┌──────────────────────────────────────────────┐
            │  ブラウザ（Vue のアプリ）                     │
            │  Netlify から配信された HTML / JS / 画像      │
            └──────────────────────────────────────────────┘
               │            │             │             │
               ▼            ▼             ▼             ▼
       Firebase        ce-n.org       いきもの判定     地図・動画
       Firestore       findMe API     API              （国土地理院・
       （DB）          （会員確認）    （生き物スキャン）  YouTube など）
```

| 種類 | サービス | 役割 |
|---|---|---|
| ホスティング | Netlify（`ce-n-game.netlify.app`） | 画面のファイルを配信するだけ。処理は行わない |
| データベース | Firebase Firestore（プロジェクト `ce-n-game`） | ユーザー・チーム・カード・ゲームの保存。**ブラウザから直接読み書きしている** |
| 外部API | ce-n.org、いきもの判定API など | 2章を参照 |
| ブラウザ内の保存 | localStorage / Cookie / sessionStorage | ログイン状態・カギの数など。7章を参照 |

---

## 2. 外部API（fetch で呼んでいるもの）

| API | 呼び出し元 | 方法 | 何をしているか |
|---|---|---|---|
| ce-n.org 会員確認<br>`https://www.ce-n.org/_functions/findMe?id={cenId}` | `LoginPage.vue` | GET | URL の `cenId` が ce-n.org の会員IDとして存在するかを確認する。存在しなければエラー画面へ |
| ce-n.org ポイント取得（テラ）<br>同じ `findMe` の `totalPoints` | `MonitorRoom.vue`（`utils/points.js` の `fetchTotalPoints`） | GET | モニタールームに「◯テラ」を表示する。ハブサイトの「合計得点」と同じ値 |
| ce-n.org ポイント更新（テラ）<br>`https://www.ce-n.org/_functions/updatePoints?id={cenId}&increment={点数}` | `utils/points.js` の `addPoints`（**まだどこからも呼んでいない**） | GET（ポイントが書き換わる） | ポイントを加算する。ハブも同じAPIを使う。詳細は [currency.md](currency.md) |
| いきもの判定API<br>`https://ikimono-api-…run.app/v1/identify` | `CreatureScan.vue` | POST（画像を送る） | 撮った写真に写っている生きものを判定する。ヘッダー `X-API-Key` が必要 |
| 日本地図の形<br>`https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson` | `DominationMap.vue` | GET | 地図で日本を緑に塗るための形のデータ |
| 地図の画像（タイル）<br>`https://cyberjapandata.gsi.go.jp/xyz/pale/…` | `DominationMap.vue` | 画像の読み込み | 国土地理院の淡色地図。キー不要 |
| YouTube IFrame API<br>`https://www.youtube.com/iframe_api` | `IntroView.vue` / `DominationMap.vue` | スクリプトの読み込み | イントロ動画・地域チュートリアル動画の再生と、「動画が終わった」の検知 |

---

## 3. Firestore のコレクション（データの入れ物）

| コレクション | 1件＝ | 主な中身 |
|---|---|---|
| `users/{uid}` | 1人のプレイヤー | `name`, `avatar`, `team`（water / earth / air）, `cenId`, `level`, `enteredMonitorRoomAt`, `tutorialCleared`（地図のチュートリアルを見た地域） |
| `teams/{teamId}` | 1チーム（`water` / `earth` / `air`） | `members`（メンバーの uid の配列） |
| `cards/{cardId}` | 1種類の生きもの（**カードライブラリ**） | `name`, `image`, `level`（1〜4）, `terrain`, `food`, `habitat`, `region`, `rarity`, `frame`, `published` |
| `cardInstances/{instanceId}` | プレイヤーが持っている1枚のカード（**所持カード**） | `cardId`, `ownerUid`, `ownerName`, `team`, `obtainedAt`, `obtainedFrom`, `status`（collection / placed / eaten）, `dominationRoomCode`, `tileId` |
| `dominationGames/{ルームコード}` | 陣取りゲーム1ルーム分の進行状況（地図の場所から始めたゲームは、街の全員で共有する枠ID `{場所ID}-{1〜3}`） | `tiles`（盤面）, `hands`（手札）, `players`（スコア）, `currentPlayerId`, `gameState`, `place`（場所）, `result`（終了時の勝ち負け）, `ownerUid` / `ownerName` / `ownerTeam`（枠を遊んでいる人）など |
| `mapSlots/{枠ID}` | 地図に出す、ゲーム枠1つの軽い「ようす」（誰が遊び中か・勝ったチーム） | `city`, `spotId`, `gameNo`, `state`（playing / finished）, `ownerUid`, `ownerName`, `ownerTeam`, `winnerTeam`, `humanWon`, `updatedAt` |
| `mapSpots/{場所ID}` | 地図の六角形1つ（街の「場所」） | `city`, `name`, `icon`, `habitat`, `q`, `r`, `order`（[requirements/05_map_habitat.md](requirements/05_map_habitat.md)） |
| `userComments/{id}` | かんばんから送られた「みんなの声」1件 | `text`, `uid`, `name`, `team`, `createdAt` |
| `abGameQuestions/{id}` | ABゲームの1問 | `location`, `order`, `bComment`, `imgB`, `qaImage`, `correct`, `showIcons`, `comment` |

> カードの詳しい設計は [requirements/04_cards.md](requirements/04_cards.md) を参照。

---

## 4. 取得（読み込み）ポイント

「どの画面が・いつ・どのデータを取ってくるか」の一覧。

### 4-1. ユーザー・チーム

| どこで | いつ | 取得するデータ | 条件 |
|---|---|---|---|
| `LoginPage.vue` | ログイン時 | `users` | `cenId` が一致するユーザー（いなければ新規登録画面へ） |
| `IntroView.vue`（`getTeamCounts`） | 新規登録時 | `teams` 全件 | 人数が少ないチームに振り分けるため |
| `MonitorRoom.vue`（`getTeamMembers`） | モニタールームを開いたとき | `users` | 自分と同じ `team` のメンバー（オンライン表示用） |
| `ProfileEditor.vue` | プロフィール編集を開いたとき | `users` | `cenId` が一致するユーザー |
| `DominationMap.vue`（`loadUser`） | 地図を開いたとき | `users` | `cenId` が一致するユーザー（`tutorialCleared` を見るため） |
| `utils/cards.js`（`getCurrentUser`） | カード関連の画面 | `users` | `cenId` が一致するユーザー。同じ画面の中では1回だけ取って使い回す |

### 4-2. カード

すべて `src/utils/cards.js` の関数を通して呼んでいます（管理画面だけは直接）。

| 関数 | 呼び出し元 | 取得するデータ | 条件 |
|---|---|---|---|
| `fetchCardLibrary()` | 宝箱・カードライブラリ・陣取りゲーム | `cards` | `published == true`（公開中のカードだけ） |
| `fetchMyCardInstances(uid)` | 宝箱の「カード一式」・カードライブラリ | `cardInstances` | `ownerUid == 自分` |
| `countCollectionCards(where)` | モニタールーム（保有カード数・10枚チェック） | `cardInstances` の件数 | `status == "collection"` ＋ `ownerUid` または `team` |
| `fetchTeamCollectionInstances(team)` | 陣取りゲーム（手札を作るとき） | `cardInstances` | `team == 自分のチーム` かつ `status == "collection"` |
| （直接）`loadCards()` | `Admin/CardAdmin.vue`（カード管理画面 `/card-admin`） | `cards` 全件 | 非公開のカードも含む |

### 4-3. ゲーム

| どこで | いつ | 取得するデータ |
|---|---|---|
| `DominationGame.vue`（`loadSavedGame`） | 陣取りゲームを開いたとき・ルームを変えたとき | `dominationGames/{ルームコード}`（無ければ新しいゲームを作る） |
| `DominationMap.vue`（`loadSpots`） | 地図を開いたとき | `mapSpots` 全件（空・失敗のときは同梱の `mapSpots.json`） |
| `DominationMap.vue`（`loadGameStates`） | 街を拡大して六角形が出たとき | `mapSlots`（その街の枠のようす）と、自分が遊び中の枠。ひし形を塗り、勝ったチームの数を数える |
| `ABGameProposalB.vue` | ABゲームを開いたとき | `abGameQuestions`（`location == "hiratsuka"`、`order` 順に並べる） |

---

## 5. 更新（追加・変更・削除）ポイント

### 5-1. ユーザー・チーム

| どこで | いつ | 操作 | 内容 |
|---|---|---|---|
| `IntroView.vue`（`createAccount`） | 新規登録 | `users/{uid}` を**新規作成**（set） | 名前・アバター・チーム・cenId など |
| `IntroView.vue`（`createAccount`） | 新規登録 | `teams/{チーム}` を**更新**（arrayUnion） | `members` に自分の uid を追加 |
| `ProfileEditor.vue`（`saveAndGoHome`） | プロフィール保存 | `users/{uid}` を**更新** | 名前・アバター |
| `DominationMap.vue`（`finishTutorial`） | 地図のチュートリアルを最後まで見たとき | `users/{uid}` を**更新** | `tutorialCleared.{地域}: true` |
| `MonitorRoom.vue`（`resetTutorialFlags`） | テスト用のリセットボタン | `users/{uid}` を**更新** | `tutorialCleared: {}`（また動画が見られるようにする） |

### 5-2. カード

| 関数・場所 | いつ | 操作 | 内容 |
|---|---|---|---|
| `addCardInstance()`（`utils/cards.js`） | 宝箱を開けたとき | `cardInstances` を**新規作成**（add） | 引いたカードを `status: "collection"` で自分の所持カードにする |
| `placeCardInstance()`（`utils/cards.js`） | 陣取りゲームでカードを盤面に置いたとき | `cardInstances/{id}` を**更新**（トランザクション） | `status: "placed"`、`dominationRoomCode`、`tileId`。まだ `collection` のときだけ更新する（6章） |
| `markCardInstancesEaten()`（`utils/cards.js`） | 陣取りゲームでカードが食べられたとき | `cardInstances/{id}` を**更新**（バッチ） | `status: "eaten"`、`eatenAt`、`eatenByInstanceId` |
| `CaveEnd.vue`（`resetCollection`） | 「カードクリア（仮）」ボタン | `cardInstances/{id}` を**削除**（バッチ） | テスト用。自分の所持カードを全部消す |
| `CardAdmin.vue`（保存） | カード管理画面で保存 | `cards/{cardId}` を**更新**（set・merge） | 名前・レベル・地形・すみか・公開/非公開など |
| `CardAdmin.vue`（追加） | カード管理画面で新規追加 | `cards` を**新規作成**（add） | カードIDは Firestore が自動で付ける |

### 5-2b. みんなの声

| どこで | いつ | 操作 | 内容 |
|---|---|---|---|
| `NoticeBoard.vue`（`send`） | かんばんで「おくる」 | `userComments` を**新規作成**（add） | コメント本文・送った人の uid / 名前 / チーム・日時 |

読み込みは `CommentsAdmin.vue`（`/comments-admin`）が `userComments` を新しい順に200件取得する。

### 5-3. ゲーム

| どこで | いつ | 操作 | 内容 |
|---|---|---|---|
| `DominationGame.vue`（`saveGame`） | カードを置いた・スキップ・ゲーム終了・新規マップ・AIの手番のたび | `dominationGames/{ルームコード}` を**丸ごと上書き**（set） | 盤面・手札・スコア・手番など |

---

## 6. 同時に書き込んでも壊れないための仕組み

| 仕組み | 使っている場所 | 何のため |
|---|---|---|
| **トランザクション** | `placeCardInstance()` | 「まだ手元にある（`collection`）か」を確認してから `placed` にする。同じカードを2つの陣取りゲームで同時に使えないようにするため |
| **バッチ** | `markCardInstancesEaten()` / `resetCollection()` | 複数のカードをまとめて1回で更新・削除する |
| **サーバー時刻**（`serverTimestamp`） | 所持カードの `obtainedAt` / `placedAt` など | 端末の時計がずれていても、正しい時刻で記録するため |

> 注意: 陣取りゲームの `dominationGames` は**丸ごと上書き**なので、同じルームを複数の端末で同時に開くと、後から保存した方で上書きされます（想定は「1ルーム＝1端末」）。

---

## 7. ブラウザの中に保存しているもの

### 7-1. ログイン情報（localStorage と Cookie の両方）

`src/utils/session.js` の `getSession` / `setSession` / `removeSession` を通して保存しています。iPhone のホーム画面から起動したとき localStorage が引き継がれないことがあるため、Cookie（180日）にも同じ値を入れています。

| キー | 中身 |
|---|---|
| `loginCenId` | ログイン中の会員ID（**これがあるとログイン中とみなす**） |
| `playerUid` | Firestore のユーザーID |
| `playerData` | ユーザー情報のコピー（名前・アバターなど） |
| `myTeam` | 自分のチーム |
| `loginDate` | 最後にモニタールームに来た日時（7日以上空くと自動でログアウト） |

### 7-2. ゲームの状態

| キー | 保存先 | 中身 |
|---|---|---|
| `caveKeys` | localStorage | エリアごとのカギの数（例: `{ kanagawa: 2, hokkaido: 0, kyoto: 1 }`） |
| `dominationRoomCode` | localStorage | 陣取りゲームのルームコード |
| `lastCaveArea` | sessionStorage | 最後に遊んだ洞窟のエリア（宝箱でどのエリアのカギを使うかの初期値） |
| `nextCaveArea` | sessionStorage | 洞窟の入口で選んだエリア（洞窟画面を開いたときに1回だけ使う） |

> カギ（`caveKeys`）はまだブラウザの中だけで、端末を変えると消えます（`docs/TODO.md`）。

---

## 8. 注意点

- **Firestore のセキュリティルールが無い（ほぼ自由に読み書きできる）**: ブラウザから直接読み書きしているため、悪意のある人が開発者ツールを使えば、ほかの人のデータも書き換えられます。本番運用の前にルールの整備が必要です
- **キーがコードに入っている**: Firebase の設定（`src/firebase.js`）と、いきもの判定APIのキー（`CreatureScan.vue`）は画面のコードに含まれていて、誰でも見られます。Firebase の設定は公開される前提のものですが、守りはセキュリティルールに頼ることになります
- **ログインは `cenId` だけで判定**: `cenId` を知っていれば、その人としてログインできます
- コストについては [cost.md](cost.md) を参照
