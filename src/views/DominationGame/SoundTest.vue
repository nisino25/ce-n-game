<template>
    <!-- ■試作：効果音の「音くらべ」。場面ごとに、フリー素材（CC0・100こ）から録音をえらんで、聞きくらべる（開発用の仮画面） -->
    <div class="st">
        <header class="st-header">
            <button class="st-back" @click="$router.push({ name: 'Home' })"><span>◀</span> もどる</button>
            <h1 class="st-heading">音くらべ<small>SOUND TEST</small></h1>
        </header>

        <p class="st-lead">
            場面ごとに、「いまの音」「作った音（シンセ）」と、素材（100こ）から えらんだ音を、聞きくらべられるよ。
            えらぶと、この端末の ゲームで すぐ その音に なるよ（「なし」にすると、作った音に もどる）。
        </p>

        <section class="st-slots">
            <article v-for="slot in slotList" :key="slot.id" class="st-slot">
                <div class="st-slot-head">
                    <p class="st-slot-title">{{ slot.icon }} {{ slot.label }}</p>
                    <span class="st-slot-state" :class="{ on: chosen[slot.id] }">{{ chosen[slot.id] ? chosen[slot.id].file : '作った音' }}</span>
                </div>
                <div class="st-slot-buttons">
                    <button class="st-play" @click="playCurrent(slot.id)">▶ いまの音</button>
                    <button class="st-play st-play-soft" @click="playSynth(slot.id)">▶ 作った音</button>
                </div>
                <div class="st-slot-pick">
                    <select :value="chosen[slot.id] ? chosen[slot.id].file : ''" @change="choose(slot.id, $event.target.value)">
                        <option value="">（なし＝作った音）</option>
                        <optgroup v-for="group in groups" :key="group.name" :label="group.label">
                            <option v-for="file in group.files" :key="file" :value="file">{{ file }}</option>
                        </optgroup>
                    </select>
                    <label class="st-volume">音量<input type="range" min="0.2" max="2" step="0.1" :value="chosen[slot.id] ? chosen[slot.id].volume : 1" :disabled="!chosen[slot.id]" @input="changeVolume(slot.id, $event.target.value)"></label>
                </div>
            </article>
        </section>

        <section class="st-box">
            <p class="st-box-title">いまの えらびかた（Claude に そのまま はりつけて つたえられる）</p>
            <pre class="st-pre">{{ summary }}</pre>
            <button class="st-play st-play-soft" @click="resetAll">ぜんぶ 作った音に もどす</button>
        </section>

        <section class="st-box">
            <p class="st-box-title">素材 100こ（タップで 聞く）</p>
            <div v-for="group in groups" :key="group.name" class="st-group">
                <p class="st-group-title">{{ group.label }}</p>
                <div class="st-chips">
                    <button v-for="file in group.files" :key="file" class="st-chip" @click="preview(file)">▶ {{ file }}</button>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import { sfx } from "@/utils/sfx.js";

const GROUP_LABELS = {
    air: "かぜ・空気",
    door: "ドア",
    footstep: "足音（地面）",
    footstep_wet: "足音（ぬれた地面）",
    footstep_wood: "足音（木）",
    glass: "ガラス",
    hit: "たたく",
    items: "どうぐ",
    lock: "かぎ",
    loop_ambient: "かんきょう音（ループ）",
    loop_construction: "工事（ループ）",
    loop_highway: "道路（ループ）",
    loop_machine: "きかい（ループ）",
    loop_water: "水（ループ）",
    metal: "金属",
    metal_hit: "金属をたたく",
    misc: "そのほか",
    stones: "石",
    switch: "スイッチ",
    thunder: "かみなり",
    wood: "木",
    wood_hit: "木をたたく"
};

export default {
    name: "SoundTest",

    data() {
        return {
            files: [],
            chosen: sfx.getSlots(),
            slotList: [
                { id: "select", icon: "👆", label: "カードを えらぶ" },
                { id: "place_sea", icon: "🌊", label: "置く：海" },
                { id: "place_river", icon: "🏞", label: "置く：川" },
                { id: "place_forest", icon: "🌲", label: "置く：森" },
                { id: "place_town", icon: "🏘", label: "置く：町" },
                { id: "place_dirt", icon: "🟫", label: "置く：土" },
                { id: "eat", icon: "😋", label: "食べた" },
                { id: "turn", icon: "🔔", label: "自分の番" },
                { id: "skip", icon: "⏭", label: "スキップ" },
                { id: "error", icon: "🚫", label: "置けない" },
                { id: "win", icon: "🏆", label: "勝った" },
                { id: "lose", icon: "🌙", label: "負けた" }
            ]
        };
    },

    computed: {
        groups() {
            const map = {};
            this.files.forEach(file => {
                const key = file.replace(/_\d+$/, "");
                (map[key] = map[key] || []).push(file);
            });
            return Object.keys(map).map(name => ({ name, label: GROUP_LABELS[name] || name, files: map[name] }));
        },

        summary() {
            const lines = this.slotList.map(slot => {
                const chosen = this.chosen[slot.id];
                return `${slot.id}: ${chosen ? `${chosen.file}（音量 ${chosen.volume}）` : "作った音"}`;
            });
            return lines.join("\n");
        }
    },

    async mounted() {
        sfx.unlock();
        try {
            const response = await fetch("/sounds/pack/index.json");
            this.files = await response.json();
        } catch (e) {
            console.error("素材の一覧を読み込めませんでした", e);
        }
    },

    methods: {
        playCurrent(slot) {
            sfx.unlock();
            sfx.playSlot(slot);
        },

        playSynth(slot) {
            sfx.unlock();
            sfx.previewSynth(slot);
        },

        preview(file) {
            sfx.unlock();
            sfx.previewFile(file, 1);
        },

        async choose(slot, file) {
            sfx.setSlot(slot, file, 1);
            this.chosen = sfx.getSlots();
            if (file) await sfx.previewFile(file, 1);
            else sfx.previewSynth(slot);
        },

        changeVolume(slot, value) {
            const chosen = this.chosen[slot];
            if (!chosen) return;
            sfx.setSlot(slot, chosen.file, Number(value));
            this.chosen = sfx.getSlots();
        },

        resetAll() {
            this.slotList.forEach(slot => sfx.setSlot(slot.id, ""));
            this.chosen = sfx.getSlots();
        }
    }
};
</script>

<style scoped>
.st{
    min-height: 100vh;
    padding-bottom: 48px;
    color: #e2e8f0;
    background:
        radial-gradient(ellipse 80% 40% at 50% -5%, rgba(34,211,238,.18), transparent 70%),
        linear-gradient(180deg, #0b1220, #05080f);
}
.st-header{
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(103,232,249,.25);
    background: rgba(8,14,26,.88);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
}
.st-back{
    padding: 6px 14px;
    border: 1.5px solid rgba(103,232,249,.7);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 900;
    color: #cffafe;
}
.st-back span{ font-size: 10px; color: #67e8f9; }
.st-heading{ margin: 0; font-size: 18px; font-weight: 900; letter-spacing: .12em; color: #a5f3fc; }
.st-heading small{ display: block; font-size: 9px; letter-spacing: .3em; color: #64748b; }
.st-lead{ max-width: 720px; margin: 16px auto 0; padding: 0 16px; font-size: 12px; font-weight: 700; line-height: 1.8; color: #94a3b8; }

.st-slots{ display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; max-width: 960px; margin: 14px auto 0; padding: 0 16px; }
.st-slot{ padding: 12px 14px; border: 1px solid rgba(103,232,249,.22); border-radius: 16px; background: rgba(255,255,255,.05); }
.st-slot-head{ display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.st-slot-title{ margin: 0; font-size: 14px; font-weight: 900; }
.st-slot-state{ max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 1px 9px; border-radius: 9999px; background: rgba(255,255,255,.08); font-size: 10px; font-weight: 800; color: #94a3b8; }
.st-slot-state.on{ background: rgba(52,211,153,.2); color: #6ee7b7; }
.st-slot-buttons{ display: flex; gap: 8px; margin: 10px 0 8px; }
.st-play{ flex: 1; padding: 8px 10px; border: 1.5px solid rgba(103,232,249,.6); border-radius: 12px; background: rgba(34,211,238,.14); font-size: 12px; font-weight: 900; color: #e0f7ff; }
.st-play:active{ transform: scale(.97); }
.st-play-soft{ border-color: rgba(255,255,255,.25); background: rgba(255,255,255,.06); color: #cbd5e1; }
.st-slot-pick{ display: flex; flex-direction: column; gap: 6px; }
.st-slot-pick select{ width: 100%; padding: 7px 8px; border: 1px solid rgba(255,255,255,.25); border-radius: 10px; background: #0f172a; font-size: 12px; font-weight: 700; color: #e2e8f0; }
.st-volume{ display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; color: #94a3b8; }
.st-volume input{ flex: 1; }

.st-box{ max-width: 960px; margin: 14px auto 0; padding: 14px 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04); }
.st-box-title{ margin: 0 0 8px; font-size: 13px; font-weight: 900; color: #a5f3fc; }
.st-pre{ margin: 0 0 10px; padding: 10px 12px; border-radius: 10px; background: #0b1220; font-size: 11px; line-height: 1.7; color: #cbd5e1; white-space: pre-wrap; user-select: all; }
.st-group{ margin-bottom: 10px; }
.st-group-title{ margin: 0 0 4px; font-size: 11px; font-weight: 900; color: #94a3b8; }
.st-chips{ display: flex; flex-wrap: wrap; gap: 5px; }
.st-chip{ padding: 4px 9px; border: 1px solid rgba(255,255,255,.2); border-radius: 9999px; background: rgba(255,255,255,.05); font-size: 10px; font-weight: 800; color: #cbd5e1; }
.st-chip:active{ background: rgba(34,211,238,.25); }
</style>
