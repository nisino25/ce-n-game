<template>
    <div class="min-h-screen bg-gradient-to-b from-emerald-50 to-emerald-100 flex justify-center px-4 py-6">
        <div class="w-full max-w-xl">

            <header class="mb-5">
                <h1 class="text-xl font-bold text-emerald-900 flex items-center gap-2 mb-3">
                    <span>🔎</span><span>{{ $t('生き物スキャン', 'Creature Scan') }}</span>
                </h1>
                <div class="flex items-center justify-between gap-2">
                    <button
                        class="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1 whitespace-nowrap"
                        @click="goLibrary"
                    >
                        <span>📚</span><span>{{ $t('図鑑をみる', 'Card book') }}</span>
                    </button>
                    <button
                        class="text-sm text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap px-2 py-2"
                        @click="goHome"
                    >
                        🏠 {{ $t('ホームにもどる', 'Back to home') }}
                    </button>
                </div>
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
                        <p class="text-emerald-800 font-bold">{{ $t('しゃしんを えらぶ', 'Choose a photo') }}</p>
                        <p class="text-emerald-500 text-sm mt-1">{{ $t('虫でも植物でもOK', 'Insects and plants are fine') }}</p>
                    </template>
                </div>

                <div class="mt-3 grid grid-cols-2 gap-2">
                    <button
                        class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                        @click="$refs.cameraInput.click()"
                    >
                        📷 {{ $t('写真をとる', 'Take a photo') }}
                    </button>
                    <button
                        class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                        @click="$refs.albumInput.click()"
                    >
                        🖼️ {{ $t('アルバムからえらぶ', 'Choose from album') }}
                    </button>
                </div>

                <button
                    v-if="previewUrl"
                    class="mt-3 text-sm text-emerald-600 hover:text-emerald-800 underline"
                    @click="resetPhoto"
                >
                    {{ $t('別の写真にする', 'Choose another photo') }}
                </button>

                <div class="mt-4">
                    <label class="text-xs text-emerald-700 font-bold block mb-1">{{ $t('どこで見つけた？（にんい）', 'Where did you find it? (optional)') }}</label>
                    <input
                        v-model="hint"
                        type="text"
                        :placeholder="$t('例: 京都市の庭, 10月', 'e.g. Kyoto garden, October')"
                        class="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                </div>

                <button
                    class="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-sm transition"
                    :disabled="!selectedFile"
                    @click="identify"
                >
                    {{ $t('はんていする', 'What is it?') }}
                </button>
            </div>

            <!-- 判定中 -->
            <div v-else-if="phase === 'loading'" class="bg-white rounded-2xl shadow-sm p-10 text-center">
                <div class="text-5xl mb-4 animate-bounce">🔬</div>
                <p class="text-emerald-800 font-bold">{{ $t('AIが はんてい中…', 'Checking your photo…') }}</p>
                <p class="text-emerald-500 text-sm mt-1">{{ $t('2〜7秒くらい かかります', 'This takes about 2 to 7 seconds') }}</p>
            </div>

            <!-- 生き物が写っていない / 特定できない -->
            <div v-else-if="phase === 'no_creature' || phase === 'uncertain'" class="bg-white rounded-2xl shadow-sm p-8 text-center">
                <img v-if="previewUrl" :src="previewUrl" class="w-full max-h-56 object-contain rounded-xl mb-4">
                <div class="text-5xl mb-4">🤔</div>
                <p class="text-emerald-800 font-bold mb-1">
                    {{ phase === 'no_creature' ? $t('生き物が写っていないみたい', 'No creature seen in the photo') : $t('生き物はいそうだけど、特定できなかったよ', 'A creature may be there, but I could not identify it') }}
                </p>
                <p class="text-emerald-500 text-sm mb-5">{{ $t('もう一度、写真をとってみよう！', 'Let us take another photo!') }}</p>
                <button
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition"
                    @click="resetPhoto"
                >
                    {{ $t('もう一度とる', 'Take another photo') }}
                </button>
            </div>

            <!-- エラー -->
            <div v-else-if="phase === 'error'" class="bg-white rounded-2xl shadow-sm p-8 text-center">
                <img v-if="previewUrl" :src="previewUrl" class="w-full max-h-56 object-contain rounded-xl mb-4">
                <div class="text-5xl mb-4">⚠️</div>
                <p class="text-rose-700 font-bold mb-1">{{ $t('はんていできませんでした', 'Could not identify') }}</p>
                <p class="text-slate-500 text-sm mb-5">{{ $t(errorMessage, errorMessageEn) }}</p>
                <button
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition"
                    @click="resetPhoto"
                >
                    {{ $t('もう一度ためす', 'Try again') }}
                </button>
            </div>


        </div>

        <!-- カードのプレビュー・登録（「これをカードにする」を押したとき） -->
        <div v-if="draftCard" class="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-4">
            <div class="mx-auto my-4 w-full max-w-lg bg-white rounded-2xl shadow-xl p-4">

                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-bold text-emerald-900">🃏 {{ $t('カードのプレビュー', 'Card preview') }}</h2>
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
                    <p class="text-emerald-800 font-bold mb-1">{{ $t('図鑑にとうろくしました！', 'Added to your card book!') }}</p>
                    <p class="text-slate-500 text-sm mb-5">{{ $t('図鑑の「じぶんがとった」で見られるよ', 'You can see it under "Caught by me" in the card book') }}</p>
                    <div class="flex flex-col gap-2">
                        <button
                            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition"
                            @click="goLibrary"
                        >
                            {{ $t('図鑑を見る', 'Open card book') }}
                        </button>
                        <button
                            class="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                            @click="finishAndReset"
                        >
                            {{ $t('もう一つスキャンする', 'Scan another') }}
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
                        <p v-if="draftStatus === 'preparing'" class="text-emerald-600 text-sm font-bold mt-1">📸 {{ $t('しゃしんを じゅんびちゅう…', 'Getting the photo ready…') }}</p>
                    </div>

                    <!-- 判定の結果のまま登録する（変更はできない） -->
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div v-for="field in readonlyFields" :key="field.label" class="bg-emerald-50 rounded-lg px-3 py-2">
                            <span class="block text-xs text-emerald-700 font-bold">{{ field.label }}</span>
                            <span class="block mt-0.5 text-emerald-900">{{ field.value }}</span>
                        </div>
                    </div>

                    <!-- お知らせ -->
                    <p v-if="draftCard.isDangerous" class="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
                        ⚠️ {{ $t(draftCard.dangerNote, draftCard.dangerNoteEn || draftCard.dangerNote) }}
                    </p>
                    <p v-if="duplicateCount > 0" class="mt-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-lg px-3 py-2">
                        📚 {{ $t(`同じ種類のカードは、もう ${duplicateCount} 枚あります。このまま登録もできます。`, `There are already ${duplicateCount} cards of this kind. You can still register this one.`) }}
                    </p>
                    <p v-if="draftMessage" class="mt-3 text-rose-700 text-sm font-bold">{{ $t(draftMessage, draftMessageEn) }}</p>
                    <p v-if="draftImage" class="mt-2 text-[11px] text-slate-400">{{ $t('がぞうのおおきさ: ', 'Image size: ') }}{{ imageKb }}KB</p>

                    <div class="mt-5 flex gap-2">
                        <button
                            class="flex-none bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 font-bold px-5 py-3 rounded-xl transition"
                            :disabled="draftStatus === 'saving'"
                            @click="closeDraft"
                        >
                            {{ $t('やめる', 'Cancel') }}
                        </button>
                        <button
                            class="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-sm transition"
                            :disabled="!canRegister"
                            @click="registerCard"
                        >
                            {{ draftStatus === 'saving' ? $t('とうろく中…', 'Saving…') : $t('カードを登録する', 'Add to my card book') }}
                        </button>
                    </div>

                    <!-- 地域マップ（生き物がいる地方がピカピカ。タップで登録する地方をえらべる） -->
                    <!-- 地図（生き物がいる地方が光る。ここでは変えられない） -->
                    <div class="mt-4 rounded-2xl bg-sky-100 p-2">
                        <p class="text-xs text-emerald-700 font-bold mb-2 text-center">{{ $t('いきている ちいき', 'Where it lives') }}</p>
                        <svg
                            :viewBox="japanMapViewBox"
                            class="w-full mx-auto block"
                            role="img"
                            :aria-label="$t('日本の地図。この生き物がいる地方が光っています', 'Map of Japan. The regions where this creature lives are glowing.')"
                        >
                            <g v-for="tile in regionTiles" :key="tile.key">
                                <path
                                    :d="regionShapes[tile.key].d"
                                    fill="#f8fafc"
                                    stroke="#94a3b8"
                                    stroke-width="8"
                                    stroke-linejoin="round"
                                    fill-rule="evenodd"
                                    :class="habitatRegions.includes(tile.key) ? 'region-sparkle' : ''"
                                />
                                <text
                                    :x="regionShapes[tile.key].label[0]"
                                    :y="regionShapes[tile.key].label[1]"
                                    text-anchor="middle"
                                    dominant-baseline="middle"
                                    class="region-label"
                                >{{ $t(tile.label, tile.labelEn) }}</text>
                            </g>
                        </svg>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
import CollectionCard from "@/views/CaveAdventure/CollectionCard.vue";
import { getCurrentUser, toDisplayCard } from "@/utils/cards.js";

// ■■直接呼びだし対応
import { resetCurrentUserCache } from "@/utils/cards.js";
import { getSession, removeSession } from "@/utils/session.js";

import {
    candidateToCardDraft,
    validateCardDraft,
    REGION_TILES,
    RARITY_OPTIONS,
    LEVEL_OPTIONS,
    HABITAT_OPTIONS
} from "@/utils/creatureCardMapping.js";
import { compressCardImage, countSameSpecies, registerScannedCard } from "@/utils/creatureCard.js";
import { JAPAN_MAP_VIEW_BOX, JAPAN_REGION_SHAPES } from "@/utils/japanRegionShapes.js";
import { t } from "@/utils/lang.js";

// ■生き物判定API連携（2026-09-20導入）
// 参照: /Users/nozomuando/Downloads/生き物判定API_連携ガイド.pdf
// このAPIキーはドキュメント上「フロントのJSに含まれる前提のゆるい鍵」と明記されており、
// 本格的な秘匿は不要（請求の暴走はサーバー側のインスタンス数上限・予算アラートで防止済み）
const IKIMONO_API_BASE = "https://ikimono-api-m4qe2atuyq-an.a.run.app";
const IKIMONO_API_KEY = "WFulVxBdSXuvxH1sPNBDRcsTuvXL-dlOQBw1_iD-M7U";

export default {
    name: "CreatureScan",

    components: { CollectionCard },

    data() {
        return {
            phase: "idle", // idle | preview | loading | uncertain | no_creature | error
            selectedFile: null,
            previewUrl: null,
            hint: "",
            errorMessage: "",
            errorMessageEn: "",

            // ■カード登録（プレビュー）用
            draftCard: null, // 判定の結果から作った、カードの内容（変更はできない）
            draftImage: null, // 縮小した写真 { dataUrl, bytes, withinLimit }
            draftStatus: "", // preparing | ready | saving | done | error
            draftMessage: "",
            draftMessageEn: "",
            duplicateCount: 0, // 同じ学名のカードの枚数（登録は止めない）
            currentUser: null,
            regionTiles: REGION_TILES,
            regionShapes: JAPAN_REGION_SHAPES,
            japanMapViewBox: JAPAN_MAP_VIEW_BOX
        };
    },

    computed: {
        // プレビューの項目（判定の結果を、読み取り専用で表示する）
        readonlyFields() {
            if (!this.draftCard) return [];
            const labelOf = (options, value) => {
                const option = options.find(item => item.value === value);
                return option ? t(option.label, option.labelEn) : "";
            };
            return [
                { label: t("なまえ", "Name"), value: this.draftCard.name },
                { label: t("レア度", "Rarity"), value: labelOf(RARITY_OPTIONS, this.draftCard.rarity) },
                { label: t("生態系レベル", "Level"), value: labelOf(LEVEL_OPTIONS, this.draftCard.level) },
                { label: t("すみか", "Habitat"), value: labelOf(HABITAT_OPTIONS, this.draftCard.habitat) }
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
                    frame: this.draftCard.frame,
                    category: this.draftCard.category
                },
                {
                    team: (this.currentUser && this.currentUser.team) || "",
                    ownerName: (this.currentUser && this.currentUser.name) || ""
                }
            );
        },

        // この生き物がいる地方（判定の結果。マップでピカピカさせる）
        habitatRegions() {
            return this.draftCard ? this.draftCard.regions : [];
        },

        imageKb() {
            return this.draftImage ? Math.round(this.draftImage.bytes / 1024) : 0;
        },

        // 登録ボタンを押せる条件：準備ができていて、名前が正しい
        canRegister() {
            if (this.draftStatus !== "ready" || !this.draftCard || !this.draftImage) return false;
            if (!this.draftImage.withinLimit) return false;
            if (validateCardDraft(this.draftCard)) return false;
            return true;
        }
    },

    beforeUnmount() {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
    },

    async mounted() {
        // 1. ログインチェック（会員IDの有無）
        const cenId = getSession("loginCenId");
        if (!cenId) {
            console.error("CreatureScan: 認証情報（loginCenId）がありません。");
            alert("ログイン情報が見つかりません。もう一度ログインし直してください。");
            this.$router.push({ name: "LoginPage" });
            return;
        }
        // 2. セッション有効期限のチェック
        if (this.checkSessionExpired()) {
            return;
        }
        // 3. 直叩き防止：URLに合言葉（?from=login）があるかチェックする
        if (this.$route.query.from !== "login") {
            console.error("CreatureScan: URLの直叩き、または不正な経路からのアクセスです。");
            alert("正しい手順からアクセスしてください。");
            this.$router.push({ name: "ScanLogin" }); // またはホーム画面などへ
            return;
        }
    },

    methods: {
        // ■追加：セッション有効期限のチェック用関数
        checkSessionExpired() {
            const lastActive = getSession("lastActiveTime");
            if (lastActive) {
                const diffDays = (Date.now() - Number(lastActive)) / (1000 * 60 * 60 * 24);
                if (diffDays > 7) {
                    removeSession("loginCenId");
                    removeSession("myTeam");
                    removeSession("playerData");
                    alert("セッションの有効期限が切れました。再度ログインしてください。");
                    this.$router.push({ name: "LoginPage" });
                    return true;
                }
            }
            return false;
        },
        
        goHome() {
            // ■■直接呼出し対応
            const cenId = (this.currentUser && this.currentUser.cenId) || getSession("loginCenId");
            removeSession("playerUid");
            removeSession("playerData");
            removeSession("myTeam");
            removeSession("loginCenId");
            removeSession("loginDate");
            resetCurrentUserCache();
            // cenIdがあればWix側の個別プロフィールページへ、なければログインページへ戻る
            if (cenId) {
                window.location.href = `https://www.ce-n.org/hui-yuan-purohuiru/${cenId}`;
            } else {
                this.$router.push({ name: "LoginPage" });
            }
        // ■もとにコード：this.$router.push({ name: "Home" });
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
            this.errorMessage = "";
            this.errorMessageEn = "";
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
                    // 子ども向けの文章があれば、それを出す（人が大きく写っているときなど）
                    this.errorMessage = (data.error && (data.error.message_for_kids || data.error.message)) || "はんていに失敗しました。もう一度ためしてね。";
                    this.errorMessageEn = (data.error && (data.error.message_for_kids_en || data.error.message_en)) || "Could not identify. Please try again.";
                    this.phase = "error";
                    return;
                }

                // 写り込みの注意がある写真は、カードにしない（子ども向けの文章をエラーとして出す）
                const privacyMessage = data.privacy && data.privacy.message_for_kids;
                if (privacyMessage) {
                    this.errorMessage = privacyMessage;
                    this.errorMessageEn = data.privacy.message_for_kids_en || privacyMessage;
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

                const top = (data.candidates || [])[0];
                if (!top) {
                    this.phase = "uncertain";
                    return;
                }

                // 候補の一覧は出さず、いちばん近い候補をそのままカードの準備に進める
                this.phase = "preview";
                this.openDraft(top);
            } catch (e) {
                console.error("生き物判定APIの呼び出しに失敗しました", e);
                this.errorMessage = "つうしんに失敗しました。電波状況を確認してもう一度ためしてね。";
                this.errorMessageEn = "Connection failed. Check your signal and try again.";
                this.phase = "error";
            }
        },

        // ■判定の結果からカードの下書きを作り、写真の縮小と同じ種類の枚数を調べる
        async openDraft(candidate) {
            this.draftCard = candidateToCardDraft(candidate);
            this.draftImage = null;
            this.duplicateCount = 0;
            this.draftStatus = "preparing";
            this.draftMessage = "";
            this.draftMessageEn = "";

            try {
                // 写真の準備はログインと関係なく行う（プレビューに写真を出すため）
                const [user, image, duplicateCount] = await Promise.all([
                    getCurrentUser(),
                    compressCardImage(this.selectedFile),
                    countSameSpecies(this.draftCard.scientificName)
                ]);

                this.currentUser = user;
                this.draftImage = image;
                this.duplicateCount = duplicateCount;

                if (!image.withinLimit) {
                    this.draftMessage = "写真が大きすぎます。別の写真でためしてね";
                    this.draftMessageEn = "The photo is too large. Please try another one.";
                    this.draftStatus = "error";
                    return;
                }
                if (!user) {
                    this.draftMessage = "ログインしてから、もういちどためしてね";
                    this.draftMessageEn = "Please log in and try again.";
                    this.draftStatus = "error";
                    return;
                }
                this.draftStatus = "ready";
            } catch (error) {
                console.error("カードの準備に失敗しました:", error);
                this.draftMessage = "じゅんびに失敗しました。もう一度ためしてね。";
                this.draftMessageEn = "Could not get the card ready. Please try again.";
                this.draftStatus = "error";
            }
        },

        async registerCard() {
            if (!this.canRegister) return;

            const nameError = validateCardDraft(this.draftCard);
            if (nameError) {
                this.draftMessage = nameError.ja;
                this.draftMessageEn = nameError.en;
                return;
            }

            this.draftStatus = "saving";
            this.draftMessage = "";
            this.draftMessageEn = "";
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
                this.draftMessageEn = "Could not register the card. Check your connection and try again.";
                this.draftStatus = "ready";
            }
        },

        closeDraft() {
            if (this.draftStatus === "saving") return;
            this.draftCard = null;
            this.draftImage = null;
            this.draftStatus = "";
            this.draftMessage = "";
            this.draftMessageEn = "";
        },

        finishAndReset() {
            this.closeDraft();
            this.resetPhoto();
        },

        goLibrary() {
            this.$router.push({ name: "CardLibrary" });
        },

    }
};
</script>

<style scoped>
.region-sparkle {
    animation: region-sparkle 1.2s ease-in-out infinite;
}

@keyframes region-sparkle {
    0%, 100% { fill: #34d399; filter: drop-shadow(0 0 0 rgba(251, 191, 36, 0)); }
    50% { fill: #fbbf24; filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9)); }
}

.region-label {
    font-size: 80px;
    font-weight: 700;
    fill: #334155;
    paint-order: stroke;
    stroke: #ffffff;
    stroke-width: 14px;
}
</style>
