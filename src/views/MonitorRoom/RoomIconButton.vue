<template>
    <!-- ■モニタールームに並べるアイコンボタン（図鑑・看板など） -->
    <button class="room-icon" type="button" :aria-label="label">
        <span class="icon-wrap">
            <svg viewBox="0 0 48 48" class="icon-svg" aria-hidden="true">
                <!-- 図鑑（本棚） -->
                <template v-if="kind === 'library'">
                    <rect x="7" y="6" width="34" height="37" rx="2" fill="none" stroke="currentColor" stroke-width="2.5" />
                    <line x1="7" y1="18.5" x2="41" y2="18.5" stroke="currentColor" stroke-width="2.5" />
                    <line x1="7" y1="31" x2="41" y2="31" stroke="currentColor" stroke-width="2.5" />
                    <rect x="11" y="9" width="4" height="8" fill="currentColor" />
                    <rect x="16.5" y="11" width="4" height="6" fill="currentColor" opacity=".6" />
                    <rect x="22" y="8.5" width="4" height="8.5" fill="currentColor" opacity=".85" />
                    <rect x="29" y="10" width="7" height="7" rx="1" fill="currentColor" opacity=".5" />
                    <rect x="11" y="22" width="6" height="8" fill="currentColor" opacity=".7" />
                    <rect x="18.5" y="21" width="4" height="9" fill="currentColor" />
                    <rect x="24" y="23" width="4" height="7" fill="currentColor" opacity=".6" />
                    <path d="M31 30 L33.5 22 L37.5 23 L35 31 Z" fill="currentColor" opacity=".85" />
                    <rect x="11" y="34.5" width="4" height="7" fill="currentColor" opacity=".85" />
                    <rect x="16.5" y="35.5" width="6" height="6" rx="1" fill="currentColor" opacity=".55" />
                    <rect x="24" y="34" width="4" height="7.5" fill="currentColor" />
                    <rect x="29.5" y="36" width="7" height="5.5" rx="1" fill="currentColor" opacity=".7" />
                </template>

                <!-- 看板 -->
                <template v-else>
                    <rect x="13" y="26" width="4" height="17" fill="currentColor" opacity=".75" />
                    <rect x="31" y="26" width="4" height="17" fill="currentColor" opacity=".75" />
                    <rect x="5" y="7" width="38" height="21" rx="3" fill="none" stroke="currentColor" stroke-width="2.5" />
                    <line x1="11" y1="14" x2="37" y2="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                    <line x1="11" y1="21" x2="29" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                    <circle cx="9" cy="11" r="1" fill="currentColor" />
                    <circle cx="39" cy="11" r="1" fill="currentColor" />
                </template>
            </svg>
        </span>
        <span class="icon-label">{{ label }}</span>
    </button>
</template>

<script>
export default {
    name: "RoomIconButton",
    props: {
        kind: { type: String, required: true }, // "library" | "board"
        label: { type: String, required: true }
    }
};
</script>

<style scoped>
.room-icon{
    display:flex;flex-direction:column;align-items:center;gap:6px;
    color:var(--team-accent,#0ff);cursor:pointer;
    -webkit-tap-highlight-color:transparent;
}
.icon-wrap{
    display:flex;align-items:center;justify-content:center;
    width:72px;height:72px;
    transition:transform .18s ease;
}
.room-icon:hover .icon-wrap{transform:translateY(-3px) scale(1.06)}
.room-icon:active .icon-wrap{transform:scale(.94)}
.room-icon:focus-visible .icon-wrap{outline:3px solid #ffd84d;outline-offset:4px;border-radius:12px}
.icon-svg{width:100%;height:100%;filter:drop-shadow(0 0 5px var(--team-accent,#0ff)) drop-shadow(0 0 12px var(--team-accent,#0ff))}
.icon-label{
    font-size:12px;font-weight:bold;line-height:1.2;white-space:nowrap;
    text-shadow:0 0 6px var(--team-accent,#0ff);
}
</style>
