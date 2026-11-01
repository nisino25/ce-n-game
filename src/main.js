import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./registerServiceWorker";

import multiavatar from "@/lib/multiavatar/multiavatar.js";
import { t } from "@/utils/lang.js";

const app = createApp(App);

app.config.globalProperties.$buildAvatar = (avatar) => {
  return multiavatar(avatar);
};

// ■表示言語の切り替え（アバター設定・モニタールームで使う）
app.config.globalProperties.$t = t;

app.use(router);

app.mount("#app");