<template>
    <!-- ■ABゲームのデモ：陣取りゲーム（すみかにもどそう）と同じ見た目。モニタールームの仮リンクから -->
    <div class="min-h-screen bg-slate-100 flex flex-col">

        <!-- 上のバー（陣取りゲームと同じ） -->
        <div class="bg-white border-b border-slate-200 px-4 py-3">
            <div class="mx-auto flex max-w-2xl items-center justify-between gap-2">
                <h1 class="text-base font-black text-slate-800">ABゲーム<br>デモ</h1>
                <div class="flex min-w-0 items-center gap-2">
                    <span v-if="area" class="whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">📍 {{ area.name }}</span>
                    <span v-if="area && !finished" class="whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Q. {{ idx + 1 }} / {{ area.questions.length }}</span>
                </div>
            </div>
        </div>

        <!-- 本体 -->
        <div class="flex-1 p-4">
            <div class="mx-auto max-w-2xl">

                <!-- エリアえらび -->
                <div v-if="!area" class="rounded-xl border border-[#475569] bg-[#1e293b] p-4">
                    <p class="mb-3 text-sm font-bold text-slate-200">🃏 エリアをえらんでね（全部の問題で あそべるよ）</p>
                    <div class="flex gap-3">
                        <button class="flex-1 rounded-xl border border-emerald-700 bg-emerald-800 py-4 text-base font-black text-emerald-100 hover:bg-emerald-700" @click="startArea('hiratsuka')">平塚市</button>
                        <button class="flex-1 rounded-xl border border-sky-700 bg-sky-800 py-4 text-base font-black text-sky-100 hover:bg-sky-700" @click="startArea('kushiro')">釧路市</button>
                    </div>
                </div>

                <!-- 問題（紺色のパネルの中に、ベージュのカード） -->
                <div v-else-if="!finished" class="rounded-xl border border-[#475569] bg-[#1e293b] p-4">
                    <p class="mb-3 text-sm font-bold text-slate-200">🃏 もんだい</p>
                    <div class="rounded-2xl bg-[#e8cfa8] p-4 text-base leading-relaxed text-slate-900 shadow">{{ current.text }}</div>

                    <div class="mt-4 grid grid-cols-2 gap-3">
                        <button class="rounded-2xl border-2 border-sky-500 bg-[#e8cfa8] py-4 px-3 text-sm font-black text-slate-900 shadow hover:brightness-95 disabled:opacity-50" :disabled="answered" @click="pick('A')">
                            A：{{ area.labelA }}
                        </button>
                        <button class="rounded-2xl border-2 border-emerald-500 bg-[#e8cfa8] py-4 px-3 text-sm font-black text-slate-900 shadow hover:brightness-95 disabled:opacity-50" :disabled="answered" @click="pick('C')">
                            C：{{ area.labelC }}
                        </button>
                    </div>

                    <!-- 正解 -->
                    <div v-if="answered && isCorrect" class="mt-4 rounded-2xl bg-[#14532d] border border-[#15803d] p-4">
                        <p class="mb-1 text-base font-black text-[#bbf7d0]">せいかい！</p>
                        <p class="text-sm leading-relaxed text-emerald-50">{{ current.comment }}</p>
                    </div>

                    <!-- 間違い -->
                    <div v-if="wrongMessage" class="mt-4 rounded-2xl bg-[#7f1d1d] border border-[#b91c1c] p-4">
                        <p class="mb-1 text-base font-black text-[#fecaca]">ちがうかも…もう一度読んでみよう！</p>
                        <p class="text-sm leading-relaxed text-red-50">おとりの答え：{{ current.wrongText }}</p>
                        <p class="text-sm leading-relaxed text-red-50">なぜ違うか：{{ current.whyWrong }}</p>
                    </div>

                    <!-- 下のボタン（陣取りゲームと同じ色） -->
                    <div class="mt-4 flex gap-2">
                        <button v-if="answered && isCorrect" class="flex-1 rounded-xl border border-[#15803d] bg-[#14532d] py-3 text-sm font-black text-[#bbf7d0] hover:brightness-110" @click="nextQ">⏭ つぎへ</button>
                        <button class="flex-1 rounded-xl border border-slate-600 bg-slate-800 py-3 text-sm font-black text-slate-200 hover:bg-slate-700" @click="backToMenu">📍 エリアをかえる</button>
                    </div>
                </div>

                <!-- おわり -->
                <div v-else class="rounded-xl border border-[#475569] bg-[#1e293b] p-5 text-center">
                    <p class="mb-2 text-base font-black text-slate-100">{{ area.name }} おわり！</p>
                    <p class="mb-4 text-sm text-slate-300">{{ area.questions.length }}問中、1回で正解したのは {{ firstTry }}問</p>
                    <div class="flex flex-col gap-2">
                        <button class="rounded-xl border border-[#15803d] bg-[#14532d] py-3 text-sm font-black text-[#bbf7d0]" @click="startArea(areaKey)">もう一度</button>
                        <button class="rounded-xl border border-slate-600 bg-slate-800 py-3 text-sm font-black text-slate-200" @click="backToMenu">エリアをかえる</button>
                    </div>
                </div>

                <div class="mt-4 text-center">
                    <button class="text-sm font-bold text-slate-500" @click="$router.push({ name: 'Home' })">← モニタールームにもどる</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
// ■平塚・釧路の全問題（スプレッドシートの内容に合わせている）
const AREAS = {
    hiratsuka: {
        name: '平塚市',
        labelA: '海ごみ対策',
        labelC: '里山再生',
        questions: [
            {
                text: '木を植えて、元気な山によみがえらせるよ！',
                correct: 'C',
                comment: '元気な山に戻ると、たくさんの落ち葉が雨水を吸って、ゆっくり土にすいこまれて地下水になっていく',
                wrongText: 'A：砂浜や海のごみを拾って集める',
                whyWrong: '木を植えて山をよみがえらせるのは里山の話で、海ごみの話ではないから',
            },
            {
                text: '砂浜にまじっているすいがらや細かいプラスチックをひろうのはたいへんだけど、海の中に流される前に集めるよ！',
                correct: 'A',
                comment: '海に流れたらほとんど回収できなくなっちゃう。手でひとつひとつとるのは大変だから、プラごみ収集メカを開発しているよ！砂浜で引っ張ってたくさん集めるものだよ！ 画像：ヤマハ発動機株式会社 ウェブサイトより',
                wrongText: 'C：里山の木を植えて、山をよみがえらせる',
                whyWrong: '海に流れる前にごみを集める話で、山の話ではないから',
            },
            {
                text: '決められた場所にたばこの吸い殻を捨ててもらうようにくふうするよ',
                correct: 'A',
                comment: 'ところが、せっかくすいがら捨てを設置してもめんどうでポイ捨てしてしま人が多い。そこで、こんな工夫が！ これは「投票できるたばこのすいがら捨て」だよ。好きな方に吸い殻を入れるよ。みんな楽しく捨てにくるから、半分近くたばこのポイ捨てが減った地域もあるよ。',
                wrongText: 'C：里山のくらしと、畑や水田を守る',
                whyWrong: 'たばこの吸い殻を捨てる場所の話で、里山の話ではないから',
            },
            {
                text: '里山のふもとに住む農家さんがつくったお米や野菜を買って、たくさん食べるよ！',
                correct: 'C',
                comment: '里山の自然のめぐみが、農家さんを通してわたしたちの食卓にあがっているんだね。畑や水田は、バランスの良い里山の自然環境に欠かせないんだ。',
                wrongText: 'A：海に流れるごみを、ふせぐ・拾う',
                whyWrong: '農家さんがつくった野菜や米を食べる話で、海ごみの話ではないから',
            },
        ],
    },
    kushiro: {
        name: '釧路市',
        labelA: 'エネルギー',
        labelC: 'ごみのポイ捨て対策',
        questions: [
            {
                text: 'これはごみ箱だよ。カラフルで目立つし、入口が大きいね！',
                correct: 'C',
                comment: 'ごみ箱のデザインを、ごみを捨てやすいような形にしたり、ごみ箱に捨てるのが楽しくなるようなデザインにするとポイ捨てが減るよ※この絵は、デンマークにある、あしあとでごみばこに近づける工夫だよ',
                wrongText: 'A：エネルギーをたくさん使って、電気をふやす',
                whyWrong: 'ごみ箱の話で、電気の話ではないから',
            },
            {
                text: 'AIを動かすとたくさんの電気が使われるんだ。むだに使うと地球のエネルギーがへってしまうよ。でも、上手に使えば、自然を守る力にもなるんだ。',
                correct: 'A',
                comment: '「ここは動物の大切なすみかだから、ソーラーは別の場所にしよう」と教えてくれたり、家や学校の電気の使いすぎを見つけて、むだをへらす手伝いをしてくれるよ。釧路湿原でも、AIを使ってどんな植物が分布しているか調べているよ',
                wrongText: 'C：湿原にごみを捨てないよう、ごみ箱をふやす',
                whyWrong: 'AIと電気の話で、ごみの話ではないから',
            },
            {
                text: '人の暮らしの中で作る電気をふやすよ',
                correct: 'A',
                comment: '家の屋根や会社の屋上など、人の暮らしの中に太陽光パネルを設置すれば、自然を壊さずにすむね。曲げられたり、塗ったり、暮らしの中でどこでも使える太陽光発電の開発が進んでいるよ。',
                wrongText: 'C：観光客がごみを持ち帰るよう、ルールをつくる',
                whyWrong: '電気をつくる話で、ごみの話ではないから',
            },
            {
                text: 'お気に入りのボトルをわすれずに！',
                correct: 'C',
                comment: 'のみものは外で買わずにマイボトルにいれて持ちあるくと、ペットボトルのごみが減るよ',
                wrongText: 'A：太陽光パネルをたくさん置いて、電気をつくる',
                whyWrong: 'ボトルとごみの話で、電気の話ではないから',
            },
        ],
    },
};

export default {
    name: 'ABGameDemo',
    data() {
        return {
            areaKey: null,
            idx: 0,
            firstTry: 0,
            missed: false,
            answered: false,
            answeredSide: null,
            isCorrect: false,
            wrongMessage: false,
            finished: false,
        };
    },
    computed: {
        area() {
            return this.areaKey ? AREAS[this.areaKey] : null;
        },
        current() {
            return this.area ? this.area.questions[this.idx] : null;
        },
    },
    methods: {
        startArea(key) {
            this.areaKey = key;
            this.idx = 0;
            this.firstTry = 0;
            this.finished = false;
            this.resetQuestion();
        },
        resetQuestion() {
            this.missed = false;
            this.answered = false;
            this.answeredSide = null;
            this.isCorrect = false;
            this.wrongMessage = false;
        },
        pick(side) {
            if (this.answered) return;
            if (side === this.current.correct) {
                this.answered = true;
                this.answeredSide = side;
                this.isCorrect = true;
                if (!this.missed) this.firstTry++;
            } else {
                this.missed = true;
                this.wrongMessage = true;
            }
        },
        nextQ() {
            this.idx++;
            if (this.idx >= this.area.questions.length) {
                this.finished = true;
                return;
            }
            this.resetQuestion();
        },
        backToMenu() {
            this.areaKey = null;
            this.finished = false;
        },
    },
};
</script>
