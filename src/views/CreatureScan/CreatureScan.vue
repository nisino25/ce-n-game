<template>
    <div class="min-h-screen bg-gradient-to-b from-emerald-50 to-emerald-100 flex justify-center px-4 py-6">
        <div class="w-full max-w-xl">

            <header class="flex items-center justify-between mb-5">
                <h1 class="text-xl font-bold text-emerald-900 flex items-center gap-2">
                    <span>🔎</span><span>生き物スキャン</span>
                </h1>
                <button
                    class="text-sm text-emerald-700 hover:text-emerald-900 underline"
                    @click="goHome"
                >
                    🏠 ホームにもどる
                </button>
            </header>

            <!-- 撮影・アップロードエリア -->
            <div v-if="phase === 'idle' || phase === 'preview'" class="bg-white rounded-2xl shadow-sm p-5">
                <label
                    class="block border-2 border-dashed rounded-2xl cursor-pointer transition"
                    :class="previewUrl ? 'border-emerald-300 p-2' : 'border-emerald-300 hover:border-emerald-400 p-10 text-center'"
                >
                    <input
                        ref="fileInput"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        class="hidden"
                        @change="onFileChange"
                    >

                    <template v-if="previewUrl">
                        <img :src="previewUrl" class="w-full max-h-80 object-contain rounded-xl">
                    </template>
                    <template v-else>
                        <div class="text-5xl mb-3">📷</div>
                        <p class="text-emerald-800 font-bold">写真をとる・えらぶ</p>
                        <p class="text-emerald-500 text-sm mt-1">虫でも植物でもOK</p>
                    </template>
                </label>

                <button
                    v-if="previewUrl"
                    class="mt-3 text-sm text-emerald-600 hover:text-emerald-800 underline"
                    @click="resetPhoto"
                >
                    別の写真にする
                </button>

                <div class="mt-4">
                    <label class="text-xs text-emerald-700 font-bold block mb-1">どこで見つけた？（にんい）</label>
                    <input
                        v-model="hint"
                        type="text"
                        placeholder="例: 京都市の庭, 10月"
                        class="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                </div>

                <button
                    class="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-sm transition"
                    :disabled="!selectedFile"
                    @click="identify"
                >
                    はんていする
                </button>
            </div>

            <!-- 判定中 -->
            <div v-else-if="phase === 'loading'" class="bg-white rounded-2xl shadow-sm p-10 text-center">
                <div class="text-5xl mb-4 animate-bounce">🔬</div>
                <p class="text-emerald-800 font-bold">AIが はんてい中…</p>
                <p class="text-emerald-500 text-sm mt-1">2〜7秒くらい かかります</p>
            </div>

            <!-- 生き物が写っていない / 特定できない -->
            <div v-else-if="phase === 'no_creature' || phase === 'uncertain'" class="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div class="text-5xl mb-4">🤔</div>
                <p class="text-emerald-800 font-bold mb-1">
                    {{ phase === 'no_creature' ? '生き物が写っていないみたい' : '生き物はいそうだけど、特定できなかったよ' }}
                </p>
                <p class="text-emerald-500 text-sm mb-5">もう一度、写真をとってみよう！</p>
                <button
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition"
                    @click="resetPhoto"
                >
                    もう一度とる
                </button>
            </div>

            <!-- エラー -->
            <div v-else-if="phase === 'error'" class="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div class="text-5xl mb-4">⚠️</div>
                <p class="text-rose-700 font-bold mb-1">はんていできませんでした</p>
                <p class="text-slate-500 text-sm mb-5">{{ errorMessage }}</p>
                <button
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition"
                    @click="resetPhoto"
                >
                    もう一度ためす
                </button>
            </div>

            <!-- 結果 -->
            <div v-else-if="phase === 'identified'" class="flex flex-col gap-4">
                <div
                    v-for="candidate in candidates"
                    :key="candidate.rank"
                    class="bg-white rounded-2xl shadow-sm overflow-hidden border"
                    :class="candidate.rank === 1 ? 'border-emerald-300' : 'border-slate-200'"
                >
                    <div
                        class="px-4 py-2 flex items-center justify-between text-xs font-bold"
                        :class="candidate.rank === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'"
                    >
                        <span>{{ candidate.rank === 1 ? '⭐ いちばん近い候補' : `候補 ${candidate.rank}` }}</span>
                        <span>確信度 {{ Math.round(candidate.confidence * 100) }}%</span>
                    </div>

                    <div class="p-5">
                        <div class="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <p class="text-2xl font-bold text-emerald-900">{{ candidate.name_ja }}</p>
                                <p class="text-xs text-slate-400">{{ candidate.name_kana }}・{{ candidate.name_scientific }}</p>
                            </div>
                            <span
                                class="flex-none text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
                                :style="{ background: rarityColor(candidate.rarity.tier) + '22', color: rarityColor(candidate.rarity.tier) }"
                            >
                                {{ candidate.rarity.tier_label_ja }}（{{ candidate.rarity.value }}）
                            </span>
                        </div>

                        <div
                            v-if="candidate.is_dangerous"
                            class="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 mb-3"
                        >
                            ⚠️ {{ candidate.danger_note }}
                        </div>

                        <p class="text-sm text-slate-700 leading-relaxed mb-3">{{ candidate.description_for_kids }}</p>

                        <div class="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                            <div>🏡 すみか: {{ candidate.habitat }}</div>
                            <div>🍽️ 食べ方: {{ dietLabel(candidate.diet) }}</div>
                            <div>🔗 栄養段階: Lv{{ candidate.trophic_level }}</div>
                            <div>🏷️ 分類: {{ categoryLabel(candidate.category) }}</div>
                        </div>

                        <p class="text-[11px] text-slate-400 border-t pt-2">
                            レア度の理由: {{ candidate.rarity.reason }}
                        </p>
                    </div>
                </div>

                <button
                    class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-3 rounded-xl transition"
                    @click="resetPhoto"
                >
                    もう一度スキャンする
                </button>
            </div>

        </div>
    </div>
</template>

<script>
// ■生き物判定API連携（2026-09-20導入）
// 参照: /Users/nozomuando/Downloads/生き物判定API_連携ガイド.pdf
// このAPIキーはドキュメント上「フロントのJSに含まれる前提のゆるい鍵」と明記されており、
// 本格的な秘匿は不要（請求の暴走はサーバー側のインスタンス数上限・予算アラートで防止済み）
const IKIMONO_API_BASE = "https://ikimono-api-m4qe2atuyq-an.a.run.app";
const IKIMONO_API_KEY = "WFulVxBdSXuvxH1sPNBDRcsTuvXL-dlOQBw1_iD-M7U";

const RARITY_COLORS = {
    common: "#64748b",
    uncommon: "#16a34a",
    rare: "#2563eb",
    very_rare: "#9333ea",
    legendary: "#d97706"
};

const CATEGORY_LABELS = {
    insect: "こんちゅう",
    plant: "植物",
    bird: "鳥",
    mammal: "ほ乳類",
    reptile: "は虫類",
    amphibian: "両生類",
    fish: "魚",
    other: "その他"
};

const DIET_LABELS = {
    producer: "光合成する",
    herbivore: "草食",
    carnivore: "肉食",
    omnivore: "雑食",
    detritivore: "分解者"
};

export default {
    name: "CreatureScan",

    data() {
        return {
            phase: "idle", // idle | preview | loading | identified | uncertain | no_creature | error
            selectedFile: null,
            previewUrl: null,
            hint: "",
            candidates: [],
            errorMessage: ""
        };
    },

    beforeUnmount() {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
    },

    methods: {
        goHome() {
            this.$router.push({ name: "Home" });
        },

        onFileChange(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (this.previewUrl) {
                URL.revokeObjectURL(this.previewUrl);
            }

            this.selectedFile = file;
            this.previewUrl = URL.createObjectURL(file);
            this.phase = "preview";
        },

        resetPhoto() {
            if (this.previewUrl) {
                URL.revokeObjectURL(this.previewUrl);
            }

            this.selectedFile = null;
            this.previewUrl = null;
            this.candidates = [];
            this.errorMessage = "";
            this.phase = "idle";

            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = "";
            }
        },

        async identify() {
            if (!this.selectedFile) return;

            this.phase = "loading";

            try {
                const fd = new FormData();
                fd.append("image", this.selectedFile);
                if (this.hint) fd.append("hint", this.hint);
                fd.append("max_candidates", 3);

                const res = await fetch(`${IKIMONO_API_BASE}/v1/identify`, {
                    method: "POST",
                    headers: { "X-API-Key": IKIMONO_API_KEY },
                    body: fd
                });

                const data = await res.json();

                if (!res.ok) {
                    this.errorMessage = (data.error && data.error.message) || "はんていに失敗しました。もう一度ためしてね。";
                    this.phase = "error";
                    return;
                }

                if (data.status === "no_creature") {
                    this.phase = "no_creature";
                    return;
                }

                if (data.status === "uncertain") {
                    this.phase = "uncertain";
                    return;
                }

                this.candidates = data.candidates || [];
                this.phase = "identified";
            } catch (e) {
                console.error("生き物判定APIの呼び出しに失敗しました", e);
                this.errorMessage = "つうしんに失敗しました。電波状況を確認してもう一度ためしてね。";
                this.phase = "error";
            }
        },

        rarityColor(tier) {
            return RARITY_COLORS[tier] || "#64748b";
        },

        categoryLabel(category) {
            return CATEGORY_LABELS[category] || category;
        },

        dietLabel(diet) {
            return DIET_LABELS[diet] || diet;
        }
    }
};
</script>
