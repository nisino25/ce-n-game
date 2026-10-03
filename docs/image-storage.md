# 画像の保存先と料金（共有用）

- 調査日: 2026-10-03
- 目的: ユーザー・管理者がアップロードする画像を、**なるべく安く（無料で）**保存できる方法を選ぶ
- 料金やプランは変わるので、決める前に、各サービスの公式ページを見る（最後にリンク）

---

## いまの方法（カード管理画面 `/card-admin`）
- 画像を **Firebase Storage** に保存 → 公開URLを Firestore の `cards/{id}.image` に保存、という流れ
- 保存先は `cards/{カードID}/{時刻}_{ファイル名}`
- 画像の**縮小・圧縮はしていない**（大きい写真は、そのまま上がる）
- `cors.json` は、バケットに設定して初めて効く。いまは `localhost:8080` だけが許可されている（本番のドメインは入っていない）

## 大事な注意：Firebase Storage は、無料の Spark プランでは使えない
- 2026年2月から、Cloud Storage for Firebase は、**従量課金の Blaze プラン**が必要（クレジットカードの登録が必要）
- Blaze でも、**5GB までは無料**。超えると 1GB あたり約 $0.10
- いまのプロジェクトが Blaze かどうかは、Firebase コンソールで確認する。Spark のままだと、アップロードは失敗する
- Blaze にしても、無料枠の中なら課金はゼロ。ただし、**上限で止まる設定はできない**（予算アラートは設定できる）

## 方法くらべ
| 方法 | 無料枠 | 向いているケース |
|---|---|---|
| **Firebase Storage**（いまの方法） | 5GB（Blaze が必要） | 今のコードをそのまま使える。ルールで、誰がアップロードできるかを決められる |
| **Cloudflare R2** | 10GB、**ダウンロードの料金なし** | 画像が増える・よく見られるとき。登録時に支払い方法を求められることがある（要確認） |
| **Cloudinary** | 10GB、1か月の表示 20GB | 大きい写真が上がるとき。自動で縮小・変換してくれる |
| **Supabase Storage** | 1GB | 小規模。DB は Firestore のままなので、サービスが1つ増えるだけ |
| **Firestore に、小さい画像を直接保存** | Firestore の無料枠（1GiB）に含まれる | 縮小した画像を文字列（base64）で保存。**Spark のままでいける**。1件 1MiB までなので、1枚 50〜100KB にする |
| **GitHub に置く**（`public/images`） | 実質無料 | 管理者が選んだ画像だけ。ユーザーのアップロードには向かない |

## おすすめ
1. どの方法でも、アップロード前に**ブラウザ側で縮小**する（512px・WebP で、1枚 30〜80KB）。無料枠に、ほぼ収まる
2. **管理者が登録するカード画像だけ**なら、`public/images` にコミットするだけで無料
3. **子どもたちが撮った写真**を保存するなら、縮小した画像を Firestore に保存するのが一番手軽（Blaze にしなくてよい）。増えてきたら Cloudflare R2 に移す
4. どの方法でも、**ルールを開けっぱなしにしない**。写真には位置情報などの個人情報が入ることがあり、ストレージを悪用されると課金につながる

## 決めること
- 「ユーザーの画像」は、**カードの絵（管理者が登録）**か、**子どもが撮った写真**か
- Firebase を Blaze にするか（カード登録が必要・予算アラートを設定する）
- 縮小のしかた（サイズ・形式）を、アップロード画面に入れるか

## 参考リンク
- [Cloud Storage for Firebase の料金変更 FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Firebase の料金（公式）](https://firebase.google.com/pricing)
- [Cloudflare R2 の料金](https://developers.cloudflare.com/r2/pricing/)
- [Cloudinary の料金](https://cloudinary.com/pricing)
- [Supabase の料金](https://supabase.com/pricing)
