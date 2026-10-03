<template>
    <!-- ■試作：ゲーム終了時の「じんち」と「生態系ピラミッド」を、いくつものゲームの結果で見くらべる画面（開発用の仮画面） -->
    <div class="rc">
        <header class="rc-header">
            <button class="rc-back" @click="$router.push({ name: 'Home' })"><span>◀</span> もどる</button>
            <h1 class="rc-heading">けっか くらべ<small>RESULT COMPARE</small></h1>
        </header>

        <p class="rc-lead">
            ゲームが おわったときの 画面（じんち・生態系ピラミッド）を、ならべて くらべられるよ。
            「見本」は 決まった かず、「プレイ」は テストモードで 最後まで あそんだ ゲームが、じどうで ふえていくよ
            （AIテストエリアで あそぶ → 終了で 保存）。
        </p>

        <!-- ■ピラミッドを、ぜんぶ ならべて見る（かたちの ちがいが、ひと目で わかる） -->
        <section class="rc-strip" aria-label="ピラミッドの 一覧">
            <div v-for="game in games" :key="game.key" class="rc-mini">
                <GameResultSummary :players="game.players" :tier-team="game.tierTeam" dark compact />
                <p class="rc-mini-title">{{ game.shortTitle }}</p>
                <span class="rc-badge" :class="game.shape.good ? 'rc-badge-good' : 'rc-badge-warn'">{{ game.shape.label }}</span>
            </div>
        </section>

        <div class="rc-grid">
            <section v-for="game in games" :key="game.key" class="rc-card">
                <div class="rc-card-head">
                    <span class="rc-kind" :class="game.sample ? 'rc-kind-sample' : 'rc-kind-play'">{{ game.sample ? '見本' : 'プレイ' }}</span>
                    <p class="rc-card-title">{{ game.title }}</p>
                </div>
                <p v-if="game.note" class="rc-card-note">{{ game.note }}</p>

                <div class="rc-winner" :style="{ '--c': game.winner.color }">
                    <span class="rc-trophy">🏆</span>
                    <span><b>{{ game.winner.name }}</b> が 1位<small>{{ game.winner.score }}点</small></span>
                </div>

                <ul class="rc-ranks">
                    <li v-for="player in ranked(game)" :key="player.id">
                        <span class="rc-rank">{{ player.rank }}</span>
                        <span class="rc-dot" :style="{ background: player.color }"></span>
                        <span class="rc-name">{{ player.name }}<em v-if="player.id === game.selfId">あなた</em></span>
                        <span class="rc-score">{{ player.score }}<small>点</small></span>
                    </li>
                </ul>

                <GameResultSummary :players="game.players" :tier-team="game.tierTeam" :self-id="game.selfId" dark />
            </section>
        </div>

        <p v-if="loading" class="rc-foot">プレイの けっかを よみこみ中…</p>
        <p v-else-if="!played.length" class="rc-foot">まだ「プレイ」は ないよ。AIテストエリアで 1ゲーム あそんでみてね</p>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { TEAM_COLORS } from "@/utils/dominationSlots.js";
import GameResultSummary from "./GameResultSummary.vue";

const TIER_POINTS = { 1: 1, 2: 3, 3: 5, 4: 8 };
const PLAYERS = [
    { id: 1, name: "水チーム", color: TEAM_COLORS.water },
    { id: 2, name: "風チーム", color: TEAM_COLORS.air },
    { id: 3, name: "土チーム", color: TEAM_COLORS.earth }
];

// ■見本：チームごとの、レベル別のカードの数（てんすうは、これから出す）
const sample = (key, title, note, counts) => {
    const tierTeam = {};
    [1, 2, 3, 4].forEach((tier, index) => {
        tierTeam[tier] = { 1: counts[index][0], 2: counts[index][1], 3: counts[index][2] };
    });
    const players = PLAYERS.map(player => ({
        ...player,
        isAI: player.id !== 2,
        score: [1, 2, 3, 4].reduce((sum, tier) => sum + tierTeam[tier][player.id] * TIER_POINTS[tier], 0)
    }));
    return { key, title, note, sample: true, players, tierTeam, selfId: 2 };
};

const SAMPLES = [
    sample("healthy", "ひろい ピラミッド", "したの レベルが たくさん。生態系が げんき", [[9, 8, 7], [4, 4, 3], [2, 2, 1], [1, 0, 1]]),
    sample("top-heavy", "うえばかり", "うえの いきものばかりで、ささえる いきものが すくない", [[2, 1, 1], [3, 3, 2], [4, 4, 3], [3, 2, 3]]),
    sample("one-team", "ひとりじめ", "1チームが おさえすぎて、ほかが ほとんど いない", [[20, 3, 2], [10, 1, 1], [4, 0, 0], [2, 0, 0]])
];

// ■ピラミッドのかたち：下のレベルほど多ければ「きれい」。うえが多かったり、1チームがおさえすぎていたら、そう伝える
const pyramidShape = game => {
    const totals = [1, 2, 3, 4].map(tier => Object.values(game.tierTeam[tier] || {}).reduce((sum, count) => sum + count, 0));
    const all = totals.reduce((sum, count) => sum + count, 0);
    if (!all) return { label: "まだ なし", good: false };
    const teamTotals = {};
    Object.values(game.tierTeam).forEach(teams => Object.entries(teams).forEach(([team, count]) => { teamTotals[team] = (teamTotals[team] || 0) + count; }));
    if (Math.max(...Object.values(teamTotals)) / all > 0.6) return { label: "ひとりじめ", good: false };
    const pyramid = totals[0] >= totals[1] && totals[1] >= totals[2] && totals[2] >= totals[3];
    return pyramid ? { label: "きれいな ピラミッド", good: true } : { label: "いびつな かたち", good: false };
};

export default {
    name: "ResultCompare",
    components: { GameResultSummary },

    data() {
        return { played: [], loading: true };
    },

    computed: {
        games() {
            return [...this.played, ...SAMPLES].map(game => ({
                ...game,
                shortTitle: game.shortTitle || game.title.replace(" のゲーム", ""),
                shape: pyramidShape(game),
                winner: [...game.players].sort((a, b) => b.score - a.score)[0] || { name: "", color: "#94a3b8", score: 0 }
            }));
        }
    },

    async mounted() {
        try {
            const snap = await db.collection("gameResults").orderBy("createdAt", "desc").limit(12).get();
            this.played = snap.docs.map(doc => {
                const data = doc.data();
                const time = data.createdAt ? new Date(data.createdAt) : null;
                const when = time ? `${time.getMonth() + 1}/${time.getDate()} ${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}` : "";
                return {
                    key: doc.id,
                    title: when ? `${when} のゲーム` : "あそんだ ゲーム",
                    note: data.resigned ? "「まけました」で おわった" : "",
                    sample: false,
                    players: data.players || [],
                    tierTeam: data.tierTeam || {},
                    selfId: data.humanPlayerId || null
                };
            });
        } catch (e) {
            console.error("けっかの読み込みに失敗しました", e);
        } finally {
            this.loading = false;
        }
    },

    methods: {
        ranked(game) {
            const sorted = [...game.players].sort((a, b) => b.score - a.score);
            return sorted.map(player => ({ ...player, rank: 1 + sorted.filter(other => other.score > player.score).length }));
        }
    }
};
</script>

<style scoped>
.rc{
    min-height: 100vh;
    padding-bottom: 48px;
    color: #e2e8f0;
    background:
        radial-gradient(ellipse 80% 40% at 50% -5%, rgba(34,211,238,.18), transparent 70%),
        linear-gradient(180deg, #0b1220, #05080f);
}
.rc-header{
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(103,232,249,.25);
    background: rgba(8,14,26,.85);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
}
.rc-back{
    padding: 6px 14px;
    border: 1.5px solid rgba(103,232,249,.7);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 900;
    color: #cffafe;
    box-shadow: 0 0 10px rgba(34,211,238,.35);
}
.rc-back span{ font-size: 10px; color: #67e8f9; }
.rc-heading{
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: .12em;
    color: #a5f3fc;
    text-shadow: 0 0 12px rgba(34,211,238,.7);
}
.rc-heading small{ display: block; font-size: 9px; letter-spacing: .3em; color: #64748b; text-shadow: none; }
.rc-lead{
    max-width: 960px;
    margin: 16px auto 0;
    padding: 0 16px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.8;
    color: #94a3b8;
}

.rc-strip{
    display: flex;
    gap: 12px;
    max-width: 960px;
    margin: 16px auto 0;
    padding: 12px 16px;
    overflow-x: auto;
}
.rc-mini{
    flex: none;
    width: 128px;
    padding: 10px 8px 10px;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    text-align: center;
}
.rc-mini-title{ margin: 6px 0 4px; font-size: 11px; font-weight: 900; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-badge{
    display: inline-block;
    padding: 1px 8px;
    border-radius: 9999px;
    font-size: 9px;
    font-weight: 900;
}
.rc-badge-good{ background: rgba(52,211,153,.2); color: #6ee7b7; border: 1px solid rgba(52,211,153,.5); }
.rc-badge-warn{ background: rgba(251,191,36,.15); color: #fcd34d; border: 1px solid rgba(251,191,36,.45); }

.rc-grid{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    max-width: 960px;
    margin: 8px auto 0;
    padding: 0 16px;
}
.rc-card{
    padding: 16px;
    border: 1px solid rgba(103,232,249,.22);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
    box-shadow: 0 8px 28px rgba(0,0,0,.35);
}
.rc-card-head{ display: flex; align-items: center; gap: 8px; }
.rc-kind{ padding: 1px 9px; border-radius: 9999px; font-size: 10px; font-weight: 900; color: #fff; }
.rc-kind-sample{ background: #64748b; }
.rc-kind-play{ background: #059669; }
.rc-card-title{ margin: 0; font-size: 15px; font-weight: 900; color: #f1f5f9; }
.rc-card-note{ margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #94a3b8; }

.rc-winner{
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 10px;
    padding: 9px 12px;
    border-radius: 12px;
    border: 1px solid var(--c);
    background: linear-gradient(90deg, color-mix(in srgb, var(--c) 28%, transparent), transparent);
    font-size: 13px;
    font-weight: 700;
}
.rc-winner b{ font-weight: 900; color: var(--c); }
.rc-winner small{ display: block; font-size: 11px; color: #94a3b8; }
.rc-trophy{ font-size: 24px; filter: drop-shadow(0 0 6px rgba(251,191,36,.6)); }

.rc-ranks{ margin: 0 0 14px; padding: 0; list-style: none; text-align: left; }
.rc-ranks li{
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 4px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    font-size: 13px;
    font-weight: 800;
}
.rc-rank{
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255,255,255,.12);
    text-align: center;
    font-size: 11px;
    line-height: 20px;
    font-weight: 900;
}
.rc-dot{ width: 9px; height: 9px; border-radius: 50%; flex: none; }
.rc-name{ flex: 1; }
.rc-name em{ margin-left: 5px; font-style: normal; font-size: 10px; font-weight: 700; color: #94a3b8; }
.rc-score{ font-weight: 900; }
.rc-score small{ margin-left: 1px; font-size: 10px; color: #94a3b8; }
.rc-foot{ margin-top: 24px; text-align: center; font-size: 12px; font-weight: 700; color: #64748b; }
</style>
