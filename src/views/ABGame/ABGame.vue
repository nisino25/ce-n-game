<template>
    <div class="ab-game">

        <div class="d-area">
            <div
                v-for="n in 17"
                :key="n"
                v-show="visibleIcons.includes(n)"
                class="d-item"
                :class="{ blink: blinkIcons.includes(n) }"
            >
                <img :src="`/images/ABGames/SDGs${n}.png`" style="width:100%;">
            </div>
        </div>

        <div class="abc-row">

            <div class="abc-item area-a">
                <img src="/images/ABGames/env1.jpg" style="width:100%; border-radius:10px;">
                <div class="area-text">
                    <span class="area-title">すいがらは海もよごしてる</span><br><br>
                    湘南海岸に多いのは「たばこのすいがらごみ」。たばこは人の健康に害をおよぼすけど、海ごみになったら、マイクロプラスチックになったり、有毒なものを出して、たくさんの生き物たちに悪い影響を与えてしまうよ。どうすればいい？
                </div>
            </div>

            <div class="circle circle-a" v-show="highlightSide === 'A'"></div>
            <div class="circle circle-c" v-show="highlightSide === 'C'"></div>

            <div class="abc-item area-b" :class="{ shake: shakeAreaB }">

                <div class="b-comment" v-html="bCommentHtml"></div>

                <div class="b-image-box">
                    <img
                        :src="questionImage"
                        class="b-image"
                        :style="{ transform: `translateX(${dragOffset}px)` }"
                        @mousedown="onDragStart"
                        @touchstart="onDragStart"
                    >
                </div>

                <button v-if="phase === 'intro'" class="start-btn" @click="start">
                    スタート
                </button>

                <div class="guide-swipe" v-show="phase === 'question'">
                    <span class="swipe-icon">👆</span>
                    <span>かいけつするほうへスライド</span>
                </div>

                <div class="swipe-effect" :class="{ show: showSwipeEffect }"></div>

                <button v-if="phase === 'correct'" class="next-btn" @click="next">
                    次へ
                </button>

                <button v-if="phase === 'finished'" class="next-stage-btn" @click="goNextStage">
                    NEXT STAGE<br>いきものを戻そう
                </button>

            </div>

            <div class="abc-item area-c">
                <img src="/images/ABGames/env2.jpg" style="width:100%; border-radius:10px;">
                <div class="area-text">
                    <span class="area-title">里山のくらしに元気を取り戻そう</span><br><br>
                    平塚市の西側には里山が広がっているよ。湧き水や谷戸（谷あい）からの豊かな水を使って水田が広がっていたよ。しかし、最近では農家さんが減ってしまったため、里山の樹木が竹林に変わったり、手入れされなくなった畑や水田が草ぼうぼうになってしまっているよ。人と自然で成り立つ里山の環境は、農家さんのようにずっと住み続ける人が必要なんだ。
                </div>
            </div>

        </div>

    </div>
</template>

<script>
export default {
    name: "ABGame",

    data() {
        return {
            // ■元ネタ: /Users/nozomuando/Downloads/ABgame -hiratukaSDGs２ー/index10.html のquestionsをそのまま移植
            questions: [
                {
                    bComment: "木を植えて、元気な山によみがえらせるよ！",
                    imgB: "B1.jpg",
                    correct: "C",
                    showIcons: [11, 13, 15, 17],
                    comment: "かつて平塚には天然記念物のオオムラサキが産卵するエノキの木があったよ。<br><br>オオムサキが戻ってくるように植林しているよ！"
                },
                {
                    bComment: "砂浜にまじっているすいがらや細かいプラスチックをひろうのはたいへんだけど、海の中に流される前に集めるよ！",
                    imgB: "B2.jpg",
                    correct: "A",
                    showIcons: [6, 11, 12, 13, 14, 17],
                    comment: "海に流れたらほとんど回収できなくなっちゃう。手でひとつひとつとるのは大変だから、プラごみ収集メカを開発しているよ！砂浜で引っ張ってたくさん集めるものだよ！<br><br>画像：ヤマハ発動機株式会社 ウェブサイトより"
                },
                {
                    bComment: "決められた場所にたばこの吸い殻を捨ててもらうようにくふうするよ",
                    imgB: "B3.jpg",
                    correct: "A",
                    showIcons: [6, 9, 11, 12, 14, 17],
                    comment: "ところが、せっかくすいがら捨てを設置してもめんどうでポイ捨てしてしま人が多い。<br><br>そこで、こんな工夫が！<br>これは「投票できるたばこのすいがら捨て」だよ。好きな方に吸い殻を入れるよ。みんな楽しく捨てにくるから、半分近くたばこのポイ捨てが減った地域もあるよ。"
                },
                {
                    bComment: "里山のふもとに住む農家さんがつくったお米や野菜を買って、たくさん食べるよ！",
                    imgB: "B4.jpg",
                    correct: "C",
                    showIcons: [8, 9, 11, 13, 15, 17],
                    comment: "里山の自然のめぐみが、農家さんを通してわたしたちの食卓にあがっているんだね。<br><br>畑や水田は、バランスの良い里山の自然環境に欠かせないんだ。"
                }
            ],

            qaImages: ["QA1.jpg", "QA2.jpg", "QA3.png", "QA4.jpg"],

            qIndex: -1,
            phase: "intro", // intro | question | correct | finished

            dragging: false,
            startX: 0,
            dragOffset: 0,
            showSwipeEffect: false,

            shakeAreaB: false,
            highlightSide: null,

            visibleIcons: [],
            blinkIcons: []
        };
    },

    computed: {
        bCommentHtml() {
            if (this.phase === "question") {
                return this.questions[this.qIndex].bComment;
            }

            if (this.phase === "correct") {
                return `<strong>正解！</strong> ${this.questions[this.qIndex].comment}`;
            }

            if (this.phase === "finished") {
                return "<strong>おわり！</strong> よく考えてくれたね。";
            }

            return "左右にある「ひらつか」のかんきょうもんだいをかいけつしよう";
        },

        questionImage() {
            if (this.phase === "question") {
                return `/images/ABGames/${this.questions[this.qIndex].imgB}`;
            }

            if (this.phase === "correct") {
                return `/images/ABGames/${this.qaImages[this.qIndex]}`;
            }

            if (this.phase === "finished") {
                return "/images/ABGames/finish.jpg";
            }

            return "/images/ABGames/seibi_top.jpg";
        }
    },

    mounted() {
        window.addEventListener("mousemove", this.onDragMove);
        window.addEventListener("mouseup", this.onDragEnd);
        window.addEventListener("touchmove", this.onDragMove, { passive: true });
        window.addEventListener("touchend", this.onDragEnd);
    },

    beforeUnmount() {
        window.removeEventListener("mousemove", this.onDragMove);
        window.removeEventListener("mouseup", this.onDragEnd);
        window.removeEventListener("touchmove", this.onDragMove);
        window.removeEventListener("touchend", this.onDragEnd);
    },

    methods: {
        start() {
            this.qIndex = 0;
            this.phase = "question";
            this.visibleIcons = this.allIconIds();
        },

        onDragStart(e) {
            if (this.phase !== "question") {
                return;
            }

            this.dragging = true;
            this.startX = e.touches ? e.touches[0].clientX : e.clientX;
        },

        onDragMove(e) {
            if (!this.dragging) {
                return;
            }

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;

            this.dragOffset = clientX - this.startX;
            this.showSwipeEffect = true;
        },

        onDragEnd() {
            if (!this.dragging) {
                return;
            }

            const diff = this.dragOffset;

            this.dragging = false;
            this.showSwipeEffect = false;
            this.dragOffset = 0;

            this.checkSwipe(diff);
        },

        checkSwipe(diff) {
            const q = this.questions[this.qIndex];

            if (diff > 50) {
                if (q.correct === "C") {
                    this.correctAnswer();
                } else {
                    this.wrongAnswer();
                }
            } else if (diff < -50) {
                if (q.correct === "A") {
                    this.correctAnswer();
                } else {
                    this.wrongAnswer();
                }
            }
        },

        correctAnswer() {
            const q = this.questions[this.qIndex];

            this.phase = "correct";
            this.highlightSide = q.correct;

            setTimeout(() => {
                this.highlightSide = null;
            }, 1000);

            this.visibleIcons = [...q.showIcons];
            this.blinkIcons = [...q.showIcons];

            setTimeout(() => {
                this.blinkIcons = [];
            }, 600);
        },

        wrongAnswer() {
            this.shakeAreaB = true;

            setTimeout(() => {
                this.shakeAreaB = false;
            }, 300);
        },

        next() {
            this.qIndex++;

            if (this.qIndex >= this.questions.length) {
                this.phase = "finished";
                this.visibleIcons = this.allIconIds();
                return;
            }

            this.phase = "question";
            this.visibleIcons = this.allIconIds();
        },

        goNextStage() {
            // ■地図（陣取りゲーム）側への統合は別対応予定。現時点ではモニタールームに戻すだけの仮動作
            this.$router.push({ name: "Home" });
        },

        allIconIds() {
            return Array.from({ length: 17 }, (_, i) => i + 1);
        }
    }
};
</script>

<style scoped>
.ab-game{
    font-family: sans-serif;
    background: #f0f0f0;
    text-align: center;
    min-height: 100vh;
    padding: 10px 0 30px;
}

.d-area{
    width: 90%;
    margin: 10px auto 20px auto;
    display: flex;
    justify-content: center;
    gap: 5px;
    flex-wrap: wrap;
}

.d-item{
    width: 60px;
    height: 60px;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 0 4px rgba(0,0,0,0.2);
    display: flex;
    justify-content: center;
    align-items: center;
}

.abc-row{
    position: relative;
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
}

.abc-item{
    width: 30%;
    padding: 10px;
    border-radius: 12px;
    background: white;
    box-shadow: 0 0 6px rgba(0,0,0,0.2);
    position: relative;
}

.area-a{ background: #d0f0ff; }
.area-c{ background: #ffdcdc; }

.area-text{
    margin-top: 10px;
    font-size: 14px;
    text-align: left;
    background: #ffffff;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 0 4px rgba(0,0,0,0.2);
}

.area-title{
    font-weight: bold;
    font-size: 18px;
}

.circle{
    position: absolute;
    top: 40%;
    width: 120px;
    height: 120px;
    border: 8px solid red;
    border-radius: 50%;
    z-index: 999;
}

.circle-a{ left: 5%; }
.circle-c{ right: 5%; }

.area-b{
    background: #fff8d0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-bottom: 20px;
}

.b-comment{
    width: 100%;
    background: #fff4b8;
    padding: 10px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 0 4px rgba(0,0,0,0.2);
    text-align: left;
}

.b-image-box{
    width: 100%;
    display: flex;
    justify-content: center;
}

.b-image{
    width: 320px;
    max-width: 100%;
    height: auto;
    border-radius: 10px;
    user-select: none;
    -webkit-user-drag: none;
    cursor: grab;
}

.guide-swipe{
    background: rgba(255,255,255,0.95);
    padding: 10px 18px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 0 8px rgba(0,0,0,0.25);
}

.swipe-icon{
    font-size: 28px;
    animation: swipeAnim 1s infinite;
}

@keyframes swipeAnim{
    0%   { transform: translateX(-10px); }
    50%  { transform: translateX(10px); }
    100% { transform: translateX(-10px); }
}

.start-btn,
.next-btn{
    padding: 12px 20px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(0,0,0,0.3);
}

.next-stage-btn{
    font-size: 24px;
    padding: 20px 40px;
    background: #ff6600;
    color: white;
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    margin-top: 20px;
    cursor: pointer;
}

.swipe-effect{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: linear-gradient(
        to right,
        rgba(255,255,0,0.0),
        rgba(255,255,0,0.4),
        rgba(255,255,0,0.0)
    );
    opacity: 0;
    transition: opacity 0.2s;
}

.swipe-effect.show{
    opacity: 1;
}

.shake{
    animation: shakeAnim 0.1s alternate 3;
}

@keyframes shakeAnim{
    from { transform: translateX(0); }
    to { transform: translateX(-10px); }
}

.blink{
    animation: blinkAnim 0.3s alternate 3;
}

@keyframes blinkAnim{
    from { opacity: 1; }
    to { opacity: 0.2; }
}
</style>
