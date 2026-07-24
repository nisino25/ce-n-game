<template>

    <div
        id="returnGate"
        @click="activateGate"
    >
        戻る
        <div>ダンジョン出口</div>
    </div>

    <div
        ref="warp"
        class="warpEffect"
    ></div>

    <div id="result">
        のこりのカギ：{{ remainKeys }}本
    </div>

    <div
        class="chest"
        :class="{ open: chestOpen }"
        @click="openChest"
    >

        <div class="lid">
            <div class="lidBand lb1"></div>
            <div class="lidBand lb2"></div>
            <div class="lidBand lb3"></div>
            <div class="lidBand lb4"></div>
        </div>

        <div class="base">
            <div class="baseBand bb1"></div>
            <div class="baseBand bb2"></div>
            <div class="baseBand bb3"></div>
            <div class="baseBand bb4"></div>
        </div>

        <div class="lock"></div>

    </div>

    <div>

        <button @click="showCollection">
            カード一式
        </button>

        <button @click="resetCollection">
            リセット(仮)
        </button>

    </div>

    <!-- Card -->

    <div
        v-if="showOverlay"
        class="overlay"
    >

        <div class="card">

            <div>{{ currentCard.rarity }}</div>

            <div class="icon">
                {{ currentCard.icon }}
            </div>

            <h2>
                {{ currentCard.name }}
            </h2>

            <div>
                HP {{ currentCard.hp }}
                /
                ATK {{ currentCard.attack }}
            </div>

            <p>
                {{ currentCard.desc }}
            </p>

            <button @click="closeCard">
                閉じる
            </button>

        </div>

    </div>

    <!-- Collection -->

    <div
        v-if="showBook"
        class="book"
    >

        <div class="bookPanel">

            <h2>
                獲得カード一覧
            </h2>

            <div id="collectionGrid">

                <div
                    v-if="collection.length === 0"
                >
                    まだカードを獲得していません。
                </div>

                <div
                    v-for="(card, index) in collection"
                    :key="index"
                    class="smallCard"
                >

                    <div>
                        {{ card.rarity }}
                    </div>

                    <div class="smallIcon">
                        {{ card.icon }}
                    </div>

                    <div>
                        {{ card.name }}
                    </div>

                    <small>
                        HP {{ card.hp }}
                        <br>
                        ATK {{ card.attack }}
                    </small>

                </div>

            </div>

            <button @click="closeCollection">
                閉じる
            </button>

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

            collection: []

        };

    },

    mounted() {

        const keys = Number(
            this.$route.query.keys
        ) || 0;

        this.remainKeys = keys;

        this.collection = JSON.parse(

            localStorage.getItem("collection") ||
            "[]"

        );

    },

    methods: {

    openChest() {

        if (this.remainKeys <= 0) {

            alert("カギがありません");
            return;

        }

        this.remainKeys--;

        const card =
            this.cards[
                Math.floor(Math.random() * this.cards.length)
            ];

        this.saveCard(card);

        this.currentCard = card;

        this.chestOpen = true;

        setTimeout(() => {

            this.showOverlay = true;

        }, 800);

    },

    saveCard(card) {

        const collection = JSON.parse(
            localStorage.getItem("collection") || "[]"
        );

        collection.push({

            ...card,

            time: new Date().toISOString()

        });

        localStorage.setItem(
            "collection",
            JSON.stringify(collection)
        );

    },

    closeCard() {

        this.showOverlay = false;

        this.chestOpen = false;

    },

    showCollection() {

        this.collection = JSON.parse(
            localStorage.getItem("collection") || "[]"
        );

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

            this.$router.back();

        }, 600);

    }

}

};
</script>