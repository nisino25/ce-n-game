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
import { loginWithCenId } from "@/utils/login.js";
import { getSession } from "@/utils/session.js";
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
        console.log("=== LoginPage mounted ===");
        console.log("現在のURL:", window.location.href);
        console.log("検索パラメータ:", window.location.search);
        const cenId = new URLSearchParams(
            window.location.search
        ).get("cenId");
        console.log("取得した cenId:", cenId);
        if (!cenId) {
            // cenIdが無いときは、ce-n.orgへ飛ばさない。ログイン中ならホーム、そうでなければ会員IDの入力画面へ
            const loggedIn = getSession("loginCenId");
            this.$router.replace({ name: loggedIn ? "Home" : "BypassLogin" });
            return;
        }
        console.log("cenIdがあります。会員確認を開始します");
        this.checkUser(cenId);
    },
    methods: {
        backToCeN() {
            window.location.href = "https://www.ce-n.org/";
        },

        // ■ログインの処理は utils/login.js にまとめてある（BypassLoginPageと同じ処理を使う）
        async checkUser(cenId) {
            this.errorMessage = "";
            this.errorMessage = await loginWithCenId(cenId, this.$router);
        },

        async initializeMemberGame(cenId) {
            // 会員ごとに初回アクセスを判定
            const initKey = `ceN_initialized_${cenId}`;
            if (localStorage.getItem(initKey) === "true") {
                console.log("前回のゲームを継続します");
                return;
            }
            // 初回アクセス時のみ実行
            console.log("初回アクセス：ゲームを初期化します");
            // 初期化処理は、会員別の保存データに対して実行します。
            // 全体の localStorage.clear() は使用しません。
            localStorage.setItem(initKey, "true");
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
