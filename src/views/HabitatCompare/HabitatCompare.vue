<template>
    <!-- ■試作：すみか（海・町・森）で陣取りゲームの盤面がどう変わるかの比較ページ。ゲーム本体はまだ変えていない -->
    <div class="compare-page">
        <header class="compare-header">
            <button class="compare-back" @click="$router.push({ name: 'Home' })">←</button>
            <h1>すみか くらべ（試作）</h1>
            <button class="compare-reroll" @click="seed++">🎲 つくりなおす</button>
        </header>

        <main class="compare-main">
            <p class="compare-lead">
                地図の六角形を「街の場所」にして、場所のすみかで盤面を変える案の試作です。
                いまのゲームは、どこでも同じ作り方（ランダム）です。
            </p>

            <div class="compare-columns">
                <section v-for="item in items" :key="item.key" class="compare-col">
                    <h2>
                        <span class="col-icon">{{ item.icon }}</span>
                        {{ item.label }}
                        <small>{{ item.spot }}</small>
                    </h2>

                    <div class="board" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
                        <span
                            v-for="tile in item.tiles"
                            :key="tile.id"
                            class="tile"
                            :style="{ background: areaColors[tile.area] }"
                        ></span>
                    </div>

                    <div class="ratio-bar">
                        <span
                            v-for="part in item.summary"
                            :key="part.area"
                            :style="{ width: part.percent + '%', background: areaColors[part.area] }"
                        ></span>
                    </div>
                    <ul class="legend">
                        <li v-for="part in item.summary" :key="part.area">
                            <i :style="{ background: areaColors[part.area] }"></i>
                            {{ areaLabels[part.area] }} {{ part.percent }}%
                        </li>
                    </ul>

                    <div class="creatures">
                        <div class="creatures-title">この すみかの いきもの（カードDBにある数）</div>
                        <template v-if="cardsLoaded">
                            <p v-if="!item.cards.length" class="creatures-empty">
                                この すみかの カードが まだ ありません
                            </p>
                            <template v-else>
                                <p class="creatures-count">{{ item.cards.length }}しゅるい</p>
                                <div class="chips">
                                    <span v-for="card in item.cards.slice(0, 8)" :key="card.cardId" class="chip">{{ card.name }}</span>
                                    <span v-if="item.cards.length > 8" class="chip more">ほか {{ item.cards.length - 8 }}</span>
                                </div>
                            </template>
                        </template>
                        <p v-else class="creatures-empty">よみこみ中…</p>
                    </div>
                </section>
            </div>
        </main>
    </div>
</template>

<script>
import { AREA_COLORS, AREA_LABELS, generateHabitatBoard, summarizeBoard } from "@/views/DominationGame/habitatBoard.js";
import { fetchCardLibrary } from "@/utils/cards.js";

const ITEMS = [
    { key: "sea", icon: "🌊", label: "海", spot: "例：平塚の海岸" },
    { key: "town", icon: "🏘", label: "町", spot: "例：平塚駅前" },
    { key: "forest", icon: "🌲", label: "森", spot: "例：高麗山" }
];

export default {
    name: "HabitatCompare",

    data() {
        return {
            cols: 30,
            rows: 15,
            seed: 7,
            areaColors: AREA_COLORS,
            areaLabels: AREA_LABELS,
            library: [],
            cardsLoaded: false
        };
    },

    computed: {
        items() {
            return ITEMS.map((item, index) => {
                const tiles = generateHabitatBoard(item.key, { rows: this.rows, cols: this.cols, seed: this.seed * 31 + index });
                return {
                    ...item,
                    tiles,
                    summary: summarizeBoard(tiles),
                    cards: this.library.filter(card => card.habitat === item.key)
                };
            });
        }
    },

    async mounted() {
        try {
            this.library = await fetchCardLibrary();
        } catch (error) {
            console.error("カードの読み込みに失敗しました:", error);
        } finally {
            this.cardsLoaded = true;
        }
    }
};
</script>

<style scoped>
.compare-page{min-height:100vh;background:#10151c;color:#e2e8f0;text-align:left}
.compare-header{
    position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:10px;
    padding:10px 16px;background:rgba(16,21,28,.95);border-bottom:1px solid #1e293b;
}
.compare-header h1{flex:1;margin:0;font-size:17px;font-weight:900;color:#67e8f9}
.compare-back{width:40px;height:40px;border:1px solid #475569;border-radius:50%;font-size:18px;font-weight:bold}
.compare-reroll{border:1px solid #22d3ee;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:bold;color:#a5f3fc}
.compare-reroll:active{transform:scale(.96)}

.compare-main{max-width:1200px;margin:0 auto;padding:16px}
.compare-lead{margin:0 0 16px;font-size:14px;line-height:1.7;color:#cbd5e1}
.compare-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.compare-col{min-width:0;padding:14px;border:1px solid #334155;border-radius:14px;background:#1b2330}
.compare-col h2{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin:0 0 10px;font-size:20px;font-weight:900}
.compare-col h2 small{font-size:12px;font-weight:bold;color:#94a3b8}
.col-icon{font-size:24px}

.board{display:grid;gap:1px;padding:2px;border-radius:8px;background:#0b1220}
.tile{display:block;aspect-ratio:1/1}

.ratio-bar{display:flex;height:12px;margin:10px 0 6px;overflow:hidden;border-radius:6px}
.ratio-bar span{display:block;height:100%}
.legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:0;padding:0;list-style:none;font-size:12px;color:#cbd5e1}
.legend i{display:inline-block;width:10px;height:10px;margin-right:4px;border-radius:2px;vertical-align:-1px}

.creatures{margin-top:14px;padding-top:12px;border-top:1px solid #334155}
.creatures-title{font-size:12px;font-weight:bold;color:#94a3b8}
.creatures-count{margin:4px 0 6px;font-size:18px;font-weight:900;color:#67e8f9}
.creatures-empty{margin:6px 0 0;font-size:13px;font-weight:bold;color:#fbbf24}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.chip{border-radius:999px;background:rgba(255,255,255,.08);padding:2px 10px;font-size:12px}
.chip.more{color:#94a3b8}

@media (max-width:640px){
    .compare-columns{grid-template-columns:1fr}
    .compare-header h1{font-size:15px}
}
</style>
