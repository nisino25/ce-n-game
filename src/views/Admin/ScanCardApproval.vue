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
                    <img v-if="card.image" :src="card.image" :alt="card.name" class="h-28 w-28 flex-none rounded-xl object-cover">
                    <div v-else class="flex h-28 w-28 flex-none items-center justify-center rounded-xl bg-slate-200 text-3xl">🐾</div>

                    <div class="flex min-w-0 flex-1 flex-col">
                        <p class="truncate text-lg font-black text-slate-800">{{ card.name }}</p>
                        <p class="truncate text-sm font-bold text-sky-700">{{ card.nameEn || "（英語名なし）" }}</p>
                        <p class="mt-1 text-xs text-slate-500">発見者 {{ card.ownerName || "-" }} ／ レア度 {{ card.rarity || "-" }}</p>
                        <p class="truncate text-xs text-slate-500">{{ regionText(card) }}</p>
                        <p class="mt-1 text-xs font-bold" :class="card.published ? 'text-emerald-700' : 'text-rose-600'">
                            {{ card.published ? "図鑑に出ている" : "図鑑に出ていない（非公開）" }}
                        </p>

                        <!-- 決める：ON / OFF のどちらかを押す -->
                        <div class="mt-auto grid grid-cols-2 gap-2 pt-3">
                            <button
                                type="button"
                                class="rounded-xl py-2 text-sm font-black transition disabled:opacity-50"
                                :class="card.caveOk === true ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'"
                                :disabled="savingId === card.cardId"
                                @click="setCave(card, true)"
                            >
                                ON：入れる
                            </button>
                            <button
                                type="button"
                                class="rounded-xl py-2 text-sm font-black transition disabled:opacity-50"
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
import { cardRegions, REGION_LABELS } from "@/utils/cards.js";

export default {
    name: "ScanCardApproval",

    data() {
        return {
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
        regionText(card) {
            const regions = cardRegions(card);
            return regions.length ? regions.map(region => REGION_LABELS[region] || region).join("・") : "地域なし";
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
