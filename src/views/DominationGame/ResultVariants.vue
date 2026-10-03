<template>
    <!-- ■同じデータ（チームごと・レベルごとの、おかれたカードの数）を、いろいろな見せ方で出す部品（見せ方くらべ用） -->
    <div class="rv">
        <!-- 案B：三角のピラミッド -->
        <svg v-if="variant === 'triangle'" viewBox="0 0 320 214" class="rv-svg" role="img" aria-label="三角のピラミッド">
            <defs>
                <clipPath v-for="band in bands" :id="`${uid}-clip-${band.tier}`" :key="band.tier">
                    <polygon :points="band.points" />
                </clipPath>
            </defs>
            <g v-for="band in bands" :key="band.tier">
                <g :clip-path="`url(#${uid}-clip-${band.tier})`">
                    <rect
                        v-for="seg in band.segments"
                        :key="seg.id"
                        :x="seg.x"
                        :y="band.y"
                        :width="seg.w"
                        :height="band.h - 2"
                        :fill="seg.color"
                    />
                </g>
                <polygon :points="band.points" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1" />
                <text :x="160" :y="band.y + band.h / 2 + 4" class="rv-band-text">{{ band.total }}</text>
                <text x="6" :y="band.y + band.h / 2 + 4" class="rv-axis-text" text-anchor="start">Lv{{ band.tier }}</text>
            </g>
        </svg>

        <!-- 案C：ひょうしょうだい＋じんちの わりあい -->
        <div v-else-if="variant === 'podium'" class="rv-podium">
            <div class="rv-share">
                <span
                    v-for="team in ranking"
                    :key="team.id"
                    class="rv-share-seg"
                    :style="{ flex: Math.max(team.territory, 0.0001), background: team.color }"
                >{{ team.share }}%</span>
            </div>
            <p class="rv-caption">じんちの わりあい</p>
            <div class="rv-stage">
                <div v-for="slot in podiumOrder" :key="slot.id" class="rv-column">
                    <span v-if="slot.rank === 1" class="rv-crown">👑</span>
                    <span class="rv-column-name">{{ slot.name.replace('チーム', '') }}</span>
                    <span class="rv-column-score">{{ slot.score }}<small>点</small></span>
                    <span
                        class="rv-column-box"
                        :style="{ height: slot.height + 'px', background: `linear-gradient(180deg, ${slot.color}, color-mix(in srgb, ${slot.color} 55%, #000))` }"
                    >{{ slot.rank }}</span>
                </div>
            </div>
        </div>

        <!-- 案D：チームごとの ドーナツ -->
        <div v-else-if="variant === 'donut'" class="rv-donuts">
            <div v-for="team in ranking" :key="team.id" class="rv-donut">
                <svg viewBox="0 0 100 100" role="img" :aria-label="`${team.name}のレベルの内わけ`">
                    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="14" />
                    <circle
                        v-for="arc in team.arcs"
                        :key="arc.tier"
                        cx="50"
                        cy="50"
                        r="34"
                        fill="none"
                        :stroke="team.color"
                        :stroke-opacity="arc.opacity"
                        stroke-width="14"
                        :stroke-dasharray="`${arc.length} ${arc.rest}`"
                        :stroke-dashoffset="arc.offset"
                        transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="49" class="rv-donut-num">{{ team.territory }}</text>
                    <text x="50" y="62" class="rv-donut-unit">マス</text>
                </svg>
                <p class="rv-donut-name"><span class="rv-dot" :style="{ background: team.color }"></span>{{ team.name.replace('チーム', '') }}</p>
            </div>
            <p class="rv-legend">
                <span v-for="tier in [1, 2, 3, 4]" :key="tier"><i :style="{ opacity: tierOpacity(tier) }"></i>Lv{{ tier }}</span>
                （こい色ほど、したの レベル）
            </p>
        </div>

        <!-- 案E：レーダー -->
        <svg v-else-if="variant === 'radar'" viewBox="0 0 260 230" class="rv-svg" role="img" aria-label="レーダーチャート">
            <polygon v-for="ring in [0.33, 0.66, 1]" :key="ring" :points="radarRing(ring)" fill="none" stroke="rgba(255,255,255,.18)" />
            <line v-for="axis in radarAxes" :key="axis.tier" x1="130" y1="115" :x2="axis.x" :y2="axis.y" stroke="rgba(255,255,255,.18)" />
            <polygon
                v-for="team in ranking"
                :key="team.id"
                :points="team.radarPoints"
                :fill="team.color"
                fill-opacity="0.22"
                :stroke="team.color"
                stroke-width="2"
            />
            <text v-for="axis in radarAxes" :key="`l-${axis.tier}`" :x="axis.lx" :y="axis.ly" class="rv-axis-text" text-anchor="middle">Lv{{ axis.tier }}</text>
        </svg>

        <!-- 案F：ならべた カード（絵ならべ） -->
        <div v-else-if="variant === 'pictogram'" class="rv-picto">
            <div v-for="tier in [4, 3, 2, 1]" :key="tier" class="rv-picto-row">
                <span class="rv-picto-level">Lv{{ tier }}</span>
                <span class="rv-picto-icons">
                    <svg v-for="(icon, index) in pictoIcons(tier)" :key="index" viewBox="0 0 24 24" class="rv-picto-icon" :style="{ fill: icon.color }">
                        <polygon v-if="tier === 1" points="12,3 22.5,21 1.5,21" />
                        <rect v-else-if="tier === 2" x="3" y="3" width="18" height="18" rx="1.5" />
                        <circle v-else-if="tier === 3" cx="12" cy="12" r="9" />
                        <polygon v-else points="12,1.5 14.9,8.4 22.4,9 16.7,13.9 18.5,21.3 12,17.4 5.5,21.3 7.3,13.9 1.6,9 9.1,8.4" />
                    </svg>
                    <small v-if="pictoMore(tier)">+{{ pictoMore(tier) }}</small>
                    <small v-if="!tierTotal(tier)" class="rv-none">なし</small>
                </span>
            </div>
        </div>

        <!-- 案H：ぼうグラフ（レベルごとに、チームを ならべる） -->
        <div v-else-if="variant === 'bars'" class="rv-bars">
            <div v-for="tier in [4, 3, 2, 1]" :key="tier" class="rv-bars-group">
                <span class="rv-bars-level">Lv{{ tier }}</span>
                <span class="rv-bars-lines">
                    <span v-for="team in ranking" :key="team.id" class="rv-bars-line">
                        <span class="rv-bars-fill" :style="{ width: Math.max(count(team.id, tier) / maxCell * 100, count(team.id, tier) ? 4 : 0) + '%', background: team.color }"></span>
                        <small>{{ count(team.id, tier) }}</small>
                    </span>
                </span>
            </div>
        </div>

        <!-- 案I：タイル（おおきさで くらべる） -->
        <div v-else-if="variant === 'treemap'" class="rv-tree">
            <div v-for="team in treemap" :key="team.id" class="rv-tree-team" :style="{ flex: Math.max(team.territory, 0.5) }">
                <span class="rv-tree-title"><span class="rv-dot" :style="{ background: team.color }"></span>{{ team.name.replace('チーム', '') }} {{ team.territory }}</span>
                <span class="rv-tree-cells">
                    <span
                        v-for="cell in team.cells"
                        :key="cell.tier"
                        class="rv-tree-cell"
                        :style="{ flex: cell.value, background: `linear-gradient(135deg, color-mix(in srgb, ${team.color} 85%, #fff), ${team.color})`, opacity: tierOpacity(cell.tier) + 0.2 }"
                    >Lv{{ cell.tier }}<b>{{ cell.value }}</b></span>
                </span>
            </div>
        </div>

        <!-- 案J：ねんりん（まるい ピラミッド） -->
        <svg v-else-if="variant === 'rings'" viewBox="0 0 220 220" class="rv-svg rv-rings" role="img" aria-label="ねんりんの グラフ">
            <g v-for="ring in rings" :key="ring.tier">
                <circle cx="110" cy="110" :r="ring.r" fill="none" stroke="rgba(255,255,255,.08)" :stroke-width="ring.width" />
                <circle
                    v-for="arc in ring.arcs"
                    :key="arc.id"
                    cx="110"
                    cy="110"
                    :r="ring.r"
                    fill="none"
                    :stroke="arc.color"
                    :stroke-width="ring.width - 2"
                    :stroke-dasharray="`${arc.length} ${ring.circumference}`"
                    :stroke-dashoffset="arc.offset"
                    transform="rotate(-90 110 110)"
                />
                <text x="110" :y="110 - ring.r + 4" class="rv-ring-label" text-anchor="middle">Lv{{ ring.tier }}</text>
            </g>
            <text x="110" y="114" class="rv-donut-num" style="font-size:12px">LEVEL</text>
        </svg>

        <!-- 案G：あわの ひょう（チーム × レベル） -->
        <div v-else-if="variant === 'bubble'" class="rv-bubble">
            <div class="rv-bubble-row rv-bubble-head">
                <span></span>
                <span v-for="tier in [1, 2, 3, 4]" :key="tier">Lv{{ tier }}</span>
            </div>
            <div v-for="team in ranking" :key="team.id" class="rv-bubble-row">
                <span class="rv-bubble-name"><span class="rv-dot" :style="{ background: team.color }"></span>{{ team.name.replace('チーム', '') }}</span>
                <span v-for="tier in [1, 2, 3, 4]" :key="tier" class="rv-bubble-cell">
                    <span
                        class="rv-bubble-dot"
                        :style="{ width: bubbleSize(team.id, tier) + 'px', height: bubbleSize(team.id, tier) + 'px', background: team.color, boxShadow: `0 0 10px ${team.color}88` }"
                    >{{ count(team.id, tier) }}</span>
                </span>
            </div>
        </div>
    </div>
</template>

<script>
let counter = 0;

export default {
    name: "ResultVariants",

    props: {
        players: { type: Array, required: true },
        tierTeam: { type: Object, required: true },
        // triangle / podium / donut / radar / pictogram / bubble
        variant: { type: String, required: true },
        // 点数（ひょうしょうだい用）
        scores: { type: Object, default: () => ({}) }
    },

    data() {
        counter += 1;
        return { uid: `rv${counter}` };
    },

    computed: {
        tierCounts() {
            return [1, 2, 3, 4].map(tier => this.tierTeam[tier] || {});
        },

        maxCell() {
            return Math.max(1, ...this.tierCounts.flatMap(teams => Object.values(teams)));
        },

        ranking() {
            const totals = this.players.map(player => ({
                player,
                territory: [1, 2, 3, 4].reduce((sum, tier) => sum + (this.count(player.id, tier)), 0)
            }));
            const all = Math.max(1, totals.reduce((sum, item) => sum + item.territory, 0));
            return totals
                .map(({ player, territory }) => {
                    const circumference = 2 * Math.PI * 34;
                    let offset = 0;
                    const arcs = [1, 2, 3, 4].map(tier => {
                        const value = this.count(player.id, tier);
                        const length = territory ? (value / territory) * circumference : 0;
                        const arc = { tier, length: Math.max(length - 1.2, 0), rest: circumference, offset: -offset, opacity: this.tierOpacity(tier) };
                        offset += length;
                        return arc;
                    }).filter(arc => arc.length > 0);
                    return {
                        id: player.id,
                        name: player.name,
                        color: player.color,
                        territory,
                        share: Math.round((territory / all) * 100),
                        score: this.scores[player.id] !== undefined ? this.scores[player.id] : (player.score || 0),
                        arcs,
                        radarPoints: this.radarPointsFor(player.id)
                    };
                })
                .sort((a, b) => b.score - a.score || b.territory - a.territory);
        },

        // ひょうしょうだい：2位・1位・3位 の順にならべる
        podiumOrder() {
            const ranked = this.ranking.map((team, index) => ({
                ...team,
                rank: 1 + this.ranking.filter(other => other.score > team.score).length,
                height: [86, 62, 44][index] || 40
            }));
            const [first, second, third] = ranked;
            return [second, first, third].filter(Boolean);
        },

        // 三角ピラミッドの、4段（上がLv4）
        bands() {
            const apexY = 8;
            const baseY = 206;
            const height = (baseY - apexY) / 4;
            const halfAt = y => ((y - apexY) / (baseY - apexY)) * 126;
            return [4, 3, 2, 1].map((tier, index) => {
                const y = apexY + index * height;
                const bottom = y + height;
                const topHalf = halfAt(y);
                const bottomHalf = halfAt(bottom);
                const total = this.tierTotal(tier);
                const teams = this.players.filter(player => this.count(player.id, tier));
                const left = 160 - bottomHalf;
                const span = bottomHalf * 2;
                let cursor = left;
                const segments = teams.map(player => {
                    const w = (this.count(player.id, tier) / total) * span;
                    const seg = { id: player.id, x: cursor, w: w + 0.5, color: player.color };
                    cursor += w;
                    return seg;
                });
                return {
                    tier,
                    y,
                    h: height,
                    total,
                    segments,
                    labelX: 160 - bottomHalf - 4,
                    points: `${160 - topHalf},${y} ${160 + topHalf},${y} ${160 + bottomHalf},${bottom} ${160 - bottomHalf},${bottom}`
                };
            }).map(band => ({ ...band, labelX: Math.max(band.labelX, 34) }));
        },

        // タイル：チームごとの四角を、じんちの大きさで ならべる
        treemap() {
            return this.ranking.map(team => ({
                ...team,
                cells: [4, 3, 2, 1]
                    .map(tier => ({ tier, value: this.count(team.id, tier) }))
                    .filter(cell => cell.value > 0)
            }));
        },

        // ねんりん：外がわが Lv1、うちがわが Lv4
        rings() {
            return [1, 2, 3, 4].map((tier, index) => {
                const r = 98 - index * 21;
                const circumference = 2 * Math.PI * r;
                const total = this.tierTotal(tier);
                let offset = 0;
                const arcs = this.players
                    .filter(player => this.count(player.id, tier))
                    .map(player => {
                        const length = (this.count(player.id, tier) / total) * circumference;
                        const arc = { id: player.id, color: player.color, length: Math.max(length - 1.5, 0.5), offset: -offset };
                        offset += length;
                        return arc;
                    });
                return { tier, r, width: 19, circumference, arcs };
            });
        },

        radarAxes() {
            // Lv1＝上、Lv2＝右、Lv3＝下、Lv4＝左
            const center = { x: 130, y: 115 };
            const radius = 82;
            return [1, 2, 3, 4].map((tier, index) => {
                const angle = -Math.PI / 2 + (Math.PI / 2) * index;
                return {
                    tier,
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle),
                    lx: center.x + (radius + 22) * Math.cos(angle),
                    ly: center.y + (radius + 22) * Math.sin(angle) + 4
                };
            });
        }
    },

    methods: {
        count(teamId, tier) {
            return (this.tierTeam[tier] && this.tierTeam[tier][teamId]) || 0;
        },

        tierTotal(tier) {
            return Object.values(this.tierTeam[tier] || {}).reduce((sum, value) => sum + value, 0);
        },

        tierOpacity(tier) {
            return [1, 0.75, 0.52, 0.32][tier - 1];
        },

        radarRing(ratio) {
            return this.radarAxes.map(axis => `${130 + (axis.x - 130) * ratio},${115 + (axis.y - 115) * ratio}`).join(" ");
        },

        radarPointsFor(teamId) {
            return [1, 2, 3, 4].map((tier, index) => {
                const angle = -Math.PI / 2 + (Math.PI / 2) * index;
                const ratio = this.count(teamId, tier) / this.maxCell;
                return `${130 + 82 * ratio * Math.cos(angle)},${115 + 82 * ratio * Math.sin(angle)}`;
            }).join(" ");
        },

        // 絵ならべ：チームごとに色をつけて、1段に14こまで
        pictoIcons(tier) {
            const icons = [];
            this.players.forEach(player => {
                for (let i = 0; i < this.count(player.id, tier); i++) icons.push({ color: player.color });
            });
            return icons.slice(0, 14);
        },

        pictoMore(tier) {
            return Math.max(0, this.tierTotal(tier) - 14);
        },

        bubbleSize(teamId, tier) {
            const value = this.count(teamId, tier);
            return value ? Math.round(14 + Math.sqrt(value / this.maxCell) * 34) : 0;
        }
    }
};
</script>

<style scoped>
.rv{ color: #e2e8f0; }
.rv-svg{ display: block; width: 100%; height: auto; }
.rv-band-text{ font-size: 12px; font-weight: 900; fill: #fff; text-anchor: middle; paint-order: stroke; stroke: rgba(0,0,0,.55); stroke-width: 3px; }
.rv-axis-text{ font-size: 10px; font-weight: 900; fill: #94a3b8; }
.rv-dot{ display: inline-block; width: 9px; height: 9px; margin-right: 5px; border-radius: 50%; }
.rv-caption{ margin: 4px 0 12px; text-align: center; font-size: 10px; font-weight: 700; color: #94a3b8; }

/* 案C */
.rv-share{ display: flex; height: 22px; overflow: hidden; border-radius: 9999px; }
.rv-share-seg{ display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: #0b1220; min-width: 0; }
.rv-stage{ display: flex; align-items: flex-end; justify-content: center; gap: 8px; }
.rv-column{ flex: 1; display: flex; flex-direction: column; align-items: center; max-width: 92px; }
.rv-crown{ font-size: 18px; }
.rv-column-name{ font-size: 12px; font-weight: 900; }
.rv-column-score{ margin-bottom: 4px; font-size: 15px; font-weight: 900; }
.rv-column-score small{ font-size: 9px; margin-left: 1px; color: #94a3b8; }
.rv-column-box{ display: flex; align-items: flex-start; justify-content: center; width: 100%; padding-top: 6px; border-radius: 10px 10px 0 0; font-size: 20px; font-weight: 900; color: rgba(255,255,255,.92); text-shadow: 0 1px 4px rgba(0,0,0,.5); }

/* 案D */
.rv-donuts{ display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 10px; }
.rv-donut{ width: 31%; min-width: 86px; text-align: center; }
.rv-donut svg{ display: block; width: 100%; height: auto; }
.rv-donut-num{ font-size: 20px; font-weight: 900; fill: #f1f5f9; text-anchor: middle; }
.rv-donut-unit{ font-size: 8px; font-weight: 700; fill: #94a3b8; text-anchor: middle; }
.rv-donut-name{ margin: 0; font-size: 12px; font-weight: 900; }
.rv-legend{ width: 100%; margin: 6px 0 0; text-align: center; font-size: 10px; font-weight: 700; color: #94a3b8; }
.rv-legend span{ margin-right: 8px; }
.rv-legend i{ display: inline-block; width: 9px; height: 9px; margin-right: 3px; border-radius: 2px; background: #e2e8f0; vertical-align: middle; }

/* 案F */
.rv-picto-row{ display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,.1); }
.rv-picto-level{ flex: none; width: 30px; text-align: right; font-size: 11px; font-weight: 900; color: #94a3b8; }
.rv-picto-icons{ display: flex; flex-wrap: wrap; align-items: center; gap: 3px; min-height: 22px; }
.rv-picto-icon{ width: 20px; height: 20px; stroke: rgba(0,0,0,.6); stroke-width: 1.5px; stroke-linejoin: round; }
.rv-picto-icons small{ margin-left: 4px; font-size: 11px; font-weight: 900; color: #cbd5e1; }
.rv-none{ color: #64748b !important; font-weight: 700 !important; }

/* 案H */
.rv-bars-group{ display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px dashed rgba(255,255,255,.1); }
.rv-bars-level{ flex: none; width: 30px; padding-top: 2px; text-align: right; font-size: 11px; font-weight: 900; color: #94a3b8; }
.rv-bars-lines{ flex: 1; display: flex; flex-direction: column; gap: 3px; }
.rv-bars-line{ display: flex; align-items: center; gap: 6px; height: 11px; }
.rv-bars-fill{ display: block; height: 100%; border-radius: 0 6px 6px 0; transition: width .5s; }
.rv-bars-line small{ font-size: 10px; font-weight: 900; color: #cbd5e1; }

/* 案I */
.rv-tree{ display: flex; gap: 6px; height: 190px; }
.rv-tree-team{ display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rv-tree-title{ font-size: 11px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rv-tree-cells{ flex: 1; display: flex; flex-direction: column; gap: 3px; min-height: 0; }
.rv-tree-cell{ display: flex; align-items: center; justify-content: space-between; gap: 4px; min-height: 18px; padding: 0 6px; border-radius: 6px; font-size: 10px; font-weight: 900; color: #0b1220; overflow: hidden; }
.rv-tree-cell b{ font-size: 12px; }

/* 案J */
.rv-rings{ max-width: 250px; margin: 0 auto; }
.rv-ring-label{ font-size: 8px; font-weight: 900; fill: #e2e8f0; paint-order: stroke; stroke: rgba(0,0,0,.6); stroke-width: 2px; }

/* 案G */
.rv-bubble-row{ display: grid; grid-template-columns: 56px repeat(4, 1fr); align-items: center; gap: 4px; }
.rv-bubble-head{ font-size: 10px; font-weight: 900; color: #94a3b8; text-align: center; }
.rv-bubble-name{ font-size: 12px; font-weight: 900; white-space: nowrap; }
.rv-bubble-cell{ display: flex; align-items: center; justify-content: center; height: 52px; }
.rv-bubble-dot{ display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 900; color: #0b1220; transition: width .4s, height .4s; }
</style>
