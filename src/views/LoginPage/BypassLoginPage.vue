<template>
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div class="bg-white rounded-xl shadow p-6 w-full max-w-sm">
            <h1 class="text-lg font-bold mb-2">ログイン（手元の確認用）</h1>
            <p class="text-xs text-gray-500 mb-4">
                ce-n.orgを通さず、正規のログインと同じ処理を行います。手元の開発環境でだけ使えます。
            </p>
            <form @submit.prevent="submit">
                <input
                    v-model.trim="cenId"
                    type="text"
                    placeholder="cenId"
                    class="border-gray-800 w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                <button
                    type="submit"
                    :disabled="!cenId || loading"
                    class="w-full py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg"
                >
                    ログイン
                </button>
            </form>
            <p v-if="errorMessage" class="text-red-600 text-sm mt-3">{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import { isLocalEnv } from "@/utils/env.js";
import { loginWithCenId } from "@/utils/login.js";

export default {
    data() {
        return {
            cenId: "",
            errorMessage: "",
            loading: false
        };
    },
    mounted() {
        // ■手元の開発環境以外（本番）では使えないようにする
        if (!isLocalEnv()) {
            this.$router.replace({ name: "Error" });
        }
    },
    methods: {
        async submit() {
            if (!this.cenId || this.loading) return;
            this.loading = true;
            this.errorMessage = "";
            // ■LoginPageと同じ処理（utils/login.js）でログインする
            this.errorMessage = await loginWithCenId(this.cenId, this.$router);
            this.loading = false;
        }
    }
};
</script>
