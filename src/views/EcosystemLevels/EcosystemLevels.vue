<template>
    <!-- ■生態系レベルのページ：レベルの意味と、カードのレベルを、ここで簡単に変えられる。モニタールームの仮リンクから -->
    <div class="min-h-screen bg-slate-50 p-4 text-slate-700">
        <div class="mx-auto max-w-6xl">
            <button class="mb-3 text-sm font-black text-slate-500" @click="$router.push({ name: 'Home' })">← モニタールームにもどる</button>

            <h1 class="text-lg font-black">生態系レベル</h1>
            <p class="mb-4 text-xs font-bold text-slate-500">カードの「生態系レベル（Lv）」の意味と、いまの枚数です。レベルは、カードごとにすぐ変えられます</p>

            <!-- レベルの説明 -->
            <section class="mb-4 rounded-xl bg-white p-3 shadow-sm">
                <button
                    type="button"
                    class="flex w-full items-center justify-between text-left text-sm font-black"
                    :aria-expanded="showLevelInfo"
                    @click="showLevelInfo = !showLevelInfo"
                >
                    レベルの意味
                    <span class="text-xs text-slate-500">{{ showLevelInfo ? '▲ たたむ' : '▼ ひらく' }}</span>
                </button>
                <ul v-if="showLevelInfo" class="mt-2 space-y-2">
                    <li v-for="item in LEVELS" :key="item.level" class="flex items-center gap-3">
                        <img :src="item.icon" :alt="`Lv${item.level}`" class="h-12 w-12 flex-none object-contain">
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-black">Lv{{ item.level }} <span class="text-xs font-bold text-slate-500">{{ countOf(item.level) }}まい</span></p>
                            <p class="text-xs leading-relaxed text-slate-600">{{ item.text }}</p>
                        </div>
                    </li>
                </ul>
                <p v-if="showLevelInfo" class="mt-3 text-xs leading-relaxed text-slate-500">
                    下のレベルほど たくさん いて、その上に 上のレベルの いきものが くらせるよ（ピラミッド）。
                </p>
            </section>

            <div v-if="loading" class="py-10 text-center text-sm font-bold text-slate-400">よみこみ中...</div>
            <div v-else-if="loadError" class="py-10 text-center text-sm font-bold text-red-500">カードを よみこめませんでした</div>

            <template v-else>
                <!-- 絞りこみ：レベルごと（すべて・Lv1〜Lv4） -->
                <div ref="listTop" class="mb-3 flex flex-wrap gap-2" role="tablist">
                    <button
                        v-for="tab in tabs"
                        :key="tab.key"
                        type="button"
                        role="tab"
                        :aria-selected="tab.key === selectedKey"
                        class="rounded-full border px-3 py-1.5 text-xs font-black transition"
                        :class="tab.key === selectedKey
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'"
                        @click="selectedKey = tab.key"
                    >
                        {{ tab.label }}
                        <span class="ml-1 opacity-80">{{ tab.count }}</span>
                    </button>
                </div>

                <section class="rounded-xl bg-white p-3 shadow-sm">
                    <p v-if="!visibleCards.length" class="py-6 text-center text-xs font-bold text-slate-400">このレベルのカードはありません</p>

                    <ul class="grid grid-cols-2 gap-3 md:grid-cols-5">
                        <li
                            v-for="card in pagedCards"
                            :key="card.cardId"
                            class="flex flex-col rounded-lg bg-slate-100 p-2"
                        >
                            <img
                                v-if="card.image"
                                :src="card.image"
                                :alt="card.name"
                                class="aspect-[3/4] w-full rounded-md bg-white object-contain"
                            >
                            <div v-else class="aspect-[3/4] w-full rounded-md bg-slate-200"></div>

                            <div class="mt-2 min-w-0">
                                <p class="truncate text-sm font-black">{{ card.name }}</p>
                                <p class="mt-0.5 text-xs text-slate-500">レア度：{{ card.rarity }}</p>
                                <p class="text-xs text-slate-500">作成日時：{{ dateOf(card) }}</p>
                                <p class="text-xs text-slate-500">作成者：{{ creatorOf(card) }}</p>
                                <p v-if="savingId === card.cardId" class="text-xs text-slate-400">保存中…</p>
                                <p v-else-if="savedId === card.cardId" class="text-xs font-bold text-emerald-600">保存した</p>
                            </div>

                            <div class="mt-2 grid grid-cols-4 gap-1">
                                <button
                                    v-for="item in LEVELS"
                                    :key="item.level"
                                    type="button"
                                    :disabled="savingId === card.cardId"
                                    class="rounded-md border px-1 py-1.5 text-xs font-black transition disabled:opacity-50"
                                    :class="card.level === item.level
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'"
                                    @click="requestLevel(card, item.level)"
                                >
                                    Lv{{ item.level }}
                                </button>
                            </div>
                        </li>
                    </ul>

                    <!-- ページ送り（1ページ25まい） -->
                    <div v-if="pageCount > 1" class="mt-3 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            :disabled="page <= 1"
                            class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40"
                            @click="goPage(page - 1)"
                        >
                            ← まえ
                        </button>
                        <span class="text-xs font-black text-slate-500">{{ page }} / {{ pageCount }} ページ（{{ visibleCards.length }}まい）</span>
                        <button
                            type="button"
                            :disabled="page >= pageCount"
                            class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40"
                            @click="goPage(page + 1)"
                        >
                            つぎ →
                        </button>
                    </div>
                </section>

                <!-- 変える前の確認（レベルを変えるときは、必ずここで「変える」を押してから保存する） -->
                <div v-if="pendingChange" class="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60 p-4" @click.self="cancelLevel">
                    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                        <p class="mb-1 text-sm font-black text-slate-500">生態系レベルを変えますか？</p>
                        <p class="mb-4 text-lg font-black">{{ pendingChange.card.name }}</p>
                        <p class="mb-5 text-base font-bold">
                            Lv{{ pendingChange.from }} → <span class="text-emerald-700">Lv{{ pendingChange.to }}</span>
                        </p>
                        <div class="flex gap-2">
                            <button type="button" class="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 font-black text-slate-600" @click="cancelLevel">やめる</button>
                            <button type="button" class="flex-1 rounded-xl bg-emerald-600 py-2.5 font-black text-white hover:bg-emerald-700" @click="confirmLevel">変える</button>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { fetchCardLibrary } from "@/utils/cards.js";

// ■1ページに出すカードの数
const PAGE_SIZE = 25;

// ■カードを作った時刻（ミリ秒）。時刻が無いカードは、いちばん前に出す
function createdMs(card) {
    const at = card.createdAt;
    return at && typeof at.toMillis === "function" ? at.toMillis() : 0;
}

// ■レベルの説明（短い文。直したいときは、ここを書き換える）
const LEVELS = [
    { level: 1, icon: "/images/card/生態系レベル１.png", text: "生態系の いちばん下の土台。いちばん たくさん いるよ" },
    { level: 2, icon: "/images/card/生態系レベル２.png", text: "土台の上に いる いきもの" },
    { level: 3, icon: "/images/card/生態系レベル３.png", text: "Lv2の上に いる いきもの" },
    { level: 4, icon: "/images/card/生態系レベル４.png", text: "生態系の いちばん上。まわりを したがえるよ" },
];

export default {
    name: "EcosystemLevels",
    data() {
        return {
            LEVELS,
            loading: true,
            loadError: false,
            cards: [],
            selectedKey: "all",
            savingId: null,
            savedId: null,
            page: 1,
            showLevelInfo: false, // レベルの説明は、はじめは縮めておく
            pendingChange: null, // 変える前の確認中の { card, from, to }
        };
    },
    computed: {
        tabs() {
            return [
                { key: "all", label: "すべて", count: this.cards.length },
                ...LEVELS.map(item => ({ key: item.level, label: `Lv${item.level}`, count: this.countOf(item.level) })),
            ];
        },
        visibleCards() {
            const list = this.selectedKey === "all"
                ? this.cards
                : this.cards.filter(card => card.level === this.selectedKey);
            // 生成時間順（新しいものから）
            // 同じ時刻（まとめて登録したもの）は、名前順にする
            return list.slice().sort((a, b) => createdMs(b) - createdMs(a) || String(a.name).localeCompare(String(b.name), "ja"));
        },
        pageCount() {
            return Math.max(1, Math.ceil(this.visibleCards.length / PAGE_SIZE));
        },
        // いまのページのカードだけ（1ページ25まい）
        pagedCards() {
            const current = Math.min(this.page, this.pageCount);
            const start = (current - 1) * PAGE_SIZE;
            return this.visibleCards.slice(start, start + PAGE_SIZE);
        },
    },
    watch: {
        // 絞りこみを変えたら、1ページ目から見る
        selectedKey() {
            this.page = 1;
        },
    },
    methods: {
        countOf(level) {
            return this.cards.filter(card => card.level === level).length;
        },
        // ページを送ったら、一覧の上（絞りこみのところ）に戻す
        goPage(next) {
            this.page = Math.min(Math.max(1, next), this.pageCount);
            this.$nextTick(() => {
                const top = this.$refs.listTop;
                if (top && top.scrollIntoView) top.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        },
        // 作成日時（その人の端末の、日本の表記。例：2026/11/18 14:32）
        dateOf(card) {
            const at = card.createdAt;
            if (!at || typeof at.toDate !== "function") return "不明";
            return at.toDate().toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
        },
        // 作成者：スキャンで作ったカードは持ち主の名前、管理画面で作ったカードは「owner」の名前
        creatorOf(card) {
            return card.ownerName || card.owner || "不明";
        },
        // ■Lvのボタンを押したら、まず確認を出す（すぐには保存しない）
        requestLevel(card, level) {
            if (level === card.level || this.savingId) return;
            this.pendingChange = { card, from: card.level, to: level };
        },

        cancelLevel() {
            this.pendingChange = null;
        },

        // ■確認で「変える」を押したときだけ保存する：cards/{id} の level だけを書き換える（画像や持ち主は変えない）
        async confirmLevel() {
            const change = this.pendingChange;
            if (!change) return;
            const { card, to } = change;
            this.pendingChange = null;
            this.savingId = card.cardId;
            this.savedId = null;
            try {
                await db.collection("cards").doc(card.cardId).update({ level: to });
                card.level = to;
                this.savedId = card.cardId;
                // 絞りこみからカードが外れたときに、ページが空にならないようにする
                this.page = Math.min(this.page, this.pageCount);
            } catch (error) {
                console.error("生態系レベルの保存に失敗しました", error);
                alert("保存できませんでした。通信を確かめて、もう一度してください。");
            } finally {
                this.savingId = null;
            }
        },
    },
    async mounted() {
        try {
            // 植物（生産者）は、生態系レベルの対象にしないので、このページには出さない
            this.cards = (await fetchCardLibrary()).filter(card => card.category !== "plant");
        } catch (error) {
            console.error("カードの読み込みに失敗しました", error);
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
};
</script>
