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

    <div id="result">のこりのカギ：{{ remainKeys }}本</div>

    <div class="chest" :class="{ open: chestOpen }" @click="openChest">
        <div class="lid"></div>
        <div class="base"></div>
        <div class="lock"></div>
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
                <img :src="currentCard.icon" :alt="currentCard.name">
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
                <div v-if="collection.length === 0">まだカードを獲得していません。</div>
                <!-- ■ミニカード表示 -->
                    <div v-for="(card, index) in collection" :key="index" class="smallCard" :style="{ backgroundImage: `url('/images/card/cardBack.png')` }">
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
                            <img :src="card.icon" :alt="card.name">
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
export default {
    data() {
        return {         
          cards:[
            {id:"l100001",name:"ウサギ",icon:"/images/card/ikimono/usagi.png",owner:"reo",level:"/images/card/生態系レベル１.png",rare:"Ａ",area1:"hokkaido",area2:"/images/card/すみかアイコン（森）.png",group:"土",card:"silver"},
            {id:"l200001",name:"アカウミガメ",icon:"/images/card/ikimono/akaumigame.png",owner:"reo",level:"/images/card/生態系レベル２.png",rare:"Ｄ",area1:"kanagawa",area2:"/images/card/すみかアイコン（海）.png",group:"土",card:"silver"}
          ],
          remainKeys: 0,
          chestOpen: false,
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
        };
    },

    mounted() {
        const savedKeys = localStorage.getItem("remainKeys");
        this.remainKeys = savedKeys !== null ? Number(savedKeys) : 0;
        this.collection = JSON.parse(localStorage.getItem("collection") ||"[]");
    },

    methods: {
        openChest() {
            if(this.chestOpen) return;
            if (this.remainKeys <= 0) {
                alert("カギがありません");
                return;
            }
            this.remainKeys--;
            localStorage.setItem("remainKeys", this.remainKeys);

            const card = this.cards[Math.floor(Math.random() * this.cards.length)];
            this.saveCard(card);
            this.currentCard = card;
            this.chestOpen = true;
            setTimeout(() => {
                this.showOverlay = true;
            }, 800);
        },

        saveCard(card) {
            const collection = JSON.parse(localStorage.getItem("collection") || "[]");
            collection.push({
                ...card,
                time: new Date().toISOString()
            });
            localStorage.setItem("collection", JSON.stringify(collection));
            this.collection = collection;
        },

        closeCard() {
            this.showOverlay = false;
            this.chestOpen = false;
        },

        showCollection() {
            this.collection = JSON.parse(localStorage.getItem("collection") || "[]");
            this.showBook = true;
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
                localStorage.removeItem("collection");
                this.collection = [];
                alert("図鑑をリセットしました");
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
    }
    .lid{
        position:absolute;top:0;width:100%;height:110px;
        border:6px solid #d4af37;border-radius:170px 170px 0 0;
        background:repeating-linear-gradient(90deg,#5a341c 0,#734624 20px,#5a341c 40px);
        transform-origin:bottom;transition:1s;
    }
    .base{
        position:absolute;bottom:0;width:100%;height:140px;
        border:6px solid #d4af37;
        background:repeating-linear-gradient(90deg,#5a341c 0,#734624 20px,#5a341c 40px);
    }

    .lock{
        position:absolute;left:50%;top:118px;transform:translateX(-50%);
        width:55px;height:70px;border-radius:10px;
        background:gold;
    }
    .lock:before{
        content:"";position:absolute;left:50%;top:16px;transform:translateX(-50%);
        width:16px;height:16px;background:#3a2415;border-radius:50%;
    }
    .lock:after{
        content:"";position:absolute;left:50%;top:30px;transform:translateX(-50%);
        width:8px;height:22px;background:#3a2415;border-radius:0 0 4px 4px;
    }

    .open .lid{transform:rotateX(-125deg)}
    button{margin:8px;padding:10px 16px}

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