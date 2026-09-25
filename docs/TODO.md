# TODOリスト

後で対応が必要な項目の一覧。対応したらチェックを入れる。

## 地図画面（DominationMap）の地域チュートリアル

地図で平塚市・釧路市を初めて選んだときに、チュートリアル動画 → ABゲーム（提案B）をモーダルで挟み、完了したら `users/{uid}.tutorialCleared.<地域>` にフラグを立てる仕組み（`src/views/DominationGame/DominationMap.vue`）。

- [ ] **チュートリアル動画を地域ごとの動画に差し替える**
  - 現在は仮で、平塚・釧路ともにイントロ（`IntroView.vue`）と同じ動画 `xpT411XKhUg` を使用している
  - 差し替え先: `DominationMap.vue` の `TUTORIAL_VIDEOS`
- [ ] **地図画面のモーダル内のABゲームを除去する**
  - 現在は仮で、動画のあとに `ABGameProposalB` をモーダル内で遊ばせている
  - 除去するもの:
    - `DominationMap.vue` のモーダル内 `<ABGameProposalB>` と `tutorial.phase === 'game'` の分岐（動画終了で直接 `finishTutorial` を呼ぶ形にする）
    - `ABGameProposalB.vue` に追加した `embedded` prop / `finish` イベント（単独ページとしてのABゲームは残す）
  - 補足: ABゲームの内容は平塚向け（「ひらつか かんきょうチャレンジ」）だが、釧路でも同じものが出ている

## モニタールームの仮リンク

- [ ] **仮リンクを削除する**
  - `MonitorRoom.vue` 右下の「🚧 仮リンク」パネル（本来の画面に組み込むまでの暫定導線）
  - 現在のリンク: 陣取りゲームに直接アクセス（仮）／ABゲーム（仮）／ABゲーム提案B（仮）／生き物スキャン（仮）
  - 各画面が本来の導線（地図側など）に組み込まれたら、パネルごと削除する

## ABゲーム（提案B）の問題データ

- 問題はFirestoreの `abGameQuestions` コレクションから取得する（`location` で絞り込み、`order` 順に並べる）
  - フィールド: `location`, `order`, `bComment`, `imgB`, `qaImage`, `correct`（"A" / "C"）, `showIcons`（SDGs番号の配列）, `comment`（HTML）
  - 平塚の4問を `hiratsuka-1`〜`hiratsuka-4` として登録済み
- [ ] 釧路など他地域の問題を追加する場合は、`location` を変えてドキュメントを追加し、`ABGameProposalB.vue` の `QUESTION_LOCATION` を地域に応じて切り替える

## 洞窟探検のエリアとカギ

エリア（神奈川・北海道・京都）ごとに洞窟の色・敵・カギ・ワープゲートを固定し、カギもエリアごとに分けた（`src/views/CaveAdventure/caveAreas.js`）。

- [ ] **カード情報をDBに統一する（次のステップ）** → 要件定義: [requirements/04_cards.md](requirements/04_cards.md)
  - 洞窟の宝箱のカード（`CaveEnd.vue`）と陣取りゲームの生きもの（`DominationGame.vue`）を、Firestoreの共通の `cards` コレクションにまとめる
  - あわせて、宝箱から出るカードをエリアに応じたものにする（カードの `area1` とエリアを対応させる）
- [x] ~~獲得カードをFirestoreに保存する~~ → 宝箱のカードは `cardInstances` に保存するようにした
- [ ] **カギをFirestoreに保存する**
  - カギ（`caveKeys`）はまだ `localStorage` のみ。端末を変えると消え、ログアウトしても消えない
- 補足: 以前の全エリア共通のカギ（`localStorage` の `remainKeys`）は使わなくなった。残っていた本数は引き継いでいない

## カード

- [ ] **カード交換所をつくる**
  - プレイヤー同士で所持カード（`cardInstances`）を交換できる場所
  - 交換の方法（1対1のトレード／交換所に出して他の人が受け取る 等）・同じチームだけか・レートなどは要検討
  - 交換すると所持カードの `ownerUid` / `ownerName` が変わる。取得したチーム（`team`）を引き継ぐか変えるかも要検討
- [ ] **カードライブラリを正式な導線に組み込む**（今はモニタールームの仮リンクから）
- [ ] **カードマスタの仮の値を正式なものにする**
  - 陣取りゲームから移したカードのレア度（レベルから仮に決めた）・すみか（地形から仮に決めた）・画像（ウサギ・アカウミガメ以外は未設定）
- [x] ~~陣取りゲームの山札をプレイヤーの所持カードに切り替える~~ → 済（AIチームは仮のカード。`requirements/04_cards.md` 6章 #1）
- [ ] **固定デッキ時代に作られた陣取りゲームのルーム**：AIチームの手札・盤面は古い形式のカードのまま（DBの所持カードとは関係ない）。「新規マップで再開」すれば新しい形式になる

## 地図の表示

- [ ] **地図タイルの見た目を元に戻すか検討する**
  - 元のStadia Maps（`alidade_smooth`）はlocalhost以外ではAPIキー（ドメイン登録）が必要で、Netlify上で表示されなかったため、国土地理院の淡色地図＋CSSフィルタに差し替えた
  - 元の見た目に戻す場合は、Stadia Mapsのアカウントで `ce-n-game.netlify.app` をドメイン登録し、`DominationMap.vue` のタイルURLを戻す

## テストデータ

- [ ] **テストユーザーのチュートリアル完了フラグを削除する**
  - 動作確認で、テストユーザー（cenId `33d85b19-663f-4849-87ae-a7232ff33fda` / uid `1790250650104`）に `tutorialCleared.hiratsuka: true` を書き込み済み
  - このままだと、このユーザーでは平塚のチュートリアルが表示されない
