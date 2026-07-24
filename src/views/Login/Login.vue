<template>
    <div class="min-h-screen flex items-center justify-center bg-sky-100">
        <div class="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-sky-700">
                    小学校システム
                </h1>
                <p class="text-gray-500 mt-2">
                    ログイン
                </p>
            </div>

            <div class="mb-5">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    ユーザーID
                </label>

                <input
                    v-model="userId"
                    type="text"
                    placeholder="ユーザーID"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    パスワード
                </label>

                <input
                    v-model="password"
                    type="password"
                    placeholder="パスワード"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
            </div>

            <button
                @click="login"
                class="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-lg font-semibold transition"
            >
                ログイン
            </button>
        </div>
    </div>
</template>

<script>
export default {
    name: "LoginView",

    data() {
        return {
            userId: "",
            password: ""
        };
    },

    methods: {
    async login() {

        // Example response from your API
        const user = {
            id: 1,
            name: "Nozo",
            belongsToId: null
            // belongsToId: 5
        };

        if (user.belongsToId) {
            this.$router.push("/monitor-room");
        } else {
            this.$router.push("/intro");
        }
    }
}
};
</script>