<template>
  <router-view/>
  <!-- localhost などで開いているときだけ、いまの画面の幅と高さ（px）を出す -->
  <div v-if="showViewport" class="viewport-debug">{{ viewport.w }} × {{ viewport.h }}px</div>
</template>

<script>
import { isLocalEnv } from "@/utils/env.js";

// 2回続けてタップしたら、拡大につながる動きを止める（入力欄などは、そのまま使える）
function preventDoubleTapZoom(event) {
  const now = Date.now();
  if (now - (preventDoubleTapZoom.last || 0) < 350 && !event.target.closest("input, textarea, select")) {
    event.preventDefault();
  }
  preventDoubleTapZoom.last = now;
}

export default {
  name: "App",
  data() {
    return {
      showViewport: isLocalEnv(),
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  },
  mounted() {
    document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
    this.onResize = () => {
      this.viewport = { w: window.innerWidth, h: window.innerHeight };
    };
    window.addEventListener("resize", this.onResize);
  },
  beforeUnmount() {
    document.removeEventListener("touchend", preventDoubleTapZoom);
    window.removeEventListener("resize", this.onResize);
  },
};
</script>

<style>
/* ダブルタップで拡大しないように（アプリ全体） */
html, body, #app, * {
  touch-action: manipulation;
}

/* スマホで入力欄をタップしたとき、画面が拡大しないように（文字は16px以上にする） */
@media (max-width: 768px) {
  /* !important：text-sm などの文字の大きさ指定より優先させる */
  input, select, textarea {
    font-size: 16px !important;
  }
}

.viewport-debug {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 9999;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font: 12px/1 monospace;
  pointer-events: none;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
