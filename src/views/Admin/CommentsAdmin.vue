<template>
    <!-- ■みんなの声（かんばんから届いたコメント）を読む画面。管理者用の仮画面（いまは誰でも開ける） -->
    <div class="comments-page">
        <header class="comments-header">
            <button class="comments-back" @click="$router.push({ name: 'Home' })">← もどる</button>
            <h1>みんなの声</h1>
            <span class="comments-count">{{ comments.length }}件</span>
        </header>

        <main class="comments-main">
            <p v-if="loading" class="comments-note">よみこみ中…</p>
            <p v-else-if="error" class="comments-note error">{{ error }}</p>
            <p v-else-if="!comments.length" class="comments-note">まだコメントはありません</p>

            <ul v-else class="comments-list">
                <li v-for="comment in comments" :key="comment.id" class="comment-item">
                    <div class="comment-meta">
                        <strong>{{ comment.name || "（名前なし）" }}</strong>
                        <span v-if="teamLabel(comment.team)" class="comment-team">{{ teamLabel(comment.team) }}</span>
                        <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                    </div>
                    <p class="comment-text">{{ comment.text }}</p>
                </li>
            </ul>
        </main>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { TEAM_LABELS } from "@/utils/cards.js";

export default {
    name: "CommentsAdmin",

    data() {
        return { loading: true, error: "", comments: [] };
    },

    async mounted() {
        try {
            const snapshot = await db.collection("userComments")
                .orderBy("createdAt", "desc")
                .limit(200)
                .get();
            this.comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("コメントの読み込みに失敗しました:", error);
            this.error = "読み込みに失敗しました。通信状況を確認してください。";
        } finally {
            this.loading = false;
        }
    },

    methods: {
        teamLabel(team) {
            return TEAM_LABELS[team] ? `${TEAM_LABELS[team]}チーム` : "";
        },

        formatTime(timestamp) {
            if (!timestamp || !timestamp.toDate) return "";
            const date = timestamp.toDate();
            const pad = n => String(n).padStart(2, "0");
            return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
    }
};
</script>

<style scoped>
.comments-page{min-height:100vh;background:#10151c;color:#e2e8f0;text-align:left}
.comments-header{
    position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;
    padding:10px 16px;background:rgba(16,21,28,.95);border-bottom:1px solid #1e293b;
}
.comments-header h1{flex:1;margin:0;font-size:18px;font-weight:900;color:#67e8f9}
.comments-back{border:1px solid #475569;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:bold}
.comments-count{font-size:13px;color:#94a3b8}
.comments-main{max-width:640px;margin:0 auto;padding:16px}
.comments-note{padding:40px 0;text-align:center;color:#94a3b8}
.comments-note.error{color:#fca5a5}
.comments-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.comment-item{padding:12px 14px;border:1px solid #334155;border-radius:12px;background:#1b2330}
.comment-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px}
.comment-team{border-radius:6px;background:#0e7490;padding:0 6px;font-size:11px;font-weight:bold}
.comment-time{margin-left:auto;font-size:12px;color:#94a3b8}
.comment-text{margin:6px 0 0;font-size:15px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
</style>
