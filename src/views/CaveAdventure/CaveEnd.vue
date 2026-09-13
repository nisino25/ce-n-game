<template>
  <div class="wrap-whole-page">

    <!-- ■訂正：ダンジョン出口 -->
      <div id="returnGate" @click="activateGate">
        ◉
        <div>ダンジョン出口</div>
      </div>
     <!-- ■削除：<div id="returnGate" @click="activateGate" class="cursor-pointer rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300">戻る</div> -->    

        <!-- <div ref="warp" class="warpEffect"></div> -->
        <div ref="warp" class="warpEffect" id="warpEffect"></div>
    
        <div id="result">のこりのカギ：{{ remainKeys }}本</div>
    
        <div class="chest" :class="{ open: chestOpen }" @click="openChest">
    
            <div class="lid">
                <!-- ■削除：<div class="lidBand lb1"></div> -->
                <!-- ■削除：<div class="lidBand lb2"></div> -->
                <!-- ■削除：<div class="lidBand lb3"></div> -->
                <!-- ■削除：<div class="lidBand lb4"></div> -->
            </div>
    
            <div class="base">
                <!-- ■削除：<div class="baseBand bb1"></div> -->
                <!-- ■削除：<div class="baseBand bb2"></div> -->
                <!-- ■削除：<div class="baseBand bb3"></div> -->
                <!-- ■削除：<div class="baseBand bb4"></div> -->
            </div>
    
            <div class="lock"></div>
    
        </div>
    
        <div class="flex gap-2 mt-4">
            <button @click="showCollection" class="px-3 py-1 bg-gray-200 rounded">カード一式</button>
            <!-- <button @click="resetCollection" class="px-3 py-1 bg-gray-200 rounded">リセット(仮)</button> -->
        </div>
    
        <!-- Card -->
    
        <div v-if="showOverlay" class="overlay">
            <div class="card">
                <div>{{ currentCard.rarity }}</div>
                <div class="icon">{{ currentCard.icon }}</div>
                <h2>{{ currentCard.name }}</h2>
                <div>HP {{ currentCard.hp }} / ATK {{ currentCard.attack }}</div>
                <p>{{ currentCard.desc }}</p>
                <button @click="closeCard">閉じる</button>
            </div>
        </div>
    
        <!-- Collection -->
    
        <div v-if="showBook" class="book">
            <div class="bookPanel">
                <h2>獲得カード一覧</h2>
                <div id="collectionGrid">
                    <div v-if="collection.length === 0">まだカードを獲得していません。</div>
                    <div v-for="(card, index) in collection" :key="index" class="smallCard">
                        <div>{{ card.rarity }}</div>
                        <div class="smallIcon">{{ card.icon }}</div>
                        <div>{{ card.name }}</div>
                        <small>HP {{ card.hp }}<br>ATK {{ card.attack }}</small>
                    </div>
                </div>
                <button @click="closeCollection">閉じる</button>
            </div>
    
        </div>
    </div>


</template>
<script>
export default {
    data() {
        return {         
          cards:[
            {id:"fox",name:"森のキツネ",icon:"🦊",rarity:"ﾚﾍﾞﾙ３",hp:100,attack:50,desc:"森の狩人"},
            {id:"bat",name:"洞窟コウモリ",icon:"🦇",rarity:"ﾚﾍﾞﾙ２",hp:80,attack:40,desc:"洞窟の住人"},
            {id:"wolf",name:"白銀オオカミ",icon:"🐺",rarity:"ﾚﾍﾞﾙ４",hp:220,attack:120,desc:"孤高の王"},
            {id:"uni",name:"オオワシ",icon:"🦅",rarity:"ﾚﾍﾞﾙ４",hp:500,attack:260,desc:"空の王者"},
            {id:"dragon",name:"クマ",icon:"🐻",rarity:"ﾚﾍﾞﾙ４",hp:1000,attack:500,desc:"森の王者"},
            {id:"dragon",name:"たぬき",icon:"🦝",rarity:"ﾚﾍﾞﾙ３",hp:1000,attack:500,desc:"森の狩人"},
            {id:"dragon",name:"ミミズ",icon:"🪱",rarity:"ﾚﾍﾞﾙ１",hp:1000,attack:500,desc:"草食者"},
            {id:"dragon",name:"ハチ",icon:"🐝",rarity:"ﾚﾍﾞﾙ１",hp:1000,attack:500,desc:"花のおともだち"},
            {id:"dragon",name:"ネズミ",icon:"🐭",rarity:"ﾚﾍﾞﾙ２",hp:1000,attack:500,desc:"草原の住人"},
            {id:"dragon",name:"ウサギ",icon:"🐇",rarity:"ﾚﾍﾞﾙ１",hp:1000,attack:500,desc:"草食です"},
            {id:"dragon",name:"サカナ",icon:"🐟",rarity:"ﾚﾍﾞﾙ２",hp:1000,attack:500,desc:"水の住人"}
            ],
            remainKeys: 0,
            chestOpen: false,
            showOverlay: false,
            showBook: false,
            currentCard: {
                id: "",
                name: "",
                icon: "",
                rarity: "",
                hp: 0,
                attack: 0,
                desc: ""
            },
            collection: [],
        };

    },

    mounted() {
        const keys = Number(this.$route.query.keys) || 0;
        this.remainKeys = keys;
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
            localStorage.setItem("collection",JSON.stringify(collection));
           // ■追加：
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

        resetCollection() {
            localStorage.removeItem("collection");
            this.collection = [];
            alert("図鑑をリセットしました");
        },

        activateGate() {
            const warp = this.$refs.warp;
            warp.style.width = "300vmax";
            warp.style.height = "300vmax";
            setTimeout(() => {
                this.$router.push("/cave-adventure/cave-entrance");
                // ■単なる戻るでなく、入り口まで飛ばす
                // this.$router.back();
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

    .lidBand,
    .baseBand{
      position:absolute;width:14px;
      background:linear-gradient(90deg,#8b6518,#f5df85,#8b6518);
      }
    .lidBand{top:0;height:98px}
    .baseBand{top:0;height:128px}
    .lb1,.bb1{left:58px}
    .lb2,.bb2{left:132px}
    .lb3,.bb3{left:206px}
    .lb4,.bb4{left:280px}

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

    .overlay,.book{
        position:fixed;inset:0;background:rgba(0,0,0,.75);
        width:100vw;height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:1000;
    }
    .card{
    background:#fff;border-radius:16px;padding:20px;
    width:300px;text-align:center;
    }
    #collectionGrid{
    display:flex;gap:10px;overflow-x:auto;
    padding:10px;margin-top:10px;
    }
    .smallCard{
    flex:0 0 auto;width:120px;height:170px;
    border:2px solid #d4af37;border-radius:10px;
    padding:8px;background:#fffdf5;text-align:center;
    }
    .icon{font-size:70px}
    .smallIcon{font-size:40px}
    .bookPanel{
    width:95%;height:80%;background:white;border-radius:16px;padding:16px;
    }

/* ■追加：帰還ゲート対応 */
#returnGate {
    position: fixed; left: 30px; top: 30px; width: 100px; height: 100px;
      border-radius: 50%; border: 4px solid #00ff00; color: #00ff00;
      background: rgba(0, 255, 0, 0.1);
      display: flex; flex-direction: column; align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.2;
      cursor: pointer;
      box-shadow:
        0 0 20px #00ff00,
        inset 0 0 20px #00ff00;
      animation: pulse 2s infinite;
      z-index: 1000;
   }
  @keyframes pulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.1); }
    100% { transform: scale(1); }
   }

/* ■追加：ワープ演出 */
#warpEffect {
  position: fixed; left: 50%; top: 50%; width: 0; height: 0;
    border-radius: 50%; background: black;
    transform: translate(-50%, -50%);
    z-index: 9999;
    pointer-events: none;
    transition: width 1.5s ease, height 1.5s ease;
  }
</style>