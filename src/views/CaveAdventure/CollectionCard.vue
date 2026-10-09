<template>
    <div class="mini-card" :style="{ backgroundImage: `url('/images/card/cardBack.png')` }">
        <div class="eco">
            <img v-if="card.group === '土'" src="/images/card/チームカラー（土・ブラウン）.png" class="team-bg" alt="土">
            <img v-else-if="card.group === '水'" src="/images/card/チームカラー（水・ブルー）.png" class="team-bg" alt="水">
            <img v-else-if="card.group === '風'" src="/images/card/チームカラー（風・ライトグリーン）.png" class="team-bg" alt="風">

            <img :src="card.level" alt="レベル">
            <span>生態系レベル</span>
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
export default {
    name: "CollectionCard",
    props: {
        card: { type: Object, required: true }
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
.eco{
    position:absolute;top:12px;left:12px;
    display:flex;flex-direction:column;align-items:center;
    z-index:10;
}
.team-bg{
    position:absolute;top:-4px;left:50%;
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
.owner{position:absolute;top:190px;left:0;width:100%;font-size:10px;color:#444}
</style>
