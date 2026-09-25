<template>
    <!-- ■カードライブラリ：DBに登録されている全カードと、自分が何枚持っているか -->
    <div class="min-h-screen bg-[#10151c] text-white px-4 py-6">
        <div class="mx-auto max-w-5xl">

            <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 class="text-2xl font-black tracking-wide text-cyan-300">カードライブラリ</h1>
                    <p class="text-sm text-slate-400">登録されている生きものカードと、あなたが持っている枚数</p>
                </div>
                <button
                    class="rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold hover:bg-white/10"
                    @click="$router.push({ name: 'Home' })"
                >
                    モニタールームにもどる
                </button>
            </header>

            <div v-if="loading" class="py-20 text-center text-slate-400">よみこみ中…</div>
            <div v-else-if="loadError" class="py-20 text-center text-red-400">{{ loadError }}</div>

            <template v-else>
                <!-- まとめ -->
                <section class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div class="summary-box">
                        <div class="summary-label">登録カード</div>
                        <div class="summary-value">{{ library.length }}<small>種類</small></div>
                    </div>
                    <div class="summary-box">
                        <div class="summary-label">持っている種類</div>
                        <div class="summary-value">{{ ownedKinds }}<small>種類</small></div>
                    </div>
                    <div class="summary-box">
                        <div class="summary-label">手元のカード</div>
                        <div class="summary-value">{{ collectionTotal }}<small>枚</small></div>
                    </div>
                    <div class="summary-box">
                        <div class="summary-label">盤面に置いたカード</div>
                        <div class="summary-value">{{ placedTotal }}<small>枚</small></div>
                    </div>
                </section>

                <p
                    class="mb-5 rounded-lg px-4 py-2 text-sm font-bold"
                    :class="collectionTotal >= minCards ? 'bg-emerald-900/60 text-emerald-200' : 'bg-amber-900/50 text-amber-200'"
                >
                    <template v-if="collectionTotal >= minCards">
                        ✅ 手元のカードが{{ minCards }}枚以上あるので「野生にもどそう！」で遊べます
                    </template>
                    <template v-else>
                        🔒 「野生にもどそう！」は手元のカードが{{ minCards }}枚以上で遊べます（あと{{ minCards - collectionTotal }}枚）
                    </template>
                </p>

                <!-- 絞り込み -->
                <div class="mb-4 flex flex-wrap gap-2">
                    <button
                        v-for="option in filterOptions"
                        :key="option.value"
                        class="filter-button"
                        :class="{ active: filter === option.value }"
                        @click="filter = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>

                <!-- カード一覧 -->
                <div v-if="!filteredCards.length" class="py-10 text-center text-slate-400">
                    該当するカードがありません
                </div>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    <div
                        v-for="card in filteredCards"
                        :key="card.cardId"
                        class="library-card"
                        :class="{ unowned: !card.owned }"
                    >
                        <div class="library-card-image">
                            <img v-if="card.image" :src="card.image" :alt="card.name">
                            <span v-else class="text-4xl">🐾</span>
                        </div>
                        <div class="library-card-body">
                            <div class="flex items-center justify-between gap-1">
                                <span class="font-bold">{{ card.name }}</span>
                                <span class="level-badge">Lv{{ card.level }}</span>
                            </div>
                            <div class="mt-1 flex flex-wrap gap-1 text-[11px]">
                                <span class="tag">{{ regionLabels[card.region] || card.region }}</span>
                                <span class="tag">{{ terrainLabels[card.terrain] || card.terrain }}</span>
                                <span class="tag">レア度 {{ card.rarity }}</span>
                            </div>
                            <div class="mt-2 text-sm">
                                <span v-if="card.collectionCount" class="font-bold text-cyan-300">もっている ×{{ card.collectionCount }}</span>
                                <span v-else class="text-slate-500">もっていない</span>
                                <span v-if="card.placedCount" class="ml-1 text-xs text-amber-300">（盤面 ×{{ card.placedCount }}）</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

        </div>
    </div>
</template>

<script>
import {
    MIN_CARDS_FOR_DOMINATION,
    REGION_LABELS,
    TERRAIN_LABELS,
    getCurrentUser,
    fetchCardLibrary,
    fetchMyCardInstances
} from "@/utils/cards.js";

export default {
    name: "CardLibrary",

    data() {
        return {
            loading: true,
            loadError: "",
            library: [],
            instances: [],
            filter: "all",
            filterOptions: [
                { value: "all", label: "すべて" },
                { value: "owned", label: "もっている" },
                { value: "unowned", label: "もっていない" },
                ...Object.entries(REGION_LABELS).map(([value, label]) => ({ value: `region:${value}`, label }))
            ],
            minCards: MIN_CARDS_FOR_DOMINATION,
            regionLabels: REGION_LABELS,
            terrainLabels: TERRAIN_LABELS
        };
    },

    computed: {
        // カードライブラリの各カードに、自分の所持枚数をつける
        cards() {
            const counts = {};
            this.instances.forEach(instance => {
                const count = counts[instance.cardId] || (counts[instance.cardId] = { collection: 0, placed: 0 });
                if (instance.status === "collection") count.collection++;
                else count.placed++;
            });

            return this.library.map(card => {
                const count = counts[card.cardId] || { collection: 0, placed: 0 };
                return {
                    ...card,
                    collectionCount: count.collection,
                    placedCount: count.placed,
                    owned: count.collection + count.placed > 0
                };
            });
        },

        filteredCards() {
            if (this.filter === "owned") return this.cards.filter(card => card.owned);
            if (this.filter === "unowned") return this.cards.filter(card => !card.owned);
            if (this.filter.startsWith("region:")) {
                const region = this.filter.slice("region:".length);
                return this.cards.filter(card => card.region === region);
            }
            return this.cards;
        },

        ownedKinds() {
            return this.cards.filter(card => card.owned).length;
        },

        collectionTotal() {
            return this.instances.filter(instance => instance.status === "collection").length;
        },

        placedTotal() {
            return this.instances.filter(instance => instance.status !== "collection").length;
        }
    },

    async mounted() {
        try {
            const [library, user] = await Promise.all([
                fetchCardLibrary(),
                getCurrentUser()
            ]);
            this.library = library;
            this.instances = user ? await fetchMyCardInstances(user.uid) : [];
        } catch (error) {
            console.error("カードライブラリの読み込みに失敗しました:", error);
            this.loadError = "読み込みに失敗しました。通信状況を確認してください。";
        } finally {
            this.loading = false;
        }
    }
};
</script>

<style scoped>
.summary-box{
    border:1px solid rgba(103,232,249,.3);border-radius:12px;
    background:rgba(255,255,255,.04);padding:10px 12px;
}
.summary-label{font-size:12px;color:#94a3b8;font-weight:bold}
.summary-value{font-size:26px;font-weight:900;line-height:1.2}
.summary-value small{font-size:12px;margin-left:2px;color:#94a3b8}

.filter-button{
    border:1px solid #475569;border-radius:999px;
    padding:4px 14px;font-size:13px;font-weight:bold;color:#cbd5e1;
}
.filter-button.active{background:#22d3ee;border-color:#22d3ee;color:#0f172a}

.library-card{
    overflow:hidden;border:1px solid #334155;border-radius:12px;
    background:#1b2330;
}
.library-card-image{
    display:flex;align-items:center;justify-content:center;
    height:110px;background:#f3eee2;
}
.library-card-image img{max-width:100%;max-height:100%;object-fit:contain}
.library-card-body{padding:8px 10px 10px}
.library-card.unowned .library-card-image{filter:grayscale(1) brightness(.55)}
.library-card.unowned .library-card-body{opacity:.6}

.level-badge{
    flex:none;border-radius:6px;background:#0e7490;
    padding:0 6px;font-size:11px;font-weight:bold;
}
.tag{border-radius:4px;background:rgba(255,255,255,.08);padding:0 6px;color:#cbd5e1}
</style>
