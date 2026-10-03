<template>
    <!-- ■ゲームのけっか：じんち（おさえたマスの数）と、生態系ピラミッド。終了画面と、けっか比べの画面で、同じ部品を使う -->
    <div class="rs" :class="{ 'rs-dark': dark, 'rs-compact': compact }">
        <section v-if="!compact" class="rs-box">
            <p class="rs-title">じんち<small>おさえた マスの かず</small></p>
            <div v-for="(team, index) in territory" :key="team.id" class="rs-team">
                <span class="rs-team-name">
                    <span class="rs-dot" :style="{ background: team.color }"></span>
                    {{ team.name.replace('チーム', '') }}<em v-if="team.isSelf">{{ selfLabel }}</em>
                </span>
                <span class="rs-bar">
                    <span
                        class="rs-bar-fill"
                        :style="{ width: Math.max(team.percent, team.count ? 6 : 0) + '%', background: `linear-gradient(90deg, ${team.color}, color-mix(in srgb, ${team.color} 65%, #fff))`, boxShadow: `0 0 10px ${team.color}88` }"
                    ></span>
                </span>
                <span class="rs-team-count"><span v-if="index === 0 && team.count" class="rs-crown">👑</span>{{ team.count }}<small>マス</small></span>
            </div>
            <p class="rs-note">じんちの ひろさは、てんすうには はいらないよ</p>
            <slot name="territory-extra"></slot>
        </section>

        <section class="rs-box rs-box-green">
            <p v-if="!compact" class="rs-title">生態系ピラミッド<small>レベルごとの カードの かず</small></p>
            <div class="rs-pyramid">
                <div v-for="row in pyramid" :key="row.tier" class="rs-row">
                    <span v-if="!compact" class="rs-level">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <polygon v-if="row.tier === 1" points="12,3 22.5,21 1.5,21" />
                            <rect v-else-if="row.tier === 2" x="3" y="3" width="18" height="18" rx="1.5" />
                            <circle v-else-if="row.tier === 3" cx="12" cy="12" r="9" />
                            <polygon v-else points="12,1.5 14.9,8.4 22.4,9 16.7,13.9 18.5,21.3 12,17.4 5.5,21.3 7.3,13.9 1.6,9 9.1,8.4" />
                        </svg>
                        Lv{{ row.tier }}
                    </span>
                    <div class="rs-layer-wrap">
                        <div v-if="row.total" class="rs-layer" :style="{ width: row.width + '%' }">
                            <span
                                v-for="part in row.parts"
                                :key="part.id"
                                class="rs-seg"
                                :style="{ flex: part.count, background: `linear-gradient(180deg, color-mix(in srgb, ${part.color} 80%, #fff), ${part.color})` }"
                            ></span>
                        </div>
                        <span v-else class="rs-empty">なし</span>
                    </div>
                    <span v-if="!compact" class="rs-count">{{ row.total }}</span>
                </div>
            </div>
            <p v-if="!compact" class="rs-note rs-note-green">したの レベルが たくさん いると、うえの いきものが くらせるよ。ひろい ピラミッドが、げんきな 生態系！</p>
        </section>
    </div>
</template>

<script>
export default {
    name: "GameResultSummary",

    props: {
        // [{ id, name, color, isAI }]
        players: { type: Array, required: true },
        // レベルごと・チームごとの、おかれたカードの数。{ 1: { 1: 9, 2: 8 }, 2: { ... } }（キー＝レベル → チームID）
        tierTeam: { type: Object, required: true },
        // 「あなた」と書く、じぶんのチーム（無ければ書かない）
        selfId: { type: Number, default: null },
        selfLabel: { type: String, default: "あなた" },
        // 暗い背景（けっか比べの画面）用
        dark: { type: Boolean, default: false },
        // ピラミッドだけを小さく出す（一覧用）
        compact: { type: Boolean, default: false }
    },

    computed: {
        territory() {
            const counts = {};
            Object.values(this.tierTeam).forEach(teams => {
                Object.entries(teams).forEach(([team, count]) => {
                    counts[team] = (counts[team] || 0) + count;
                });
            });
            const max = Math.max(1, ...Object.values(counts));
            return this.players
                .map(player => ({
                    id: player.id,
                    name: player.name,
                    color: player.color,
                    isSelf: player.id === this.selfId,
                    count: counts[player.id] || 0,
                    percent: Math.round(((counts[player.id] || 0) / max) * 100)
                }))
                .sort((a, b) => b.count - a.count);
        },

        // ■生態系ピラミッド：レベルごとに数える（下がLv1。チームの色で分けて見せる）
        pyramid() {
            const totals = [1, 2, 3, 4].map(tier => Object.values(this.tierTeam[tier] || {}).reduce((sum, count) => sum + count, 0));
            const maxTotal = Math.max(1, ...totals);
            return [4, 3, 2, 1].map(tier => {
                const teams = this.tierTeam[tier] || {};
                const total = totals[tier - 1];
                return {
                    tier,
                    total,
                    width: total ? Math.max(14, Math.round((total / maxTotal) * 100)) : 0,
                    parts: this.players
                        .filter(player => teams[player.id])
                        .map(player => ({ id: player.id, color: player.color, count: teams[player.id] }))
                };
            });
        }
    }
};
</script>

<style scoped>
.rs{
    --rs-text: #334155;
    --rs-sub: #94a3b8;
    --rs-box: #f1f5f9;
    --rs-box-green: #ecfdf5;
    --rs-track: #e2e8f0;
    --rs-green-text: #047857;
    text-align: left;
}
.rs-dark{
    --rs-text: #e2e8f0;
    --rs-sub: #94a3b8;
    --rs-box: rgba(255,255,255,.06);
    --rs-box-green: rgba(52,211,153,.1);
    --rs-track: rgba(255,255,255,.1);
    --rs-green-text: #6ee7b7;
}
.rs-box{
    margin-bottom: 14px;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--rs-box);
}
.rs-compact .rs-box{ margin: 0; padding: 6px 8px; }
.rs-box-green{ background: var(--rs-box-green); }
.rs-title{
    margin: 0 0 10px;
    text-align: center;
    font-size: 14px;
    font-weight: 900;
    color: var(--rs-text);
}
.rs-box-green .rs-title{ color: var(--rs-green-text); }
.rs-title small{
    display: block;
    margin-top: 1px;
    font-size: 10px;
    font-weight: 700;
    color: var(--rs-sub);
}
.rs-team{
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
    font-size: 12px;
    font-weight: 800;
    color: var(--rs-text);
}
.rs-team-name{
    flex: none;
    width: 74px;
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
}
.rs-team-name em{ font-style: normal; font-size: 10px; font-weight: 700; color: var(--rs-sub); }
.rs-dot{ width: 9px; height: 9px; border-radius: 50%; flex: none; }
.rs-bar{
    flex: 1;
    height: 14px;
    border-radius: 9999px;
    background: var(--rs-track);
    overflow: hidden;
}
.rs-bar-fill{ display: block; height: 100%; border-radius: 9999px; transition: width .6s ease; }
.rs-team-count{ flex: none; width: 58px; text-align: right; white-space: nowrap; }
.rs-team-count small{ font-size: 10px; margin-left: 1px; color: var(--rs-sub); }
.rs-crown{ margin-right: 2px; font-size: 11px; }
.rs-note{ margin: 4px 0 0; text-align: center; font-size: 10px; color: var(--rs-sub); }
.rs-note-green{ margin-top: 10px; line-height: 1.6; color: var(--rs-green-text); }

.rs-pyramid{ display: flex; flex-direction: column; align-items: stretch; gap: 3px; }
.rs-row{ display: flex; align-items: center; gap: 8px; }
.rs-level{
    flex: none;
    width: 46px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    font-size: 11px;
    font-weight: 900;
    color: var(--rs-text);
}
.rs-level svg{ width: 12px; height: 12px; fill: var(--rs-sub); }
.rs-layer-wrap{ flex: 1; display: flex; justify-content: center; align-items: center; min-height: 26px; }
.rs-layer{
    display: flex;
    height: 26px;
    overflow: hidden;
    clip-path: polygon(7% 0, 93% 0, 100% 100%, 0 100%);
    filter: drop-shadow(0 2px 3px rgba(0,0,0,.25));
    transition: width .6s ease;
}
.rs-seg{ display: block; height: 100%; }
.rs-seg + .rs-seg{ box-shadow: -1px 0 0 rgba(255,255,255,.55); }
.rs-empty{ font-size: 11px; font-weight: 700; color: var(--rs-sub); opacity: .6; }
.rs-count{ flex: none; width: 28px; font-size: 12px; font-weight: 900; color: var(--rs-text); }
.rs-compact .rs-layer-wrap{ min-height: 11px; }
.rs-compact .rs-layer{ height: 11px; }
.rs-compact .rs-pyramid{ gap: 2px; }
</style>
