<template>
    <div class="mini-card" :class="{ gold: isGold, plant: card.plant }" :style="cardStyle">
        <!-- ■植物の台紙（白地に生産者バッジ）。白は乗算で消えて、背景の虹色が透けて見える -->
        <img v-if="card.plant" src="/images/card/植物の台紙.png" class="plant-frame" alt="">

        <div class="eco">
            <img v-if="card.group === '土'" src="/images/card/チームカラー（土・ブラウン）.png" class="team-bg" alt="土">
            <img v-else-if="card.group === '水'" src="/images/card/チームカラー（水・ブルー）.png" class="team-bg" alt="水">
            <img v-else-if="card.group === '風'" src="/images/card/チームカラー（風・ライトグリーン）.png" class="team-bg" alt="風">

            <img :src="card.level" alt="レベル">
            <span>{{ card.plant ? "生産者" : "生態系レベル" }}</span>
        </div>

        <div class="top-right">
            <div class="rare">
                <span>レア度</span>
                <strong>{{ card.rare }}</strong>
            </div>
            <div class="habitat">
                <span>すみか</span>
                <img :src="card.area2" alt="すみか">
            </div>
        </div>

        <div class="image">
            <img v-if="card.icon" :src="card.icon" :alt="card.name" loading="lazy">
            <div v-else class="no-image">🐾</div>
        </div>

        <div class="name">{{ card.name }}</div>
        <div class="owner">発見者 {{ card.owner }}</div>
    </div>
</template>

<script>
// ■獲得カード一覧・拡大表示で使う、150×220のミニカード（拡大はtransform: scaleで行う）
// ■植物（生産者）の台紙：パステルの虹色（左上は黄、右上は緑、右は水色、左下はピンク）
const PLANT_BACKGROUND = "linear-gradient(135deg, #fff4c2 0%, #c9f7d6 30%, #c5e6ff 55%, #f6c9ef 78%, #fff1c9 100%)";

export default {
    name: "CollectionCard",
    props: {
        card: { type: Object, required: true }
    },
    computed: {
        // ■植物は、ゴールドにせず、パステルの台紙（生産者）にする
        isGold() {
            return !this.card.plant && this.card.card === "gold";
        },
        // ■ゴールドのときは、銀の背景画像に金色を「乗算」で重ねる（銀の明るさは残り、金色になる）
        cardStyle() {
            if (this.card.plant) {
                return { background: PLANT_BACKGROUND };
            }
            const style = { backgroundImage: `url('/images/card/cardBack.png')` };
            if (this.isGold) {
                style.backgroundColor = "#f5c542";
                style.backgroundBlendMode = "multiply";
            }
            return style;
        }
    }
};
</script>

<style scoped>
.mini-card{
    position:relative;
    width:150px;
    height:220px;
    padding:10px;
    box-sizing:border-box;
    background-size:100% 100%;
    background-repeat:no-repeat;
    border-radius:8px;
    text-align:center;
    line-height:1.3;
}
/* ■ゴールドカード（スキャンでとったカード）：背景は cardStyle で金色にし、ふちも金色に */
.mini-card.gold{
    box-shadow:0 0 0 3px #e8b730, 0 0 14px rgba(250,204,21,.65);
}
.eco{
    position:absolute;top:12px;left:12px;
    display:flex;flex-direction:column;align-items:center;
    z-index:10;
}
.team-bg{
    position:absolute;top:-9px;left:50%;
    transform:translateX(-50%) scale(1.4);transform-origin:center top;
    width:36px;height:36px;object-fit:contain;z-index:1;
}
.eco img:not(.team-bg){width:28px;height:28px;object-fit:contain;z-index:2}
.eco span{font-size:8px;line-height:1;color:#000;margin-top:12px;white-space:nowrap}

.top-right{
    position:absolute;top:6px;right:8px;
    display:flex;flex-direction:column;align-items:flex-end;
    z-index:10;
}
.rare{display:flex;align-items:baseline;gap:4px;color:#000}
.rare span{font-size:9px}
.rare strong{font-size:14px;font-family:serif;line-height:1}
.habitat{display:flex;align-items:center;gap:2px;margin-top:2px}
.habitat span{font-size:8px;color:#000;white-space:nowrap}
.habitat img{width:28px;height:28px;object-fit:contain}

.image{
    position:absolute;top:50px;left:50%;transform:translateX(-50%);
    width:120px;height:120px;
    display:flex;align-items:center;justify-content:center;
}
.image img{width:100%;height:100%;object-fit:contain}
.no-image{font-size:28px;display:flex;align-items:center;justify-content:center}

.name{
    position:absolute;top:165px;left:0;width:100%;
    font-size:13px;font-weight:bold;color:#000;padding:0 4px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}

/* ■植物（生産者）のカード：パステルの台紙に、大きな写真・大きな名前（見本の配置にそろえる） */
.mini-card.plant .team-bg,
.mini-card.plant .habitat{display:none}
.plant-frame{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply;pointer-events:none}
.mini-card.plant .eco{top:50px;left:12px}
.mini-card.plant .eco img:not(.team-bg){display:none}
.mini-card.plant .eco span{font-size:11px;font-weight:bold;margin-top:0}
.mini-card.plant .rare span{font-size:11px}
.mini-card.plant .rare strong{font-size:26px;font-family:serif;font-style:italic}
.mini-card.plant .image{top:63px;left:6px;width:138px;height:123px;transform:none}
.mini-card.plant .image img{object-fit:cover}
.mini-card.plant .name{top:190px;font-size:15px}
.mini-card.plant .owner{position:absolute;top:210px;left:0;width:100%;font-size:9px;color:#000}
.owner{position:absolute;top:190px;left:0;width:100%;font-size:10px;color:#444}
</style>
