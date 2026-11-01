import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./registerServiceWorker";

import multiavatar from "@/lib/multiavatar/multiavatar.js";
import { t } from "@/utils/lang.js";
import { isLocalEnv } from "@/utils/env.js";
import { getSession } from "@/utils/session.js";

// ■ログイン中は、この会員のIDを開始URLに入れたマニフェストに切り替える（ホーム画面に入れるとき用）
// iPhoneはホーム画面に入れた時点のマニフェストを使うため、Vueを動かす前（ページを開いた時点）に設定する
function usePersonalManifest() {
  const cenId = getSession("loginCenId");
  if (!cenId || isLocalEnv()) return;
  let link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = `/.netlify/functions/manifest?cenId=${encodeURIComponent(cenId)}`;
}
usePersonalManifest();

const app = createApp(App);

app.config.globalProperties.$buildAvatar = (avatar) => {
  return multiavatar(avatar);
};

// ■表示言語の切り替え（アバター設定・モニタールームで使う）
app.config.globalProperties.$t = t;

app.use(router);

app.mount("#app");