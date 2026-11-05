<template>
    <!-- ■追加：帰還ゲート表示 -->
    <div id="returnGate" @click="returnHome">
        ◉
        <div>{{ $t('帰還ゲート', 'Return gate') }}</div>
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
            @click="openAreaSelect"
        ></button>

        <!-- ■正しい会員として読めない（ログインしていない・カギが読めない）ときは、探検させない -->
        <div
            v-if="keysError"
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[80%] max-w-md rounded-xl bg-black/80 border-2 border-red-400 px-5 py-4 text-center text-white font-bold pointer-events-none"
        >
            <p class="text-lg">🔒 {{ $t('今は探検できません', 'Exploring is not available right now') }}</p>
            <p class="mt-2 text-sm">{{ $t('カギの情報を読み込めませんでした。ログインし直してから、もう一度ためしてください。', 'Could not load your keys. Please log in again and try again.') }}</p>
        </div>

        <!-- ■持っているカギの合計（種類別の内訳は出さない） -->
        <div
            v-if="!keysError"
            class="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/60 border-2 border-yellow-300 px-5 py-1.5 text-white font-black text-lg whitespace-nowrap pointer-events-none"
        >
            <template v-if="keysLoaded">🔑 {{ $t('カギ', 'Keys') }} {{ totalKeys }}{{ $t('本', '') }}</template>
            <template v-else>🔑 {{ $t('カギを確認中…', 'Checking keys…') }}</template>
        </div>

        <img
            src="/images/cave/cave-entrance.png"
            id="entrance"
            class="w-[90vw] rounded-xl"
        >

        <!-- ■どのダンジョンに入るかを選ぶ（入口の画像をクリックすると表示） -->
        <div v-if="showAreaSelect" id="areaSelectBackdrop" @click.self="showAreaSelect = false">
        <div id="areaSelect">
            <p class="area-select-title">{{ $t('どのダンジョンに入る？', 'Which dungeon will you enter?') }}</p>
            <div class="area-select-buttons">
                <button
                    v-for="(info, id) in areas"
                    :key="id"
                    class="area-select-button"
                    :style="{ '--area-color': info.keyColor }"
                    @click="startGame(id)"
                >
                    <img :src="info.emblem" :alt="info.name" class="area-select-emblem">
                    <span>{{ $t(info.name + 'ダンジョン', info.nameEn + ' dungeon') }}</span>
                    <!-- ■このダンジョンのカギの数（読み込み中は出さない） -->
                    <span v-if="keysLoaded" class="area-select-keys">🔑 {{ caveKeys[id] || 0 }}{{ $t('本', ' keys') }}</span>
                </button>
            </div>
        </div>
        </div>
    </div>

    <!-- ■追加：ダンジョン転送中表示 -->
    <div v-if="showLoading" id="loadingScreen">
        <div id="loadingText">
            {{ $t(selectedAreaName + 'ダンジョン転送中・・・', 'Warping to the ' + selectedAreaNameEn + ' dungeon...') }}
        </div>
    </div>

</template>

<script>
import { CAVE_AREAS, saveNextCaveArea, loadCaveKeys } from "./caveAreas.js";
import { prefetchChestData } from "@/utils/cards.js";
import { getSession } from "@/utils/session.js";

export default {
    mounted() {
        // ■洞窟に入った時点で、宝箱のデータを裏で読んでおく（宝箱の画面で待たないように）
        prefetchChestData();

        // ■持っているカギの合計を出すために、カギの数を読む。
        // 会員として読めなかった（ログインしていない・カギが読めない）ときは、探検させない
        const cenId = getSession("loginCenId");
        if (!cenId) {
            this.keysError = true;
            return;
        }
        loadCaveKeys(cenId)
            .then(keys => {
                this.caveKeys = keys;
                this.keysLoaded = true;
            })
            .catch(error => {
                console.error("カギ情報の読み込みに失敗しました:", error);
                this.keysError = true;
            });
    },

    computed: {
        totalKeys() {
            return Object.values(this.caveKeys).reduce((sum, count) => sum + count, 0);
        }
    },

    data() {
        return {
            showStart: true,
            // ■追加：
            showLoading: false,
            areas: CAVE_AREAS,
            showAreaSelect: false,
            selectedAreaName: "",
            selectedAreaNameEn: "",
            caveKeys: {},
            keysLoaded: false,
            keysError: false
        };
    },

    methods: {

        // ■ダンジョンを選ぶ画面は、カギが読めたときだけ開く
        openAreaSelect() {
            if (this.keysError) return;
            this.showAreaSelect = true;
        },

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

        // ■選んだエリアのダンジョンへ（洞窟画面でそのエリアから始める）
        startGame(areaId) {
            saveNextCaveArea(areaId);
            this.selectedAreaName = CAVE_AREAS[areaId].name;
            this.selectedAreaNameEn = CAVE_AREAS[areaId].nameEn;
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

#areaSelectBackdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.6);
}

#areaSelect {
    width: min(92vw, 720px);
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 200, 80, 0.5);
    box-shadow: 0 0 24px rgba(255, 200, 80, 0.3);
    text-align: center;
}

.area-select-title {
    margin: 0 0 10px;
    color: #ffe29a;
    font-size: 20px;
    font-weight: 900;
    text-shadow: 0 0 8px rgba(255, 200, 80, 0.7);
}

.area-select-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
}

.area-select-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1 1 180px;
    padding: 8px 10px;
    border: 2px solid var(--area-color);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
}

.area-select-button:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-2px);
}

.area-select-emblem {
    width: 150px;
    height: 44px;
    object-fit: contain;
}

.area-select-keys {
    font-size: 15px;
    font-weight: 900;
    color: #ffd84d;
    text-shadow: 1px 1px 0 #000;
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


