<template>
  <div class="card-admin">
    <h1>カードデータ管理</h1>

    <!-- 検索・新規追加 -->
    <div class="search-area">
      <input
        v-model="searchText"
        type="text"
        placeholder="カード名で検索"
      />

      <button
        class="add-button"
        @click="startNewCard"
      >
        ＋ 新しいカードを追加
      </button>
    </div>

    <div class="main-area">

      <!-- 左：カード一覧 -->
      <div class="card-list">
        <h2>カード一覧（{{ filteredCards.length }}）</h2>

        <div
          v-for="card in filteredCards"
          :key="card.cardId"
          class="card-list-item"
          :class="{ selected: selectedCard && selectedCard.cardId === card.cardId }"
          @click="selectCard(card)"
        >
          <img
            v-if="card.image"
            :src="card.image"
            class="list-image"
          />

          <div class="list-info">
            <div class="list-name">
              {{ card.name || "名前なし" }}
            </div>

            <div class="list-detail">
              Lv.{{ card.level }}
              ／ レア {{ card.rarity }}
              ／ {{ card.published ? "公開" : "非公開" }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右：編集・新規追加 -->
      <div class="edit-area" v-if="editCard">

        <h2>
          {{ isNewCard ? "新しいカードを追加" : "カード情報の修正" }}
        </h2>

        <!-- 既存カードの場合だけIDを表示 -->
        <div
          v-if="!isNewCard"
          class="card-id"
        >
          カードID：{{ editCard.cardId }}
        </div>

        <!-- 新規カードの場合 -->
        <div
          v-if="isNewCard"
          class="new-card-message"
        >
          新しいカードを登録します。<br>
          カードIDは保存時に自動生成されます。
        </div>

        <!-- 画像 -->
        <div class="preview-area">
          <img
            v-if="editCard.image"
            :src="editCard.image"
            class="preview-image"
          />
          <div v-else class="no-image">
            画像なし
          </div>
        </div>

        <!-- カード名 -->
        <label>
          カード名
          <input v-model="editCard.name" type="text" />
        </label>

        <!-- 画像 -->
        <label>
          画像パス
          <input v-model="editCard.image" type="text" />
        </label>

        <!-- 生態系レベル -->
        <label>
          生態系レベル
          <select v-model.number="editCard.level">
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </label>

        <!-- レア度 -->
        <label>
          レア度
          <select v-model="editCard.rarity">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>

        <!-- 地域 -->
        <label>
          地域
          <select v-model="editCard.region">
            <option value="hokkaido">北海道</option>
            <option value="kanagawa">神奈川</option>
            <option value="kyoto">京都</option>
          </select>
        </label>

        <!-- すみか -->
        <label>
          すみか
          <select v-model="editCard.habitat">
            <option value="forest">森</option>
            <option value="sea">海</option>
            <option value="river">川</option>
            <option value="town">町</option>
            <option value="soil">土</option>
          </select>
        </label>

        <!-- 陸・水辺 -->
        <label>
          地形
          <select v-model="editCard.terrain">
            <option value="land">陸</option>
            <option value="water">水</option>
          </select>
        </label>

        <!-- フレーム -->
        <label>
          カードフレーム
          <input v-model="editCard.frame" type="text" />
        </label>

        <!-- 公開 -->
        <label class="checkbox-label">
          <input
            v-model="editCard.published"
            type="checkbox"
          />
          公開する
        </label>

        <!-- 食物連鎖 -->
        <label>
          食物連鎖（1行に1種類）
          <textarea
            v-model="foodText"
            rows="6"
            placeholder="例&#10;植物&#10;昆虫&#10;小動物"
          ></textarea>
        </label>

        <!-- 保存 -->
        <div class="button-area">

          <!-- 新規追加 -->
          <button
            v-if="isNewCard"
            class="add-save-button"
            @click="addCard"
            :disabled="saving"
          >
            {{ saving ? "登録中..." : "カードを追加" }}
          </button>

          <!-- 既存カードの修正 -->
          <button
            v-else
            class="save-button"
            @click="saveCard"
            :disabled="saving"
          >
            {{ saving ? "保存中..." : "カード情報を保存" }}
          </button>

          <button
            class="cancel-button"
            @click="cancelEdit"
            :disabled="saving"
          >
            キャンセル
          </button>

        </div>

        <div
          v-if="message"
          class="message"
        >
          {{ message }}
        </div>

      </div>

      <!-- カード未選択 -->
      <div
        v-else
        class="edit-area no-selection"
      >
        <p>左側からカードを選択してください。</p>
      </div>

    </div>
  </div>
</template>

<script>
import db from "@/firebase.js";

export default {
  name: "CardAdmin",

  data() {
    return {
      cards: [],
      searchText: "",
      selectedCard: null,
      editCard: null,
      foodText: "",
      saving: false,
      message: "",

      // 新規カードかどうか
      isNewCard: false
    };
  },

  computed: {
    filteredCards() {
      const text = this.searchText.trim().toLowerCase();

      if (!text) {
        return this.cards;
      }

      return this.cards.filter(card => {
        return (card.name || "")
          .toLowerCase()
          .includes(text);
      });
    }
  },

  async mounted() {
    await this.loadCards();
  },

  methods: {

    // ----------------------------------------
    // cards コレクションを読み込む
    // ----------------------------------------
    async loadCards() {
      try {
        const snapshot = await db
          .collection("cards")
          .get();

        this.cards = snapshot.docs
          .map(doc => ({
            cardId: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            return (a.level || 0) - (b.level || 0);
          });

      } catch (error) {
        console.error("カード読み込みエラー:", error);
        this.message = "カードデータを読み込めませんでした。";
      }
    },

    // ----------------------------------------
    // カード選択
    // ----------------------------------------
    selectCard(card) {
      this.isNewCard = false;

      this.selectedCard = card;

      this.editCard = {
        ...card
      };

      // 食物連鎖を編集用テキストに変換
      if (Array.isArray(card.food)) {
        this.foodText = card.food.join("\n");
      } else {
        this.foodText = "";
      }

      this.message = "";
    },

    // ----------------------------------------
    // 新しいカードを追加する画面
    // ----------------------------------------
    startNewCard() {

      this.isNewCard = true;

      this.selectedCard = null;

      this.editCard = {
        name: "",
        image: "",
        level: 1,
        rarity: "D",
        region: "hokkaido",
        habitat: "forest",
        terrain: "land",
        frame: "silver",
        published: false
      };

      this.foodText = "";

      this.message = "";
    },

    // ----------------------------------------
    // 編集取り消し
    // ----------------------------------------
    cancelEdit() {
      this.editCard = null;
      this.selectedCard = null;
      this.foodText = "";
      this.message = "";
      this.isNewCard = false;
    },

    // ----------------------------------------
    // 既存カードを保存
    // ----------------------------------------
    async saveCard() {

      if (!this.editCard) {
        return;
      }

      if (!this.editCard.name) {
        alert("カード名を入力してください。");
        return;
      }

      this.saving = true;
      this.message = "";

      try {

        // 食物連鎖を配列に戻す
        const food = this.foodText
          .split("\n")
          .map(item => item.trim())
          .filter(item => item !== "");

        const cardData = {
          name: this.editCard.name,
          image: this.editCard.image || "",
          level: Number(this.editCard.level) || 1,
          rarity: this.editCard.rarity || "D",
          region: this.editCard.region || "",
          habitat: this.editCard.habitat || "",
          terrain: this.editCard.terrain || "land",
          frame: this.editCard.frame || "silver",
          published: Boolean(this.editCard.published),
          food: food
        };

        await db
          .collection("cards")
          .doc(this.editCard.cardId)
          .set(cardData, { merge: true });

        this.message = "カード情報を保存しました。";

        // 一覧も更新
        await this.loadCards();

        // 保存後、同じカードを再選択
        const savedCard = this.cards.find(
          card => card.cardId === this.editCard.cardId
        );
        if (savedCard) {
          this.selectCard(savedCard);
        }

      } catch (error) {

        console.error("カード保存エラー:", error);

        this.message =
          "保存できませんでした。Firestoreの権限などを確認してください。";

      } finally {
        this.saving = false;
      }
    },

    // ----------------------------------------
    // 新しいカードをFirestoreに追加
    // ----------------------------------------
    async addCard() {

      if (!this.editCard) {
        return;
      }
      if (!this.editCard.name) {
        alert("カード名を入力してください。");
        return;
      }
      this.saving = true;
      this.message = "";

      try {

        // 食物連鎖を配列に戻す
        const food = this.foodText
          .split("\n")
          .map(item => item.trim())
          .filter(item => item !== "");

        const cardData = {
          name: this.editCard.name,
          image: this.editCard.image || "",
          level: Number(this.editCard.level) || 1,
          rarity: this.editCard.rarity || "D",
          region: this.editCard.region || "",
          habitat: this.editCard.habitat || "",
          terrain: this.editCard.terrain || "land",
          frame: this.editCard.frame || "silver",
          published: Boolean(this.editCard.published),
          food: food
        };

        // FirestoreがカードIDを自動生成
        const ref = await db
          .collection("cards")
          .add(cardData);
        this.message = "新しいカードを追加しました。";

        // 一覧を更新
        await this.loadCards();

        // 追加したカードを選択状態にする
        const newCard = this.cards.find(
          card => card.cardId === ref.id
        );
        if (newCard) {
          this.selectCard(newCard);
        }

      } catch (error) {

        console.error("カード追加エラー:", error);

        this.message =
          "カードを追加できませんでした。Firestoreの権限などを確認してください。";

      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.card-admin {
  padding: 30px;
  font-family: sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
  box-sizing: border-box;
}

h1 {
  margin-bottom: 20px;
}

h2 {
  margin-top: 0;
}

.search-area {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.search-area input {
  width: 350px;
  padding: 10px;
  font-size: 16px;
}

/* 新規追加ボタン */
.add-button {
  padding: 10px 18px;
  border: none;
  cursor: pointer;
  background: #1976d2;
  color: white;
  font-size: 15px;
  font-weight: bold;
}

.add-button:hover {
  background: #1565c0;
}

.main-area {
  display: flex;
  gap: 25px;
  align-items: flex-start;
}

/* 左側 */
.card-list {
  width: 420px;
  background: white;
  border: 1px solid #ccc;
  padding: 15px;
  box-sizing: border-box;
  max-height: 75vh;
  overflow-y: auto;
}

.card-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
}

.card-list-item:hover {
  background: #f0f0f0;
}

.card-list-item.selected {
  background: #e0f0ff;
}

.list-image {
  width: 55px;
  height: 55px;
  object-fit: contain;
}

.list-info {
  flex: 1;
}

.list-name {
  font-weight: bold;
  font-size: 16px;
}

.list-detail {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

/* 右側 */
.edit-area {
  width: 550px;
  background: white;
  border: 1px solid #ccc;
  padding: 20px;
  box-sizing: border-box;
}

.card-id {
  font-size: 12px;
  color: #777;
  margin-bottom: 15px;
}

.new-card-message {
  padding: 10px;
  margin-bottom: 15px;
  background: #eaf3ff;
  border: 1px solid #b7d4f5;
  color: #315b85;
  font-size: 14px;
}

.preview-area {
  text-align: center;
  margin-bottom: 20px;
}

.preview-image {
  width: 180px;
  height: 180px;
  object-fit: contain;
  border: 1px solid #ddd;
  background: #fafafa;
}

.no-image {
  width: 180px;
  height: 180px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  color: #999;
}

.edit-area label {
  display: block;
  margin-bottom: 15px;
  font-weight: bold;
}

.edit-area input[type="text"],
.edit-area select,
.edit-area textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 5px;
  padding: 9px;
  font-size: 15px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.button-area {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.save-button,
.add-save-button,
.cancel-button {
  padding: 12px 20px;
  border: none;
  cursor: pointer;
  font-size: 15px;
}

.save-button {
  background: #2e7d32;
  color: white;
}

.add-save-button {
  background: #1976d2;
  color: white;
}

.save-button:disabled,
.add-save-button:disabled {
  background: #aaa;
  cursor: default;
}

.cancel-button {
  background: #ddd;
}

.cancel-button:disabled {
  cursor: default;
}

.message {
  margin-top: 15px;
  padding: 10px;
  background: #eef7ee;
  border: 1px solid #9ccc9c;
}

.no-selection {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
}
</style>