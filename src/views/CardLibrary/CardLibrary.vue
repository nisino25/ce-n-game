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
                        ✅ 手元のカードが{{ minCards }}枚以上あるので「すみかにもどそう！」で遊べます
                    </template>
                    <template v-else>
                        🔒 「すみかにもどそう！」は手元のカードが{{ minCards }}枚以上で遊べます（あと{{ minCards - collectionTotal }}枚）
                    </template>
                </p>

                <!-- タブ：ぜんぶ／じぶんがとった／ほかの人がとった（タブを選ぶと、下の「もっている」などの絞り込みは使わない） -->
                <div class="mb-2 flex flex-wrap gap-2">
                    <button
                        v-for="option in tabOptions"
                        :key="option.value"
                        class="filter-button"
                        :class="{ active: tab === option.value }"
                        @click="tab = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>

                <!-- 絞り込み：1段目＝持っているかどうか（最初は「もっている」）、2段目＝ロケーション（タブが「ぜんぶ」のときだけ） -->
                <div v-if="tab === 'all'" class="mb-2 flex flex-wrap gap-2">
                    <button
                        v-for="option in ownedOptions"
                        :key="option.value"
                        class="filter-button"
                        :class="{ active: ownedFilter === option.value }"
                        @click="ownedFilter = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>
                <div class="mb-4 flex flex-wrap gap-2">
                    <button
                        v-for="option in regionOptions"
                        :key="option.value"
                        class="filter-button"
                        :class="{ active: regionFilter === option.value }"
                        @click="regionFilter = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>

                <!-- カード一覧 -->
                <div v-if="!filteredCards.length" class="py-10 text-center text-slate-400">
                    該当するカードがありません
                </div>
                <!-- ■宝箱・獲得カード一覧と同じカードデザイン（CollectionCard）で表示 -->
                <div class="library-grid">
                    <!-- ■タップするとカードを拡大して見られる -->
                    <button
                        v-for="(card, index) in filteredCards"
                        :key="card.cardId"
                        class="library-item"
                        :class="{ unowned: !card.owned }"
                        :aria-label="card.name + 'を拡大して見る'"
                        @click="focusCard(index)"
                    >
                        <CollectionCard :card="displayCard(card)" />
                        <span v-if="isMine(card)" class="mine-badge">📷 じぶん</span>
                        <span v-if="card.collectionCount" class="count-badge">×{{ card.collectionCount }}</span>
                        <span v-else-if="card.placedCount" class="count-badge placed">盤面 ×{{ card.placedCount }}</span>
                        <span v-else class="lock-badge">もっていない</span>
                    </button>
                </div>
            </template>

        </div>

        <!-- ■カードの拡大表示（宝箱の獲得カード一覧と同じ操作感） -->
        <div v-if="focusedCard" class="focus-modal" @click.self="closeFocus">
            <button class="focus-close" aria-label="閉じる" @click="closeFocus">✕</button>
            <button class="focus-nav focus-prev" aria-label="前のカード" :disabled="focusedIndex === 0" @click.stop="moveFocus(-1)">◀</button>

            <div :key="focusedCard.cardId" class="focus-card" :style="{ '--s': focusScale }">
                <CollectionCard :card="displayCard(focusedCard)" />
            </div>

            <button class="focus-nav focus-next" aria-label="次のカード" :disabled="focusedIndex === filteredCards.length - 1" @click.stop="moveFocus(1)">▶</button>
            <p class="focus-count">
                {{ focusedIndex + 1 }} / {{ filteredCards.length }}
                <span class="focus-owned">
                    <template v-if="isMine(focusedCard)">&emsp;📷 じぶんがとった</template>
                    <template v-if="focusedCard.collectionCount">&emsp;もっている ×{{ focusedCard.collectionCount }}</template>
                    <template v-if="focusedCard.placedCount">&emsp;盤面 ×{{ focusedCard.placedCount }}</template>
                    <template v-if="!focusedCard.owned">&emsp;もっていない</template>
                </span>
            </p>
        </div>
    </div>
</template>

<script>
import CollectionCard from "@/views/CaveAdventure/CollectionCard.vue";
import { getSession } from "@/utils/session.js";
import {
    MIN_CARDS_FOR_DOMINATION,
    toDisplayCard,
    REGION_LABELS,
    TERRAIN_LABELS,
    getCurrentUser,
    fetchCardLibrary,
    fetchMyCardInstances
} from "@/utils/cards.js";

export default {
    name: "CardLibrary",

    components: { CollectionCard },

    data() {
        return {
            loading: true,
            loadError: "",
            library: [],
            instances: [],
            tab: "all", // all（ぜんぶ）／mine（じぶんがとった）／others（ほかの人がとった）
            tabOptions: [
                { value: "all", label: "ぜんぶ" },
                { value: "mine", label: "📷 じぶんがとった" },
                { value: "others", label: "👥 ほかの人がとった" }
            ],
            ownedFilter: "owned", // 最初は持っているカードだけ表示する
            regionFilter: "all",
            ownedOptions: [
                { value: "all", label: "すべて" },
                { value: "owned", label: "もっている" },
                { value: "unowned", label: "もっていない" }
            ],
            regionOptions: [
                { value: "all", label: "すべての場所" },
                ...Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }))
            ],
            playerName: "",
            myUid: "",
            focusedIndex: null,
            focusScale: 2,
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
            return this.cards.filter(card =>
                this.matchesTab(card)
                && (this.tab !== "all" || this.matchesOwnedFilter(card))
                && (this.regionFilter === "all" || card.region === this.regionFilter)
            );
        },

        focusedCard() {
            return this.focusedIndex === null ? null : this.filteredCards[this.focusedIndex] || null;
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

    methods: {
        // ■宝箱と同じ表示用データに変換（所持カードにはチームカラーと自分の名前を付ける）
        displayCard(card) {
            // 持っていないカードでも、スキャンで登録されたものは「発見者」を出す
            let instance = null;
            if (card.owned) {
                instance = { team: getSession("myTeam"), ownerName: this.playerName };
            } else if (card.ownerName) {
                instance = { team: "", ownerName: card.ownerName };
            }
            return toDisplayCard(card, instance);
        },

        // 自分がスキャンでとって登録したカードか
        isMine(card) {
            return Boolean(card.ownerUid) && card.ownerUid === this.myUid;
        },

        matchesOwnedFilter(card) {
            if (this.ownedFilter === "all") return true;
            return (this.ownedFilter === "owned") === card.owned;
        },

        // タブ：じぶんがとった／ほかの人がとった（スキャンで登録されたカードのうち、持ち主が自分か他の人か）
        matchesTab(card) {
            if (this.tab === "mine") return this.isMine(card);
            if (this.tab === "others") return card.source === "scan" && !this.isMine(card);
            return true;
        },

        // ■画面に収まる最大2.2倍まで拡大して表示
        focusCard(index) {
            const maxByHeight = (window.innerHeight * 0.78) / 220;
            const maxByWidth = (window.innerWidth * 0.86) / 150;
            this.focusScale = Math.max(1, Math.min(2.2, maxByHeight, maxByWidth));
            this.focusedIndex = index;
        },

        moveFocus(delta) {
            const next = this.focusedIndex + delta;
            if (next < 0 || next >= this.filteredCards.length) return;
            this.focusedIndex = next;
        },

        closeFocus() {
            this.focusedIndex = null;
        }
    },

    async mounted() {
        try {
            const [library, user] = await Promise.all([
                fetchCardLibrary(),
                getCurrentUser()
            ]);
            this.library = library;
            this.playerName = (user && user.name) || "";
            this.myUid = (user && user.uid) || "";
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

.library-grid{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
    gap:16px 12px;justify-items:center;
}
.library-item{
    position:relative;display:block;width:150px;height:220px;padding:0;
    cursor:pointer;transition:transform .18s ease;-webkit-tap-highlight-color:transparent;
}
.library-item:hover{transform:translateY(-4px) scale(1.03)}
.library-item:active{transform:scale(.97)}
.library-item:focus-visible{outline:3px solid #ffd84d;outline-offset:3px}
.library-item.unowned > :first-child{filter:grayscale(1) brightness(.5)}
.count-badge{
    position:absolute;right:-6px;bottom:-8px;z-index:20;
    border-radius:999px;background:#22d3ee;color:#0f172a;
    padding:2px 10px;font-size:13px;font-weight:900;
    box-shadow:0 2px 6px rgba(0,0,0,.5);
}
.count-badge.placed{background:#fbbf24}
.mine-badge{
    position:absolute;left:-6px;top:-8px;z-index:20;
    border-radius:999px;background:#f472b6;color:#0f172a;
    padding:2px 8px;font-size:11px;font-weight:900;
    box-shadow:0 2px 6px rgba(0,0,0,.5);white-space:nowrap;
}
.lock-badge{
    position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);z-index:20;
    border-radius:999px;background:#334155;color:#cbd5e1;
    padding:2px 10px;font-size:11px;font-weight:bold;white-space:nowrap;
}

/* ■カードの拡大表示 */
.focus-modal{
    position:fixed;inset:0;z-index:10001;
    background:rgba(6,10,16,.88);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
}
.focus-card{
    line-height:0;
    transform:scale(var(--s,2));
    filter:drop-shadow(0 18px 30px rgba(0,0,0,.6));
    animation:focus-pop .28s cubic-bezier(.2,1.2,.4,1);
}
@keyframes focus-pop{from{transform:scale(calc(var(--s,2) * .6));opacity:0}to{transform:scale(var(--s,2));opacity:1}}
.focus-close,.focus-nav{
    position:absolute;margin:0;padding:0;border-radius:50%;
    background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);
    color:#fff;cursor:pointer;transition:background .2s,opacity .2s;
}
.focus-close:hover,.focus-nav:hover:not(:disabled){background:rgba(255,255,255,.25)}
.focus-close{top:max(16px,env(safe-area-inset-top));right:16px;width:40px;height:40px;font-size:16px}
.focus-nav{top:50%;transform:translateY(-50%);width:44px;height:44px;font-size:16px}
.focus-nav:disabled{opacity:.25;cursor:default}
.focus-prev{left:10px}
.focus-next{right:10px}
.focus-count{
    position:absolute;bottom:calc(18px + env(safe-area-inset-bottom));left:0;right:0;
    margin:0;text-align:center;color:#cbd5e1;font-size:13px;font-weight:bold;letter-spacing:2px;
}
.focus-owned{color:#67e8f9;letter-spacing:0}

@media (prefers-reduced-motion: reduce){
    .focus-card{animation:none !important}
}
</style>
