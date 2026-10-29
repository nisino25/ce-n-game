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
import { setSession } from "@/utils/session.js";

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
            console.log("cenIdがありません。ce-n.orgへ移動します");
            this.backToCeN();
            return;
        }

    console.log("cenIdがあります。会員確認を開始します");
    this.checkUser(cenId);

    //    const cenId = new URLSearchParams(window.location.search).get("cenId");

    //    if (!cenId) {
    //        this.backToCeN();
    //        return;
    //    }

    //    this.checkUser(cenId);
    },
    methods: {
        backToCeN() {
            window.location.href = "https://www.ce-n.org/";
        },

        async checkUser(cenId) {
            this.errorMessage = "";
            console.log("Introへ渡す cenId:", cenId);
            // 最大2回までリトライする仕組み（一時的な通信エラー対策）
            let maxRetries = 2;
            let findMeResult = null;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const findMeUrl = `https://www.ce-n.org/_functions/findMe?id=${encodeURIComponent(cenId)}`;
                    const findMeResponse = await fetch(findMeUrl);
                    findMeResult = await findMeResponse.json();
                    break; // 成功したらループを抜ける
                } catch (fetchError) {
                    console.warn(`findMe 通信リトライ (${i + 1}/${maxRetries}):`, fetchError);
                    if (i === maxRetries - 1) {
                        // 通信自体が完全に失敗した場合のフェイルセーフ（必要に応じてそのまま通すかエラーにするか）
                        console.error("findMe APIへの接続に失敗しました。続行します。");
                        findMeResult = null; // API確認スキップ扱いにすることも可能
                    } else {
                        await new Promise(r => setTimeout(r, 1000)); // 1秒待ってリトライ
                    }
                }
            }

            if (findMeResult.message) {
                this.$router.push({ name: "Error" });
                return;
            }
            try {
                // Firestoreからのデータ取得にもリトライを挟むとさらに安全
                let snapshot = null;
                for (let i = 0; i < maxRetries; i++) {
                 try {
                    snapshot = await db
                        .collection("users")
                        .where("cenId", "==", cenId)
                        .get();
                    break;
                    } catch (dbError) {
                        if (i === maxRetries - 1) throw dbError;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                // ★ 検索結果を確認するログ
                console.log("=== LoginPage 判定 ===");
                console.log("受け取った cenId:", cenId);
                console.log("users検索件数:", snapshot.size);
                console.log(
                    "検索結果:",
                    snapshot.docs.map(doc => ({
                        uid: doc.id,
                        cenId: doc.data().cenId,
                        team: doc.data().team
                    }))
                );

                // if (!snapshot.empty) {
                //     await this.initializeMemberGame(cenId);
                //     setSession("loginCenId", cenId);
                //     setSession("playerData", JSON.stringify(snapshot.docs[0].data()));
                //     setSession("myTeam", snapshot.docs[0].data().team);
                //     this.$router.push({ name: "Home" });
                //     return;
                // }

                // this.$router.push({
                //     name: "Intro",
                //     query: { cenId }
                // });
                if (!snapshot.empty) {
                    // 既存会員：保存済みのゲームを再開
                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();
                    // ★ ここで中身を丸ごとコンソールに出してみる
                    console.log("【デバッグ】取得したuserDataの中身:", userData);
                    console.log("【デバッグ】introCompletedの値:", userData.introCompleted, " (型:", typeof userData.introCompleted, ")");

                    if (userData.introCompleted === true) {
                        setSession("loginCenId", cenId);
                        setSession("playerUid", userDoc.id);
                        setSession("playerData", JSON.stringify(userData));
                        setSession("myTeam", userData.team);
                        this.$router.push({ name: "Home" });
                        return;
                    }
                }
                // usersにデータがない場合だけ、初回INTROへ
                console.log("Introへ渡す cenId:", cenId);
                this.$router.push({
                    name: "Intro",
                    query: { cenId }
                });
                
            } catch (error) {
                console.error("Failed to check user:", error);
                this.errorMessage = "確認に失敗しました。通信状況を確認してください。";
            }
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
