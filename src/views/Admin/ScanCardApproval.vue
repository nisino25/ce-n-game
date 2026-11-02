<template>
    <!-- ■スキャンで作ったカードのうち、洞窟の宝箱のくじに入れるものを決める管理画面 -->
    <div class="min-h-screen bg-slate-100">
        <!-- 上に固定：タイトル・進み具合・絞り込み -->
        <header class="sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur">
            <div class="mx-auto max-w-6xl px-4 py-3">
                <div class="flex items-center justify-between gap-3">
                    <h1 class="text-lg font-black text-slate-800 md:text-xl">スキャンのカード：洞窟のくじに入れるか</h1>
                    <button class="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-sm font-bold hover:bg-slate-100" @click="$router.back()">もどる</button>
                </div>

                <!-- 進み具合 -->
                <div class="mt-2 flex items-center gap-3">
                    <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div class="h-full bg-emerald-500 transition-all" :style="{ width: progressPercent + '%' }"></div>
                    </div>
                    <p class="whitespace-nowrap text-sm font-bold text-slate-700">
                        決めた {{ decidedCount }} / {{ cards.length }}（ON {{ onCount }} ・ OFF {{ offCount }} ・ 未決定 {{ undecidedCount }}）
                    </p>
                </div>

                <!-- 絞り込み -->
                <div class="mt-3 flex flex-wrap gap-2">
                    <button
                        v-for="option in filterOptions"
                        :key="option.value"
                        type="button"
                        class="rounded-full border px-4 py-1.5 text-sm font-bold transition"
                        :class="filter === option.value ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
                        @click="filter = option.value"
                    >
                        {{ option.label }}（{{ option.count }}）
                    </button>
                </div>

                <!-- 写真の見せ方（この画面のプレビューだけ変わる。カードのデータは変えない） -->
                <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span class="font-bold text-slate-600">写真：</span>
                    <button
                        v-for="option in positionOptions"
                        :key="option.value"
                        type="button"
                        class="rounded-full border px-3 py-1 font-bold transition"
                        :class="imagePosition === option.value ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
                        @click="imagePosition = option.value"
                    >{{ option.label }}</button>
                    <span class="ml-2 font-bold text-slate-600">大きさ：</span>
                    <button
                        v-for="option in zoomOptions"
                        :key="option.value"
                        type="button"
                        class="rounded-full border px-3 py-1 font-bold transition"
                        :class="imageZoom === option.value ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
                        @click="imageZoom = option.value"
                    >{{ option.label }}</button>
                </div>
            </div>
        </header>

        <main class="mx-auto max-w-6xl px-4 py-5">
            <p class="mb-4 text-sm text-slate-600">
                <b>ON</b>：洞窟の宝箱のくじに入ります。<b>OFF</b>：入りません。<b>未決定</b>：まだ決めていません（くじには入りません）。
            </p>

            <p v-if="loading" class="py-10 text-center text-slate-500">よみこみ中…</p>
            <p v-else-if="loadError" class="py-10 text-center text-red-600">{{ loadError }}</p>
            <p v-else-if="!visibleCards.length" class="py-10 text-center text-slate-500">この条件のカードはありません</p>

            <!-- PC・iPadでは2〜3列で見せる -->
            <ul v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <li
                    v-for="card in visibleCards"
                    :key="card.cardId"
                    class="flex gap-4 rounded-2xl bg-white p-4 shadow-sm"
                    :class="decisionClass(card)"
                >
                    <!-- ゲームやカードライブラリで見えるのと同じカード（写真の見せ方は、上の設定で変えられる） -->
                    <div class="flex-none">
                        <CollectionCard :card="previewOf(card)" :image-style="imageStyle" />
                    </div>

                    <div class="flex min-w-0 flex-1 flex-col">
                        <p class="truncate text-lg font-black text-slate-800">{{ card.name }}</p>
                        <p class="truncate text-sm font-bold text-sky-700">{{ card.nameEn || "（英語名なし）" }}</p>
                        <p class="mt-1 text-xs text-slate-500">発見者 {{ card.ownerName || "-" }} ／ レア度 {{ card.rarity || "-" }}</p>
                        <!-- いま遊べる地域（関東・近畿・北海道）だけを、バッジで出す -->
                        <div class="mt-1 flex flex-wrap gap-1">
                            <span
                                v-for="region in playableRegions(card)"
                                :key="region"
                                class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800"
                            >{{ REGION_LABELS[region] }}</span>
                            <span v-if="!playableRegions(card).length" class="text-xs text-slate-400">遊べる地域なし</span>
                        </div>
                        <p class="mt-1 text-xs font-bold" :class="card.published ? 'text-emerald-700' : 'text-rose-600'">
                            {{ card.published ? "図鑑に出ている" : "図鑑に出ていない（非公開）" }}
                        </p>

                        <!-- 決める：ON / OFF のどちらかを押す -->
                        <div class="mt-auto grid grid-cols-1 gap-2 pt-3">
                            <button
                                type="button"
                                class="whitespace-nowrap rounded-xl px-2 py-2 text-sm font-black transition disabled:opacity-50"
                                :class="card.caveOk === true ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'"
                                :disabled="savingId === card.cardId"
                                @click="setCave(card, true)"
                            >
                                ON：入れる
                            </button>
                            <button
                                type="button"
                                class="whitespace-nowrap rounded-xl px-2 py-2 text-sm font-black transition disabled:opacity-50"
                                :class="card.caveOk === false ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                                :disabled="savingId === card.cardId"
                                @click="setCave(card, false)"
                            >
                                OFF：入れない
                            </button>
                        </div>
                    </div>
                </li>
            </ul>

            <p v-if="saveError" class="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{{ saveError }}</p>
        </main>
    </div>
</template>

<script>
import db from "@/firebase.js";
import CollectionCard from "@/views/CaveAdventure/CollectionCard.vue";
import { cardRegions, REGION_LABELS, toDisplayCard } from "@/utils/cards.js";

// いま陣取りゲームで遊べる地域（関東・近畿・北海道）
const PLAYABLE_REGIONS = ["kanto", "kinki", "hokkaido"];

export default {
    name: "ScanCardApproval",

    components: { CollectionCard },

    created() {
        this.REGION_LABELS = REGION_LABELS;
    },

    data() {
        return {
            // 写真の見せ方（この画面のプレビューだけ）
            imagePosition: "center",
            imageZoom: 1,
            positionOptions: [
                { value: "top", label: "上" },
                { value: "center", label: "中央" },
                { value: "bottom", label: "下" }
            ],
            zoomOptions: [
                { value: 1, label: "100%" },
                { value: 1.2, label: "120%" },
                { value: 1.4, label: "140%" }
            ],
            cards: [],
            loading: true,
            loadError: "",
            savingId: null,
            saveError: "",
            // 未決定（初期）／ON ／ OFF ／ すべて
            filter: "undecided"
        };
    },

    computed: {
        imageStyle() {
            return this.imageStyleFor();
        },
        onCount() {
            return this.cards.filter(card => card.caveOk === true).length;
        },
        offCount() {
            return this.cards.filter(card => card.caveOk === false).length;
        },
        decidedCount() {
            return this.onCount + this.offCount;
        },
        undecidedCount() {
            return this.cards.length - this.decidedCount;
        },
        progressPercent() {
            return this.cards.length ? Math.round((this.decidedCount / this.cards.length) * 100) : 0;
        },
        filterOptions() {
            return [
                { value: "undecided", label: "未決定だけ", count: this.undecidedCount },
                { value: "on", label: "ONだけ", count: this.onCount },
                { value: "off", label: "OFFだけ", count: this.offCount },
                { value: "all", label: "すべて", count: this.cards.length }
            ];
        },
        visibleCards() {
            if (this.filter === "on") return this.cards.filter(card => card.caveOk === true);
            if (this.filter === "off") return this.cards.filter(card => card.caveOk === false);
            if (this.filter === "undecided") return this.cards.filter(card => card.caveOk !== true && card.caveOk !== false);
            return this.cards;
        }
    },

    async mounted() {
        try {
            // スキャンのカードだけを、新しい順に出す
            const snapshot = await db.collection("cards").where("source", "==", "scan").get();
            const createdTime = card => (card.createdAt && card.createdAt.toMillis ? card.createdAt.toMillis() : 0);
            this.cards = snapshot.docs
                .map(doc => ({ cardId: doc.id, ...doc.data() }))
                .sort((a, b) => createdTime(b) - createdTime(a));
        } catch (error) {
            console.error("スキャンのカードの読み込みに失敗しました:", error);
            this.loadError = "カードを読み込めませんでした。通信状況を確認してください。";
        } finally {
            this.loading = false;
        }
    },

    methods: {
        // カードを、ゲームやカードライブラリで出すのと同じ形にする
        previewOf(card) {
            return toDisplayCard(card, { team: "", ownerName: card.ownerName || "" });
        },

        // 写真の位置と大きさ（中央・上・下、拡大）
        // 拡大するときは、写真の中心の位置を決めて、その位置を真ん中にそろえる
        imageStyleFor() {
            const position = { top: "center top", center: "center center", bottom: "center bottom" }[this.imagePosition];
            return { objectPosition: position, transform: `scale(${this.imageZoom})`, transformOrigin: position };
        },

        // いま遊べる地域（関東・近畿・北海道）のうち、このカードが出る地域
        playableRegions(card) {
            return cardRegions(card).filter(region => PLAYABLE_REGIONS.includes(region));
        },

        decisionClass(card) {
            if (card.caveOk === true) return "ring-2 ring-emerald-400";
            if (card.caveOk === false) return "ring-2 ring-slate-300";
            return "ring-1 ring-amber-300";
        },

        async setCave(card, value) {
            if (card.caveOk === value) return;
            this.savingId = card.cardId;
            this.saveError = "";
            try {
                await db.collection("cards").doc(card.cardId).update({ caveOk: value });
                card.caveOk = value;
            } catch (error) {
                console.error("洞窟のくじの設定を保存できませんでした:", error);
                this.saveError = `「${card.name}」を保存できませんでした。もう一度ためしてください。`;
            } finally {
                this.savingId = null;
            }
        }
    }
};
</script>
