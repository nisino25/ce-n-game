<template>
    <!-- ■どんな端末で使われているかの集計を見る画面（管理者用の仮画面。いまは誰でも開ける）。
         Firestoreには「日付ごとの回数」だけが入っているので、ここで、種類ごとに足して、割合の棒グラフにする -->
    <div class="stats-page">
        <header class="stats-header">
            <button class="stats-back" @click="$router.push({ name: 'Home' })">← もどる</button>
            <h1>端末の集計</h1>
            <span class="stats-total">{{ total }}回</span>
        </header>

        <main class="stats-main">
            <p v-if="loading" class="stats-note">よみこみ中…</p>
            <p v-else-if="error" class="stats-note error">{{ error }}</p>
            <p v-else-if="!total" class="stats-note">まだ データが ありません</p>

            <template v-else>
                <p class="stats-lead">
                    「1つの端末が、1日に1回あそんだ」を1回として数えています（人数ではなく、回数）。
                    名前や ID とは、結びつけていません。直近{{ days.length }}日ぶん。
                </p>

                <section v-for="group in groups" :key="group.title" class="stats-card">
                    <h2>{{ group.title }}</h2>
                    <div v-for="row in group.rows" :key="row.label" class="stats-row">
                        <span class="stats-label">{{ row.label }}</span>
                        <span class="stats-bar"><span :style="{ width: row.percent + '%' }"></span></span>
                        <span class="stats-count">{{ row.count }}回<small>{{ row.percent }}%</small></span>
                    </div>
                </section>

                <section class="stats-card">
                    <h2>日ごと</h2>
                    <div v-for="day in days" :key="day.date" class="stats-row">
                        <span class="stats-label">{{ day.date.slice(5) }}</span>
                        <span class="stats-bar"><span :style="{ width: day.percent + '%' }"></span></span>
                        <span class="stats-count">{{ day.total }}回</span>
                    </div>
                </section>
            </template>
        </main>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { WIDTH_BUCKETS } from "@/utils/deviceStats.js";

const TYPE_LABELS = { phone: "スマホ", tablet: "タブレット", pc: "PC" };
const OS_LABELS = { ios: "iOS", android: "Android", windows: "Windows", mac: "Mac", other: "その他" };
const APP_LABELS = { app: "ホーム画面アプリ", web: "ブラウザ" };

export default {
    name: "DeviceStats",

    data() {
        return { loading: true, error: "", days: [], groups: [], total: 0 };
    },

    async mounted() {
        try {
            const snapshot = await db.collection("deviceStats").orderBy("date", "desc").limit(90).get();
            const rows = snapshot.docs
                .map(doc => ({ date: doc.id, ...doc.data() }))
                .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date)); // 動作確認用のデータ（日付ではないID）は含めない

            // 「種類 × 幅 × OS × アプリ」のキーごとの回数を、種類ごと・幅ごと…に足し直す
            const byType = {}, byWidth = {}, byOs = {}, byApp = {};
            const add = (map, key, count) => { map[key] = (map[key] || 0) + count; };
            rows.forEach(row => {
                Object.entries(row.counts || {}).forEach(([key, count]) => {
                    const [type, width, os, app] = key.split("__");
                    add(byType, type, count);
                    add(byWidth, width, count);
                    add(byOs, os, count);
                    add(byApp, app, count);
                });
            });

            this.total = rows.reduce((sum, row) => sum + (row.total || 0), 0);
            const toRows = (map, labels) => Object.entries(map)
                .map(([key, count]) => ({ label: labels[key] || key, count, percent: this.percent(count) }))
                .sort((a, b) => b.count - a.count);

            this.groups = [
                { title: "端末の種類", rows: toRows(byType, TYPE_LABELS) },
                { title: "画面の幅（px）", rows: WIDTH_BUCKETS.filter(b => byWidth[b.key]).map(b => ({ label: b.label, count: byWidth[b.key], percent: this.percent(byWidth[b.key]) })) },
                { title: "OS", rows: toRows(byOs, OS_LABELS) },
                { title: "使い方", rows: toRows(byApp, APP_LABELS) }
            ];

            const maxDay = Math.max(1, ...rows.map(row => row.total || 0));
            this.days = rows.map(row => ({ date: row.date, total: row.total || 0, percent: Math.round(((row.total || 0) / maxDay) * 100) }));
        } catch (error) {
            console.error("端末の集計の読み込みに失敗しました:", error);
            this.error = "読み込みに失敗しました。通信状況を確認してください。";
        } finally {
            this.loading = false;
        }
    },

    methods: {
        percent(count) {
            return this.total ? Math.round((count / this.total) * 100) : 0;
        }
    }
};
</script>

<style scoped>
.stats-page{min-height:100vh;background:#10151c;color:#e2e8f0;text-align:left}
.stats-header{
    position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;
    padding:10px 16px;background:rgba(16,21,28,.95);border-bottom:1px solid #1e293b;
}
.stats-header h1{flex:1;margin:0;font-size:18px;font-weight:900;color:#67e8f9}
.stats-back{border:1px solid #475569;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:bold}
.stats-total{font-size:13px;color:#94a3b8}
.stats-main{max-width:560px;margin:0 auto;padding:16px}
.stats-note{padding:40px 0;text-align:center;color:#94a3b8}
.stats-note.error{color:#fca5a5}
.stats-lead{margin:0 0 14px;font-size:12px;line-height:1.7;color:#94a3b8}
.stats-card{margin-bottom:14px;padding:12px 14px;border:1px solid #334155;border-radius:12px;background:#1b2330}
.stats-card h2{margin:0 0 8px;font-size:14px;font-weight:900;color:#a5f3fc}
.stats-row{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:13px}
.stats-label{flex:none;width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stats-bar{flex:1;height:10px;overflow:hidden;border-radius:999px;background:#0b1220}
.stats-bar span{display:block;height:100%;border-radius:999px;background:#22d3ee}
.stats-count{flex:none;width:78px;text-align:right;font-weight:bold}
.stats-count small{margin-left:4px;font-size:10px;font-weight:normal;color:#94a3b8}
</style>
