<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4">
    <div class="text-center">
      <!-- ローディング表示 -->
      <template v-if="!errorMessage">
        <div class="loader mx-auto mb-6"></div>
        <p class="text-gray-500">よみこみ中...</p>
      </template>

      <!-- エラー表示 -->
      <template v-else>
        <p class="text-red-500 mb-6 font-medium">{{ errorMessage }}</p>
        <button
          class="px-6 py-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-lg shadow-md transition-colors"
          @click="backToCeN"
        >
          ce-n.orgにもどる
        </button>
      </template>
    </div>
  </div>
</template>

<script>
import db from "@/firebase.js";
import { setSession } from "@/utils/session.js";

export default {
  name: "LoginPage",
  data() {
    return {
      errorMessage: ""
    };
  },
  mounted() {
    const cenId = new URLSearchParams(window.location.search).get("cenId");

    // URLに cenId が含まれていない場合、ce-n.org に戻す
    if (!cenId) {
      this.backToCeN();
      return;
    }

    this.checkUser(cenId);
  },
  methods: {
    backToCeN() {
      window.location.href = "https://www.ce-n.org/";
    },

    async checkUser(cenId) {
      this.errorMessage = "";

      try {
        // 1. ce-n.org 側の会員IDとして有効かどうかを検証
        const findMeUrl = `https://www.ce-n.org/_functions/findMe?id=${encodeURIComponent(cenId)}`;
        const findMeResponse = await fetch(findMeUrl);
        const findMeResult = await findMeResponse.json();

        // ce-n.org側でエラーメッセージが返ってきた場合（無効なcenId）
        if (findMeResult.message) {
          this.$router.push({ name: "Error" });
          return;
        }

        // 2. Firestore から cenId に紐づくユーザーデータを取得
        const snapshot = await db
          .collection("users")
          .where("cenId", "==", cenId)
          .get();

        setSession("loginCenId", cenId);

        if (!snapshot.empty) {
          // 既存ユーザーデータが存在する場合、セッション情報を格納
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();

          setSession("playerUid", userDoc.id);
          setSession("playerData", JSON.stringify(userData));
          setSession("myTeam", userData.team);
        }

        // URL・認証に問題がなければ、Introを経由せず CreatureScan.vue を直接起動
        this.$router.push({
          name: "CreatureScan",
          query: { cenId }
        });

      } catch (error) {
        console.error("ユーザー確認エラー:", error);
        this.errorMessage = "確認に失敗しました。通信状況を確認の上、再度お試しください。";
      }
    }
  }
};
</script>

<style scoped>
.loader {
  width: 48px;
  height: 48px;
  border: 5px solid #e5e7eb;
  border-top-color: #0284c7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>