<template>
    <!-- ■ABゲームのデモ：エリアを選ぶと、陣取りゲームと同じ ABゲーム（ABGameProposalB）を、そのエリアの問題で遊べる。モニタールームの仮リンクから -->
    <div class="min-h-screen bg-slate-100 flex flex-col">

        <!-- 上のバー（陣取りゲームと同じ） -->
        <div class="bg-white border-b border-slate-200 px-4 py-3">
            <div class="mx-auto flex max-w-2xl items-center justify-between gap-2">
                <h1 class="text-base font-black text-slate-800">ABゲーム<br>デモ</h1>
                <span v-if="area" class="whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">📍 {{ area.name }}</span>
            </div>
        </div>

        <div class="flex-1 p-4">
            <div class="mx-auto max-w-2xl">

                <!-- エリアえらび -->
                <div v-if="!areaKey" class="rounded-xl border border-[#475569] bg-[#1e293b] p-4">
                    <p class="mb-3 text-sm font-bold text-slate-200">🃏 エリアをえらんでね（全部の問題で あそべるよ）</p>
                    <div class="flex gap-3">
                        <button class="flex-1 rounded-xl border border-emerald-700 bg-emerald-800 py-4 text-base font-black text-emerald-100 hover:bg-emerald-700" @click="areaKey = 'hiratsuka'">平塚市</button>
                        <button class="flex-1 rounded-xl border border-sky-700 bg-sky-800 py-4 text-base font-black text-sky-100 hover:bg-sky-700" @click="areaKey = 'kushiro'">釧路市</button>
                    </div>
                </div>

                <!-- ABゲーム本体（陣取りの中で出るものと同じ部品）。終わったらエリアえらびにもどる -->
                <template v-else>
                    <ABGameProposalB :key="areaKey" :city="areaKey" embedded @finish="areaKey = null" />
                    <div class="mt-4 text-center">
                        <button class="text-sm font-bold text-slate-500" @click="areaKey = null">← エリアをかえる</button>
                    </div>
                </template>

                <div class="mt-6 text-center">
                    <button class="text-sm font-bold text-slate-500" @click="$router.push({ name: 'Home' })">← モニタールームにもどる</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import ABGameProposalB from "@/views/ABGame/ABGameProposalB.vue";

const AREA_NAMES = { hiratsuka: { name: "平塚市" }, kushiro: { name: "釧路市" } };

export default {
    name: "ABGameDemo",
    components: { ABGameProposalB },
    data() {
        return { areaKey: null };
    },
    computed: {
        area() {
            return this.areaKey ? AREA_NAMES[this.areaKey] : null;
        },
    },
};
</script>
