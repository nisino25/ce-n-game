<template>
    <!-- ■陣取りゲームで、カードを大きく見せる画面（タイルをタップ／手札をタップ）。
         カードの見た目は、カードライブラリ・宝箱と同じ共通のカード（CollectionCard）を使う -->
    <div class="focus-overlay" @click.self="$emit('close')">
        <button class="focus-close" aria-label="閉じる" @click="$emit('close')">✕</button>

        <div class="focus-card" :style="{ '--s': scale }">
            <CollectionCard v-if="display" :card="display" />
            <CreatureCard v-else :creature="card" />
        </div>

        <!-- ゲームのルールに関わる情報（レベル・食べもの）は、カードの下に文字で出す -->
        <div class="focus-info">
            <span class="focus-info-tag">Lv{{ card.tier }}</span>
            <span class="focus-info-label">食べもの</span>
            <template v-if="card.food && card.food.length">
                <span v-for="(food, index) in card.food" :key="index" class="focus-info-food">{{ food }}</span>
            </template>
            <span v-else class="focus-info-none">なし</span>
        </div>

        <button v-if="selectable" class="focus-select" @click="$emit('select')">選択する</button>
    </div>
</template>

<script>
import CollectionCard from "@/views/CaveAdventure/CollectionCard.vue";
import CreatureCard from "./CreatureCard.vue";

export default {
    name: "GameCardFocus",
    components: { CollectionCard, CreatureCard },
    props: {
        card: { type: Object, required: true }, // 陣取りゲームのカード（label, tier, food ...）
        display: { type: Object, default: null }, // 共通カード用の表示データ（toDisplayCard）。無ければ旧表示
        selectable: { type: Boolean, default: false } // 「選択する」ボタンを出すか（手札のとき）
    },
    emits: ["close", "select"],
    computed: {
        // 画面に収まる大きさ（最大2倍）。カードの基本の大きさは 150×220
        scale() {
            const byHeight = (window.innerHeight * 0.55) / 220;
            const byWidth = (window.innerWidth * 0.8) / 150;
            return Math.max(1, Math.min(2, byHeight, byWidth));
        }
    }
};
</script>

<style scoped>
.focus-overlay{
    position:fixed;inset:0;z-index:70;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
    background:rgba(6,10,16,.88);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
    padding:16px;
}
.focus-close{
    position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;
    width:40px;height:40px;border-radius:50%;
    background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);
    color:#fff;font-size:16px;
}
/* カードは scale で大きくする。場所をとらないよう、はみ出す分の余白を足す */
.focus-card{
    line-height:0;
    transform:scale(var(--s,2));
    margin:calc(110px * (var(--s,2) - 1)) 0;
    filter:drop-shadow(0 18px 30px rgba(0,0,0,.6));
    animation:focus-pop .25s cubic-bezier(.2,1.2,.4,1);
}
@keyframes focus-pop{from{transform:scale(calc(var(--s,2) * .7));opacity:0}to{transform:scale(var(--s,2));opacity:1}}
.focus-info{
    display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;
    max-width:340px;color:#e2e8f0;font-size:13px;font-weight:700;
}
.focus-info-tag{border-radius:6px;background:#0e7490;padding:1px 8px;font-weight:900}
.focus-info-label{color:#94a3b8;font-size:12px}
.focus-info-food{border-radius:999px;background:rgba(255,255,255,.14);padding:2px 10px}
.focus-info-none{color:#94a3b8}
.focus-select{
    min-width:180px;border-radius:14px;background:#22d3ee;padding:12px 24px;
    font-size:17px;font-weight:900;color:#0f172a;
}
.focus-select:active{transform:scale(.97)}
</style>
