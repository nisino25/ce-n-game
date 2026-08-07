import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import multiavatar from "@/lib/multiavatar/multiavatar.js";

const app = createApp(App);

app.config.globalProperties.$buildAvatar = (avatar) => {
  return multiavatar(avatar);
};

app.use(router);

app.mount("#app");