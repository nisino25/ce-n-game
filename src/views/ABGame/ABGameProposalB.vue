<template>
    <div class="min-h-screen bg-[#f4f1e8] flex justify-center px-4 py-8">
        <div class="w-full max-w-2xl">

            <!-- Header -->
            <header class="flex items-center justify-between mb-5">
                <h1 class="text-xl font-bold text-emerald-900 tracking-wide">
                    ひらつか かんきょうチャレンジ<span class="text-sm font-normal text-emerald-700 ml-1">（提案B）</span>
                </h1>
                <div v-if="phase === 'question' || phase === 'correct'" class="bg-emerald-800 text-white text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Q. {{ progressIndex }} / {{ questions.length }}
                </div>
            </header>

            <!-- Impact meters -->
            <div v-if="phase !== 'intro'" class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-white rounded-2xl p-3 shadow-sm border border-sky-100">
                    <div class="text-xs font-bold text-sky-700 mb-1">🏖️ 海ごみ対策</div>
                    <div class="h-2.5 bg-sky-100 rounded-full overflow-hidden">
                        <div class="h-full bg-sky-500 rounded-full transition-all duration-500" :style="{ width: impactAPercent + '%' }"></div>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-3 shadow-sm border border-emerald-100">
                    <div class="text-xs font-bold text-emerald-700 mb-1">⛰️ 里山再生</div>
                    <div class="h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" :style="{ width: impactCPercent + '%' }"></div>
                    </div>
                </div>
            </div>

            <!-- Intro -->
            <div v-if="phase === 'intro'" class="bg-white rounded-3xl shadow-md p-8 text-center">
                <img src="/images/ABGames/seibi_top.jpg" class="w-full max-w-sm mx-auto rounded-2xl mb-5">
                <p class="text-emerald-900 font-bold text-lg mb-1">ひらつかの2つのかんきょう問題</p>
                <p class="text-gray-600 text-sm mb-6">出てくる取り組みが、どっちの問題を解決するかを選んでいこう！</p>
                <p v-if="loadError" class="text-red-600 text-sm mb-4">{{ loadError }}</p>
                <button
                    class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg px-10 py-3 rounded-2xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="loading || !questions.length"
                    @click="start"
                >
                    {{ loading ? "よみこみ中…" : "はじめる" }}
                </button>
            </div>

            <!-- Question / Correct -->
            <div v-else-if="phase === 'question' || phase === 'correct'">

                <div class="bg-white rounded-2xl shadow-sm p-4 mb-5 flex gap-4 items-center">
                    <img :src="`/images/ABGames/${currentQuestion.imgB}`" class="w-24 h-24 object-cover rounded-xl flex-none">
                    <p class="text-gray-800 text-sm leading-relaxed">{{ currentQuestion.bComment }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button
                        class="choice-card border-sky-200 bg-sky-50"
                        :class="choiceClass('A')"
                        :disabled="phase === 'correct'"
                        @click="choose('A')"
                    >
                        <img src="/images/ABGames/env1.jpg" class="w-full h-28 object-cover rounded-xl mb-2">
                        <span class="font-bold text-sky-800 text-sm">すいがら・海ごみ</span>
                    </button>
                    <button
                        class="choice-card border-emerald-200 bg-emerald-50"
                        :class="choiceClass('C')"
                        :disabled="phase === 'correct'"
                        @click="choose('C')"
                    >
                        <img src="/images/ABGames/env2.jpg" class="w-full h-28 object-cover rounded-xl mb-2">
                        <span class="font-bold text-emerald-800 text-sm">里山のくらし</span>
                    </button>
                </div>

                <p v-if="hint" class="text-center text-rose-600 font-bold text-sm mt-3">
                    {{ hint }}
                </p>

                <transition name="fade-up">
                    <div v-if="phase === 'correct'" class="bg-white rounded-2xl shadow-md p-5 mt-5">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">正解！</span>
                        </div>
                        <div class="flex gap-4 items-start mb-4">
                            <img :src="`/images/ABGames/${currentQuestion.qaImage}`" class="w-28 h-28 object-cover rounded-xl flex-none">
                            <p class="text-gray-700 text-sm leading-relaxed" v-html="currentQuestion.comment"></p>
                        </div>
                        <div class="flex flex-wrap gap-2 justify-center mb-4">
                            <img
                                v-for="n in currentQuestion.showIcons"
                                :key="n"
                                :src="`/images/ABGames/SDGs${n}.png`"
                                class="w-10 h-10 rounded-md sdgs-pop"
                            >
                        </div>
                        <div class="text-center">
                            <button
                                class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-sm transition-colors"
                                @click="next"
                            >
                                次へ
                            </button>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- Finished -->
            <div v-else class="bg-white rounded-3xl shadow-md p-8 text-center">
                <p class="text-emerald-900 font-bold text-xl mb-2">おわり！よく考えてくれたね。</p>
                <p class="text-gray-600 text-sm mb-5">
                    海ごみ対策 {{ correctCountA }}問 ／ 里山再生 {{ correctCountC }}問、解決に貢献したよ。
                </p>
                <div class="flex flex-wrap gap-2 justify-center mb-6">
                    <img
                        v-for="n in 17"
                        :key="n"
                        :src="`/images/ABGames/SDGs${n}.png`"
                        class="w-10 h-10 rounded-md"
                    >
                </div>
                <button
                    class="bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-md transition-colors"
                    @click="goNextStage"
                >
                    NEXT STAGE<br>いきものを戻そう
                </button>
            </div>

        </div>
    </div>
</template>

<script>
import db from "@/firebase.js";

const QUESTION_LOCATION = "hiratsuka";

export default {
    name: "ABGameProposalB",

    props: {
        // ■地図画面のモーダル内で遊ぶ場合はtrue。終了時に遷移せずfinishイベントを出す
        embedded: {
            type: Boolean,
            default: false
        }
    },

    emits: ["finish"],

    data() {
        return {
            // ■元ロジック（ABGame.vue / index10.html）の内容をベースに、
            // 操作感とレイアウトだけを見直した別案。既存のABGame.vueは変更していない
            // 問題はFirestoreの abGameQuestions コレクションから取得する（order順）
            questions: [],
            loading: true,
            loadError: "",

            qIndex: -1,
            phase: "intro", // intro | question | correct | finished

            selectedSide: null,
            wrongSide: null,
            hint: "",

            correctCountA: 0,
            correctCountC: 0
        };
    },

    async mounted() {
        try {
            const snapshot = await db.collection("abGameQuestions")
                .where("location", "==", QUESTION_LOCATION)
                .get();
            this.questions = snapshot.docs
                .map(doc => doc.data())
                .sort((a, b) => a.order - b.order);

            if (!this.questions.length) {
                this.loadError = "問題が見つかりませんでした。";
            }
        } catch (error) {
            console.error("ABゲームの問題の取得に失敗しました:", error);
            this.loadError = "問題の読み込みに失敗しました。通信状況を確認してください。";
        } finally {
            this.loading = false;
        }
    },

    computed: {
        currentQuestion() {
            return this.questions[this.qIndex] || {};
        },

        progressIndex() {
            return this.qIndex + 1;
        },

        impactAPercent() {
            return Math.round((this.correctCountA / this.questions.length) * 100);
        },

        impactCPercent() {
            return Math.round((this.correctCountC / this.questions.length) * 100);
        }
    },

    methods: {
        start() {
            this.qIndex = 0;
            this.phase = "question";
        },

        choose(side) {
            if (this.phase !== "question") {
                return;
            }

            const q = this.questions[this.qIndex];

            if (side === q.correct) {
                this.selectedSide = side;
                this.phase = "correct";
                this.hint = "";

                if (side === "A") {
                    this.correctCountA++;
                } else {
                    this.correctCountC++;
                }

                return;
            }

            this.wrongSide = side;
            this.hint = "ちがうかも…もう一度読んでみよう！";

            setTimeout(() => {
                this.wrongSide = null;
            }, 400);
        },

        choiceClass(side) {
            return {
                "choice-correct": this.phase === "correct" && this.selectedSide === side,
                "choice-wrong": this.wrongSide === side
            };
        },

        next() {
            this.selectedSide = null;
            this.hint = "";
            this.qIndex++;

            if (this.qIndex >= this.questions.length) {
                this.phase = "finished";
                return;
            }

            this.phase = "question";
        },

        goNextStage() {
            if (this.embedded) {
                this.$emit("finish");
                return;
            }

            // ■地図（陣取りゲーム）側への統合は別対応予定。現時点ではモニタールームに戻すだけの仮動作
            this.$router.push({ name: "Home" });
        }
    }
};
</script>

<style scoped>
.choice-card{
    border-width: 2px;
    border-radius: 1.25rem;
    padding: 0.9rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .15s ease;
}

.choice-card:hover:not(:disabled){
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0,0,0,.08);
}

.choice-card:disabled{
    cursor: default;
}

.choice-correct{
    outline: 3px solid #16a34a;
    box-shadow: 0 0 0 4px rgba(22,163,74,.2);
}

.choice-wrong{
    animation: shakeAnim .1s ease-in-out 3;
    outline: 3px solid #e11d48;
}

@keyframes shakeAnim{
    from { transform: translateX(0); }
    to { transform: translateX(-8px); }
}

.sdgs-pop{
    animation: popIn .3s ease-out;
}

@keyframes popIn{
    from { transform: scale(.4); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.fade-up-enter-active{
    transition: opacity .25s ease, transform .25s ease;
}

.fade-up-enter-from{
    opacity: 0;
    transform: translateY(8px);
}
</style>
