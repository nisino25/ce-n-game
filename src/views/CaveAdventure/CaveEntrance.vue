<template>
    <!-- ■追加：帰還ゲート表示 -->
    <div id="returnGate" @click="returnHome">
        ◉
        <div>帰還ゲート</div>
    </div>
    <!-- ■追加：ワープ演出 -->
    <div id="warpEffect"></div>


    <div
        v-if="showStart"
        id="start"
        class="fixed inset-0 flex items-center justify-center bg-black"
    >
        <button
            id="startButton"
            class="absolute inset-0"
            @click="startGame"
        ></button>

        <img
            src="/images/cave/cave-entrance.png"
            id="entrance"
            class="w-[90vw] rounded-xl"
        >
    </div>

    <!-- ■追加：ダンジョン転送中表示 -->
    <div v-if="showLoading" id="loadingScreen">
        <div id="loadingText">
            ダンジョン転送中・・・
        </div>
    </div>

</template>

<script>
export default {

    data() {
        return {
            showStart: true,
            // ■追加：
            showLoading: false
        };
    },

    methods: {

        // ■追加：帰還処理
        returnHome() {
            const warp = document.getElementById("warpEffect");
            if (warp) {
                warp.style.width = "300vmax";
                warp.style.height = "300vmax";
            }

            setTimeout(() => {
                this.$router.push("/");
            }, 800);
        },
        // ---------

        startGame() {
        // 開始ボタン後の演出
            this.showStart = false;
            this.showLoading = true;
            setTimeout(() => {
                this.showLoading = false;

           this.$router.push("/cave-adventure/cave-game");
            },  1500);
       }
    }

};
</script>

<style scoped>
#start {
    z-index: 10;
    background:
        radial-gradient(
            circle at center,
            #444 0%,
            #222 35%,
            #111 65%,
            #000 100%
        );
}

#startButton {
    z-index: 100;
    cursor: pointer;
    background: transparent;
    border: none;
}

#entrance {
    object-fit: contain;
    max-height: 95vh;
    max-width: 90vw;
    box-shadow: 0 0 40px rgba(255, 200, 80, 0.4);
}

#returnGate {
    position: fixed;
    left: 7.5%;
    top: 30px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 4px solid #00ffff;
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.2;
    cursor: pointer;
    box-shadow:
        0 0 20px #00ffff,
        inset 0 0 20px #00ffff;
    animation: pulse 2s infinite;
    z-index: 1000;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

#warpEffect {
    position: fixed;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: white;
    transform: translate(-50%, -50%);
    z-index: 9999;
    pointer-events: none;
    transition: width 1.2s ease, height 1.2s ease;
}

#loadingScreen {
    position: fixed;
    inset: 0;
    background: black;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5000;
}

#loadingText {
    font-size: 48px;
    font-weight: bold;
    color: #00ffff;
    text-shadow:
        0 0 10px #00ffff,
        0 0 20px #00ffff,
        0 0 40px #00ffff;
    animation: blink 0.8s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}
</style>


