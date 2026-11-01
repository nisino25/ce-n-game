<template>
    <!-- ■陣取りゲームの「地域のカード」の仕様（どの街で、どのカードが手札に出るか）。モニタールームの仮リンクから -->
    <div class="min-h-screen bg-slate-50 p-4 text-slate-700">
        <div class="mx-auto max-w-2xl">
            <button class="mb-3 text-sm font-black text-slate-500" @click="$router.push({ name: 'Home' })">← モニタールームにもどる</button>

            <h1 class="text-lg font-black">陣取りゲームの、地域のカード</h1>
            <p class="mb-4 text-xs font-bold text-slate-500">公開中のカードから、街ごとに手札に出るカードを表示しています</p>

            <section class="mb-4 rounded-xl bg-white p-3 shadow-sm">
                <h2 class="mb-2 text-sm font-black">ルール</h2>
                <ul class="list-disc space-y-1 pl-5 text-xs leading-relaxed">
                    <li>手札は、<b>自分が持っている</b>カードのうち、まだ盤面に置いていないもの（図鑑の「もっている」から、置いたものを除く）</li>
                    <li>平塚市のゲームは、<b>関東エリア</b>のカードだけ手札に出る</li>
                    <li>釧路市のゲームは、<b>北海道エリア</b>のカードだけ手札に出る</li>
                    <li>スキャンで作ったカードは、<b>生息する地域（複数）</b>の街の手札に、それぞれ出る</li>
                    <li>街が決まらないとき（テストなど）は、絞らずに全部出る</li>
                </ul>
            </section>

            <div v-if="loading" class="py-10 text-center text-sm font-bold text-slate-400">よみこみ中...</div>
            <div v-else-if="loadError" class="py-10 text-center text-sm font-bold text-red-500">カードを よみこめませんでした</div>

            <template v-else>
                <!-- タブ：見たい地域を選ぶ -->
                <div class="mb-3 flex flex-wrap gap-2" role="tablist">
                    <button
                        v-for="group in groups"
                        :key="group.key"
                        type="button"
                        role="tab"
                        :aria-selected="group.key === selectedKey"
                        class="rounded-full border px-3 py-1.5 text-xs font-black transition"
                        :class="group.key === selectedKey
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'"
                        @click="selectedKey = group.key"
                    >
                        {{ group.tabLabel }}
                        <span class="ml-1 opacity-80">{{ group.cards.length }}</span>
                    </button>
                </div>

                <section v-if="currentGroup" class="mb-4 rounded-xl bg-white p-3 shadow-sm">
                    <h2 class="text-sm font-black">
                        {{ currentGroup.title }}
                        <span class="ml-1 text-xs font-bold text-slate-500">{{ currentGroup.cards.length }}まい</span>
                    </h2>
                    <p class="mb-2 text-xs font-bold text-slate-500">{{ currentGroup.note }}</p>

                    <ul class="space-y-1">
                        <li
                            v-for="card in currentGroup.cards"
                            :key="card.cardId"
                            class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs"
                        >
                            <span class="font-black">{{ card.name }}</span>
                            <span class="text-slate-500">Lv{{ card.level }}・{{ card.rarity }}</span>
                            <span class="ml-auto flex flex-wrap justify-end gap-1">
                                <!-- この カードが属する地域（複数ある場合は、ぜんぶバッジで出す） -->
                                <span
                                    v-for="region in regionsOf(card)"
                                    :key="region"
                                    class="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                                    :class="region === currentGroup.region ? 'ring-2 ring-slate-800' : ''"
                                    :style="{ background: regionColors[region] || '#64748b' }"
                                >{{ regionLabels[region] || region }}</span>
                            </span>
                        </li>
                    </ul>
                    <p v-if="!currentGroup.cards.length" class="text-xs text-slate-400">カードは まだ ありません</p>
                </section>
            </template>

            <section class="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <h2 class="mb-2 text-sm font-black">まだ 決まっていないこと</h2>
                <ul class="list-disc space-y-1 pl-5 text-xs leading-relaxed">
                    <li>AIのチームの手札も、街の地域で絞るか</li>
                </ul>
            </section>
        </div>
    </div>
</template>

<script>
import { fetchCardLibrary, cardRegions, REGION_LABELS } from '@/utils/cards.js';

// ■地域ごとの色（バッジの色）
const REGION_COLORS = {
    hokkaido: '#0ea5e9',
    tohoku: '#6366f1',
    kanto: '#f43f5e',
    chubu: '#f59e0b',
    kinki: '#10b981',
    chugoku: '#8b5cf6',
    shikoku: '#14b8a6',
    kyushu: '#f97316',
    okinawa: '#06b6d4',
};

// ■ドミネーションゲームで使っている地域（バッジはこの地域だけ出す）
const GAME_REGIONS = ['kanto', 'hokkaido', 'kinki'];

// ■街ごとに、手札に出る地域（DominationGame.vue の CITY_REGION と同じ）
const GROUPS = [
    { key: 'kanto', region: 'kanto', tabLabel: '関東エリア', title: '関東エリア（平塚市のゲーム）', note: '平塚市のゲームで、手札に出る' },
    { key: 'hokkaido', region: 'hokkaido', tabLabel: '北海道エリア', title: '北海道エリア（釧路市のゲーム）', note: '釧路市のゲームで、手札に出る' },
    { key: 'kinki', region: 'kinki', tabLabel: '近畿エリア', title: '近畿エリア（京都市のゲーム）', note: '京都市の街は まだ 手札と つながっていない' },
    { key: 'scan', scan: true, tabLabel: 'スキャンで作ったカード', title: 'スキャンで作ったカード', note: '生息する地域（複数）の手札に、それぞれ出る' },
];

export default {
    name: 'RegionCardSpec',
    data() {
        return {
            loading: true,
            loadError: false,
            library: [],
            selectedKey: GROUPS[0].key,
            regionLabels: REGION_LABELS,
            regionColors: REGION_COLORS,
        };
    },
    computed: {
        groups() {
            return GROUPS.map(group => ({
                ...group,
                cards: this.library.filter(card => (group.scan
                    ? card.source === 'scan'
                    : cardRegions(card).includes(group.region))),
            }));
        },
        currentGroup() {
            return this.groups.find(group => group.key === this.selectedKey) || null;
        },
    },
    methods: {
        regionsOf(card) {
            return cardRegions(card).filter(region => GAME_REGIONS.includes(region));
        },
    },
    async mounted() {
        try {
            this.library = await fetchCardLibrary();
        } catch (error) {
            console.error('カードの読み込みに失敗しました', error);
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
};
</script>
