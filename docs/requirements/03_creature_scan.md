# 生き物スキャン 要件定義書

- 対象: `CreatureScan.vue` / 外部API「ikimono-api」
- 作成日: 2026-09-24
- 位置づけ: [00_overview.md](00_overview.md) の詳細版（生き物スキャン機能部分）
- ステータス: **実装済みだが、2026-09-24時点でMonitorRoomからの導線は一旦非表示にしてデプロイ**（[00_overview.md](00_overview.md) 8章参照）。画面・ルート・API連携コード自体は`src/views/CreatureScan/CreatureScan.vue`に残っている

---

## 1. 概要・目的

来場者が撮影・アップロードした写真をAI（外部API）に判定させ、写っている生き物の名前・特徴・レア度などを表示する機能。MonitorRoomの「生き物スキャン」ボタンから遷移する想定（現在ボタンはコメントアウトで非表示）。

## 2. 外部API連携（ikimono-api）

- 参照元: `生き物判定API_連携ガイド.pdf`（安藤氏提供）
- ベースURL: `https://ikimono-api-m4qe2atuyq-an.a.run.app`（Cloud Run。アイドル時はゼロスケールし、初回リクエストで2〜7秒程度のコールドスタートが発生する）
- エンドポイント:
  - `POST /v1/identify`（multipart form）
    - `image`: 判定対象の画像ファイル（必須）
    - `hint`: 発見場所などのヒント文字列（任意）
    - `max_candidates`: 返す候補数（本実装では3固定）
    - ヘッダー: `X-API-Key`
  - `GET /v1/health`（認証不要、死活監視用。本実装では未使用）
- **APIキーの扱い**: `CreatureScan.vue`内にハードコードしている（`IKIMONO_API_KEY`）。連携ガイドに「本格的な認証ではなく、URLを偶然見つけた相手やクローラを弾く程度の鍵。請求の暴走はサーバー側のインスタンス数上限・予算アラートで防止済み」と明記されており、フロントJSに含まれる前提の鍵のため、Firebase設定同様にクライアント側へのハードコードで問題ない
- レスポンスの`status`によって画面の表示を分岐する（下記4章参照）

## 3. 画面仕様（`CreatureScan.vue`）

### 状態遷移（`phase`）

| phase | 内容 |
|---|---|
| `idle` | 初期状態。写真選択待ち |
| `preview` | 写真選択済み・判定前のプレビュー表示 |
| `loading` | API判定中（「2〜7秒くらいかかります」の案内あり） |
| `identified` | 判定成功。候補を表示 |
| `uncertain` | 生き物らしきものはあるが特定できず |
| `no_creature` | 生き物が写っていないと判定 |
| `error` | 通信エラー・APIエラー |

### 入力

- 写真: `<input type="file" accept="image/*" capture="environment">`（スマホではカメラ起動を促す）
- ヒント: 任意のテキスト入力（例:「京都市の庭, 10月」）

### 判定結果表示（`identified`時）

`candidates`配列（最大3件、`rank`順）をカード表示。各候補に以下を表示:

- `name_ja` / `name_kana` / `name_scientific`（和名・かな・学名）
- `confidence`（確信度％）
- `rarity.tier` / `rarity.value` / `rarity.tier_label_ja` / `rarity.reason`（レア度とその判定理由）
- `is_dangerous` / `danger_note`（危険生物の場合の注意書き。該当時は赤枠で強調表示）
- `description_for_kids`（子ども向け説明文）
- `habitat`（すみか）/ `diet`（食性: producer/herbivore/carnivore/omnivore/detritivore）/ `trophic_level`（栄養段階）/ `category`（分類: insect/plant/bird/mammal/reptile/amphibian/fish/other）

## 4. 画面遷移

- MonitorRoomの「生き物スキャン」ボタン → `changeMode('creature-scan')`（ドア演出付きでモード切替） → `/creature-scan`
- 画面右上「🏠 ホームにもどる」ボタン → MonitorRoom（`Home`）へ

## 5. 既知の課題・未実装事項

| 項目 | 内容 |
|---|---|
| 判定結果の永続化 | 判定して得た生き物情報はFirestoreに保存されない（表示のみ）。カード収集システムとの連携は未設計・未実装 |
| コスト面の確認体制 | Cloud Runのコールドスタート＋課金が発生するため、開発中のテストでも実際に課金が走る。本番運用でどの程度のアクセス量を想定するか未確認 |
| MonitorRoomからの導線 | 2026-09-24時点でボタンをコメントアウトして非表示にしている（実装・API連携自体は動作確認済み。正式公開の判断待ち） |
| エラー時の区別 | ネットワークエラーとAPI側エラーをまとめて「はんていできませんでした」表示にしている。原因の切り分けはしていない |
