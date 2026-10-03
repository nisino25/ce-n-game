<template>
    <!-- ■カードのレベルの形（Lv1=三角／Lv2=四角／Lv3=丸／Lv4=★）。盤面と同じ形 -->
    <g :opacity="opacity">
        <polygon v-if="tier === 1" points="12,3 22.5,21 1.5,21" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" stroke-linejoin="round" />
        <rect v-else-if="tier === 2" x="3" y="3" width="18" height="18" rx="1.5" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" stroke-linejoin="round" />
        <circle v-else-if="tier === 3" cx="12" cy="12" r="9" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" />
        <polygon v-else points="12,1.5 14.9,8.4 22.4,9 16.7,13.9 18.5,21.3 12,17.4 5.5,21.3 7.3,13.9 1.6,9 9.1,8.4" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" stroke-linejoin="round" />
    </g>
</template>

<script>
export default {
    name: "TierShape",
    props: {
        tier: { type: Number, default: 1 },
        fill: { type: String, default: "#fff" },
        stroke: { type: String, default: "#000" },
        strokeWidth: { type: Number, default: 1.6 },
        opacity: { type: Number, default: 1 }
    }
};
</script>
