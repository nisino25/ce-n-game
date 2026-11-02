<template>
    <!-- ■表示言語の切り替え（旗つき）。会員ごとに保存されるので、ほかの画面でも同じ言語になる -->
    <div class="inline-flex overflow-hidden rounded-full border border-slate-500 text-xs font-bold" role="group" aria-label="表示言語 / Language">
        <button
            type="button"
            class="flex items-center gap-1 px-2.5 py-1"
            :class="lang === 'ja' ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:bg-white/10'"
            :aria-pressed="lang === 'ja' ? 'true' : 'false'"
            title="日本語"
            aria-label="日本語"
            @click="changeLang('ja')"
        >🇯🇵</button>
        <button
            type="button"
            class="flex items-center gap-1 px-2.5 py-1"
            :class="lang === 'en' ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:bg-white/10'"
            :aria-pressed="lang === 'en' ? 'true' : 'false'"
            title="English"
            aria-label="English"
            @click="changeLang('en')"
        >🇬🇧</button>
    </div>
</template>

<script>
import { getLang, setLang } from "@/utils/lang.js";

export default {
    name: "LangSwitch",
    computed: {
        lang() {
            return getLang();
        }
    },
    methods: {
        changeLang(lang) {
            setLang(lang);
        }
    }
};
</script>
