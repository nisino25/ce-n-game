import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./registerServiceWorker";

import multiavatar from "@/lib/multiavatar/multiavatar.js";
import { t, loadMemberLang } from "@/utils/lang.js";
const app = createApp(App);

app.config.globalProperties.$buildAvatar = (avatar) => {
  return multiavatar(avatar);
};

// ■表示言語の切り替え（アバター設定・モニタールームで使う）
app.config.globalProperties.$t = t;

app.use(router);

app.mount("#app");

// ■ログイン中なら、会員の言語（サーバーに保存したもの）をこの端末にも反映する
loadMemberLang();