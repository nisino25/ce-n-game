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
                    <li>平塚市のゲームは、<b>神奈川</b>のカードだけ手札に出る</li>
                    <li>釧路市のゲームは、<b>北海道</b>のカードだけ手札に出る</li>
                    <li>スキャンで作ったカード（地域なし）は、どの街の手札にも出ない</li>
                    <li>街が決まらないとき（テストなど）は、絞らずに全部出る</li>
                </ul>
            </section>

            <div v-if="loading" class="py-10 text-center text-sm font-bold text-slate-400">よみこみ中...</div>
            <div v-else-if="loadError" class="py-10 text-center text-sm font-bold text-red-500">カードを よみこめませんでした</div>

            <template v-else>
                <section v-for="group in groups" :key="group.key" class="mb-4 rounded-xl bg-white p-3 shadow-sm">
                    <h2 class="text-sm font-black">
                        {{ group.title }}
                        <span class="ml-1 text-xs font-bold text-slate-500">{{ group.cards.length }}まい</span>
                    </h2>
                    <p class="mb-2 text-xs font-bold text-slate-500">{{ group.note }}</p>
                    <ul class="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                        <li v-for="card in group.cards" :key="card.cardId" class="rounded-lg bg-slate-100 px-2 py-1">
                            {{ card.name }}
                            <span class="text-slate-500">（Lv{{ card.level }}・{{ card.rarity }}）</span>
                        </li>
                    </ul>
                    <p v-if="!group.cards.length" class="text-xs text-slate-400">カードは まだ ありません</p>
                </section>
            </template>

            <section class="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <h2 class="mb-2 text-sm font-black">まだ 決まっていないこと</h2>
                <ul class="list-disc space-y-1 pl-5 text-xs leading-relaxed">
                    <li>スキャンのカード（地域なし）を、どちらかの街に出すか</li>
                    <li>AIのチームの手札も、街の地域で絞るか</li>
                    <li>手札の持ち主を、チーム全員にするか、自分だけにするか（図鑑は「自分の持っているカード」）</li>
                    <li>盤面に置いたカードを、手札から外すか（図鑑の「もっている」には含まれる）</li>
                </ul>
            </section>
        </div>
    </div>
</template>

<script>
import { fetchCardLibrary } from '@/utils/cards.js';

// ■街ごとに、手札に出る地域（DominationGame.vue の CITY_REGION と同じ）
const GROUPS = [
    { key: 'kanagawa', region: 'kanagawa', title: '神奈川（平塚市のゲーム）', note: '平塚市のゲームで、手札に出る' },
    { key: 'hokkaido', region: 'hokkaido', title: '北海道（釧路市のゲーム）', note: '釧路市のゲームで、手札に出る' },
    { key: 'kyoto', region: 'kyoto', title: '京都', note: '街は まだ ない。洞窟の宝箱から出るカードだけ' },
    { key: 'scan', region: '', title: '地域なし（スキャンで作ったカード）', note: 'どの街の手札にも出ない（まだ決まっていない）' },
];

export default {
    name: 'RegionCardSpec',
    data() {
        return {
            loading: true,
            loadError: false,
            library: [],
        };
    },
    computed: {
        groups() {
            return GROUPS.map(group => ({
                ...group,
                cards: this.library.filter(card => (card.region || '') === group.region),
            }));
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
