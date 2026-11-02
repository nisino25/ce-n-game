<template>
    <!-- ■スキャンで作ったカードのうち、洞窟の宝箱から出してよいものをONにする管理画面 -->
    <div class="min-h-screen bg-slate-100 p-4">
        <div class="mx-auto max-w-3xl">
            <header class="mb-4 flex items-center justify-between gap-3">
                <h1 class="text-xl font-black text-slate-800">スキャンのカード：洞窟で出す</h1>
                <button class="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-sm font-bold" @click="$router.back()">もどる</button>
            </header>

            <p class="mb-4 text-sm text-slate-600">ONにしたカードは、洞窟の宝箱のくじに入ります（銀フレームのカードと同じように、地域で当たります）。</p>

            <p v-if="loading" class="py-10 text-center text-slate-500">よみこみ中…</p>
            <p v-else-if="loadError" class="py-10 text-center text-red-600">{{ loadError }}</p>
            <p v-else-if="!cards.length" class="py-10 text-center text-slate-500">スキャンのカードはまだありません</p>

            <ul v-else class="space-y-3">
                <li
                    v-for="card in cards"
                    :key="card.cardId"
                    class="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                >
                    <img v-if="card.image" :src="card.image" :alt="card.name" class="h-20 w-20 flex-none rounded-lg object-cover">
                    <div v-else class="flex h-20 w-20 flex-none items-center justify-center rounded-lg bg-slate-200 text-2xl">🐾</div>

                    <div class="min-w-0 flex-1">
                        <p class="truncate font-bold text-slate-800">{{ card.name }}</p>
                        <p class="truncate text-xs text-slate-500">
                            発見者 {{ card.ownerName || "-" }} ／ レア度 {{ card.rarity || "-" }} ／ {{ regionText(card) }}
                        </p>
                        <p class="text-xs" :class="card.published ? 'text-emerald-700' : 'text-rose-600'">
                            {{ card.published ? "図鑑に出ている" : "図鑑に出ていない（公開されていない）" }}
                        </p>
                    </div>

                    <button
                        type="button"
                        class="flex-none rounded-full px-4 py-2 text-sm font-black transition disabled:opacity-50"
                        :class="card.caveOk ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'"
                        :disabled="savingId === card.cardId"
                        @click="toggleCave(card)"
                    >
                        {{ card.caveOk ? "洞窟で出す：ON" : "洞窟で出す：OFF" }}
                    </button>
                </li>
            </ul>

            <p v-if="saveError" class="mt-4 text-sm text-red-600">{{ saveError }}</p>
        </div>
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
            saveError: ""
        };
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

        async toggleCave(card) {
            const next = card.caveOk !== true;
            this.savingId = card.cardId;
            this.saveError = "";
            try {
                await db.collection("cards").doc(card.cardId).update({ caveOk: next });
                card.caveOk = next;
            } catch (error) {
                console.error("洞窟で出す設定の保存に失敗しました:", error);
                this.saveError = `「${card.name}」の設定を保存できませんでした。もう一度ためしてください。`;
            } finally {
                this.savingId = null;
            }
        }
    }
};
</script>
