<template>
    <!-- ■生態系レベルのページ：レベルの意味と、カードのレベルを、ここで簡単に変えられる。モニタールームの仮リンクから -->
    <div class="min-h-screen bg-slate-50 p-4 text-slate-700">
        <div class="mx-auto max-w-2xl">
            <button class="mb-3 text-sm font-black text-slate-500" @click="$router.push({ name: 'Home' })">← モニタールームにもどる</button>

            <h1 class="text-lg font-black">生態系レベル</h1>
            <p class="mb-4 text-xs font-bold text-slate-500">カードの「生態系レベル（Lv）」の意味と、いまの枚数です。レベルは、カードごとにすぐ変えられます</p>

            <!-- レベルの説明 -->
            <section class="mb-4 rounded-xl bg-white p-3 shadow-sm">
                <h2 class="mb-2 text-sm font-black">レベルの意味</h2>
                <ul class="space-y-2">
                    <li v-for="item in LEVELS" :key="item.level" class="flex items-center gap-3">
                        <img :src="item.icon" :alt="`Lv${item.level}`" class="h-12 w-12 flex-none object-contain">
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-black">Lv{{ item.level }} <span class="text-xs font-bold text-slate-500">{{ countOf(item.level) }}まい</span></p>
                            <p class="text-xs leading-relaxed text-slate-600">{{ item.text }}</p>
                        </div>
                    </li>
                </ul>
                <p class="mt-3 text-xs leading-relaxed text-slate-500">
                    下のレベルほど たくさん いて、その上に 上のレベルの いきものが くらせるよ（ピラミッド）。
                </p>
            </section>

            <div v-if="loading" class="py-10 text-center text-sm font-bold text-slate-400">よみこみ中...</div>
            <div v-else-if="loadError" class="py-10 text-center text-sm font-bold text-red-500">カードを よみこめませんでした</div>

            <template v-else>
                <!-- 絞りこみ：レベルごと（すべて・Lv1〜Lv4） -->
                <div class="mb-3 flex flex-wrap gap-2" role="tablist">
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

                    <ul class="space-y-1">
                        <li
                            v-for="card in visibleCards"
                            :key="card.cardId"
                            class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs"
                        >
                            <span class="font-black">{{ card.name }}</span>
                            <span class="text-slate-500">{{ card.rarity }}</span>
                            <span class="ml-auto flex items-center gap-2">
                                <span v-if="savingId === card.cardId" class="text-slate-400">保存中…</span>
                                <span v-else-if="savedId === card.cardId" class="font-bold text-emerald-600">保存した</span>
                                <select
                                    :value="card.level"
                                    :disabled="savingId === card.cardId"
                                    class="rounded-md border border-slate-300 bg-white px-2 py-1 font-black"
                                    @change="changeLevel(card, $event.target.value)"
                                >
                                    <option v-for="item in LEVELS" :key="item.level" :value="item.level">Lv{{ item.level }}</option>
                                </select>
                            </span>
                        </li>
                    </ul>
                </section>
            </template>
        </div>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { fetchCardLibrary } from "@/utils/cards.js";

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
            return list.slice().sort((a, b) => (a.level || 0) - (b.level || 0) || String(a.name).localeCompare(String(b.name), "ja"));
        },
    },
    methods: {
        countOf(level) {
            return this.cards.filter(card => card.level === level).length;
        },
        // ■レベルを変える：cards/{id} の level だけを書き換える（画像や持ち主は変えない）
        async changeLevel(card, value) {
            const level = Number(value);
            if (!LEVELS.some(item => item.level === level) || level === card.level) return;
            this.savingId = card.cardId;
            this.savedId = null;
            try {
                await db.collection("cards").doc(card.cardId).update({ level });
                card.level = level;
                this.savedId = card.cardId;
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
            this.cards = await fetchCardLibrary();
        } catch (error) {
            console.error("カードの読み込みに失敗しました", error);
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
};
</script>
