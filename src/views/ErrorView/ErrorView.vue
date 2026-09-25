<template>

    <div class="min-h-screen flex items-center justify-center bg-slate-100">

        <div class="bg-white rounded-2xl shadow-xl p-10 text-center">

            <div class="text-6xl mb-5">
                ⚠️
            </div>

            <h1 class="text-3xl font-bold text-red-500 mb-4">
                エラーが発生しました
            </h1>

            <!-- ボタンを押すことによってredirectをうながす -->
            <p class="text-gray-700 mb-6">
                <button
                    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    @click="backToCeN"
                >
                    ce-n.orgにもどる
                </button>
            </p>

        </div>

    </div>

</template>

<script>
    export default {
        mounted() {
            // mounted時にログアウト（セッションをクリアしておく）
            localStorage.removeItem("playerUid");
            localStorage.removeItem("playerData");
            localStorage.removeItem("myTeam");
            localStorage.removeItem("loginCenId");
            localStorage.removeItem("loginDate");
        },
        methods: {
            backToCeN() {
                window.location.href = "https://www.ce-n.org/";
            }
        }
    };
</script>
