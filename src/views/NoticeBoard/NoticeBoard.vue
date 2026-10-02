<template>
    <!-- ■かんばん：これからのアップデートのお知らせと、みんなの声（コメント）を送る場所 -->
    <div class="board-page">
        <header class="board-header">
            <button class="board-back" aria-label="モニタールームにもどる" @click="$router.push({ name: 'Home' })">←</button>
            <h1>かんばん</h1>
            <span class="board-header-space"></span>
        </header>

        <main class="board-main">
            <!-- これからのアップデート -->
            <section class="board-section">
                <h2><span class="section-icon">📣</span>つぎの アップデート</h2>
                <ul class="update-list">
                    <li v-for="item in upcoming" :key="item.title" class="update-item">
                        <span class="update-icon">{{ item.icon }}</span>
                        <div class="update-body">
                            <div class="update-title">
                                {{ item.title }}
                                <span v-if="item.badge" class="update-badge">{{ item.badge }}</span>
                            </div>
                            <p class="update-text">{{ item.text }}</p>
                        </div>
                    </li>
                </ul>
            </section>

            <!-- みんなの声 -->
            <section class="board-section">
                <h2><span class="section-icon">💬</span>みんなの こえ</h2>
                <p class="board-lead">ゲームを あそんで おもったことや、ほしい ものを おしえてね！</p>

                <div v-if="sent" class="thanks">
                    <div class="thanks-icon">🎉</div>
                    <p class="thanks-title">ありがとう！ とどいたよ</p>
                    <button class="board-button secondary" @click="sent = false">もういちど かく</button>
                </div>

                <form v-else class="comment-form" @submit.prevent="send">
                    <textarea
                        v-model="text"
                        class="comment-input"
                        rows="4"
                        :maxlength="maxLength"
                        placeholder="ここに かいてね"
                    ></textarea>
                    <div class="comment-foot">
                        <span class="comment-count">{{ text.length }} / {{ maxLength }}</span>
                    </div>
                    <p v-if="error" class="comment-error">{{ error }}</p>
                    <button class="board-button" type="submit" :disabled="!canSend">
                        {{ sending ? "おくっています…" : "✉ おくる" }}
                    </button>
                </form>
            </section>
        </main>
    </div>
</template>

<script>
import db, { firebase } from "@/firebase.js";
import { getCurrentUser } from "@/utils/cards.js";

export default {
    name: "NoticeBoard",

    data() {
        return {
            // ■「つぎの アップデート」に出す予定。ここに足していく
            upcoming: [
                {
                    icon: "🔄",
                    title: "トレードモード",
                    badge: "ためし",
                    text: "ほかの ひとと カードを こうかん できるよ。まずは ためしに つくってみるよ。"
                }
            ],
            maxLength: 200,
            text: "",
            sending: false,
            sent: false,
            error: ""
        };
    },

    computed: {
        canSend() {
            return !this.sending && this.text.trim().length > 0;
        }
    },

    methods: {
        // ■みんなの声をFirestore（userComments）に保存する
        async send() {
            if (!this.canSend) return;
            this.sending = true;
            this.error = "";
            try {
                const user = await getCurrentUser();
                await db.collection("userComments").add({
                    text: this.text.trim(),
                    uid: user ? user.uid : null,
                    name: user ? user.name || "" : "",
                    team: user ? user.team || "" : "",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.text = "";
                this.sent = true;
            } catch (error) {
                console.error("コメントの送信に失敗しました:", error);
                this.error = "おくれなかったよ。ネットを たしかめて、もういちど おしてね";
            } finally {
                this.sending = false;
            }
        }
    }
};
</script>

<style scoped>
.board-page{min-height:100vh;background:#10151c;color:#e2e8f0;text-align:left}
.board-header{
    position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;
    padding:10px 16px;background:rgba(16,21,28,.95);border-bottom:1px solid #1e293b;
}
.board-header h1{margin:0;font-size:22px;font-weight:900;color:#67e8f9}
.board-back{
    width:44px;height:44px;border:1px solid #475569;border-radius:50%;
    font-size:20px;font-weight:bold;color:#e2e8f0;
}
.board-back:hover{background:rgba(255,255,255,.08)}
.board-header-space{width:44px}

.board-main{max-width:560px;margin:0 auto;padding:16px 16px 40px}
.board-section{margin-bottom:28px}
.board-section h2{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:20px;font-weight:900;color:#a5f3fc}
.section-icon{font-size:24px}
.board-lead{margin:0 0 12px;font-size:15px;line-height:1.7;color:#cbd5e1}

.update-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.update-item{
    display:flex;gap:12px;padding:14px;
    border:1px solid rgba(103,232,249,.35);border-radius:14px;background:rgba(255,255,255,.04);
}
.update-icon{flex:none;font-size:30px;line-height:1}
.update-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:18px;font-weight:900}
.update-badge{
    border-radius:999px;background:#fbbf24;color:#1f2937;
    padding:1px 10px;font-size:12px;font-weight:900;
}
.update-text{margin:4px 0 0;font-size:14px;line-height:1.7;color:#cbd5e1}

.comment-input{
    display:block;width:100%;box-sizing:border-box;resize:vertical;
    padding:12px;border:2px solid #475569;border-radius:12px;
    background:#0b1220;color:#fff;font-size:16px;line-height:1.6;
}
.comment-input:focus{outline:none;border-color:#22d3ee}
.comment-foot{display:flex;justify-content:flex-end;margin:4px 2px 8px}
.comment-count{font-size:12px;color:#94a3b8}
.comment-error{margin:0 0 8px;font-size:14px;font-weight:bold;color:#fca5a5}

.board-button{
    display:block;width:100%;min-height:52px;border-radius:14px;
    background:#22d3ee;color:#0f172a;font-size:18px;font-weight:900;
}
.board-button:hover:not(:disabled){background:#67e8f9}
.board-button:active:not(:disabled){transform:scale(.98)}
.board-button:disabled{opacity:.4;cursor:not-allowed}
.board-button.secondary{background:transparent;border:2px solid #22d3ee;color:#a5f3fc;font-size:16px}

.thanks{padding:24px 16px;text-align:center;border:1px solid rgba(103,232,249,.35);border-radius:14px;background:rgba(255,255,255,.04)}
.thanks-icon{font-size:48px}
.thanks-title{margin:6px 0 16px;font-size:20px;font-weight:900;color:#67e8f9}
</style>
