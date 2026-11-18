<template>
    <div class="min-h-screen bg-gray-100 py-8 px-4">
        <div class="max-w-5xl mx-auto">

            <header class="bg-white rounded-xl shadow p-5 mb-6">
                <h1 class="text-xl font-bold">✏️ 鉛筆ボタンの置き場所（確認用）</h1>
                <p class="text-sm text-gray-600 mt-2">
                    モニタールームの自分のアバターの横に、鉛筆ボタンをどう置くかを比べる画面です。気に入った番号を教えてください。（見た目だけ。押しても何も起きません）
                </p>
            </header>

            <div class="grid sm:grid-cols-2 gap-6">
                <section v-for="variant in variants" :key="variant.id" class="bg-white rounded-xl shadow p-4">
                    <h2 class="font-bold mb-3">{{ variant.id }}. {{ variant.label }}</h2>

                    <!-- ■モニタールームの背景に近い箱の中で、アバターと鉛筆ボタンを置く -->
                    <div class="relative h-[200px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
                            <div
                                class="w-full h-full rounded-full border-4 border-yellow-400 overflow-hidden"
                                v-html="avatarSvg"
                            ></div>

                            <button
                                type="button"
                                class="absolute rounded-full bg-[#0b1220] p-1 shadow-lg ring-2 ring-cyan-400"
                                :style="variant.style"
                                aria-hidden="true"
                                tabindex="-1"
                            >
                                <svg viewBox="0 0 64 64" class="w-7 h-7 block">
                                    <path d="M32 27 V22 A4 4 0 1 1 36 18" fill="none" stroke="#22d3ee" stroke-width="5" stroke-linecap="round"/>
                                    <path d="M32 27 L13 40 Q12 44 16 44 H48 Q52 44 51 40 Z" fill="none" stroke="#22d3ee" stroke-width="5" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <p class="text-xs text-gray-500 mt-2">{{ variant.note }}</p>
                </section>
            </div>

        </div>
    </div>
</template>

<script>
export default {
    name: "AvatarButtonLab",

    data(){
        return {
            // 見本のアバター（モニタールームで出ている人と同じ作り方）
            sample: { env:5, clo:12, head:3, mouth:8, eyes:20, top:14 },

            // 鉛筆ボタンの置き方。style はアバターの箱（80px）からの相対位置
            variants: [
                { id: 1, label: "右横・まん中", note: "アバターの右に、高さをそろえて置く", style: { left: "100%", top: "50%", transform: "translate(8px, -50%)" } },
                { id: 2, label: "右横・上", note: "右に、アバターの上の端にそろえる", style: { left: "100%", top: "0", transform: "translate(8px, 0)" } },
                { id: 3, label: "右横・下", note: "右に、アバターの下の端にそろえる", style: { left: "100%", bottom: "0", transform: "translate(8px, 0)" } },
                { id: 4, label: "左横・まん中", note: "アバターの左に置く（名前とぶつかりにくい）", style: { right: "100%", top: "50%", transform: "translate(-8px, -50%)" } },
                { id: 5, label: "右下の角（バッジ風）", note: "アバターの右下に、少し重ねる", style: { right: "-6px", bottom: "-6px" } },
                { id: 6, label: "右上の角（バッジ風）", note: "アバターの右上に、少し重ねる", style: { right: "-6px", top: "-6px" } },
                { id: 7, label: "上・まん中", note: "アバターの真上に置く", style: { left: "50%", top: "-48px", transform: "translateX(-50%)" } },
                { id: 8, label: "下・まん中", note: "アバターの真下に置く（今の案に近い）", style: { left: "50%", bottom: "-48px", transform: "translateX(-50%)" } },
            ],
        };
    },

    computed:{
        avatarSvg(){
            return this.$buildAvatar(this.sample);
        },
    },
}
</script>
