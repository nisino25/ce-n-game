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

        <!-- ▼ 会員削除ボタンの追加 ▼ -->
        <button 
          class="danger-button" 
          :disabled="saving || deleting" 
          @click="deleteMember"
        >
          {{ deleting ? "削除中..." : "会員を削除する" }}
        </button>
      </div>

      <p v-if="saveMessage" class="message">
        {{ saveMessage }}
      </p>

      <!-- チュートリアル完了状態の編集 -->
      <div class="future-area">
        <h2>チュートリアル完了状態</h2>
        <div class="key-grid">
          <div>
            <label for="tutorial-hiratsuka">平塚市のチュートリアル</label>
            <select id="tutorial-hiratsuka" v-model="form.tutorialCleared.hiratsuka">
              <option :value="true">完了済み（true）</option>
              <option :value="false">未完了（false）</option>
            </select>
          </div>
          <div>
            <label for="tutorial-kushiro">釧路市のチュートリアル</label>
            <select id="tutorial-kushiro" v-model="form.tutorialCleared.kushiro">
              <option :value="true">完了済み（true）</option>
              <option :value="false">未完了（false）</option>
            </select>
          </div>
        </div>
        <p class="note">
          保存すると、Firestore上のチュートリアル完了フラグが更新されます。
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

      <!-- カギの本数 -->
      <div class="future-area">
        <h2>洞窟のカギ</h2>
        <p v-if="keyLoading" class="note">
          カギの情報を読み込み中です...
        </p>
        <div v-else class="key-grid">
          <div v-for="area in caveAreas" :key="area.id">
            <label :for="'key-' + area.id">
              {{ area.name }}のカギ
            </label>
            <input
              :id="'key-' + area.id"
              v-model.number="keyForm[area.id]"
              type="number"
              min="0"
              step="1"
            />
          </div>
        </div>

        <div class="button-row">
          <button
            :disabled="keyLoading || keySaving"
            @click="saveCaveKeyCounts"
          >
            {{ keySaving ? "保存中..." : "カギの本数を保存" }}
          </button>
          <button
            class="secondary"
            :disabled="keyLoading || keySaving"
            @click="loadMemberKeys"
          >
            再読み込み
          </button>
        </div>
        <p v-if="keyMessage" class="message">
          {{ keyMessage }}
        </p>
        <p class="note">
          保存すると、選択した会員のFirestore上のカギの本数が更新されます。
        </p>
      </div>

      </div>
    </section>
  </div>
</template>

<script>
import db from "@/firebase.js";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { CAVE_AREAS, CAVE_AREA_IDS } from "../CaveAdventure/caveAreas.js";

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
        cenId: "",
        tutorialCleared: {
          hiratsuka: false,
          kushiro: false
        }
      },

      loading: false,
      saving: false,
      deleting: false,
      searched: false,
      message: "",
      saveMessage: "",

      caveAreas: CAVE_AREA_IDS.map(id => ({
        id,
        name: CAVE_AREAS[id].name
      })),
      keyForm: {
        kanagawa: 0,
        hokkaido: 0,
        kyoto: 0
      },
      keyLoading: false,
      keySaving: false,
      keyMessage: "",
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

    // カギの確認・修正
    async loadMemberKeys() {
      if (!this.selectedMember || !this.selectedMember.cenId) {
        this.keyMessage = "会員ID（cenId）がありません。";
        return;
      }
      this.keyLoading = true;
      this.keyMessage = "";
      try {
        const cenId = String(this.selectedMember.cenId);
        const entries = await Promise.all(
          CAVE_AREA_IDS.map(async areaId => {
            const docId =
              `${encodeURIComponent(cenId)}_${areaId}`;
            const snapshot = await db
              .collection("caveKeys")
              .doc(docId)
              .get();
            const count = snapshot.exists
              ? Number(snapshot.data().count) || 0
              : 0;
            return [areaId, Math.max(0, count)];
          })
        );
        this.keyForm = Object.fromEntries(entries);
        this.keyMessage = "カギの本数を読み込みました。";
      } catch (error) {
        console.error("カギの読み込みエラー:", error);
        this.keyMessage =
          "カギを読み込めませんでした。Firestoreの権限を確認してください。";
      } finally {
        this.keyLoading = false;
      }
    },
    async saveCaveKeyCounts() {
      if (
        !this.selectedMember ||
        !this.selectedMember.cenId ||
        this.keySaving
      ) {
        this.keyMessage = "対象会員のcenIdを確認してください。";
        return;
      }
      for (const areaId of CAVE_AREA_IDS) {
        const count = Number(this.keyForm[areaId]);
        if (!Number.isInteger(count) || count < 0) {
          this.keyMessage =
            "カギの本数は0以上の整数で入力してください。";
          return;
        }
      }
      this.keySaving = true;
      this.keyMessage = "";
      try {
        const cenId = String(this.selectedMember.cenId);
        const batch = db.batch();
        for (const areaId of CAVE_AREA_IDS) {
          const docId =
            `${encodeURIComponent(cenId)}_${areaId}`;
          const docRef = db
            .collection("caveKeys")
            .doc(docId);
          batch.set(docRef, {
            cenId,
            areaId,
            count: Number(this.keyForm[areaId]),
            updatedAt:
              firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
        await batch.commit();
        this.keyMessage = "カギの本数を保存しました。";
      } catch (error) {
        console.error("カギの保存エラー:", error);
        this.keyMessage =
          "保存できませんでした。Firestoreの書き込み権限を確認してください。";
      } finally {
        this.keySaving = false;
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
        const byCenId = await db
          .collection("users")
          .where("cenId", "==", keyword)
          .get();

        const byName = await db
          .collection("users")
          .where("name", "==", keyword)
          .get();

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

    async selectMember(member) {
      console.log("① 詳細・編集ボタンが押されました", member);
      this.selectedMember = { ...member };
      
      // フォームに値をセット（Firestoreから再取得した値や既存の値に対応）
      this.form = {
        name: member.name || "",
        team: member.team || "",
        cenId: member.cenId || "",
        tutorialCleared: {
          hiratsuka: member.tutorialCleared?.hiratsuka || false,
          kushiro: member.tutorialCleared?.kushiro || false
        }
      };

      this.saveMessage = "";
      this.keyMessage = "";
      this.keyForm = {
        kanagawa: 0,
        hokkaido: 0,
        kyoto: 0
      };

      // Firestoreから最新の会員情報を取得して確実に同期する
      try {
        const doc = await db
          .collection("users")
          .doc(member.docId)
          .get();
        if (doc.exists) {
          const freshData = doc.data();
          this.selectedMember = {
            ...freshData,
            docId: doc.id
          };
          // フォーム側のチュートリアル完了状態も最新化
          this.form.tutorialCleared = {
            hiratsuka: freshData.tutorialCleared?.hiratsuka || false,
            kushiro: freshData.tutorialCleared?.kushiro || false
          };
          console.log("④ 最新のtutorialCleared:", this.selectedMember.tutorialCleared);
        } else {
          console.warn("会員データが見つかりません:", member.docId);
        }
      } catch (error) {
        console.error("会員情報の再取得エラー:", error);
      }
      await this.loadMemberKeys();
    },

    // 削除処理
    async deleteMember() {
      if (!this.selectedMember || this.deleting) return;

      // 誤操作防止の確認ダイアログ
      const memberName = this.form.name || "この会員";
      const confirmed = window.confirm(`本当に「${memberName}」のデータを削除しますか？\nこの操作は元に戻せません。`);
      if (!confirmed) return;

      this.deleting = true;
      this.saveMessage = "";

      try {
        const docId = this.selectedMember.docId;
        const team = this.selectedMember.team;
        const cenId = this.selectedMember.cenId;

        const batch = db.batch();

        // 1. users コレクションのドキュメントを削除
        const userRef = db.collection("users").doc(docId);
        batch.delete(userRef);

        // 2. チームに所属している場合は、teamsコレクションの members 配列からも削除する
        if (["earth", "water", "air"].includes(team)) {
          const teamRef = db.collection("teams").doc(team);
          batch.update(teamRef, {
            members: firebase.firestore.FieldValue.arrayRemove(docId)
          });
        }

        // 3. （必要に応じて）関連する caveKeys も削除する場合
        if (cenId) {
          const areaIds = ["kanagawa", "hokkaido", "kyoto"]; // CAVE_AREA_IDS など
          for (const areaId of areaIds) {
            const keyDocId = `${encodeURIComponent(cenId)}_${areaId}`;
            const keyRef = db.collection("caveKeys").doc(keyDocId);
            batch.delete(keyRef);
          }
        }

        await batch.commit();

        // 4. 画面側のリストからも削除された会員を除外して、編集画面を閉じる
        this.members = this.members.filter(m => m.docId !== docId);
        this.selectedMember = null;
        this.saveMessage = "";
        
        alert("会員データを削除しました。");

      } catch (error) {
        console.error("会員削除エラー:", error);
        this.saveMessage = "削除できませんでした。Firestoreの権限を確認してください。";
      } finally {
        this.deleting = false;
      }
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

        const batch = db.batch();
        const userRef = db
          .collection("users")
          .doc(oldMember.docId);

        // チュートリアル完了状態を含めて更新
        const updateData = {
          name: this.form.name,
          team: newTeam,
          cenId: newCenId,
          tutorialCleared: {
            hiratsuka: !!this.form.tutorialCleared.hiratsuka,
            kushiro: !!this.form.tutorialCleared.kushiro
          },
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

        // 保存後のローカル状態を更新
        const updatedMember = {
          ...oldMember,
          name: this.form.name,
          team: newTeam,
          cenId: newCenId,
          tutorialCleared: { ...this.form.tutorialCleared }
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


.key-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
@media (max-width: 600px) {
  .key-grid {
    grid-template-columns: 1fr;
  }
}
.map-rule-panel h3 {
  margin-top: 24px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #d8e0da;
  font-size: 17px;
  color: #286746;
}
.map-rule-panel table {
  width: 100%;
  margin: 10px 0 20px;
  border-collapse: collapse;
}
.map-rule-panel th,
.map-rule-panel td {
  padding: 10px;
  border: 1px solid #d8e0da;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}
.map-rule-panel th {
  background: #edf4ef;
}
.map-rule-panel .rule-list {
  padding-left: 24px;
  line-height: 1.8;
}
.map-rule-panel .note {
  line-height: 1.7;
}
@media (max-width: 600px) {
  .map-rule-panel {
    padding: 12px;
  }

  .map-rule-panel th,
  .map-rule-panel td {
    padding: 7px;
    font-size: 12px;
  }
}

button.danger-button {
  background: #dc2626; /* 赤色 */
  margin-left: auto;   :w /* 右側に寄せたい場合 */
}
button.danger-button:hover {
  background: #b91c1c;
}
</style>