<template>
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div class="text-center">
            <template v-if="!errorMessage">
                <div class="loader mx-auto mb-6"></div>
                <p class="text-gray-500">よみこみ中...</p>
            </template>

            <template v-else>
                <p class="text-red-500 mb-6">{{ errorMessage }}</p>
                <button
                    class="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg"
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

// ■このアプリは基本的にce-n.org側の会員ページから ?cenId=... 付きのリンクで
// アクセスされる前提のため、手入力フォームは廃止し、確認中はローディング表示のみにする。
// cenIdが無い状態でこの画面に来た場合は、正しい入口であるce-n.orgへ案内する
export default {
    data() {
        return {
            errorMessage: ""
        };
    },
    mounted() {
        const cenId = new URLSearchParams(window.location.search).get("cenId");

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
                // ■ce-n.org側の会員IDとして有効かをまず確認する。
                // 存在しなければこのアプリには入れず、ce-n.orgへ案内する
                const findMeUrl = `https://www.ce-n.org/_functions/findMe?id=${encodeURIComponent(cenId)}`;
                const findMeResponse = await fetch(findMeUrl);
                const findMeResult = await findMeResponse.json();

                if (findMeResult.message) {
                    this.$router.push({ name: "Error" });
                    return;
                }

                const snapshot = await db
                    .collection("users")
                    .where("cenId", "==", cenId)
                    .get();

                if (!snapshot.empty) {
                    localStorage.setItem("loginCenId", cenId);
                    localStorage.setItem("playerData", JSON.stringify(snapshot.docs[0].data()));
                    localStorage.setItem("myTeam", snapshot.docs[0].data().team);
                    this.$router.push({ name: "Home" });
                    return;
                }

                this.$router.push({
                    name: "Intro",
                    query: { cenId }
                });
            } catch (error) {
                console.error("Failed to check user:", error);
                this.errorMessage = "確認に失敗しました。通信状況を確認してください。";
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
    to { transform: rotate(360deg); }
}
</style>
