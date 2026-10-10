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
                <div
                    class="border-2 border-dashed border-emerald-300 rounded-2xl"
                    :class="previewUrl ? 'p-2' : 'p-10 text-center'"
                >
                    <!-- カメラで撮る用と、アルバムから選ぶ用（capture を付けると、アルバムが開かないため分けている） -->
                    <input
                        ref="cameraInput"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        class="hidden"
                        @change="onFileChange"
                    >
                    <input
                        ref="albumInput"
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="onFileChange"
                    >

                    <template v-if="previewUrl">
                        <img :src="previewUrl" class="w-full max-h-80 object-contain rounded-xl">
                    </template>
                    <template v-else>
                        <div class="text-5xl mb-3">📷</div>
                        <p class="text-emerald-800 font-bold">しゃしんを えらぶ</p>
                        <p class="text-emerald-500 text-sm mt-1">虫でも植物でもOK</p>
                    </template>
                </div>

                <div class="mt-3 grid grid-cols-2 gap-2">
                    <button
                        class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                        @click="$refs.cameraInput.click()"
                    >
                        📷 写真をとる
                    </button>
                    <button
                        class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                        @click="$refs.albumInput.click()"
                    >
                        🖼️ アルバムからえらぶ
                    </button>
                </div>

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
                <img v-if="previewUrl" :src="previewUrl" class="w-full max-h-56 object-contain rounded-xl mb-4">
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
                <img v-if="previewUrl" :src="previewUrl" class="w-full max-h-56 object-contain rounded-xl mb-4">
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
                <div v-if="previewUrl" class="bg-white rounded-2xl shadow-sm p-3">
                    <img :src="previewUrl" class="w-full max-h-64 object-contain rounded-xl">
                </div>

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

                        <button
                            class="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-sm transition"
                            @click="openDraft(candidate)"
                        >
                            🃏 これをカードにする
                        </button>
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

        <!-- カードのプレビュー・登録（「これをカードにする」を押したとき） -->
        <div v-if="draftCard" class="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-4">
            <div class="mx-auto my-4 w-full max-w-md bg-white rounded-2xl shadow-xl p-5">

                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-emerald-900">🃏 カードのプレビュー</h2>
                    <button
                        class="text-slate-400 hover:text-slate-600 text-xl leading-none px-2 disabled:opacity-30"
                        :disabled="draftStatus === 'saving'"
                        aria-label="閉じる"
                        @click="closeDraft"
                    >
                        ✕
                    </button>
                </div>

                <!-- 登録できたあと -->
                <div v-if="draftStatus === 'done'" class="text-center py-4">
                    <div class="text-5xl mb-3">🎉</div>
                    <p class="text-emerald-800 font-bold mb-1">図鑑にとうろくしました！</p>
                    <p class="text-slate-500 text-sm mb-5">図鑑の「じぶんがとった」で見られるよ</p>
                    <div class="flex flex-col gap-2">
                        <button
                            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition"
                            @click="goLibrary"
                        >
                            図鑑を見る
                        </button>
                        <button
                            class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                            @click="finishAndReset"
                        >
                            もう一つスキャンする
                        </button>
                    </div>
                </div>

                <template v-else>
                    <!-- プレビュー（写真の準備が終わると、絵柄が入る） -->
                    <div class="flex flex-col items-center mb-4">
                        <div class="w-[225px] h-[330px]">
                            <div style="transform: scale(1.5); transform-origin: top left; width: 150px;">
                                <CollectionCard :card="previewCard" />
                            </div>
                        </div>
                        <p v-if="draftStatus === 'preparing'" class="text-emerald-600 text-sm font-bold mt-1">📸 しゃしんを じゅんびちゅう…</p>
                    </div>

                    <!-- 判定の結果のまま登録する（変更はできない） -->
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div v-for="field in readonlyFields" :key="field.label" class="bg-emerald-50 rounded-lg px-3 py-2">
                            <span class="block text-xs text-emerald-700 font-bold">{{ field.label }}</span>
                            <span class="block mt-0.5 text-emerald-900">{{ field.value }}</span>
                        </div>
                    </div>
                    <p class="mt-2 text-[11px] text-slate-400">判定の結果のまま登録します（ここでは変えられません）</p>

                    <!-- お知らせ -->
                    <p v-if="draftCard.isDangerous" class="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
                        ⚠️ {{ draftCard.dangerNote }}
                    </p>
                    <p v-if="duplicateCount > 0" class="mt-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-lg px-3 py-2">
                        📚 同じ種類のカードは、もう {{ duplicateCount }} 枚あります。このまま登録もできます。
                    </p>
                    <p v-if="faceFound === true" class="mt-3 bg-rose-50 border border-rose-300 text-rose-700 text-sm font-bold rounded-lg px-3 py-2">
                        🙅 人の顔が写っている写真は、カードにできません。とりなおしてね。
                    </p>
                    <label
                        v-else-if="faceFound === null && draftStatus !== 'preparing'"
                        class="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2"
                    >
                        <input v-model="faceChecked" type="checkbox" class="mt-0.5">
                        <span>この端末では顔のチェックができません。<b>人の顔が写っていないこと</b>を、おとなが確かめました。</span>
                    </label>
                    <p v-if="draftMessage" class="mt-3 text-rose-700 text-sm font-bold">{{ draftMessage }}</p>
                    <p v-if="draftImage" class="mt-2 text-[11px] text-slate-400">がぞうのおおきさ: {{ imageKb }}KB</p>

                    <div class="mt-5 flex flex-col gap-2">
                        <button
                            class="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-sm transition"
                            :disabled="!canRegister"
                            @click="registerCard"
                        >
                            {{ draftStatus === 'saving' ? 'とうろく中…' : 'このカードで とうろくする' }}
                        </button>
                        <button
                            class="text-sm text-emerald-700 hover:text-emerald-900 underline disabled:opacity-30"
                            :disabled="draftStatus === 'saving'"
                            @click="closeDraft"
                        >
                            やめる
                        </button>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
import CollectionCard from "@/views/CaveAdventure/CollectionCard.vue";
import { getCurrentUser, toDisplayCard, REGION_LABELS } from "@/utils/cards.js";
import {
    candidateToCardDraft,
    validateCardDraft,
    RARITY_OPTIONS,
    LEVEL_OPTIONS,
    HABITAT_OPTIONS
} from "@/utils/creatureCardMapping.js";
import { compressCardImage, detectFace, countSameSpecies, registerScannedCard } from "@/utils/creatureCard.js";

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

    components: { CollectionCard },

    data() {
        return {
            phase: "idle", // idle | preview | loading | identified | uncertain | no_creature | error
            selectedFile: null,
            previewUrl: null,
            hint: "",
            candidates: [],
            errorMessage: "",

            // ■カード登録（プレビュー）用
            draftCard: null, // 判定の結果から作った、カードの内容（変更はできない）
            draftImage: null, // 縮小した写真 { dataUrl, bytes, withinLimit }
            draftStatus: "", // preparing | ready | saving | done | error
            draftMessage: "",
            faceFound: null, // true: 顔あり / false: 顔なし / null: この端末では調べられない
            faceChecked: false, // faceFound が null のとき、おとなが確認したか
            duplicateCount: 0, // 同じ学名のカードの枚数（登録は止めない）
            currentUser: null
        };
    },

    computed: {
        // プレビューの項目（判定の結果を、読み取り専用で表示する）
        readonlyFields() {
            if (!this.draftCard) return [];
            const labelOf = (options, value) => {
                const option = options.find(item => item.value === value);
                return option ? option.label : "";
            };
            return [
                { label: "なまえ", value: this.draftCard.name },
                { label: "レア度", value: labelOf(RARITY_OPTIONS, this.draftCard.rarity) },
                { label: "生態系レベル", value: labelOf(LEVEL_OPTIONS, this.draftCard.level) },
                { label: "すみか", value: labelOf(HABITAT_OPTIONS, this.draftCard.habitat) },
                { label: "ちいき", value: this.draftCard.region ? REGION_LABELS[this.draftCard.region] : "ちいき なし" }
            ];
        },

        // プレビュー用の表示データ（図鑑・宝箱と同じ見た目）
        previewCard() {
            if (!this.draftCard) return null;
            return toDisplayCard(
                {
                    cardId: "preview",
                    name: this.draftCard.name || "なまえ未定",
                    image: this.draftImage ? this.draftImage.dataUrl : "",
                    level: this.draftCard.level,
                    rarity: this.draftCard.rarity,
                    habitat: this.draftCard.habitat,
                    frame: this.draftCard.frame
                },
                {
                    team: (this.currentUser && this.currentUser.team) || "",
                    ownerName: (this.currentUser && this.currentUser.name) || ""
                }
            );
        },

        imageKb() {
            return this.draftImage ? Math.round(this.draftImage.bytes / 1024) : 0;
        },

        // 登録ボタンを押せる条件：準備ができていて、名前が正しく、顔の確認が済んでいる
        canRegister() {
            if (this.draftStatus !== "ready" || !this.draftCard || !this.draftImage) return false;
            if (!this.draftImage.withinLimit) return false;
            if (validateCardDraft(this.draftCard)) return false;
            return this.faceFound === false || (this.faceFound === null && this.faceChecked);
        }
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

            ["cameraInput", "albumInput"].forEach(name => {
                if (this.$refs[name]) {
                    this.$refs[name].value = "";
                }
            });
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

        // ■候補からカードの下書きを作り、写真の縮小・顔チェック・同じ種類の枚数を調べる
        async openDraft(candidate) {
            this.draftCard = candidateToCardDraft(candidate, this.hint);
            this.draftImage = null;
            this.faceFound = null;
            this.faceChecked = false;
            this.duplicateCount = 0;
            this.draftStatus = "preparing";
            this.draftMessage = "";

            try {
                this.currentUser = await getCurrentUser();
                if (!this.currentUser) {
                    this.draftMessage = "ログインしてから、もういちどためしてね";
                    this.draftStatus = "error";
                    return;
                }

                const [image, faceFound, duplicateCount] = await Promise.all([
                    compressCardImage(this.selectedFile),
                    detectFace(this.selectedFile),
                    countSameSpecies(this.draftCard.scientificName)
                ]);

                this.draftImage = image;
                this.faceFound = faceFound;
                this.duplicateCount = duplicateCount;

                if (!image.withinLimit) {
                    this.draftMessage = "写真が大きすぎます。別の写真でためしてね";
                    this.draftStatus = "error";
                    return;
                }
                this.draftStatus = "ready";
            } catch (error) {
                console.error("カードの準備に失敗しました:", error);
                this.draftMessage = "じゅんびに失敗しました。もう一度ためしてね。";
                this.draftStatus = "error";
            }
        },

        async registerCard() {
            if (!this.canRegister) return;

            const nameError = validateCardDraft(this.draftCard);
            if (nameError) {
                this.draftMessage = nameError;
                return;
            }

            this.draftStatus = "saving";
            this.draftMessage = "";
            try {
                await registerScannedCard({
                    draft: this.draftCard,
                    imageDataUrl: this.draftImage.dataUrl,
                    user: this.currentUser
                });
                this.draftStatus = "done";
            } catch (error) {
                console.error("カードの登録に失敗しました:", error);
                this.draftMessage = "とうろくできませんでした。つうしんを確かめて、もういちどためしてね。";
                this.draftStatus = "ready";
            }
        },

        closeDraft() {
            if (this.draftStatus === "saving") return;
            this.draftCard = null;
            this.draftImage = null;
            this.draftStatus = "";
            this.draftMessage = "";
        },

        finishAndReset() {
            this.closeDraft();
            this.resetPhoto();
        },

        goLibrary() {
            this.$router.push({ name: "CardLibrary" });
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
