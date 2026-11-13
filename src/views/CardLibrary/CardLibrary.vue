<template>
    <!-- ■カードライブラリ：DBに登録されている全カードと、自分が何枚持っているか -->
    <div class="min-h-screen bg-[#10151c] text-white px-4 py-6">
        <div class="mx-auto max-w-5xl">

            <header class="mb-5 flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-3">
                        <h1 class="text-2xl font-black tracking-wide text-cyan-300">{{ $t('カードライブラリ', 'Card book') }}</h1>
                        <LangSwitch />
                    </div>
                </div>
                <button
                    class="shrink-0 rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold hover:bg-white/10"
                    @click="$router.back()"
                >
                    {{ $t('もどる', 'Back') }}
                </button>
                <!-- クリック修正前：@click="$router.push({ name: 'Home' })" -->

            </header>

            <div v-if="loading" class="loading-box">
                <div class="loading-cards"><span></span><span></span><span></span></div>
                <p>{{ $t('よみこみ中…', 'Loading…') }}</p>
            </div>
            <div v-else-if="loadError" class="py-20 text-center text-red-400">{{ loadError }}</div>

            <template v-else>
                <!-- まとめ -->
                <section class="mb-5 grid grid-cols-4 gap-2 text-center">
                    <div class="summary-box">
                        <div class="summary-label">{{ $t('登録カード', 'Cards in book') }}</div>
                        <div class="summary-value">{{ library.length }}<small>{{ $t('種類', 'kinds') }}</small></div>
                    </div>
                    <div class="summary-box">
                        <div class="summary-label">{{ $t('持っている種類', 'Kinds you have') }}</div>
                        <div class="summary-value">{{ ownedKinds }}<small>{{ $t('種類', 'kinds') }}</small></div>
                    </div>
                    <div class="summary-box">
                        <div class="summary-label">{{ $t('手元のカード', 'Cards you have') }}</div>
                        <div class="summary-value">{{ collectionTotal }}<small>{{ $t('枚', 'cards') }}</small></div>
                    </div>
                    <div class="summary-box">
                        <div class="summary-label">{{ $t('使用中のカード', 'Cards in use') }}</div>
                        <div class="summary-value">{{ placedTotal }}<small>{{ $t('枚', 'cards') }}</small></div>
                    </div>
                </section>

                <!-- 足りないときだけ、あと何枚かを出す（足りているときは出さない） -->
                <p
                    v-if="collectionTotal < minCards"
                    class="mb-5 rounded-lg bg-amber-900/50 px-4 py-2 text-sm font-bold text-amber-200"
                >
                    🔒 {{ $t(`「すみかにもどそう！」は手元のカードが${minCards}枚以上で遊べます（あと${minCards - collectionTotal}枚）`, `"Back to our hideout!" needs ${minCards}+ cards (${minCards - collectionTotal} more)`) }}
                </p>

                <div class="sticky-bar">
                <!-- タブ：ぜんぶ／じぶんがとった／ほかの人がとった（タブを選ぶと、下の「もっている」などの絞り込みは使わない） -->
                <div class="tab-row mb-2 flex flex-wrap gap-2">
                    <button
                        v-for="option in tabOptions"
                        :key="option.value"
                        class="filter-button"
                        :class="{ active: tab === option.value }"
                        @click="tab = option.value"
                    >
                        {{ $t(option.label, option.labelEn) }}
                    </button>
                </div>

                <!-- 持っているか：タブが「ぜんぶ」のときだけ、ここで選ぶ（モーダルの外に出している） -->
                <div v-if="tab === 'all'" class="owned-row mb-2 flex flex-wrap gap-2">
                    <button
                        v-for="option in ownedOptions"
                        :key="option.value"
                        class="filter-button"
                        :class="{ active: ownedFilter === option.value }"
                        @click="ownedFilter = option.value"
                    >
                        {{ $t(option.label, option.labelEn) }}
                    </button>
                </div>

                <!-- 絞り込み：ボタンを押すと、モーダルで持ち主・場所・作られた日を選ぶ -->
                <div class="mb-4 flex flex-wrap items-center gap-3">
                    <button class="filter-button" :class="{ active: activeFilterCount > 0 }" @click="filterOpen = true">
                        🔍 {{ $t('絞りこみ', 'Filter') }}<span v-if="activeFilterCount" class="ml-1">（{{ activeFilterCount }}）</span>
                    </button>
                    <span class="text-xs text-slate-400">{{ filterSummary }}</span>
                    <!-- 並べ方：新しい順（初期）・取得順（自分が手に入れた順）・レア度順 -->
                    <div class="ml-auto flex flex-wrap gap-2">
                        <button
                            v-for="option in sortOptions"
                            :key="option.value"
                            class="filter-button"
                            :class="{ active: sortKey === option.value }"
                            @click="sortKey = option.value"
                        >
                            {{ $t(option.label, option.labelEn) }}
                        </button>
                    </div>
                </div>

                </div>
                <!-- カード一覧 -->
                <div v-if="!filteredCards.length" class="py-10 text-center text-slate-400">
                    {{ $t('該当するカードがありません', 'No cards match') }}
                </div>
                <!-- ■宝箱・獲得カード一覧と同じカードデザイン（CollectionCard）で表示 -->
                <div ref="grid" class="library-grid" :class="{ 'three-up': threeUp }">
                    <!-- ■タップするとカードを拡大して見られる -->
                    <button
                        v-for="(card, index) in pagedCards"
                        :key="card.cardId"
                        class="library-item"
                        :class="{ unowned: !card.owned, compact: threeUp }"
                        :style="itemStyle"
                        :aria-label="$t(card.name + 'を拡大して見る', 'Zoom in on ' + card.name)"
                        @click="focusCard(pageStart + index, $event)"
                    >
                        <CollectionCard :card="displayCard(card)" />
                        <!-- ■作った人のアバター（スキャンでとったカードだけ） -->
                        <span v-if="ownerAvatarSvg(card)" class="owner-avatar" v-html="ownerAvatarSvg(card)"></span>
                        <span v-if="isMine(card)" class="mine-badge">📷 {{ $t('じぶん', 'Mine') }}</span>
                        <span v-if="card.collectionCount" class="count-badge">×{{ card.collectionCount }}</span>
                        <span v-else-if="card.placedCount" class="count-badge placed">{{ $t('使用中', 'In use') }} ×{{ card.placedCount }}</span>
                    </button>
                </div>
                <nav v-if="pageCount > 1" class="pager">
                    <button class="filter-button" :disabled="page === 1" @click="goPage(page - 1)">◀</button>
                    <button
                        v-for="n in pageCount"
                        :key="n"
                        class="filter-button"
                        :class="{ active: n === page }"
                        @click="goPage(n)"
                    >
                        {{ n }}
                    </button>
                    <button class="filter-button" :disabled="page === pageCount" @click="goPage(page + 1)">▶</button>
                </nav>
            </template>

        </div>

        <!-- ■絞りこみのモーダル（下から出る） -->
        <div v-if="filterOpen" class="filter-modal" @click.self="filterOpen = false">
            <div class="filter-panel">
                <div class="filter-head">
                    <h2>{{ $t('絞りこみ', 'Filter') }}</h2>
                    <div class="flex gap-2">
                        <button class="filter-button" @click="resetFilters">{{ $t('リセット', 'Reset') }}</button>
                        <button class="filter-button active" @click="filterOpen = false">{{ $t('閉じる', 'Close') }}</button>
                    </div>
                </div>

                <section>
                    <h3>{{ $t('場所', 'Place') }}</h3>
                    <div class="flex flex-wrap gap-2">
                        <button
                            v-for="option in regionOptions"
                            :key="option.value"
                            class="filter-button"
                            :class="{ active: regionFilter === option.value }"
                            @click="regionFilter = option.value"
                        >
                            {{ $t(option.label, option.labelEn) }}
                        </button>
                    </div>
                </section>

                <section>
                    <h3>{{ $t('作られた日', 'Created') }}</h3>
                    <div class="flex flex-wrap gap-2">
                        <button
                            v-for="option in dateOptions"
                            :key="option.value"
                            class="filter-button"
                            :class="{ active: dateFilter === option.value }"
                            @click="dateFilter = option.value"
                        >
                            {{ $t(option.label, option.labelEn) }}
                        </button>
                    </div>
                    <div v-if="dateFilter === 'custom'" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <input v-model="dateFrom" type="date" class="date-input">
                        <span>〜</span>
                        <input v-model="dateTo" type="date" class="date-input">
                    </div>
                    <p class="mt-2 text-xs text-slate-500">{{ $t('作られた日が分からないカードは、作られた日で絞ったときは出ません', 'Cards with no creation date are hidden when filtering by date') }}</p>
                </section>
            </div>
        </div>

        <!-- ■カードの拡大表示（宝箱の獲得カード一覧と同じ操作感） -->
        <transition name="focus-fade">
        <div v-if="focusedCard" class="focus-modal" @click.self="closeFocus">
            <button class="focus-close" :aria-label="$t('閉じる', 'Close')" @click="closeFocus">✕</button>
            <button class="focus-nav focus-prev" :aria-label="$t('前のカード', 'Previous card')" :disabled="focusedIndex === 0" @click.stop="moveFocus(-1)">◀</button>

            <div
                :key="focusedCard.cardId"
                class="focus-card"
                :style="{ '--s': focusScale, '--ox': focusOrigin.x + 'px', '--oy': focusOrigin.y + 'px', '--os': focusOrigin.s }"
            >
                <CollectionCard :card="displayCard(focusedCard)" />
            </div>

            <!-- 自分が撮ったカードだけ、写真を整えられる（同じカードを持つ全員の写真が変わる） -->
            <div v-if="canEditPhoto(focusedCard)" class="focus-photo" @click.stop>
                <button type="button" class="focus-photo-btn" @click="photoEditing = true">
                    📷 {{ $t('しゃしんを ととのえる', 'Adjust the photo') }}
                </button>
            </div>
            <PhotoAdjustModal
                v-if="photoEditing && canEditPhoto(focusedCard)"
                :key="focusedCard.cardId"
                :src="photoSrcFor(focusedCard)"
                @change="pendingEdit = $event"
                @close="closePhotoEdit"
            >
                <template #note>
                    <p class="text-xs text-rose-600 mb-2">{{ $t('ほかの人が持っているカードにも、同じ写真が出ます', 'Everyone who has this card will see the new photo.') }}</p>
                </template>
                <template #footer>
                    <p v-if="photoSaving" class="text-xs text-emerald-700 text-center mt-3">{{ $t('ほぞん中…', 'Saving…') }}</p>
                    <p v-else-if="photoMessage" class="text-xs text-emerald-700 text-center mt-3">{{ photoMessage }}</p>
                    <div class="mt-4 flex gap-2">
                        <button type="button" class="flex-1 bg-white border border-emerald-300 text-emerald-700 font-bold py-2.5 rounded-xl" @click="closePhotoEdit">{{ $t('やめる', 'Cancel') }}</button>
                        <button
                            type="button"
                            class="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl"
                            :disabled="!pendingEdit || photoSaving"
                            @click="saveEditedPhoto(focusedCard, pendingEdit)"
                        >{{ $t('保存する', 'Save') }}</button>
                    </div>
                </template>
            </PhotoAdjustModal>

            <button class="focus-nav focus-next" :aria-label="$t('次のカード', 'Next card')" :disabled="focusedIndex === filteredCards.length - 1" @click.stop="moveFocus(1)">▶</button>
            <p class="focus-count">
                {{ focusedIndex + 1 }} / {{ filteredCards.length }}
                <span class="focus-owned">
                    <template v-if="isMine(focusedCard)">&emsp;📷 {{ $t('じぶんがとった', 'Caught by me') }}</template>
                    <template v-if="focusedCard.collectionCount">&emsp;{{ $t('もっている', 'Owned') }} ×{{ focusedCard.collectionCount }}</template>
                    <template v-if="focusedCard.placedCount">&emsp;{{ $t('使用中', 'In use') }} ×{{ focusedCard.placedCount }}</template>
                </span>
            </p>
        </div>
        </transition>
    </div>
</template>

<script>
import CollectionCard from "@/views/CaveAdventure/CollectionCard.vue";
import LangSwitch from "@/components/LangSwitch.vue";
import PhotoAdjustModal from "@/components/PhotoAdjustModal.vue";
import { getSession } from "@/utils/session.js";
import { REGION_TILES } from "@/utils/creatureCardMapping.js";
import { t } from "@/utils/lang.js";
import { compressCardImage } from "@/utils/creatureCard.js";
import {
    MIN_CARDS_FOR_DOMINATION,
    toDisplayCard,
    cardRegions,
    TERRAIN_LABELS,
    getCurrentUser,
    fetchCardLibraryList,
    fetchCardImage,
    fetchUserAvatar,
    fetchMyCardInstances,
    saveCardImage
} from "@/utils/cards.js";

// ■レア度の並び（A が いちばんレア）
const RARITY_RANK = { A: 0, B: 1, C: 2, D: 3 };

// ■写真の読み込み順：いちばん上の段（先頭の6枚）は先に読む。ほかは少しずつ（同時に読むのは3枚まで）
const URGENT_PHOTO_COUNT = 6;
const PHOTO_CONCURRENCY = 3;
const urgentPhotoQueue = [];
const backgroundPhotoQueue = [];
const queuedPhotoIds = new Set();
let activePhotoLoads = 0;

// 今開いている図鑑（写真を書き込む先）。図鑑を開くたびに入れ替える
let photoView = null;

// 図鑑を開いたときに、前の表示の写真キューを空にする（残ったままだと、新しい表示に写真が届かない）
function startPhotoQueue(vm) {
    photoView = vm;
    urgentPhotoQueue.length = 0;
    backgroundPhotoQueue.length = 0;
    queuedPhotoIds.clear();
}

function stopPhotoQueue(vm) {
    if (photoView === vm) photoView = null;
}

function pumpPhotoQueue() {
    while (activePhotoLoads < PHOTO_CONCURRENCY) {
        const cardId = urgentPhotoQueue.shift() || backgroundPhotoQueue.shift();
        if (!cardId) return;
        activePhotoLoads++;
        fetchCardImage(cardId)
            .then(image => {
                // 書き込むのは、いま開いている図鑑（前の表示には書かない）
                if (photoView) photoView.imageByCardId = { ...photoView.imageByCardId, [cardId]: image };
            })
            .catch(error => {
                console.error("カードの画像の読み込みに失敗しました:", error);
                // 次に表示したとき、もう一度読めるように覚えない
                queuedPhotoIds.delete(cardId);
            })
            .finally(() => {
                activePhotoLoads--;
                pumpPhotoQueue();
            });
    }
}

function queuePhotos(vm, cards, urgent) {
    cards.forEach(card => {
        if (card.image || vm.imageByCardId[card.cardId] !== undefined || queuedPhotoIds.has(card.cardId)) return;
        queuedPhotoIds.add(card.cardId);
        (urgent ? urgentPhotoQueue : backgroundPhotoQueue).push(card.cardId);
    });
    pumpPhotoQueue();
}

export default {
    name: "CardLibrary",

    components: { CollectionCard, LangSwitch, PhotoAdjustModal },

    data() {
        return {
            loading: true,
            gridWidth: 0,
            filterOpen: false,
            page: 1,
            pageSize: 24, // 3列・4列・6列・8列のどれで並べても、段がそろう数（3と4の公倍数）
            sortKey: "created", // created（新しい順）／obtained（取得順）／rarity（レア度順）
            sortOptions: [
                { value: "created", label: "新しい順", labelEn: "Newest" },
                { value: "obtained", label: "取得順", labelEn: "Order caught" },
                { value: "rarity", label: "レア度順", labelEn: "Rarity" }
            ],
            imageByCardId: {}, // 読んだカードの画像（一覧では読まず、表示するページの分だけ読む）
            avatarByUid: {}, // 作った人のアバター（SVG）
            dateFilter: "all",
            dateFrom: "",
            dateTo: "",
            dateOptions: [
                { value: "all", label: "すべて", labelEn: "All" },
                { value: "today", label: "今日", labelEn: "Today" },
                { value: "week", label: "1週間以内", labelEn: "Within 1 week" },
                { value: "month", label: "1か月以内", labelEn: "Within 1 month" },
                { value: "custom", label: "期間を指定", labelEn: "Custom range" }
            ],
            loadError: "",
            library: [],
            instances: [],
            tab: "all", // all（ぜんぶ）／mine（じぶんがとった）／others（ほかの人がとった）
            tabOptions: [
                { value: "all", label: "ぜんぶ", labelEn: "All" },
                { value: "mine", label: "📷 じぶんがとった", labelEn: "📷 Caught by me" },
                { value: "others", label: "👥 ほかの人がとった", labelEn: "👥 Caught by others" }
            ],
            ownedFilter: "owned", // 最初は「もっている」カードだけ表示する（「すべて」は、タブの下の「持っているか」で選ぶ）
            regionFilter: "all",
            ownedOptions: [
                { value: "all", label: "すべて", labelEn: "All" },
                { value: "owned", label: "もっている", labelEn: "Owned" },
                { value: "placed", label: "使用中", labelEn: "In use" }
            ],
            // 地域の絞り込みは「北海道」「東北」のように短い名前で出す
            regionOptions: [
                { value: "all", label: "すべての場所", labelEn: "All places" },
                // いまのゲームで使う地方（関東・北海道・近畿）だけを選べるようにする（データは9地方のまま）
                ...REGION_TILES.filter(tile => ["kanto", "hokkaido", "kinki"].includes(tile.key)).map(tile => ({ value: tile.key, label: tile.label, labelEn: tile.labelEn }))
            ],
            playerName: "",
            myUid: "",
            focusedIndex: null,
            focusScale: 2,
            focusOrigin: { x: 0, y: 0, s: 1 },
            photoEditing: false, // 自分が撮ったカードの「写真を整える」を開いているか
            photoSaving: false,
            photoMessage: "",
            pendingEdit: null, // 編集中の位置・拡大（保存ボタンを押すまで、写真には反映しない）
            minCards: MIN_CARDS_FOR_DOMINATION,
            terrainLabels: TERRAIN_LABELS
        };
    },

    watch: {
        // 絞りこみ・並べ方が変わったら、1ページ目に戻す
        filterKey() {
            this.page = 1;
        },
        // ページや見ているカードが変わったら、そこに出るカードの画像と作った人のアバターを読む
        pagedCards() {
            this.loadVisibleExtras();
        },
        focusedCard() {
            this.loadVisibleExtras();
            // 別のカードに移ったら、写真の編集は閉じる
            this.photoEditing = false;
            this.photoMessage = "";
            this.pendingEdit = null;
        },
    },
    created() {
        window.addEventListener("resize", this.measureGrid);
    },
    updated() {
        this.measureGrid();
    },
    beforeUnmount() {
        stopPhotoQueue(this);
        window.removeEventListener("resize", this.measureGrid);
    },
    computed: {
        // スマホ幅（グリッドが480px未満）のときは、1行に3枚を横幅いっぱいに均等に並べる
        threeUp() {
            return this.gridWidth > 0 && this.gridWidth < 480;
        },
        // カードの元の幅は150px。3列の幅に合わせて縮める
        cardScale() {
            return (this.gridWidth - 16) / 3 / 150;
        },
        itemStyle() {
            return this.threeUp ? { "--card-scale": this.cardScale } : {};
        },
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

        // 自分が最初に手に入れた時刻（カードごと）。取得順の並べ方に使う
        firstObtainedMs() {
            const map = {};
            this.instances.forEach(instance => {
                // まだ保存中で時刻が無いものは、いま手に入れたものとして扱う
                const ms = instance.obtainedAt && instance.obtainedAt.toMillis ? instance.obtainedAt.toMillis() : Date.now();
                if (map[instance.cardId] === undefined || ms < map[instance.cardId]) map[instance.cardId] = ms;
            });
            return map;
        },

        // 並べ方に従って並べる。作られた日が無いカードは、新しい順のとき いちばん下
        filteredCards() {
            const createdTime = card => (card.createdAt && card.createdAt.toMillis ? card.createdAt.toMillis() : 0);
            const newestFirst = (a, b) => createdTime(b) - createdTime(a);
            const sorters = {
                // 新しく作られた順
                created: newestFirst,
                // 自分が手に入れた順（古く手に入れたものから）。持っていないカードは、そのあと新しい順
                obtained: (a, b) => {
                    const oa = this.firstObtainedMs[a.cardId];
                    const ob = this.firstObtainedMs[b.cardId];
                    if (oa === undefined && ob === undefined) return newestFirst(a, b);
                    if (oa === undefined) return 1;
                    if (ob === undefined) return -1;
                    return oa - ob;
                },
                // レア度の高い順（同じレア度は新しい順）
                rarity: (a, b) => (RARITY_RANK[a.rarity] ?? 9) - (RARITY_RANK[b.rarity] ?? 9) || newestFirst(a, b)
            };
            return this.cards
                .filter(card =>
                    this.matchesTab(card)
                    && (this.tab !== "all" || this.matchesOwnedFilter(card))
                    && (this.regionFilter === "all" || cardRegions(card).includes(this.regionFilter))
                    && this.matchesDate(card)
                )
                .sort(sorters[this.sortKey] || newestFirst);
        },

        filterKey() {
            return [this.tab, this.ownedFilter, this.regionFilter, this.dateFilter, this.sortKey].join("|");
        },
        pageCount() {
            return Math.max(1, Math.ceil(this.filteredCards.length / this.pageSize));
        },
        pageStart() {
            return (this.page - 1) * this.pageSize;
        },
        pagedCards() {
            return this.filteredCards.slice(this.pageStart, this.pageStart + this.pageSize);
        },

        // 絞りこみで、初期値（もっているカードだけ）から変えた数
        activeFilterCount() {
            return (this.regionFilter !== "all" ? 1 : 0)
                + (this.dateFilter !== "all" ? 1 : 0);
        },

        // 画面の下に出す、いま選んでいる絞りこみの内容
        filterSummary() {
            const parts = [];
            if (this.tab === "all") {
                const owned = this.ownedOptions.find(o => o.value === this.ownedFilter);
                if (owned) parts.push(t(owned.label, owned.labelEn));
            }
            const region = this.regionOptions.find(o => o.value === this.regionFilter);
            if (region && region.value !== "all") parts.push(t(region.label, region.labelEn));
            const date = this.dateOptions.find(o => o.value === this.dateFilter);
            if (date && date.value !== "all") parts.push(t(date.label, date.labelEn));
            return parts.join(" ・ ");
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
        goPage(n) {
            this.page = n;
            window.scrollTo({ top: 0, behavior: "smooth" });
        },

        measureGrid() {
            const el = this.$refs.grid;
            if (el && el.clientWidth !== this.gridWidth) {
                this.gridWidth = el.clientWidth;
            }
        },

        // ■宝箱と同じ表示用データに変換（所持カードにはチームカラーと自分の名前を付ける）
        displayCard(card) {
            // 持っていないカードでも、スキャンで登録されたものは「発見者」を出す
            let instance = null;
            if (card.owned) {
                instance = { team: getSession("myTeam"), ownerName: this.playerName };
            } else if (card.ownerName) {
                instance = { team: "", ownerName: card.ownerName };
            }
            // 画像は一覧では読んでいないので、読み終わったものだけ入れる（まだのあいだは空の枠）
            return toDisplayCard({ ...card, image: card.image || this.imageByCardId[card.cardId] || "" }, instance);
        },

        // いま画面に出ているカード（ページの分と、拡大して見ているカード）の画像と、作った人のアバターを読む
        loadVisibleExtras() {
            const page = this.pagedCards;
            // 写真は、いちばん上の段を先に読む。拡大して見ているカードも先に読む。残りは少しずつ
            queuePhotos(this, page.slice(0, URGENT_PHOTO_COUNT), true);
            if (this.focusedCard) queuePhotos(this, [this.focusedCard], true);
            queuePhotos(this, page.slice(URGENT_PHOTO_COUNT), false);
            // 次のページの写真は、今のページの後で先読みする
            queuePhotos(this, this.filteredCards.slice(this.pageStart + this.pageSize, this.pageStart + this.pageSize * 2), false);

            const cards = [...page, this.focusedCard].filter(Boolean);
            cards.forEach(card => {
                if (card.ownerUid && this.avatarByUid[card.ownerUid] === undefined) {
                    fetchUserAvatar(card.ownerUid)
                        .then(avatar => {
                            // 作った人のアバターが無いときは、空（何も出さない）として覚える
                            const svg = avatar ? this.$buildAvatar(avatar) : "";
                            this.avatarByUid = { ...this.avatarByUid, [card.ownerUid]: svg };
                        })
                        .catch(error => console.error("作った人のアバターの読み込みに失敗しました:", error));
                }
            });
        },

        // 作った人のアバター（スキャンでとったカードで、読み終わったものだけ）
        ownerAvatarSvg(card) {
            return card.ownerUid ? this.avatarByUid[card.ownerUid] || "" : "";
        },

        // 自分がスキャンでとって登録したカードか
        isMine(card) {
            return Boolean(card.ownerUid) && card.ownerUid === this.myUid;
        },

        // 写真を整えられるのは、自分が撮ったスキャンのカードだけ
        canEditPhoto(card) {
            return Boolean(card) && card.source === "scan" && this.isMine(card);
        },

        // 編集をやめて閉じる（保存していない変更は捨てる）
        closePhotoEdit() {
            this.photoEditing = false;
            this.photoMessage = "";
            this.pendingEdit = null;
        },

        photoSrcFor(card) {
            return (card && (card.image || this.imageByCardId[card.cardId])) || "";
        },

        // 編集した範囲で写真を作り直し、cardImages/{id} に保存する
        // 注意：同じカードを持つ全員の写真が変わる（共有の写真を上書きする）
        async saveEditedPhoto(card, edit) {
            const src = this.photoSrcFor(card);
            if (!src || this.photoSaving) return;

            this.photoSaving = true;
            this.photoMessage = "";
            try {
                const blob = await (await fetch(src)).blob();
                const image = await compressCardImage(blob, edit);
                if (!image.withinLimit) {
                    this.photoMessage = t("写真が大きすぎます。バーで近づけてね", "The photo is too large. Zoom in with the slider.");
                    return;
                }
                await saveCardImage(card.cardId, image.dataUrl);
                // 表示に使う画像も新しいものにする（カード本体に古い画像が残っていた場合も含む）
                card.image = image.dataUrl;
                this.imageByCardId = { ...this.imageByCardId, [card.cardId]: image.dataUrl };
                this.pendingEdit = null;
                this.photoMessage = t("写真を保存しました", "Photo saved.");
            } catch (error) {
                console.error("写真の保存に失敗しました:", error);
                this.photoMessage = t("保存できませんでした。もう一度ためしてね", "Could not save. Please try again.");
            } finally {
                this.photoSaving = false;
            }
        },

        // 作られた日で絞る（作られた日が無いカードは、日付で絞ったときは出ない）
        matchesDate(card) {
            if (this.dateFilter === "all") return true;
            const created = card.createdAt && card.createdAt.toDate ? card.createdAt.toDate() : null;
            if (!created) return false;
            if (this.dateFilter === "today") {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                return created >= startOfToday;
            }
            if (this.dateFilter === "week") return Date.now() - created.getTime() <= 7 * 86400000;
            if (this.dateFilter === "month") return Date.now() - created.getTime() <= 30 * 86400000;
            const from = this.dateFrom ? new Date(this.dateFrom + "T00:00:00") : null;
            const to = this.dateTo ? new Date(this.dateTo + "T23:59:59") : null;
            if (from && created < from) return false;
            if (to && created > to) return false;
            return true;
        },

        resetFilters() {
            this.regionFilter = "all";
            this.dateFilter = "all";
            this.dateFrom = "";
            this.dateTo = "";
        },

        matchesOwnedFilter(card) {
            if (this.ownedFilter === "all") return true;
            // 使用中：盤面（陣取り）に置いているカードがあるもの
            if (this.ownedFilter === "placed") return card.placedCount > 0;
            return (this.ownedFilter === "owned") === card.owned;
        },

        // タブ：じぶんがとった／ほかの人がとった（スキャンで登録されたカードのうち、持ち主が自分か他の人か）
        matchesTab(card) {
            if (this.tab === "mine") return this.isMine(card);
            if (this.tab === "others") return card.source === "scan" && !this.isMine(card);
            return true;
        },

        // ■画面に収まる最大2.2倍まで拡大して表示
        focusCard(index, event) {
            const maxByHeight = (window.innerHeight * 0.78) / 220;
            const maxByWidth = (window.innerWidth * 0.86) / 150;
            this.focusScale = Math.max(1, Math.min(2.2, maxByHeight, maxByWidth));
            // タップしたカードの場所と大きさを覚えて、そこから真ん中へ動かす
            const rect = event && event.currentTarget ? event.currentTarget.getBoundingClientRect() : null;
            if (rect) {
                this.focusOrigin = {
                    x: rect.left + rect.width / 2 - window.innerWidth / 2,
                    y: rect.top + rect.height / 2 - window.innerHeight / 2,
                    s: rect.width / (150 * this.focusScale),
                };
            }
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
        startPhotoQueue(this);
        try {
            // 自分の情報を先に取り、カード一覧と所持カードを同時に読む
            const user = await getCurrentUser();
            const [library, instances] = await Promise.all([
                fetchCardLibraryList(),
                user ? fetchMyCardInstances(user.uid) : []
            ]);
            this.library = library;
            this.instances = instances;
            this.playerName = (user && user.name) || "";
            this.myUid = (user && user.uid) || "";
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
/* スマホ幅：4つの箱を1行に並べるため、文字を小さくする */
@media (max-width:480px){
    .summary-box{padding:8px 4px}
    .summary-label{font-size:10px}
    .summary-value{font-size:18px}
    .summary-value small{font-size:10px}
}

.filter-button{
    border:1px solid #475569;border-radius:999px;
    padding:4px 14px;font-size:13px;font-weight:bold;color:#cbd5e1;
}
.filter-button.active{background:#22d3ee;border-color:#22d3ee;color:#0f172a}

.filter-sep{
    border:0;border-top:1px solid #334155;margin:12px 0;
}
.library-grid{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
    gap:30px 12px;justify-items:center;
    /* 1段目の「じぶん」「もっている」のバッジが、固定バーの下に隠れないように、上に余白をとる */
    padding-top:20px;
}
/* 読み込み中：カードが順に跳ねる */
.loading-box{display:flex;flex-direction:column;align-items:center;gap:16px;padding:80px 0;color:#94a3b8}
.loading-cards{display:flex;gap:8px}
.loading-cards span{
    width:26px;height:36px;border-radius:6px;
    background:linear-gradient(160deg,#67e8f9,#0ea5e9);
    animation:card-bounce 1s ease-in-out infinite;
}
.loading-cards span:nth-child(2){animation-delay:.15s}
.loading-cards span:nth-child(3){animation-delay:.3s}
@keyframes card-bounce{
    0%,100%{transform:translateY(0) rotate(-6deg);opacity:.5}
    50%{transform:translateY(-12px) rotate(4deg);opacity:1}
}

/* スマホ幅：タブは1行に収める */
@media (max-width:480px){
    .tab-row{flex-wrap:nowrap;gap:6px}
    .tab-row .filter-button{padding:6px 9px;font-size:12px;white-space:nowrap}
}

/* 絞りこみの行は、スクロールしても上に残す。
   背景は画面の端（ページの左右の余白＝px-4 の分）まで広げ、スクロールするカードが横からはみ出さないようにする */
.sticky-bar{
    position:sticky;top:0;z-index:30;background:#10151c;padding:8px 16px 6px;margin:0 -16px;
}

/* ページ送り */
.pager{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:20px 0 8px}
.pager .filter-button:disabled{opacity:.3;cursor:default}

/* 拡大表示：ふわっと開いて、ゆっくり閉じる */
.focus-fade-enter-active,.focus-fade-leave-active{transition:opacity .4s ease}
.focus-fade-enter-from,.focus-fade-leave-to{opacity:0}
.focus-fade-enter-active .focus-card,.focus-fade-leave-active .focus-card{
    transition:transform .6s cubic-bezier(.22,.8,.3,1),opacity .5s ease;
}
.focus-fade-enter-from .focus-card,.focus-fade-leave-to .focus-card{
    transform:translate(var(--ox,0),var(--oy,0)) scale(var(--os,.5));opacity:0;
}

/* 絞りこみのモーダル（下から出る） */
.filter-modal{
    position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.6);
    display:flex;align-items:flex-end;justify-content:center;
}
.filter-panel{
    width:100%;max-width:480px;max-height:80vh;overflow-y:auto;
    background:#1e293b;border-radius:16px 16px 0 0;padding:16px;text-align:left;
}
.filter-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.filter-head h2{font-size:16px;font-weight:bold;color:#e2e8f0}
.filter-panel section{margin-top:14px}
.filter-panel h3{font-size:12px;font-weight:bold;color:#94a3b8;margin-bottom:6px}
.date-input{
    background:#0f172a;color:#e2e8f0;border:1px solid #475569;border-radius:8px;padding:4px 8px;
}

/* スマホ幅：1行に3枚を横幅いっぱいに均等に並べる（カードは --card-scale で縮める） */
.library-grid.three-up{
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:30px 8px;justify-items:stretch;
}
.library-item.compact{
    width:auto;height:auto;aspect-ratio:150 / 220;
}
.library-item.compact > :first-child{
    zoom:var(--card-scale,1);
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
    position:absolute;right:-2px;top:-16px;z-index:20;
    border-radius:999px;background:#22d3ee;color:#0f172a;
    padding:0 8px;font-size:12px;line-height:18px;font-weight:900;white-space:nowrap;
    box-shadow:0 2px 6px rgba(0,0,0,.5);
}
.count-badge.placed{background:#fbbf24}
/* 動物のカード（図鑑の中だけ）：レア度の文字を大きくして、読みやすくする */
.library-item :deep(.mini-card:not(.plant) .rare strong){font-size:20px}
.library-item :deep(.mini-card:not(.plant) .rare span){font-size:11px}

/* 作った人のアバター（カードの左下に、丸く小さく出す） */
.owner-avatar{
    position:absolute;left:-6px;bottom:-8px;z-index:20;
    width:32px;height:32px;border-radius:999px;overflow:hidden;
    background:#0b1220;border:2px solid #22d3ee;
}
.owner-avatar :deep(svg){width:100%;height:100%;display:block}
.mine-badge{
    position:absolute;left:-2px;top:-16px;z-index:20;
    border-radius:999px;background:#f472b6;color:#0f172a;
    padding:0 7px;font-size:11px;line-height:18px;font-weight:900;
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
}
.focus-photo{
    position:absolute;bottom:calc(64px + env(safe-area-inset-bottom));left:0;right:0;
    display:flex;justify-content:center;padding:0 12px;
}
.focus-photo-btn{
    padding:8px 16px;border-radius:999px;cursor:pointer;
    background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:14px;
}
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
    .focus-fade-enter-active,.focus-fade-leave-active,
    .focus-fade-enter-active .focus-card,.focus-fade-leave-active .focus-card{transition:none !important}
}
</style>
