<template>
    <!-- ■試作：食べられたカードの「見せ方」くらべ。レベル4が生まれた盤面の一部を、いろいろな見せ方で ならべる（開発用の仮画面） -->
    <div class="ec">
        <header class="ec-header">
            <button class="ec-back" @click="$router.push({ name: 'Home' })"><span>◀</span> もどる</button>
            <h1 class="ec-heading">食べられ方 くらべ<small>EATEN COMPARE</small></h1>
        </header>

        <p class="ec-lead">
            食べられたマスが「×」だと、もとは なんだったか 分からないよね。そこで、食べられた カードの 見せ方を、いくつか ならべたよ。
            上の スライドで 盤面の 一部（レベル4が 生まれた ところ）を えらぶと、したに、すべての 見せ方で 出るよ。
        </p>

        <section ref="strip" class="ec-strip" aria-label="盤面の 一部を えらぶ">
            <button
                v-for="cluster in clusters"
                :key="cluster.key"
                class="ec-mini"
                :class="{ active: cluster.key === selected.key }"
                @click="selectedKey = cluster.key"
            >
                <span class="ec-mini-kind" :class="cluster.sample ? 'ec-kind-sample' : 'ec-kind-real'">{{ cluster.sample ? '見本' : 'ゲーム' }}</span>
                <span class="ec-mini-title">{{ cluster.title }}</span>
                <span class="ec-mini-note">{{ cluster.short }}</span>
            </button>
        </section>

        <main class="ec-main">
            <section class="ec-selected">
                <p class="ec-selected-title">{{ selected.title }}</p>
                <p class="ec-selected-note">{{ selected.note }}</p>
                <p class="ec-selected-note">そばの 小さな 絵（▲■●★）は、レベル。色は、チーム。</p>
            </section>

            <div class="ec-grid">
                <section v-for="style in styles" :key="style.id" class="ec-card">
                    <div class="ec-card-head"><span class="ec-label">{{ style.label }}</span><p class="ec-card-title">{{ style.title }}</p></div>
                    <p class="ec-card-note">{{ style.note }}</p>
                    <div class="ec-board" :style="{ gridTemplateColumns: `repeat(${selected.cols}, 1fr)` }">
                        <div v-for="cell in selected.cells" :key="cell.key" class="ec-cell" :style="cellStyle(cell, style.id)">
                            <svg viewBox="0 0 24 24" class="ec-svg" aria-hidden="true">
                                <template v-if="cell.tier">
                                    <!-- ふつうに おいてある カード -->
                                    <TierShape v-if="!cell.eaten" :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.6" />

                                    <!-- 案A：いまの（×） -->
                                    <template v-else-if="style.id === 'x'">
                                        <TierShape :tier="cell.tier" fill="#666" stroke="#000" :stroke-width="1.2" :opacity="0.4" />
                                        <path d="M5 5L19 19M19 5L5 19" fill="none" :stroke="color(cell.eaterTeam)" stroke-width="3.2" stroke-linecap="round" />
                                    </template>

                                    <!-- 案B：中ぬき（もとの形が、はっきり分かる） -->
                                    <template v-else-if="style.id === 'hollow'">
                                        <TierShape :tier="cell.tier" fill="none" :stroke="color(cell.owner)" :stroke-width="2" />
                                    </template>

                                    <!-- 案C：うすくして、1本の すじ -->
                                    <template v-else-if="style.id === 'slash'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.5" />
                                        <path d="M3 21L21 3" fill="none" :stroke="color(cell.eaterTeam)" stroke-width="3" stroke-linecap="round" />
                                    </template>

                                    <!-- 案D：かじられた あと -->
                                    <template v-else-if="style.id === 'bite'">
                                        <mask :id="`bite-${cell.key}-${style.id}`">
                                            <rect width="24" height="24" fill="#fff" />
                                            <circle :cx="12 + cell.dx * 11" :cy="12 + cell.dy * 11" r="8" fill="#000" />
                                        </mask>
                                        <g :mask="`url(#bite-${cell.key}-${style.id})`">
                                            <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.4" />
                                        </g>
                                        <circle :cx="12 + cell.dx * 11" :cy="12 + cell.dy * 11" r="8" fill="none" :stroke="color(cell.eaterTeam)" stroke-width="1.6" stroke-dasharray="2.5 2" />
                                    </template>

                                    <!-- 案E：だれに 食べられたか（すみに 小さな バッジ） -->
                                    <template v-else-if="style.id === 'badge'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.55" />
                                        <circle cx="18" cy="6" r="6" :fill="color(cell.eaterTeam)" stroke="#000" stroke-width="1" />
                                        <g transform="translate(13.2 1.2) scale(0.4)">
                                            <TierShape :tier="cell.eaterTier" fill="#fff" stroke="#000" :stroke-width="2" />
                                        </g>
                                    </template>

                                    <!-- 案F：食べた ほうを さす やじるし -->
                                    <template v-else-if="style.id === 'arrow'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.5" />
                                        <g :transform="`translate(${12 + cell.dx * 7} ${12 + cell.dy * 7}) rotate(${cell.angle})`">
                                            <polygon points="-6,-4.5 3,0 -6,4.5 -3.5,0" :fill="color(cell.eaterTeam)" stroke="#000" stroke-width="1" stroke-linejoin="round" />
                                        </g>
                                    </template>

                                    <!-- 案G：案Cを もっと くらく -->
                                    <template v-else-if="style.id === 'darkc'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.28" />
                                        <path d="M3 21L21 3" fill="none" :stroke="color(cell.eaterTeam)" stroke-width="3" stroke-linecap="round" />
                                    </template>

                                    <!-- 案H：赤い斜線 -->
                                    <template v-else-if="style.id === 'redslash'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.7" />
                                        <path d="M2.5 21.5L21.5 2.5" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" />
                                        <path d="M2.5 21.5L21.5 2.5" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
                                    </template>

                                    <!-- 案I：きんしマーク -->
                                    <template v-else-if="style.id === 'prohibit'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.55" />
                                        <circle cx="12" cy="12" r="10" fill="none" stroke="#ef4444" stroke-width="2.6" />
                                        <path d="M5 19L19 5" fill="none" stroke="#ef4444" stroke-width="2.6" stroke-linecap="round" />
                                    </template>

                                    <!-- 案J：モノクロ＋かどの 三角 -->
                                    <template v-else-if="style.id === 'gray'">
                                        <TierShape :tier="cell.tier" fill="#9ca3af" stroke="#000" :stroke-width="1.2" :opacity="0.8" />
                                        <polygon points="24,0 24,11 13,0" :fill="color(cell.eaterTeam)" stroke="#000" stroke-width="0.8" />
                                    </template>

                                    <!-- 案K：はんぶんこ -->
                                    <template v-else-if="style.id === 'split'">
                                        <g transform="translate(0.5 0.5) scale(0.6)">
                                            <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.8" />
                                        </g>
                                        <g transform="translate(11.5 11.5) scale(0.45)">
                                            <TierShape :tier="cell.eaterTier" fill="#fff" stroke="#000" :stroke-width="2" />
                                        </g>
                                    </template>

                                    <!-- 案L：ひび われ -->
                                    <template v-else-if="style.id === 'crack'">
                                        <TierShape :tier="cell.tier" :fill="color(cell.owner)" stroke="#000" :stroke-width="1.2" :opacity="0.7" />
                                        <path d="M13 1.5L10 8.5L14.5 12L9 16.5L12.5 22.5" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round" />
                                        <path d="M13 1.5L10 8.5L14.5 12L9 16.5L12.5 22.5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" />
                                    </template>

                                    <!-- 案M：シルエット -->
                                    <template v-else-if="style.id === 'silhouette'">
                                        <TierShape :tier="cell.tier" fill="#000" :stroke="color(cell.owner)" :stroke-width="1.8" :opacity="0.9" />
                                    </template>
                                </template>
                            </svg>
                        </div>
                    </div>
                </section>
            </div>
        </main>

        <p v-if="loading" class="ec-foot">ゲームの 盤面を よみこみ中…</p>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { TEAM_COLORS } from "@/utils/dominationSlots.js";
import TierShape from "./TierShape.vue";

const TEAM_BY_ID = { 1: "water", 2: "air", 3: "earth" };
const AREA_COLORS = { town: "#B88E66", forest: "#768F7C", dirt: "#C2B5A6", river: "#8FAFBD", sea: "#5E7F9B", undeveloped: "#666666" };
const SIZE = 7;

// ■見本：レベル4（★）が、まわりを食べていった、ようすの盤面（7×7）。文字は「地形:もちぬし:レベル:食べたのは(縦,横)」
//   ・ちがうチームが食べて、さらに食べられたものも入れてある
const SAMPLE_CELLS = (() => {
    const spec = {
        "3,3": { owner: 2, tier: 4 },
        "3,2": { owner: 1, tier: 3, eatenBy: [3, 3] },
        "2,3": { owner: 3, tier: 3, eatenBy: [3, 3] },
        "3,4": { owner: 1, tier: 2, eatenBy: [3, 3] },
        "4,3": { owner: 3, tier: 1, eatenBy: [3, 3] },
        "3,1": { owner: 2, tier: 2, eatenBy: [3, 2] },
        "2,2": { owner: 1, tier: 1, eatenBy: [3, 2] },
        "1,3": { owner: 2, tier: 1, eatenBy: [2, 3] },
        "2,4": { owner: 3, tier: 2, eatenBy: [2, 3] },
        "4,4": { owner: 2, tier: 2 },
        "5,3": { owner: 1, tier: 3 },
        "0,0": { owner: 3, tier: 2 }
    };
    const areas = ["forest", "forest", "town", "forest", "dirt", "river", "sea"];
    const cells = [];
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            cells.push({ row, col, area: areas[(row * 2 + col) % areas.length], ...(spec[`${row},${col}`] || {}) });
        }
    }
    return cells;
})();

export default {
    name: "EatenCompare",
    components: { TierShape },

    data() {
        return {
            loading: true,
            real: [],
            selectedKey: "",
            styles: [
                { id: "x", label: "案A", title: "×（いまの）", note: "食べたチームの色の ×。食べられたことは 分かるけど、もとが なにか 分からない" },
                { id: "hollow", label: "案B", title: "中ぬき", note: "もとの 形（▲■●★）を、ふちだけ にして、もとのチームの色で のこす" },
                { id: "slash", label: "案C", title: "うすく＋すじ", note: "もとの カードを うすく のこして、食べた チームの色の 1本の すじ" },
                { id: "bite", label: "案D", title: "かじられた あと", note: "もとの カードに、食べられた ほうから かじった あと（食べた色の てんせん）" },
                { id: "badge", label: "案E", title: "バッジつき", note: "もとの カードを うすく のこして、すみに「だれの どのレベルに 食べられたか」の バッジ" },
                { id: "arrow", label: "案F", title: "やじるし", note: "もとの カードを うすく のこして、食べた ほうを さす やじるし" },
                { id: "darkc", label: "案G", title: "案Cを もっと くらく", note: "案Cの、もとの カードを、さらに くらくして、背景も まっ黒に。すじは 食べた チームの色" },
                { id: "redslash", label: "案H", title: "赤い 斜線", note: "もとの カードの 上に、赤い 斜線。ふちの 色で、食べた チームが 分かる" },
                { id: "prohibit", label: "案I", title: "きんしマーク", note: "赤い まる＋斜線（きんしの マーク）。「もう つかえない」が いちばん つたわりやすい" },
                { id: "gray", label: "案J", title: "モノクロ＋かど", note: "もとの カードを 灰色に して、かどに 食べた チームの 色の 三角。色が うるさくならない" },
                { id: "split", label: "案K", title: "はんぶんこ", note: "マスを ななめに 2つに わけて、ひだりうえに「もとの カード」、みぎしたに「食べた カード」" },
                { id: "crack", label: "案L", title: "ひび われ", note: "もとの カードに、白い ひびを 入れる。こわれた かんじが 出る" },
                { id: "silhouette", label: "案M", title: "シルエット", note: "もとの カードを 黒い かげに して、ふちだけ もとの チームの 色。形が 読みやすい" }
            ]
        };
    },

    computed: {
        clusters() {
            const sample = {
                key: "sample",
                sample: true,
                title: "見本：レベル4の まわり",
                short: "食べられた マスが 多い",
                note: "レベル4（★）が まわりを 食べて、さらに 食べられた カードも ある、ようすの 見本",
                cols: SIZE,
                cells: this.toCells(SAMPLE_CELLS, SIZE, SIZE)
            };
            return [...this.real, sample];
        },

        selected() {
            return this.clusters.find(cluster => cluster.key === this.selectedKey) || this.clusters[0];
        }
    },

    async mounted() {
        try {
            const docs = await Promise.all(
                Array.from({ length: 10 }, (_, index) => db.collection("dominationGames").doc(`aitest-${String(index + 1).padStart(2, "0")}-1`).get().catch(() => null))
            );
            const found = [];
            docs.forEach((doc, index) => {
                if (!doc || !doc.exists) return;
                const data = doc.data();
                if (!data || !Array.isArray(data.tiles)) return;
                const cluster = this.makeCluster(data.tiles, `aitest-${String(index + 1).padStart(2, "0")}`);
                if (cluster && (cluster.hasLv4 || cluster.eatenCount >= 5)) found.push(cluster);
            });
            // レベル4が生まれた盤面を、先に
            this.real = found.sort((a, b) => Number(b.hasLv4) - Number(a.hasLv4) || b.eatenCount - a.eatenCount);
        } catch (e) {
            console.error("盤面の読み込みに失敗しました", e);
        } finally {
            this.loading = false;
        }
    },

    methods: {
        color(team) {
            return TEAM_COLORS[TEAM_BY_ID[team]] || "#94a3b8";
        },

        // ■ゲームの盤面から、見せたい 7×7 を切り出す（レベル4があれば、その まわり。無ければ、食べられた マスが いちばん 多い ところ）
        makeCluster(tiles, slot) {
            const byPos = new Map(tiles.map(tile => [`${tile.row},${tile.col}`, tile]));
            const rows = Math.max(...tiles.map(tile => tile.row)) + 1;
            const cols = Math.max(...tiles.map(tile => tile.col)) + 1;
            const star = tiles.find(tile => tile.placedCard && tile.placedCard.tier === 4);
            let top;
            let left;
            if (star) {
                top = Math.max(0, Math.min(rows - SIZE, star.row - 3));
                left = Math.max(0, Math.min(cols - SIZE, star.col - 3));
            } else {
                let best = -1;
                for (let r = 0; r <= rows - SIZE; r++) {
                    for (let c = 0; c <= cols - SIZE; c++) {
                        let count = 0;
                        for (let dr = 0; dr < SIZE; dr++) for (let dc = 0; dc < SIZE; dc++) {
                            const tile = byPos.get(`${r + dr},${c + dc}`);
                            if (tile && tile.eatenByTileId) count++;
                        }
                        if (count > best) { best = count; top = r; left = c; }
                    }
                }
            }
            const byId = new Map(tiles.map(tile => [tile.id, tile]));
            const cells = [];
            for (let dr = 0; dr < SIZE; dr++) {
                for (let dc = 0; dc < SIZE; dc++) {
                    const tile = byPos.get(`${top + dr},${left + dc}`);
                    if (!tile) continue;
                    const cell = { row: dr, col: dc, area: tile.area, owner: tile.ownerTeam, tier: tile.placedCard ? tile.placedCard.tier : 0 };
                    if (tile.eatenByTileId) {
                        const eater = byId.get(tile.eatenByTileId);
                        if (eater) {
                            cell.eatenBy = [eater.row - top, eater.col - left];
                            cell.eaterTeam = tile.eatenByPlayerId || eater.ownerTeam;
                            cell.eaterTier = eater.placedCard ? eater.placedCard.tier : 1;
                            cell.eaterDelta = [eater.row - tile.row, eater.col - tile.col];
                        }
                    }
                    cells.push(cell);
                }
            }
            const eatenCount = cells.filter(cell => cell.eatenBy).length;
            return {
                key: slot,
                sample: false,
                hasLv4: !!star,
                eatenCount,
                title: slot.replace("aitest-", "AIテスト ") ,
                short: star ? "★ レベル4 あり" : `食べられた ${eatenCount}こ`,
                note: star ? "レベル4（★）が 生まれた 盤面の、そのまわり" : "この ゲームには レベル4が なかったので、食べられた マスが いちばん 多い ところ",
                cols: SIZE,
                cells: this.toCells(cells, SIZE, SIZE, true)
            };
        },

        // 見本の cells（eatenBy: [縦,横]）を、表示用に そろえる
        toCells(source, rows, cols, ready = false) {
            const byPos = new Map(source.map(cell => [`${cell.row},${cell.col}`, cell]));
            const cells = [];
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const base = byPos.get(`${row},${col}`);
                    if (!base) continue;
                    const cell = { key: `${row}-${col}`, area: base.area, owner: base.owner || 0, tier: base.tier || 0, eaten: false, eaterTeam: 0, eaterTier: 1, dx: 0, dy: 0, angle: 0 };
                    if (base.eatenBy) {
                        cell.eaten = true;
                        const eater = ready ? null : byPos.get(`${base.eatenBy[0]},${base.eatenBy[1]}`);
                        cell.eaterTeam = ready ? base.eaterTeam : (eater ? eater.owner : 1);
                        cell.eaterTier = ready ? base.eaterTier : (eater ? eater.tier : 1);
                        const delta = ready ? base.eaterDelta : [base.eatenBy[0] - row, base.eatenBy[1] - col];
                        const length = Math.hypot(delta[0], delta[1]) || 1;
                        cell.dy = delta[0] / length;
                        cell.dx = delta[1] / length;
                        cell.angle = Math.atan2(cell.dy, cell.dx) * 180 / Math.PI;
                    }
                    cells.push(cell);
                }
            }
            return cells;
        },

        cellStyle(cell, variant) {
            const style = { background: AREA_COLORS[cell.area] || "#999" };
            if (!cell.tier) return style;
            if (!cell.eaten) {
                style.background = `color-mix(in srgb, ${this.color(cell.owner)} 42%, #0a0f1c)`;
                style.boxShadow = `inset 0 0 0 2px ${this.color(cell.owner)}`;
                return style;
            }
            const eaterColor = this.color(cell.eaterTeam);
            if (variant === "hollow") {
                style.background = "#0b0d12";
                style.boxShadow = `inset 0 0 0 2px ${eaterColor}`;
            } else if (variant === "x") {
                style.background = "#05060a";
                style.boxShadow = `inset 0 0 0 3px ${eaterColor}`;
            } else if (variant === "darkc") {
                style.background = "#020305";
                style.boxShadow = `inset 0 0 0 2px ${eaterColor}`;
            } else if (variant === "split") {
                style.background = `linear-gradient(135deg, #05060a 50%, ${eaterColor} 50%)`;
                style.boxShadow = "none";
            } else if (variant === "silhouette") {
                style.background = `color-mix(in srgb, ${eaterColor} 35%, #05060a)`;
                style.boxShadow = `inset 0 0 0 2px ${eaterColor}`;
            } else if (variant === "bite") {
                style.background = `color-mix(in srgb, ${this.color(cell.owner)} 22%, #0a0f1c)`;
                style.boxShadow = `inset 0 0 0 2px ${eaterColor}`;
            } else {
                style.background = "#0b0d12";
                style.boxShadow = `inset 0 0 0 2px ${eaterColor}`;
            }
            return style;
        }
    }
};
</script>

<style scoped>
.ec{
    min-height: 100vh;
    padding-bottom: 48px;
    color: #e2e8f0;
    background:
        radial-gradient(ellipse 80% 40% at 50% -5%, rgba(167,139,250,.2), transparent 70%),
        linear-gradient(180deg, #0b1220, #05080f);
}
.ec-header{
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(167,139,250,.3);
    background: rgba(8,14,26,.88);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
}
.ec-back{ padding: 6px 14px; border: 1.5px solid rgba(196,181,253,.7); border-radius: 9999px; font-size: 13px; font-weight: 900; color: #ede9fe; }
.ec-back span{ font-size: 10px; color: #c4b5fd; }
.ec-heading{ margin: 0; font-size: 18px; font-weight: 900; letter-spacing: .1em; color: #ddd6fe; }
.ec-heading small{ display: block; font-size: 9px; letter-spacing: .3em; color: #64748b; }
.ec-lead{ max-width: 960px; margin: 16px auto 0; padding: 0 16px; font-size: 12px; font-weight: 700; line-height: 1.8; color: #94a3b8; }

.ec-strip{ display: flex; gap: 10px; max-width: 960px; margin: 14px auto 0; padding: 8px 16px 10px; overflow-x: auto; }
.ec-mini{ flex: none; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; width: 150px; padding: 10px 12px; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: rgba(255,255,255,.04); text-align: left; transition: transform .15s, border-color .15s, box-shadow .15s; }
.ec-mini:hover{ transform: translateY(-2px); }
.ec-mini.active{ border-color: #c4b5fd; box-shadow: 0 0 16px rgba(167,139,250,.5); background: rgba(167,139,250,.12); }
.ec-mini-kind{ padding: 0 8px; border-radius: 9999px; font-size: 9px; font-weight: 900; color: #fff; }
.ec-kind-sample{ background: #64748b; }
.ec-kind-real{ background: #059669; }
.ec-mini-title{ font-size: 12px; font-weight: 900; }
.ec-mini-note{ font-size: 10px; font-weight: 700; color: #94a3b8; }

.ec-main{ max-width: 960px; margin: 6px auto 0; }
.ec-selected{ margin: 0 16px; padding: 12px 16px; border: 1px solid rgba(196,181,253,.4); border-radius: 16px; background: rgba(167,139,250,.08); }
.ec-selected-title{ margin: 0; font-size: 15px; font-weight: 900; color: #ede9fe; }
.ec-selected-note{ margin: 4px 0 0; font-size: 11px; font-weight: 700; color: #94a3b8; }

.ec-grid{ display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; margin: 14px 16px 0; }
.ec-card{ padding: 14px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04); }
.ec-card-head{ display: flex; align-items: center; gap: 8px; }
.ec-label{ padding: 1px 9px; border-radius: 9999px; background: #6d28d9; font-size: 10px; font-weight: 900; color: #fff; }
.ec-card-title{ margin: 0; font-size: 14px; font-weight: 900; }
.ec-card-note{ margin: 6px 0 10px; min-height: 32px; font-size: 11px; font-weight: 700; line-height: 1.5; color: #94a3b8; }
.ec-board{ display: grid; gap: 2px; padding: 4px; border-radius: 10px; background: #05080f; }
.ec-cell{ aspect-ratio: 1 / 1; border-radius: 2px; display: flex; align-items: center; justify-content: center; }
.ec-svg{ width: 80%; height: 80%; overflow: visible; }
.ec-foot{ margin-top: 24px; text-align: center; font-size: 12px; font-weight: 700; color: #64748b; }
</style>
