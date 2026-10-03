<template>
    <!-- ■試作：ゲーム終了時の「じんち」と「生態系ピラミッド」を、ゲームを選んで、いろいろな見せ方で見る画面（開発用の仮画面） -->
    <div class="rc">
        <header class="rc-header">
            <button class="rc-back" @click="$router.push({ name: 'Home' })"><span>◀</span> もどる</button>
            <h1 class="rc-heading">けっか くらべ<small>RESULT COMPARE</small></h1>
        </header>

        <p class="rc-lead">
            上の スライドから ゲームを えらぶと、したの メインに、その ゲームの けっかが、いろいろな 見せ方で 出るよ。
            「見本」は 決まった かず、「プレイ」は AIテストで 最後まで あそんだ ゲーム（おわると じどうで ふえるよ）。
        </p>

        <!-- ■上のスライド：ゲームを えらぶ（ピラミッドの かたちが、ひと目で わかる） -->
        <section ref="strip" class="rc-strip" aria-label="ゲームを えらぶ">
            <button
                v-for="game in games"
                :key="game.key"
                :ref="el => setMiniRef(game.key, el)"
                class="rc-mini"
                :class="{ active: game.key === selected.key }"
                @click="selectedKey = game.key"
            >
                <span class="rc-mini-kind" :class="game.sample ? 'rc-kind-sample' : 'rc-kind-play'">{{ game.sample ? '見本' : 'プレイ' }}</span>
                <GameResultSummary :players="game.players" :tier-team="game.tierTeam" dark compact />
                <span class="rc-mini-title">{{ game.shortTitle }}</span>
                <span class="rc-mini-winner" :style="{ '--c': game.winner.color }">🏆 {{ game.winner.name.replace('チーム', '') }}</span>
                <span class="rc-badge" :class="game.shape.good ? 'rc-badge-good' : 'rc-badge-warn'">{{ game.shape.label }}</span>
            </button>
        </section>

        <!-- ■下のメイン：えらんだ ゲーム -->
        <main class="rc-main">
            <section class="rc-selected">
                <div class="rc-card-head">
                    <span class="rc-kind" :class="selected.sample ? 'rc-kind-sample' : 'rc-kind-play'">{{ selected.sample ? '見本' : 'プレイ' }}</span>
                    <p class="rc-card-title">{{ selected.title }}</p>
                    <button v-if="selected.gameLink" class="rc-open" @click="openGame(selected)">🎮 ゲームの画面で 見る</button>
                </div>
                <p v-if="selected.note" class="rc-card-note">{{ selected.note }}</p>
                <p v-if="selected.gameLink" class="rc-card-note">ゲームの画面では、盤面・「ふりかえる」も 見られるよ（その 枠の いちばん あたらしい ゲームが ひらくよ）</p>

                <div class="rc-selected-body">
                    <div class="rc-winner" :style="{ '--c': selected.winner.color }">
                        <span class="rc-trophy">🏆</span>
                        <span><b>{{ selected.winner.name }}</b> が 1位<small>{{ selected.winner.score }}点</small></span>
                    </div>
                    <ul class="rc-ranks">
                        <li v-for="player in ranked(selected)" :key="player.id">
                            <span class="rc-rank">{{ player.rank }}</span>
                            <span class="rc-dot" :style="{ background: player.color }"></span>
                            <span class="rc-name">{{ player.name }}<em v-if="player.id === selected.selfId">あなた</em></span>
                            <span class="rc-score">{{ player.score }}<small>点</small></span>
                        </li>
                    </ul>
                </div>
            </section>

            <div class="rc-grid rc-grid-styles">
                <section class="rc-card">
                    <div class="rc-card-head"><span class="rc-kind rc-kind-play">案A</span><p class="rc-card-title">つみあげ ピラミッド（いまの）</p></div>
                    <p class="rc-card-note">レベルごとの かずが、一目で分かる。チームの内わけは、色の長さで見る</p>
                    <GameResultSummary :players="selected.players" :tier-team="selected.tierTeam" :self-id="selected.selfId" dark />
                </section>
                <section v-for="style in styles" :key="style.id" class="rc-card">
                    <div class="rc-card-head"><span class="rc-kind rc-kind-play">{{ style.label }}</span><p class="rc-card-title">{{ style.title }}</p></div>
                    <p class="rc-card-note">{{ style.note }}</p>
                    <ResultVariants :players="selected.players" :tier-team="selected.tierTeam" :scores="selected.scores" :variant="style.id" />
                </section>
            </div>
        </main>

        <p v-if="loading" class="rc-foot">プレイの けっかを よみこみ中…</p>
        <p v-else-if="!played.length" class="rc-foot">まだ「プレイ」は ないよ。AIテストで 1ゲーム あそんでみてね</p>
    </div>
</template>

<script>
import db from "@/firebase.js";
import { TEAM_COLORS } from "@/utils/dominationSlots.js";
import GameResultSummary from "./GameResultSummary.vue";
import ResultVariants from "./ResultVariants.vue";
import mapSpotsSeed from "./mapSpots.json";

const TIER_POINTS = { 1: 1, 2: 3, 3: 5, 4: 10 };
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
    components: { GameResultSummary, ResultVariants },

    data() {
        return {
            miniRefs: {},
            played: [],
            loading: true,
            selectedKey: "",
            // ■ちがう見せ方の案（同じデータを、これらで見くらべる）
            styles: [
                { id: "triangle", label: "案B", title: "三角ピラミッド", note: "ほんものの ピラミッドの形。下の段ほど ひろくなる。チームの色で、段ごとに分ける" },
                { id: "podium", label: "案C", title: "ひょうしょうだい", note: "順位を、いちばん先に見せる。上に、じんちの わりあい（％）" },
                { id: "donut", label: "案D", title: "ドーナツ（チームごと）", note: "チームごとに、どのレベルを おいたか。こい色が したのレベル" },
                { id: "radar", label: "案E", title: "レーダー", note: "チームの「とくい」な レベルの かたよりが、形で分かる" },
                { id: "pictogram", label: "案F", title: "カードの ならべ", note: "おいた カードの 形（▲■●★）を、そのまま ならべる。数えやすく、子どもに分かりやすい" },
                { id: "bubble", label: "案G", title: "あわの ひょう", note: "チーム × レベルを、あわの 大きさで。だれが どこに 多いかが、くらべやすい" },
                { id: "bars", label: "案H", title: "ぼうグラフ", note: "レベルごとに、3チームを ならべる。かずの ちがいが、いちばん 正かくに 分かる" },
                { id: "treemap", label: "案I", title: "タイル", note: "チームごとの 四角の中に、レベルの 四角。おおきさで、ざっくり くらべる" },
                { id: "rings", label: "案J", title: "ねんりん", note: "外がわが Lv1、うちがわが Lv4。まるい 形の ピラミッド。色の 長さが チームの わりあい" }
            ]
        };
    },

    computed: {
        selected() {
            return this.games.find(game => game.key === this.selectedKey) || this.games[0];
        },

        games() {
            return [...this.played, ...SAMPLES].map(game => ({
                ...game,
                shortTitle: game.shortTitle || game.title.replace(" のゲーム", ""),
                scores: Object.fromEntries(game.players.map(player => [player.id, player.score])),
                shape: pyramidShape(game),
                winner: [...game.players].sort((a, b) => b.score - a.score)[0] || { name: "", color: "#94a3b8", score: 0 }
            }));
        }
    },

    watch: {
        // えらんだゲームが、スライドの真ん中あたりに見えるようにする
        selectedKey() {
            this.$nextTick(() => {
                const el = this.miniRefs[this.selected.key];
                if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            });
        }
    },

    async mounted() {
        try {
            const snap = await db.collection("gameResults").orderBy("createdAt", "desc").limit(60).get();
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
                    selfId: data.humanPlayerId || null,
                    roomCode: data.roomCode || "",
                    gameLink: /^aitest-\d+-\d$/.test(data.roomCode || "")
                };
            });
        } catch (e) {
            console.error("けっかの読み込みに失敗しました", e);
        } finally {
            this.loading = false;
            // スライドは、いつも いちばん左（いちばん新しいゲーム）から
            this.$nextTick(() => {
                if (this.$refs.strip) this.$refs.strip.scrollLeft = 0;
            });
        }
    },

    methods: {
        setMiniRef(key, el) {
            if (el) this.miniRefs[key] = el;
        },

        // ■結果のゲームの画面へ（AIテストの枠の、いちばん新しいゲームを、観戦モードで開く）
        openGame(game) {
            const match = /^(aitest-\d+)-(\d)$/.exec(game.roomCode || "");
            if (!match) return;
            const spot = mapSpotsSeed.spots.find(item => item.id === match[1]);
            if (!spot) return;
            localStorage.setItem("dominationRoomCode", game.roomCode);
            localStorage.setItem("dominationPlace", JSON.stringify({
                city: spot.city,
                cityName: mapSpotsSeed.cities[spot.city].name,
                spotId: spot.id,
                spotName: spot.name,
                habitat: spot.habitat,
                gameNo: Number(match[2]),
                test: true
            }));
            localStorage.setItem("dominationSpectate", "1");
            this.$router.push("/dominationGame");
        },

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
.rc-grid-styles{ margin-top: 14px; }

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
    overflow-anchor: none; /* プレイの けっかが あとから ふえても、スライドの位置が、ずれないように */
    scroll-snap-type: x proximity;
    display: flex;
    gap: 12px;
    max-width: 960px;
    margin: 16px auto 0;
    padding: 12px 16px;
    overflow-x: auto;
}
.rc-mini{
    flex: none;
    scroll-snap-align: center;
    cursor: pointer;
    width: 128px;
    padding: 10px 8px 10px;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    text-align: center;
}
.rc-mini{ display: flex; flex-direction: column; align-items: center; gap: 2px; position: relative; transition: transform .15s, border-color .15s, box-shadow .15s; }
.rc-mini:hover{ transform: translateY(-2px); }
.rc-mini.active{ border-color: #67e8f9; box-shadow: 0 0 16px rgba(34,211,238,.55); background: rgba(34,211,238,.1); }
.rc-mini > *{ width: 100%; }
.rc-mini-kind{ align-self: flex-start; width: auto !important; padding: 0 8px; border-radius: 9999px; font-size: 9px; font-weight: 900; color: #fff; }
.rc-mini-winner{ font-size: 10px; font-weight: 900; color: var(--c); }
.rc-main{ max-width: 960px; margin: 6px auto 0; }
.rc-selected{ margin: 0 16px; padding: 14px 16px; border: 1px solid rgba(103,232,249,.4); border-radius: 18px; background: linear-gradient(180deg, rgba(34,211,238,.1), rgba(255,255,255,.03)); box-shadow: 0 0 22px rgba(34,211,238,.15); }
.rc-selected-body{ display: grid; grid-template-columns: 1fr; gap: 0 18px; }
@media (min-width: 640px){ .rc-selected-body{ grid-template-columns: 1fr 1fr; align-items: start; } }
.rc-open{ margin-left: auto; padding: 6px 14px; border: 1.5px solid #a78bfa; border-radius: 9999px; background: rgba(109,40,217,.35); font-size: 12px; font-weight: 900; color: #ede9fe; white-space: nowrap; }
.rc-open:active{ transform: scale(.96); }
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
