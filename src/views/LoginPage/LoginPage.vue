<template>
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
        <div class="bg-white rounded-xl shadow p-8 w-full max-w-md">
            <h1 class="text-2xl font-bold mb-6">ログイン</h1>
            <label class="block mb-2 font-semibold">User ID</label>
            <input
                v-model="inputCenId"
                type="text"
                placeholder="User IDを入力してください"
                class="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4"
                @keyup.enter="checkUser"
            >
            <button
                class="w-full p-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg"
                @click="checkUser"
                :disabled="checking"
            >
                {{ checking ? "確認中..." : "ログイン" }}
            </button>
            <p v-if="errorMessage" class="text-red-500 mt-4">
                {{ errorMessage }}
            </p>
        </div>
    </div>
</template>

<script>
import db from "@/firebase.js";

export default {
    data() {
        return {
            inputCenId: "",
            checking: false,
            errorMessage: ""
        };
    },
    mounted() {
        const cenId = new URLSearchParams(window.location.search).get("cenId");

        if (cenId) {
            this.inputCenId = cenId;
            this.checkUser();
        }
    },
    methods: {
        async checkUser() {
            this.errorMessage = "";
            const cenId = this.inputCenId.trim();

            if (!cenId) {
                this.errorMessage = "User IDを入力してください。";
                return;
            }

            this.checking = true;

            try {
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
                this.errorMessage = "ユーザーの確認に失敗しました。";
            } finally {
                this.checking = false;
            }
        }
    }
};
</script>