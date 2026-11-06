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

                <!-- 写真を選んだあとの枠（写真がないうちは、ボタン2つだけを出す） -->
                <div
                    v-if="previewUrl"
                    class="border-2 border-dashed border-emerald-300 rounded-2xl p-2"
                >
                    <!-- 写真は、ととのえた範囲（カードの写真枠と同じ比率）で見せる -->
                    <template v-if="previewUrl">
                        <div class="relative mx-auto w-full overflow-hidden rounded-xl bg-white" style="aspect-ratio: 138 / 123;">
                            <img
                                :src="previewUrl"
                                alt=""
                                class="absolute max-w-none"
                                :style="previewCropStyle"
                                @load="onPreviewLoad"
                            >
                        </div>
                    </template>
                </div>

                <!-- 写真がまだないとき：大きいボタンを2つ、横いっぱいに並べる -->
                <div v-if="!previewUrl" class="flex flex-col gap-4 py-2">
                    <button
                        type="button"
                        class="group w-full rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-7 text-white shadow-lg shadow-emerald-300/60 transition hover:brightness-105 active:scale-[0.98]"
                        @click="$refs.cameraInput.click()"
                    >
                        <span class="block text-5xl leading-none">📷</span>
                        <span class="mt-2 block text-xl font-black tracking-wide">{{ $t('写真をとる', 'Take a photo') }}</span>
                    </button>
                    <button
                        type="button"
                        class="group w-full rounded-3xl bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-7 text-white shadow-lg shadow-sky-300/60 transition hover:brightness-105 active:scale-[0.98]"
                        @click="$refs.albumInput.click()"
                    >
                        <span class="block text-5xl leading-none">🖼️</span>
                        <span class="mt-2 block text-xl font-black tracking-wide">{{ $t('アルバムからえらぶ', 'Choose from album') }}</span>
                    </button>
                </div>


                <!-- 判定に送る前に、写真の位置と拡大を整える（ここで切った範囲を判定し、カードの写真にもなる） -->
                <button
                    v-if="previewUrl && !draftCard"
                    type="button"
                    class="mt-3 w-full bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                    @click="photoModalOpen = true"
                >
                    📷 {{ $t('しゃしんを ととのえる', 'Adjust the photo') }}
                </button>

                <!-- 写真を整えるモーダル（ここで切った範囲を判定し、カードの写真にもなる） -->
                <PhotoAdjustModal
                    v-if="photoModalOpen && previewUrl && !draftCard"
                    :src="previewUrl"
                    :initial-edit="photoEdit"
                    @change="photoEdit = $event"
                    @close="photoModalOpen = false"
                >
                    <template #note>
                        <p class="text-xs text-emerald-600 mb-3">{{ $t('ここで切った範囲を判定します', 'The part you frame here is what gets judged.') }}</p>
                    </template>
                </PhotoAdjustModal>

                <!-- 写真を選んだあと：別の写真にする（押すと、確認のポップアップが出る） -->
                <button
                    v-if="previewUrl"
                    type="button"
                    class="mt-3 w-full rounded-xl border border-emerald-300 bg-white py-2.5 font-bold text-emerald-700 transition hover:bg-emerald-50"
                    @click="photoResetConfirm = true"
                >
                    🗑️ {{ $t('別の写真にする', 'Choose another photo') }}
                </button>

                <!-- 消すかの確認（ポップアップ） -->
                <div
                    v-if="previewUrl && photoResetConfirm"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    @click.self="photoResetConfirm = false"
                >
                    <div class="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl">
                        <p class="text-lg font-bold text-slate-800">{{ $t('この写真を消しますか？', 'Delete this photo?') }}</p>
                        <p class="mt-1 text-sm text-slate-500">{{ $t('えらびなおしになります', 'You will choose a photo again.') }}</p>
                        <div class="mt-4 flex gap-2">
                            <button type="button" class="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 font-bold text-slate-700" @click="photoResetConfirm = false">{{ $t('やめる', 'Cancel') }}</button>
                            <button type="button" class="flex-1 rounded-xl bg-rose-600 py-2.5 font-bold text-white" @click="confirmResetPhoto">{{ $t('消す', 'Delete') }}</button>
                        </div>
                    </div>
                </div>

                <!-- 写真を選んだあとに出す（写真がないうちは、出さない） -->
                <div v-if="previewUrl" class="mt-4">
                    <label class="text-xs text-emerald-700 font-bold block mb-1">{{ $t('どこで見つけた？（にんい）', 'Where did you find it? (optional)') }}</label>
                    <input
                        v-model="hint"
                        type="text"
                        :placeholder="$t('例: 京都市の庭, 10月', 'e.g. Kyoto garden, October')"
                        class="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                </div>

                <button
                    v-if="previewUrl"
                    class="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-sm transition"
                    :disabled="!selectedFile"
                    @click="identify"
                >
                    {{ $t('はんていする', 'What is it?') }}
                </button>
            </div>

            <!-- 判定中 -->
            <div v-else-if="phase === 'loading' && !uploadDone" class="bg-white rounded-2xl shadow-sm p-10 text-center">
                <div class="text-5xl mb-4 animate-bounce">📤</div>
                <p class="text-emerald-800 font-bold">{{ $t('写真を送っているよ…', 'Sending your photo…') }}</p>
                <div class="relative mt-4 h-3 w-full bg-emerald-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 transition-all duration-200" :style="{ width: uploadPercent + '%' }"></div>
                    <!-- 送信中は、ずっと流れているしま模様を出す（小さい写真は一瞬で送り終わるため） -->
                    <div class="upload-stripe absolute inset-0"></div>
                </div>
                <p class="text-emerald-600 text-sm mt-2 font-bold">{{ uploadPercent }}%</p>
            </div>

            <div v-else-if="phase === 'loading'" class="bg-white rounded-2xl shadow-sm p-10 text-center">
                <div class="text-5xl mb-4 animate-bounce">🔬</div>
                <p class="text-emerald-800 font-bold">{{ $t('AIが はんてい中…', 'Checking your photo…') }}</p>
                <p class="text-emerald-500 text-sm mt-2">{{ $t(`けいか ${judgeSeconds}秒`, `${judgeSeconds}s so far`) }}</p>
                <p class="text-emerald-500 text-sm">{{ $t('ふつう 2〜7秒', 'usually 2 to 7 s') }}</p>
            </div>

            <!-- 生き物が写っていない / 特定できない -->
            <div v-else-if="phase === 'no_creature' || phase === 'uncertain'" class="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div v-if="previewUrl" class="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-xl bg-white mb-4" style="aspect-ratio: 138 / 123;">
                    <img :src="previewUrl" alt="" class="absolute max-w-none" :style="previewCropStyle" @load="onPreviewLoad">
                </div>
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
                <div v-if="previewUrl" class="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-xl bg-white mb-4" style="aspect-ratio: 138 / 123;">
                    <img :src="previewUrl" alt="" class="absolute max-w-none" :style="previewCropStyle" @load="onPreviewLoad">
                </div>
                <div class="text-5xl mb-4">⚠️</div>
                <p class="text-rose-700 font-bold mb-1">{{ $t('はんていできませんでした', 'Could not identify') }}</p>
                <p class="text-slate-500 text-sm mb-5">{{ $t(errorMessage, errorMessageEn) }}</p>
                <!-- 写真は消さず、そのまま「ととのえる」が使える画面にもどす -->
                <button
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition"
                    @click="backToPreview"
                >
                    {{ $t('写真をととのえなおす', 'Adjust the photo again') }}
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
                    <p class="text-emerald-700 font-bold text-lg mb-5">{{ $t('つぎの生きものも、撮ってみよう！', 'Find the next one and take a photo!') }}</p>
                    <div class="flex flex-col gap-3">
                        <!-- 連続で撮るのが基本なので、「もう一つスキャンする」を一番目立たせる -->
                        <button
                            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-4 rounded-2xl shadow-md transition"
                            @click="finishAndReset"
                        >
                            📷 {{ $t('もう一つスキャンする', 'Scan another') }}
                        </button>
                        <!-- 図鑑は、ふつうの文字のリンクにして、強調しすぎないようにする -->
                        <button
                            type="button"
                            class="text-sm text-emerald-700 hover:text-emerald-900 underline py-1"
                            @click="goLibrary"
                        >
                            {{ $t('図鑑をみる', 'See the card book') }}
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

                    <!-- 写真を整える（モーダル）。きめるで、この写真で作り直す -->
                    <button
                        v-if="draftImage && draftStatus !== 'preparing'"
                        type="button"
                        class="mb-4 w-full bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition"
                        @click="draftPhotoModalOpen = true"
                    >
                        📷 {{ $t('しゃしんを ととのえる', 'Adjust the photo') }}
                    </button>
                    <PhotoAdjustModal
                        v-if="draftPhotoModalOpen && draftImage && previewUrl"
                        :src="previewUrl"
                        :initial-edit="photoEdit"
                        @change="onDraftPhotoChange"
                        @close="closeDraftPhotoModal"
                    >
                        <template #note>
                            <p class="text-xs text-rose-600 mb-2">{{ $t('きめると、カードの写真が作り直されます', 'The card photo is rebuilt when you press Done.') }}</p>
                        </template>
                    </PhotoAdjustModal>

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
                        📚 {{ $t(`同じ種類のカードは、もう ${duplicateCount} 枚あります。このまま登録もできます。`, `There ${duplicateCount === 1 ? "is" : "are"} already ${duplicateCount} ${duplicateCount === 1 ? "card" : "cards"} of this kind. You can still register this one.`) }}
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
import PhotoAdjustModal from "@/components/PhotoAdjustModal.vue";
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
import { cropRect } from "@/utils/creatureCard.js";

// ■生き物判定API連携（2026-09-20導入）
// 参照: /Users/nozomuando/Downloads/生き物判定API_連携ガイド.pdf
// このAPIキーはドキュメント上「フロントのJSに含まれる前提のゆるい鍵」と明記されており、
// 本格的な秘匿は不要（請求の暴走はサーバー側のインスタンス数上限・予算アラートで防止済み）
const IKIMONO_API_BASE = "https://ikimono-api-m4qe2atuyq-an.a.run.app";
const IKIMONO_API_KEY = "WFulVxBdSXuvxH1sPNBDRcsTuvXL-dlOQBw1_iD-M7U";

export default {
    name: "CreatureScan",

    components: { CollectionCard, PhotoAdjustModal },

    data() {
        return {
            phase: "idle", // idle | preview | loading | uncertain | no_creature | error
            uploadPercent: 0, // 写真のアップロードの進み（0〜100）
            uploadDone: false, // アップロードが終わったか（ここから先は、AIの判断を待つ）
            judgeSeconds: 0, // 判断中の経過秒数（判断の進みは分からないので、%ではなく秒で出す）
            judgeTimer: null,
            selectedFile: null,
            previewUrl: null,
            hint: "",
            errorMessage: "",
            errorMessageEn: "",

            // ■カード登録（プレビュー）用
            draftCard: null, // 判定の結果から作った、カードの内容（変更はできない）
            draftImage: null, // 縮小した写真 { dataUrl, bytes, withinLimit }
            draftStatus: "", // preparing | ready | saving | done | error
            photoEdit: { zoom: 1, cx: 0.5, cy: 0.5 }, // 写真の拡大（1〜3）と、切り取りの中心（0〜1）
            photoEditToken: 0, // 写真の編集が古い結果で上書きされないための番号
            photoEditDirty: false, // 登録の画面で、モーダルの中を動かしたか
            draftPhotoModalOpen: false, // 登録の画面の「しゃしんを ととのえる」モーダルを開いているか
            photoModalOpen: false, // 判定の前の「しゃしんを ととのえる」モーダルを開いているか
            previewNatural: null, // 選んだ写真の元の大きさ { w, h }（ととのえた範囲を、枠の中に出すため）
            photoResetConfirm: false, // 写真を消すかの確認を出しているか
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
        // 写真の枠に出す位置と大きさ（ととのえた範囲が、枠いっぱいに見えるように、写真を動かす）
        previewCropStyle() {
            const natural = this.previewNatural;
            if (!natural) return { left: "0", top: "0", width: "100%", height: "100%", objectFit: "cover" };
            const { sx, sy, sw, sh } = cropRect(natural.w, natural.h, this.photoEdit);
            return {
                left: `${(-sx / sw) * 100}%`,
                top: `${(-sy / sh) * 100}%`,
                width: `${(natural.w / sw) * 100}%`,
                height: `${(natural.h / sh) * 100}%`
            };
        },

        // プレビューの項目（判定の結果を、読み取り専用で表示する）
        readonlyFields() {
            if (!this.draftCard) return [];
            const labelOf = (options, value) => {
                const option = options.find(item => item.value === value);
                return option ? t(option.label, option.labelEn) : "";
            };
            return [
                { label: t("なまえ", "Name"), value: t(this.draftCard.name, this.draftCard.nameEn || this.draftCard.name) },
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
                    nameEn: this.draftCard.nameEn || "",
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
        this.stopJudgeTimer();
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
            this.photoEdit = { zoom: 1, cx: 0.5, cy: 0.5 };
            this.photoModalOpen = false;
            this.previewNatural = null;
            this.phase = "preview";
        },

        // エラーの画面から、同じ写真のまま選ぶ画面にもどす（写真もととのえた範囲も残す）
        backToPreview() {
            this.errorMessage = "";
            this.errorMessageEn = "";
            this.phase = "preview";
        },

        // 確認のあとに、写真を消して選びなおす画面にもどす
        confirmResetPhoto() {
            this.photoResetConfirm = false;
            this.resetPhoto();
        },

        onPreviewLoad(e) {
            this.previewNatural = { w: e.target.naturalWidth, h: e.target.naturalHeight };
        },

        resetPhoto() {
            if (this.previewUrl) {
                URL.revokeObjectURL(this.previewUrl);
            }

            this.selectedFile = null;
            this.previewUrl = null;
            this.photoEdit = { zoom: 1, cx: 0.5, cy: 0.5 };
            this.photoModalOpen = false;
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
            this.uploadPercent = 0;
            this.uploadDone = false;
            this.judgeSeconds = 0;
            this.stopJudgeTimer();

            try {
                // 送る写真は、ととのえた範囲だけを切り取って縮小したもの（登録用と同じ処理）
                // 切り取りに失敗したときは、元の全体の写真は送らずに止める（ととのえた範囲以外が送られないように）
                let photo;
                try {
                    const small = await compressCardImage(this.selectedFile, { ...this.photoEdit });
                    photo = await (await fetch(small.dataUrl)).blob();
                } catch (e) {
                    console.error("判定用の写真の切り取りに失敗しました", e);
                    this.errorMessage = "しゃしんを よみこめませんでした。ほかの写真で、もういちどためしてね";
                    this.errorMessageEn = "Could not read the photo. Please try another photo.";
                    this.phase = "error";
                    return;
                }

                const fd = new FormData();
                fd.append("image", photo, "photo.jpg");
                if (this.hint) fd.append("hint", this.hint);
                fd.append("max_candidates", 3);

                // アップロードの進みを出すため、fetchではなくXMLHttpRequestで送る
                const { ok, data } = await this.postIdentify(fd);

                if (!ok) {
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

        // ■判定APIへ送る。送っている間は％を出し、送り終わったら「判断中」の秒数を数え始める
        // （サーバーの判断の進みは分からないので、判断中は％を出さない）
        postIdentify(fd) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", `${IKIMONO_API_BASE}/v1/identify`);
                xhr.setRequestHeader("X-API-Key", IKIMONO_API_KEY);
                xhr.responseType = "text";

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        this.uploadPercent = Math.round((e.loaded / e.total) * 100);
                    }
                };
                // 送り終わったら、判断中の表示に切り替える（サーバーの返事を待つ）
                // 小さい写真は一瞬で送り終わるので、送信の表示は最低0.7秒は見せる
                const startedAt = Date.now();
                xhr.upload.onload = () => {
                    this.uploadPercent = 100;
                    const wait = Math.max(0, 700 - (Date.now() - startedAt));
                    setTimeout(() => {
                        // 返事がもう届いて、判定が終わっていたら何もしない
                        if (this.phase !== "loading") return;
                        this.uploadDone = true;
                        this.startJudgeTimer();
                    }, wait);
                };
                xhr.onload = () => {
                    this.stopJudgeTimer();
                    let data = {};
                    try {
                        data = JSON.parse(xhr.responseText || "{}");
                    } catch (e) {
                        data = {};
                    }
                    resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
                };
                xhr.onerror = () => {
                    this.stopJudgeTimer();
                    reject(new Error("network error"));
                };
                xhr.onabort = () => {
                    this.stopJudgeTimer();
                    reject(new Error("aborted"));
                };
                xhr.send(fd);
            });
        },

        startJudgeTimer() {
            this.stopJudgeTimer();
            this.judgeSeconds = 0;
            this.judgeTimer = setInterval(() => {
                this.judgeSeconds += 1;
            }, 1000);
        },

        stopJudgeTimer() {
            if (this.judgeTimer) {
                clearInterval(this.judgeTimer);
                this.judgeTimer = null;
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
                    compressCardImage(this.selectedFile, { ...this.photoEdit }),
                    countSameSpecies(this.draftCard.scientificName)
                ]);

                this.currentUser = user;
                this.draftImage = image;
                this.duplicateCount = duplicateCount;

                if (!image.withinLimit) {
                    this.draftMessage = "写真が大きすぎます。下のバーで近づけるか、別の写真でためしてね";
                    this.draftMessageEn = "The photo is too large. Zoom in with the slider, or try another photo.";
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

        // 登録の画面の写真を、モーダルでととのえた内容に合わせる（閉じるときに、写真を作り直す）
        onDraftPhotoChange(edit) {
            this.photoEdit = edit;
            this.photoEditDirty = true;
        },

        closeDraftPhotoModal() {
            this.draftPhotoModalOpen = false;
            if (this.photoEditDirty) {
                this.photoEditDirty = false;
                this.applyPhotoEdit();
            }
        },

        // ■編集した範囲で写真を作り直す（この写真がそのままカードの写真になる）
        async applyPhotoEdit() {
            if (!this.selectedFile) return;
            if (this.draftStatus === "saving" || this.draftStatus === "done") return;
            const token = ++this.photoEditToken;
            try {
                const image = await compressCardImage(this.selectedFile, { ...this.photoEdit });
                if (token !== this.photoEditToken) return; // もっと新しい編集があれば、この結果は捨てる
                this.draftImage = image;

                if (!image.withinLimit) {
                    this.draftMessage = "写真が大きすぎます。下のバーで近づけるか、別の写真でためしてね";
                    this.draftMessageEn = "The photo is too large. Zoom in with the slider, or try another photo.";
                    this.draftStatus = "error";
                    return;
                }
                if (!this.currentUser) {
                    this.draftMessage = "ログインしてから、もういちどためしてね";
                    this.draftMessageEn = "Please log in and try again.";
                    this.draftStatus = "error";
                    return;
                }
                this.draftMessage = "";
                this.draftMessageEn = "";
                this.draftStatus = "ready";
            } catch (error) {
                console.error("写真の編集に失敗しました:", error);
                this.draftMessage = "しゃしんの じゅんびに失敗しました。もう一度ためしてね。";
                this.draftMessageEn = "Could not prepare the photo. Please try again.";
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
.upload-stripe {
    background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.4) 0 8px, transparent 8px 16px);
    background-size: 32px 32px;
    animation: upload-stripe-move 0.8s linear infinite;
}
@keyframes upload-stripe-move {
    from { background-position: 0 0; }
    to { background-position: 32px 0; }
}
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
