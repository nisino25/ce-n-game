
<template>
  <div class="member-admin">
    <h1>会員情報管理</h1>

    <!-- 会員検索 -->
    <section class="panel">
      <h2>会員検索</h2>

      <div class="search-row">
        <input
          v-model.trim="searchText"
          type="text"
          placeholder="cenId または会員名（完全一致）"
          @keyup.enter="searchMembers"
        />
        <button :disabled="loading" @click="searchMembers">
          {{ loading ? "検索中..." : "検索" }}
        </button>
      </div>

      <p class="message">{{ message }}</p>

      <div v-if="members.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>会員名</th>
              <th>チーム</th>
              <th>cenId</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in members"
              :key="member.docId"
            >
              <td>{{ member.name || "未登録" }}</td>
              <td>{{ teamName(member.team) }}</td>
              <td class="cen-id">{{ member.cenId || "未登録" }}</td>
              <td>
                <button @click="selectMember(member)">
                  詳細・編集
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else-if="searched && !loading">
        該当する会員が見つかりません。
      </p>
    </section>

    <!-- 会員情報の編集 -->
    <section v-if="selectedMember" class="panel">
      <h2>会員情報の編集</h2>

      <p class="note">
        内部ドキュメントID：{{ selectedMember.docId }}
      </p>

      <label for="member-name">会員名（name）</label>
      <input
        id="member-name"
        v-model.trim="form.name"
        type="text"
      />

      <label for="member-team">所属チーム（team）</label>
      <select id="member-team" v-model="form.team">
        <option value="earth">土チーム</option>
        <option value="water">水チーム</option>
        <option value="air">風チーム</option>
      </select>

      <label for="member-cenid">会員ID（cenId）</label>
      <input
        id="member-cenid"
        v-model.trim="form.cenId"
        type="text"
      />

      <p class="note">
        cenIdを変更すると、次回ログイン時の会員照合に
        影響します。変更前に正しいIDか確認してください。
      </p>

      <div class="button-row">
        <button
          :disabled="saving"
          @click="saveMember"
        >
          {{ saving ? "保存中..." : "変更を保存" }}
        </button>

        <button class="secondary" @click="cancelEdit">
          キャンセル
        </button>
      </div>

      <p v-if="saveMessage" class="message">
        {{ saveMessage }}
      </p>

      <!-- 所持カードは初期版では閲覧のみ -->
      <div class="cards-area">
        <h2>所持カード（cards）</h2>

        <p>
          登録件数：
          <strong>{{ cardCount }}</strong>
        </p>

        <pre>{{ cardsText }}</pre>

        <p class="note">
          カードのデータ構造を確認するため、
          この画面ではカード情報を変更しません。
        </p>
      </div>

      <!-- 将来追加：カギの本数 -->
      <div class="future-area">
        <h2>カギの本数</h2>
        <p class="note">
          今後、Firestoreの保存項目を確認して追加予定です。
        </p>
      </div>
    </section>
  </div>
</template>

<script>
import db from "@/firebase.js";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

export default {
  name: "MemberAdmin",
  mounted() {this.loadAllMembers();},

  data() {
    return {
      searchText: "",
      members: [],
      selectedMember: null,

      form: {
        name: "",
        team: "",
        cenId: ""
      },

      loading: false,
      saving: false,
      searched: false,
      message: "",
      saveMessage: ""
    };
  },

  computed: {
    cardsText() {
      if (!this.selectedMember) return "";

      const cards = this.selectedMember.cards;
      if (cards == null) return "カード情報はありません。";

      try {
        return JSON.stringify(cards, null, 2);
      } catch (error) {
        return String(cards);
      }
    },

    cardCount() {
      if (!this.selectedMember) return 0;

      const cards = this.selectedMember.cards;

      if (Array.isArray(cards)) return cards.length;

      if (typeof cards === "string") {
        return cards ? cards.split("&").filter(Boolean).length : 0;
      }

      if (cards && typeof cards === "object") {
        return Object.keys(cards).length;
      }

      return 0;
    }
  },

  methods: {

    async loadAllMembers() {
    this.loading = true;
    this.searched = false;
    this.message = "";
    this.selectedMember = null;
    try {
      const snapshot = await db
        .collection("users")
        .get();
      this.members = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));
      this.searched = true;
      this.message =
        `${this.members.length}件の会員データを表示しています。`;
      console.log("全会員データ:", this.members);
    } catch (error) {
      console.error("全会員取得エラー:", error);
      this.message =
        "会員一覧を取得できませんでした。Firestoreの読み取り権限を確認してください。";
    } finally {
      this.loading = false;
    }
  },
    teamName(team) {
      const names = {
        earth: "土チーム",
        water: "水チーム",
        air: "風チーム"
      };

      return names[team] || team || "未設定";
    },

    async searchMembers() {
      const keyword = this.searchText.trim();

      this.members = [];
      this.selectedMember = null;
      this.message = "";
      this.searched = false;

      if (!keyword) {
        this.message = "会員IDまたは会員名を入力してください。";
        return;
      }

      this.loading = true;

      try {
        // cenIdの完全一致で検索
        const byCenId = await db
          .collection("users")
          .where("cenId", "==", keyword)
          .get();

        // 会員名の完全一致でも検索
        const byName = await db
          .collection("users")
          .where("name", "==", keyword)
          .get();

        // 同じドキュメントが重複表示されないように統合
        const found = new Map();

        byCenId.forEach(doc => {
          found.set(doc.id, {
            docId: doc.id,
            ...doc.data()
          });
        });

        byName.forEach(doc => {
          found.set(doc.id, {
            docId: doc.id,
            ...doc.data()
          });
        });

        this.members = Array.from(found.values());
        this.searched = true;

        if (this.members.length === 0) {
          this.message = "該当する会員が見つかりません。";
        } else {
          this.message =
            `${this.members.length}件の会員データが見つかりました。`;
        }
      } catch (error) {
        console.error("会員検索エラー:", error);
        this.message =
          "検索に失敗しました。Firestoreの読み取り権限を確認してください。";
      } finally {
        this.loading = false;
      }
    },

    selectMember(member) {
      this.selectedMember = { ...member };

      this.form = {
        name: member.name || "",
        team: member.team || "",
        cenId: member.cenId || ""
      };

      this.saveMessage = "";
    },

    cancelEdit() {
      this.selectedMember = null;
      this.saveMessage = "";
    },

    async saveMember() {
      if (!this.selectedMember || this.saving) return;

      if (!this.form.name) {
        this.saveMessage = "会員名を入力してください。";
        return;
      }

      if (!this.form.cenId) {
        this.saveMessage = "cenIdを入力してください。";
        return;
      }

      if (!["earth", "water", "air"].includes(this.form.team)) {
        this.saveMessage = "所属チームを選択してください。";
        return;
      }

      const oldMember = this.selectedMember;
      const oldTeam = oldMember.team;
      const newTeam = this.form.team;
      const newCenId = this.form.cenId;

      this.saving = true;
      this.saveMessage = "";

      try {
        // cenIdの重複登録を防止
        const duplicateSnapshot = await db
          .collection("users")
          .where("cenId", "==", newCenId)
          .get();

        const duplicate = duplicateSnapshot.docs.find(
          doc => doc.id !== oldMember.docId
        );

        if (duplicate) {
          this.saveMessage =
            "このcenIdは別の会員データで使用されています。";
          return;
        }

        // チーム変更時は、teamsコレクションとの整合性も確認
        const batch = db.batch();

        const userRef = db
          .collection("users")
          .doc(oldMember.docId);

        const updateData = {
          name: this.form.name,
          team: newTeam,
          cenId: newCenId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (oldTeam !== newTeam) {
          if (
            !["earth", "water", "air"].includes(oldTeam)
          ) {
            this.saveMessage =
              "現在のチームを特定できないため、チーム変更を保存できません。";
            return;
          }

          const oldTeamRef = db.collection("teams").doc(oldTeam);
          const newTeamRef = db.collection("teams").doc(newTeam);

          const oldTeamDoc = await oldTeamRef.get();
          const newTeamDoc = await newTeamRef.get();

          if (!oldTeamDoc.exists || !newTeamDoc.exists) {
            this.saveMessage =
              "変更前または変更先のチームデータがありません。保存を中止しました。";
            return;
          }

          // usersのドキュメントIDをチームのメンバーIDとして使用
          batch.update(oldTeamRef, {
            members: firebase.firestore.FieldValue.arrayRemove(
              oldMember.docId
            )
          });

          batch.update(newTeamRef, {
            members: firebase.firestore.FieldValue.arrayUnion(
              oldMember.docId
            )
          });
        }

        batch.update(userRef, updateData);

        await batch.commit();

        // 保存後の表示を更新
        const updatedMember = {
          ...oldMember,
          name: this.form.name,
          team: newTeam,
          cenId: newCenId
        };

        this.selectedMember = updatedMember;

        this.members = this.members.map(member =>
          member.docId === oldMember.docId
            ? updatedMember
            : member
        );

        this.saveMessage = "会員情報を保存しました。";
      } catch (error) {
        console.error("会員情報保存エラー:", error);
        this.saveMessage =
          "保存できませんでした。Firestoreの書き込み権限やデータ構造を確認してください。";
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.member-admin {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  color: #26332b;
}

h1 {
  margin-bottom: 24px;
}

h2 {
  margin-top: 0;
  font-size: 20px;
}

.panel {
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #d8e0da;
  border-radius: 10px;
  background: #fff;
}

.search-row,
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
  margin: 6px 0 16px;
  padding: 10px;
  border: 1px solid #bbc8be;
  border-radius: 5px;
  font-size: 15px;
}

.search-row input {
  flex: 1;
  min-width: 220px;
  margin: 0;
}

button {
  padding: 10px 16px;
  border: 0;
  border-radius: 5px;
  background: #286746;
  color: white;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.secondary {
  background: #68756d;
}

label {
  display: block;
  font-weight: 600;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid #e0e5e1;
  text-align: left;
}

th {
  background: #f1f5f2;
}

.cen-id {
  overflow-wrap: anywhere;
  font-size: 12px;
}

.message {
  color: #285b3d;
  overflow-wrap: anywhere;
}

.note {
  color: #65736a;
  font-size: 13px;
}

.cards-area,
.future-area {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #d8e0da;
}

pre {
  max-height: 300px;
  overflow: auto;
  padding: 12px;
  background: #f3f5f3;
  border-radius: 5px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>