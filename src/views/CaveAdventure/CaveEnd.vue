<template>
  <div class="wrap-whole-page">

    <div class="top-info absolute top-8 left-8 text-white text-lg font-bold z-10">
        <!-- ■訂正：ダンジョン出口 -->
        <div id="returnGate" @click="activateGate">
            ◉
            <div>ダンジョン出口</div>
        </div>
    
        <!-- ■追加：他洞窟へのワープ -->
        <div id="forestWarpGate" @click="warpDungeon">
            ◉
            <div>他洞窟へのワープ</div>
        </div>
    </div>

    <div ref="warp" class="warpEffect" id="warpEffect"></div>

    <div id="result">{{ selectedAreaInfo.name }}のカギ：{{ remainKeys }}本</div>

    <!-- ■どのエリアのカギで宝箱を開けるか（初期値は最後に遊んだ洞窟のエリア） -->
    <div class="area-tabs">
        <button
            v-for="(info, id) in areas"
            :key="id"
            class="area-tab"
            :class="{ active: id === selectedArea }"
            :style="{ '--area-color': info.keyColor }"
            :disabled="chestPhase !== 'idle'"
            @click="selectedArea = id"
        >
            <span class="area-key">🔑</span>
            {{ info.name }} {{ caveKeys[id] }}本
        </button>
    </div>

    <!-- ■宝箱：カギを差す → 回す → 錠前が外れる → フタが開いて光があふれる → カード登場 -->
    <div class="chest" :class="'phase-' + chestPhase" @click="openChest">
        <div class="light-rays"></div>
        <div class="chest-glow"></div>
        <div class="base">
            <div class="inside"></div>
        </div>
        <div class="lid">
            <div class="lid-face lid-front"></div>
            <div class="lid-face lid-back"></div>
        </div>
        <div class="lock"></div>
        <svg class="key" viewBox="0 0 24 64" aria-hidden="true">
            <circle cx="12" cy="10" r="7.5" fill="none" stroke="#ffd84d" stroke-width="4"/>
            <rect x="10" y="17" width="4" height="42" rx="1" fill="#ffd84d"/>
            <rect x="14" y="45" width="7" height="4" fill="#ffd84d"/>
            <rect x="14" y="53" width="5" height="4" fill="#ffd84d"/>
        </svg>
        <span
            v-for="n in 14"
            :key="n"
            class="sparkle"
            :style="sparkleStyle(n)"
        ></span>
    </div>

    <div class="flex gap-2 mt-4">
        <button @click="showCollection" class="px-3 py-1 bg-gray-200 rounded">カード一式</button>
    </div>

    <!-- Card -->
    <div v-if="showOverlay" class="overlay">
        <div class="card" :style="{ backgroundImage: `url('/images/card/cardBack.png')` }">   
            <!-- ■生態系レベル -->
            <div class="eco-level">
                <img v-if="currentCard.group === '土'" src="/images/card/チームカラー（土・ブラウン）.png" class="team-color-bg" alt="土">
                <img v-else-if="currentCard.group === '水'" src="/images/card/チームカラー（水・ブルー）.png" class="team-color-bg" alt="水">
                <img v-else-if="currentCard.group === '風'" src="/images/card/チームカラー（風・ライトグリーン）.png" class="team-color-bg" alt="風">

                <img :src="currentCard.level" alt="生態系レベル">
                <span>生態系レベル</span>
            </div>

            <!-- ■上段 -->
            <div class="card-top">
            <div class="card-top-right">
                <!-- ■レア度 -->
                <div class="rarity">
                    <span>レア度</span>
                    <strong>{{ currentCard.rare }}</strong>
                </div>
                <!-- ■すみか -->
                <div class="habitat">
                    <span>すみか</span>
                    <img :src="currentCard.area2" alt="すみか">
                </div>
            </div>
            </div>

            <!-- ■生きもの画像 -->
            <div class="card-image">
                <img v-if="currentCard.icon" :src="currentCard.icon" :alt="currentCard.name">
                <div v-else class="no-image">🐾<span>画像じゅんび中</span></div>
            </div>

            <!-- ■生きものの名前 -->
            <h2 class="card-name">{{ currentCard.name }}</h2>

            <!-- ■発見者 -->
            <div class="discoverer">発見者 {{ currentCard.owner }}</div>

            <!-- ■閉じるボタン（class="close-btn" を付与） -->
            <button class="close-btn" @click.stop="closeCard">閉じる</button>
        </div>    
    </div>

    <!-- Collection -->
    <div v-if="showBook" class="book">
        <div class="bookPanel">
            <h2>獲得カード一覧</h2>
            <div id="collectionGrid">
                <div v-if="collectionLoading">よみこみ中…</div>
                <div v-else-if="collection.length === 0">まだカードを獲得していません。</div>
                <!-- ■ミニカード表示 -->
                    <div v-for="card in collection" :key="card.instanceId" class="smallCard" :style="{ backgroundImage: `url('/images/card/cardBack.png')` }">
                        <!-- 生態系レベル -->
                        <div class="small-eco">
                            <img v-if="card.group === '土'" src="/images/card/チームカラー（土・ブラウン）.png" class="small-team-bg" alt="土">
                            <img v-else-if="card.group === '水'" src="/images/card/チームカラー（水・ブルー）.png" class="small-team-bg" alt="水">
                            <img v-else-if="card.group === '風'" src="/images/card/チームカラー（風・ライトグリーン）.png" class="small-team-bg" alt="風">

                            <img :src="card.level" alt="レベル">
                            <span>生態系レベル</span>
                        </div>
                        <!-- レア度 & すみか -->
                        <div class="small-top-right">
                            <div class="small-rare">
                                <span>レア度</span>
                                <strong>{{ card.rare }}</strong>
                            </div>
                            <div class="small-habitat">
                                <span>すみか</span>
                                <img :src="card.area2" alt="すみか">
                            </div>
                        </div>
                        <!-- 生きもの画像 -->
                        <div class="small-image">
                            <img v-if="card.icon" :src="card.icon" :alt="card.name">
                            <div v-else class="no-image small">🐾</div>
                        </div>
                        <!-- 名前 -->
                        <div class="small-name">{{ card.name }}</div>
                        <!-- 発見者 -->
                        <div class="small-owner">発見者 {{ card.owner }}</div>
                
                </div>
            </div>
            <button @click="closeCollection">閉じる</button>
            <button type="button" class="book-clear-btn" @click="resetCollection">カードクリア（仮）</button>
        </div>
    </div>
  </div>
</template>

<script>
import {
    CAVE_AREAS,
    CAVE_AREA_IDS,
    loadCaveKeys,
    saveCaveKeys,
    loadLastCaveArea
} from "./caveAreas.js";
import db from "@/firebase.js";
import {
    getCurrentUser,
    fetchCardLibrary,
    fetchMyCardInstances,
    drawCard,
    addCardInstance,
    toDisplayCard
} from "@/utils/cards.js";

export default {
    data() {
        return {         
          // ■カードはFirestoreのカードライブラリ（cards）から出し、所持カード（cardInstances）として保存する
          library: [],
          user: null,
          areas: CAVE_AREAS,
          caveKeys: loadCaveKeys(),
          selectedArea: CAVE_AREA_IDS[0],
          chestPhase: "idle", // idle | unlocking | opening | open
          showOverlay: false,
          showBook: false,
          currentCard: {
              id: "",
              name: "",
              icon: "",
              owner: "",
              level: "",
              rare: "",
              area1: "",
              area2: "",
              card: ""
          },
          collection: [],
          collectionLoading: false,
        };
    },

    computed: {
        selectedAreaInfo() {
            return CAVE_AREAS[this.selectedArea];
        },

        remainKeys() {
            return this.caveKeys[this.selectedArea] || 0;
        }
    },

    mounted() {
        // 最後に遊んだ洞窟のエリア → 無ければカギを持っているエリア → 無ければ先頭のエリア
        this.selectedArea =
            loadLastCaveArea() ||
            CAVE_AREA_IDS.find(id => this.caveKeys[id] > 0) ||
            CAVE_AREA_IDS[0];

        this.loadCardData();
    },

    methods: {
        async loadCardData() {
            try {
                [this.library, this.user] = await Promise.all([
                    fetchCardLibrary(),
                    getCurrentUser()
                ]);
            } catch (error) {
                console.error("カード情報の読み込みに失敗しました:", error);
            }
        },

        async openChest() {
            if(this.chestPhase !== "idle") return;
            if (this.remainKeys <= 0) {
                alert(`${this.selectedAreaInfo.name}のカギがありません`);
                return;
            }
            if (!this.library.length || !this.user) {
                alert("カード情報を読み込み中です。少し待ってからもう一度開けてください。");
                return;
            }

            const areaId = this.selectedArea;
            const card = drawCard(this.library, areaId);

            this.caveKeys[areaId]--;
            saveCaveKeys(this.caveKeys);

            // カギを差して回す(〜1.1秒) → 錠前が外れてフタが開く(〜1.9秒) → カード登場
            // 演出の間に、引いたカードを所持カードとしてDBに保存する
            this.chestPhase = "unlocking";
            const saving = addCardInstance({
                card,
                user: this.user,
                obtainedFrom: `cave:${areaId}`
            });
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

            await wait(1100);
            this.chestPhase = "opening";
            await wait(900);

            try {
                const instance = await saving;
                this.currentCard = toDisplayCard(card, instance);
                this.chestPhase = "open";
                this.showOverlay = true;
            } catch (error) {
                console.error("カードの保存に失敗しました:", error);
                // 保存できなかったらカギを返す
                this.caveKeys[areaId]++;
                saveCaveKeys(this.caveKeys);
                this.chestPhase = "idle";
                alert("カードを保存できませんでした。通信状況を確認して、もう一度開けてください。");
            }
        },

        // 宝箱から飛び出すキラキラの向き・距離・タイミング（上方向に扇状に散らす）
        sparkleStyle(n) {
            const angle = (-160 + (140 / 13) * (n - 1)) * Math.PI / 180;
            const distance = 130 + (n * 37) % 90;
            return {
                "--dx": `${Math.cos(angle) * distance}px`,
                "--dy": `${Math.sin(angle) * distance}px`,
                "--delay": `${(n * 53) % 250}ms`,
                "--size": `${6 + (n * 7) % 7}px`
            };
        },

        closeCard() {
            this.showOverlay = false;
            this.chestPhase = "idle";
        },

        // ■獲得カード一覧：自分の所持カード（cardInstances）をカードライブラリの情報と合わせて表示
        async showCollection() {
            this.showBook = true;
            this.collectionLoading = true;
            try {
                const user = this.user || await getCurrentUser();
                const instances = user ? await fetchMyCardInstances(user.uid) : [];
                const libraryById = Object.fromEntries(this.library.map(card => [card.cardId, card]));
                this.collection = instances
                    .filter(instance => libraryById[instance.cardId])
                    .sort((a, b) => (b.obtainedAt?.seconds || 0) - (a.obtainedAt?.seconds || 0))
                    .map(instance => ({
                        instanceId: instance.instanceId,
                        ...toDisplayCard(libraryById[instance.cardId], instance)
                    }));
            } catch (error) {
                console.error("獲得カードの読み込みに失敗しました:", error);
                this.collection = [];
            } finally {
                this.collectionLoading = false;
            }
        },

        closeCollection() {
            this.showBook = false;
        },
        // ■追加：カード一括クリア処理（確認ダイアログ付き）
        resetCollection() {
            if (this.collection.length === 0) {
                alert("クリアするカードがありません。");
                return;
            }
            if (confirm("獲得したカードをすべて消去してもよろしいですか？")) {
                // ■テスト用：自分の所持カードをDBから削除する
                const batch = db.batch();
                this.collection.forEach(card => {
                    batch.delete(db.collection("cardInstances").doc(card.instanceId));
                });
                batch.commit()
                    .then(() => {
                        this.collection = [];
                        alert("図鑑をリセットしました");
                    })
                    .catch(error => {
                        console.error("カードの削除に失敗しました:", error);
                        alert("カードを削除できませんでした。");
                    });
            }
        },

        activateGate() {
            const warp = this.$refs.warp;
            warp.style.width = "300vmax";
            warp.style.height = "300vmax";
            setTimeout(() => {
                this.$router.push("/cave-adventure/cave-entrance");
            }, 600);
        },
        warpDungeon() {
            const warp = this.$refs.warp;
            warp.style.width = "300vmax";
            warp.style.height = "300vmax";
            setTimeout(() => {
                this.$router.back();
            }, 600);
       
        }
    }
};
</script>

<style scoped>
    *{box-sizing:border-box}
    .wrap-whole-page{
        margin:0;font-family:sans-serif;height:100vh !important;
        display:flex;justify-content:center;align-items:center;flex-direction:column;
        background:radial-gradient(circle,#5b4732,#1d1711) !important;
    }
    #result{
        color:#fff;
        font-weight:900;
        font-size:36px;
        letter-spacing:2px;
        text-shadow:
            3px 3px 0 #000,
            0 0 10px #000,
            0 0 20px gold;
        margin-bottom:20px;
    }

    .chest{
        position:relative;width:340px;height:240px;cursor:pointer;
        margin-top:70px; /* 開いたフタが上の「のこりのカギ」表示に重ならないように */
        /* 少し上から見下ろす視点にして、フタが奥に倒れる様子を見せる */
        perspective:700px;
        perspective-origin:50% -200px;
    }
    .chest.phase-idle:hover{animation:chest-bob 1.2s ease-in-out infinite}
    .chest.phase-unlocking{animation:chest-shake .35s ease-in-out .75s}

    .base{
        position:absolute;bottom:0;width:100%;height:140px;z-index:2;
        border:6px solid #d4af37;
        background:repeating-linear-gradient(90deg,#5a341c 0,#734624 20px,#5a341c 40px);
    }
    /* フタが開いたときに見える箱の中 */
    .inside{
        position:absolute;top:0;left:0;right:0;height:34px;
        background:linear-gradient(#1a0e06,#3a2415);
        box-shadow:inset 0 -10px 30px rgba(255,210,80,.9);
        opacity:0;transition:opacity .3s;
    }
    .phase-opening .inside,.phase-open .inside{opacity:1}

    .lid{
        position:absolute;top:0;width:100%;height:110px;z-index:3;
        transform-origin:50% 100%;
        transform-style:preserve-3d;
        transition:transform .45s ease-in;
    }
    .lid-face{
        position:absolute;inset:0;
        border:6px solid #d4af37;border-radius:170px 170px 0 0;
        backface-visibility:hidden;
    }
    .lid-front{
        background:repeating-linear-gradient(90deg,#5a341c 0,#734624 20px,#5a341c 40px);
    }
    /* フタの裏側（開いたときに見える面） */
    .lid-back{
        transform:rotateX(180deg);
        background:linear-gradient(#2b180c,#4a2c16);
    }
    /* フタ：一度ガタッと浮いてから、奥へ倒れながらはね上がる */
    .phase-opening .lid{animation:lid-open .8s cubic-bezier(.3,1.3,.5,1) forwards}
    .phase-open .lid{transform:translate(-25px,-80px) rotate(-12deg) rotateX(35deg)}

    .lock{
        position:absolute;left:50%;top:118px;transform:translateX(-50%);
        width:55px;height:70px;border-radius:10px;z-index:4;
        background:gold;
        transition:transform .5s ease-in,opacity .5s ease-in;
    }
    .lock:before{
        content:"";position:absolute;left:50%;top:16px;transform:translateX(-50%);
        width:16px;height:16px;background:#3a2415;border-radius:50%;
    }
    .lock:after{
        content:"";position:absolute;left:50%;top:30px;transform:translateX(-50%);
        width:8px;height:22px;background:#3a2415;border-radius:0 0 4px 4px;
    }
    .phase-opening .lock,.phase-open .lock{
        transform:translateX(-50%) translateY(90px) rotate(28deg);
        opacity:0;
    }

    /* カギ：上から差し込んで回す */
    .key{
        position:absolute;left:50%;top:92px;width:24px;height:64px;z-index:5;
        margin-left:-12px;
        opacity:0;pointer-events:none;
        filter:drop-shadow(0 0 6px rgba(255,216,77,.8));
    }
    .phase-unlocking .key{animation:key-insert 1.1s ease-out forwards}
    .phase-opening .key,.phase-open .key{
        opacity:0;transform:translateY(90px) rotateY(90deg);
        transition:transform .5s ease-in,opacity .5s ease-in;
    }

    /* 箱の中からあふれる光 */
    .chest-glow{
        position:absolute;left:50%;top:100px;width:420px;height:420px;z-index:1;
        transform:translate(-50%,-50%) scale(0);
        border-radius:50%;
        background:radial-gradient(circle,rgba(255,236,150,.95) 0%,rgba(255,200,60,.55) 30%,transparent 65%);
        pointer-events:none;
        transition:transform .6s ease-out;
    }
    .phase-opening .chest-glow,.phase-open .chest-glow{transform:translate(-50%,-50%) scale(1)}

    .light-rays{
        position:absolute;left:50%;top:100px;width:620px;height:620px;z-index:0;
        margin:-310px 0 0 -310px;
        border-radius:50%;
        background:repeating-conic-gradient(rgba(255,225,120,.45) 0 8deg,transparent 8deg 22deg);
        -webkit-mask-image:radial-gradient(circle,#000 20%,transparent 68%);
        mask-image:radial-gradient(circle,#000 20%,transparent 68%);
        opacity:0;transform:scale(.3);
        pointer-events:none;
        transition:opacity .5s ease-out,transform .7s ease-out;
    }
    .phase-opening .light-rays,.phase-open .light-rays{
        opacity:1;transform:scale(1);
        animation:rays-spin 12s linear infinite;
    }

    .sparkle{
        position:absolute;left:50%;top:100px;z-index:6;
        width:var(--size);height:var(--size);
        margin:calc(var(--size) / -2) 0 0 calc(var(--size) / -2);
        border-radius:50%;
        background:#fff6c4;
        box-shadow:0 0 8px 2px #ffd84d;
        opacity:0;pointer-events:none;
    }
    .phase-opening .sparkle{animation:sparkle-burst .9s ease-out var(--delay) forwards}

    @keyframes chest-bob{
        0%,100%{transform:translateY(0)}
        50%{transform:translateY(-4px)}
    }
    @keyframes chest-shake{
        0%,100%{transform:rotate(0)}
        25%{transform:rotate(-2.5deg)}
        50%{transform:rotate(2.5deg)}
        75%{transform:rotate(-1.5deg)}
    }
    @keyframes key-insert{
        0%{opacity:0;transform:translateY(-120px)}
        40%{opacity:1;transform:translateY(-8px)}
        50%{opacity:1;transform:translateY(0)}
        85%,100%{opacity:1;transform:translateY(0) rotateY(90deg)}
    }
    @keyframes lid-open{
        0%{transform:none}
        20%{transform:translateY(-14px)}
        30%{transform:translateY(-6px)}
        100%{transform:translate(-25px,-80px) rotate(-12deg) rotateX(35deg)}
    }
    @keyframes rays-spin{
        from{transform:scale(1) rotate(0)}
        to{transform:scale(1) rotate(360deg)}
    }
    @keyframes sparkle-burst{
        0%{opacity:0;transform:translate(0,0) scale(.4)}
        15%{opacity:1}
        100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}
    }

    /* カード登場：箱の方向から回転しながら飛び出す */
    .overlay{animation:overlay-in .3s ease-out;perspective:1200px}

    /* 画像がまだ無いカード */
    .no-image{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        width:100%;height:100%;min-height:120px;
        font-size:48px;color:#8a7a5c;background:#f3eee2;border-radius:8px;
    }
    .no-image span{font-size:12px;font-weight:bold;margin-top:4px}
    .no-image.small{min-height:60px;font-size:28px}
    .overlay .card{animation:card-reveal .85s cubic-bezier(.2,1.25,.4,1)}
    @keyframes overlay-in{
        from{background:rgba(0,0,0,0)}
        to{background:rgba(0,0,0,.75)}
    }
    @keyframes card-reveal{
        0%{opacity:0;transform:translateY(180px) scale(.2) rotateY(540deg)}
        50%{opacity:1}
        100%{opacity:1;transform:translateY(0) scale(1) rotateY(0)}
    }

    @media (prefers-reduced-motion: reduce){
        .chest,.lid,.key,.sparkle,.light-rays,.overlay,.overlay .card{animation:none !important}
    }
    button{margin:8px;padding:10px 16px}

    .area-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
    .area-tab{
        margin:0;padding:6px 14px;border-radius:999px;
        display:inline-flex;align-items:center;gap:6px;
        background:rgba(0,0,0,.35);color:#fff;font-weight:bold;font-size:14px;
        border:2px solid var(--area-color);
        opacity:.65;transition:opacity .2s,background .2s;
    }
    .area-tab.active{background:var(--area-color);opacity:1}
    .area-tab.active .area-key{background:rgba(0,0,0,.3)}
    .area-tab:disabled{cursor:default}
    .area-key{
        display:inline-flex;align-items:center;justify-content:center;
        width:22px;height:22px;border-radius:50%;
        background:var(--area-color);border:2px solid #fff;font-size:11px;
    }

    /* 全画面オーバーレイ */
    .overlay,.book{
        position:fixed !important;
        inset:0 !important;
        background:rgba(0,0,0,.75);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:9999;
    }

    /* カード本体 */
    .card{
        width: 300px;
        height: 440px;
        background-size: 100% 100%;
        background-repeat: no-repeat;
        padding: 20px;
        text-align: center;
        position: relative !important;
        margin: 0 !important;
    }

    /* 上部ヘッダー部 */
    .card-top {
        position: relative;
        height: 60px;
        pointer-events: none; /* 下の要素の操作を妨げない */
    }
    .eco-level {
        position: absolute !important;
        top: 40px !important;       /* カード上端からの位置 */
        left: 30px !important;      /* カード左端からの位置 */
        width: 100px !important;     /* ブロック幅を固定 */
        display: flex !important;
        flex-direction: column !important; /* 画像と文字を縦に綺麗に並べる */
        align-items: center !important;    /* 左右中央揃え */
        margin: 0 !important;
        padding: 0 !important;
        z-index: 100 !important;
        pointer-events: none !important;
    }
    .team-color-bg {
        position: absolute !important;
        top: 30 !important;
        left: 10 !important;
        width: 100px !important;      /* マークより少し大きめにするか同サイズに調整 */
        height: 100px !important;
        object-fit: contain !important;
        z-index: 1 !important;        /* 最背面に配置 */
        transform: scale(1.5) !important;
        transform-origin: center center !important;
    }
    .eco-level img {
        position: absolute !important; /* 親要素のFlex配置に従わせる */
        top: -10px !important;
        width: 60px !important;      /* アイコンの幅 */
        height: 60px !important;     /* アイコンの高さ */
        object-fit: contain !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 2 !important;
    }
    .eco-level span {
        position: absolute !important; /* 親要素のFlex配置に従わせる */
        transform: none !important;
        top: 75px !important;
        padding: 0 !important;
        display: block !important;
        text-align: center !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        color: #000000 !important;
        font-weight: bold !important;
    }
    .card-top-right {
        position: absolute !important;
        top: 10px !important;
        right: 15px !important;
        display: flex !important;
        flex-direction: column !important; /* レア度とすみかを縦並び */
        align-items: flex-end !important;   /* 右揃え */
        z-index: 100 !important;
        pointer-events: none !important;
    }
    .rarity {
        display: flex !important;
        align-items: baseline !important; /* 下端揃えで綺麗に並べる */
        gap: 12px !important;
    }
    .rarity span{
        font-size: 13px !important;
        color: #000 !important;
        font-weight: bold !important;
    }
    .rarity strong {
        font-size: 38px !important;
        font-family: serif !important;
        color: #000 !important;
        line-height: 1 !important;
    }
    .habitat {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-top: 10px !important;
    }
    .habitat span {
        font-size: 13px !important;
        color: #000 !important;
        font-weight: bold !important;
    }
    .habitat img {
        width: 48px !important;            /* すみかアイコンのサイズ */
        height: 48px !important;
        object-fit: contain !important;
    }
    /* 生きもの画像エリア（大きさを適正化しボタン被りを防止） */
    .card-image {
        position: absolute;
        top: 85px;
        left: 50%;
        transform: translateX(-50%);
        width: 250px;
        height: 280px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none; /* クリック判定を透過させてボタンを押せるように */
    }
    .card-image img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    /* 生きものの名前 */
    .card-name {
        position: absolute;
        top: 320px;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        margin: 0;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        pointer-events: none;
    }

    /* 発見者 */
    .discoverer {
        position: absolute;
        top: 350px;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        margin: 0;
        font-size: 13px;
        text-align: center;
        pointer-events: none;
    }

    /* 閉じるボタン（最下部に配置し確実にクリック可能化） */
    .close-btn {
        position: absolute !important;
        bottom: 20px !important; /* ★この数値を小さく(10px等)するとさらに下に下がります */
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 10000 !important;
        pointer-events: auto !important;
        margin: 0 !important;
        padding: 6px 24px !important;
        background-color: #ffffff !important;
        border: 2px solid #444444 !important;
        border-radius: 6px !important;
        font-size: 13px !important;
        font-weight: bold !important;
        color: #333 !important;
        cursor: pointer !important;
    }
    .close-btn:hover {
        background-color: #eee !important;
    }

    /* コレクション図鑑 */
    #collectionGrid{
        display: flex !important;
        gap: 15px !important;
        overflow-x: auto !important;
        padding: 15px 5px !important;
        margin-top: 10px !important;
    }
    .smallCard{
        flex: 0 0 auto !important;
        width: 150px !important;
        height: 220px !important;
        background-size: 100% 100% !important;
        background-repeat: no-repeat !important;
        position: relative !important;
        padding: 10px !important;
        box-sizing: border-box !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
    }
    .small-eco {
        position: absolute !important;
        top: 12px !important;
        left: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        z-index: 10 !important;
    }
    .small-team-bg {
        position: absolute !important;
        top: -4px !important;
        left: 50% !important;
        transform: translateX(-50%) scale(1.4) !important;
        transform-origin: center top !important;
        width: 36px !important;
        height: 36px !important;
        object-fit: contain !important;
        z-index: 1 !important;
    }
    .small-eco img {
        top: 5;
        width: 28px !important;
        height: 28px !important;
        z-index: 2 !important;
        object-fit: contain !important;
    }
    .small-eco span {
        font-size: 8px !important;
        line-height: 1 !important;
        color: #000 !important;
        margin-top: 2px !important;
        white-space: nowrap !important;
    }
    /* ミニカード：右上（レア度＆すみか） */
    .small-top-right {
        position: absolute !important;
        top: 6px !important;
        right: 8px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        z-index: 10 !important;
    }
    .small-rare {
        display: flex !important;
        align-items: baseline !important;
        gap: 4px !important;
        color: #000 !important;
    }
    .small-rare span {
        font-size: 9px !important;
    }
    .small-rare strong {
        font-size: 13px !important;
        font-family: serif !important;
        line-height: 1 !important;
    }
    .small-rare strong {
        font-size: 14px !important;
        font-family: serif !important;
    }
    .small-habitat {
        display: flex !important;
        align-items: center !important;
        gap: 2px !important;
        margin-top: 2px !important;
    }
    .small-habitat span {
        font-size: 8px !important;
        color: #000 !important;
        white-space: nowrap !important;
    }
    .small-habitat img {
        width: 28px !important;
        height: 28px !important;
        object-fit: contain !important;
    }
    /* ミニカード：生きもの画像 */
    .small-image {
        position: absolute !important;
        top: 50px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 120px !important;
        height: 120px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    .small-image img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
    }
    /* ミニカード：名前 */
    .small-name {
        position: absolute !important;
        top: 165px !important;
        left: 0 !important;
        width: 100% !important;
        font-size: 13px !important;
        font-weight: bold !important;
        text-align: center !important;
        color: #000 !important;
        padding: 0 4px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
    }
    /* ミニカード：発見者 */
    .small-owner {
        position: absolute !important;
        top: 190px !important;
        left: 0 !important;
        width: 100% !important;
        font-size: 10px !important;
        text-align: center !important;
        color: #444 !important;
    }
    /* コレクションモーダルの閉じるボタン */
    .book-btn-area {
        display: flex !important;
        justify-content: center !important;
        gap: 15px !important;
        margin-top: 15px !important;
        position: relative !important;
        z-index: 10000 !important;
        pointer-events: auto !important;
    }
    .book-close-btn {
        margin-top: 0px !important;
        padding: 6px 20px !important;
        background-color: #eee !important;
        border: 1px solid #ccc !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: bold !important;
    }
    .book-clear-btn {
        padding: 6px 20px !important;
        background-color: #ff4d4d !important;
        border: 2px solid #cc0000 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: bold !important;
        color: #ffffff !important;
    }
    .book-clear-btn:hover {
        background-color: #e60000 !important;
    }

    .smallIcon{font-size:40px}
    .bookPanel{
        width:95%;height:80%;background:white;border-radius:16px;padding:16px;
    }

    /* 帰還ゲート & ワープ */
    #returnGate {
        width: 100px;
        height: 100px;
        border-radius: 50%; border: 4px solid #00ff00; color: #00ff00;
        background: rgba(0, 255, 0, 0.1);
        display: flex; flex-direction: column; align-items: center;
        justify-content: center;
        text-align: center;
        line-height: 1.2;
        cursor: pointer;
        box-shadow: 0 0 20px #00ff00, inset 0 0 20px #00ff00;
        animation: pulse 2s infinite;
        z-index: 1000;
        margin-bottom: 30px;
    }
    #forestWarpGate {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        border: 4px solid #ff00ff;
        color: #ff00ff;
        background: rgba(255,0,255,0.1);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        line-height: 1.2;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 0 20px #ff00ff, inset 0 0 20px #ff00ff;
        animation: pulse 2s infinite;
        z-index: 1000;
    }
    @keyframes pulse {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    #warpEffect {
        position: fixed; left: 50%; top: 50%; width: 0; height: 0;
        border-radius: 50%; background: black;
        transform: translate(-50%, -50%);
        z-index: 9999;
        pointer-events: none;
        transition: width 1.5s ease, height 1.5s ease;
    }
</style>