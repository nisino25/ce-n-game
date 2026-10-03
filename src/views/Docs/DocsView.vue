<template>
    <!-- ■ドキュメント一覧：docs/ 以下のmdファイルをまとめて読めるページ（仮リンクから） -->
    <div class="docs-page">
        <header class="docs-header">
            <button class="docs-back" @click="$router.push({ name: 'Home' })">← <span class="docs-back-label">モニタールームにもどる</span></button>
            <h1>ドキュメント</h1>
            <button class="docs-menu-toggle" @click="menuOpen = !menuOpen">☰ 一覧</button>
        </header>

        <div class="docs-body">
            <nav class="docs-nav" :class="{ open: menuOpen }">
                <template v-for="group in groups" :key="group.label">
                    <div class="docs-group">{{ group.label }}</div>
                    <button
                        v-for="doc in group.docs"
                        :key="doc.path"
                        class="docs-nav-item"
                        :class="{ active: doc.path === currentPath }"
                        @click="openDoc(doc.path)"
                    >
                        {{ doc.title }}
                    </button>
                </template>
            </nav>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <article ref="content" class="docs-content" @click="onContentClick" v-html="html"></article>
        </div>
    </div>
</template>

<script>
import { marked } from "marked";

// ■docs/ 以下のmdをビルド時に取り込む（cost.mdはコストの内部資料なので画面には出さない）
const context = require.context("../../../docs", true, /^\.\/(?!cost\.md$).*\.md$/);

const docs = context.keys().map(key => {
    const path = key.replace(/^\.\//, "");
    const raw = context(key);
    const source = typeof raw === "string" ? raw : raw.default;
    const heading = source.match(/^#\s+(.+)$/m);
    return { path, title: heading ? heading[1].trim() : path, source };
});

// ■上から並べる順番（ここに無いものは最後にファイル名順）
const ORDER = [
    "deploy-log.md",
    "release-notes.md",
    "currency.md",
    "TODO.md",
    "data-access.md",
    "device-stats.md",
    "requirements/00_overview.md",
    "requirements/01_login.md",
    "requirements/02_domination_game.md",
    "requirements/03_creature_scan.md",
    "requirements/04_cards.md",
    "requirements/05_map_habitat.md"
];
const orderOf = path => {
    const index = ORDER.indexOf(path);
    return index === -1 ? ORDER.length : index;
};
// ■「本番への反映」タブに入れるもの
const PRODUCTION = ["deploy-log.md"];
docs.sort((a, b) => orderOf(a.path) - orderOf(b.path) || a.path.localeCompare(b.path));

export default {
    name: "DocsView",

    data() {
        return {
            menuOpen: false,
            currentPath: this.initialPath()
        };
    },

    computed: {
        groups() {
            const production = docs.filter(doc => PRODUCTION.includes(doc.path));
            const requirements = docs.filter(doc => doc.path.startsWith("requirements/"));
            const others = docs.filter(doc => !doc.path.startsWith("requirements/") && !PRODUCTION.includes(doc.path));
            return [
                { label: "本番への反映", docs: production },
                { label: "通貨・やること・データ", docs: others },
                { label: "要件定義", docs: requirements }
            ].filter(group => group.docs.length);
        },

        html() {
            const doc = docs.find(item => item.path === this.currentPath);
            return doc ? marked.parse(doc.source) : "<p>ドキュメントが見つかりません</p>";
        }
    },

    methods: {
        initialPath() {
            const wanted = this.$route.query.doc;
            return docs.some(doc => doc.path === wanted) ? wanted : docs.length ? docs[0].path : "";
        },

        openDoc(path) {
            this.currentPath = path;
            this.menuOpen = false;
            this.$router.replace({ query: { doc: path } });
            window.scrollTo(0, 0);
        },

        // ■ドキュメント内の相対リンク（xxx.md）は、このページの中で開く
        onContentClick(event) {
            const anchor = event.target.closest("a");
            if (!anchor) return;
            const href = anchor.getAttribute("href") || "";
            if (/^https?:/.test(href)) {
                anchor.target = "_blank";
                anchor.rel = "noopener";
                return;
            }
            event.preventDefault();
            const target = this.resolve(href.split("#")[0]);
            if (docs.some(doc => doc.path === target)) this.openDoc(target);
        },

        resolve(href) {
            const base = this.currentPath.split("/").slice(0, -1);
            const parts = [];
            [...base, ...href.split("/")].forEach(part => {
                if (part === "..") parts.pop();
                else if (part && part !== ".") parts.push(part);
            });
            return parts.join("/");
        }
    }
};
</script>

<style scoped>
.docs-page{min-height:100vh;background:#10151c;color:#e2e8f0;text-align:left}
.docs-header{
    position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;
    padding:10px 16px;background:rgba(16,21,28,.95);border-bottom:1px solid #1e293b;
    -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
}
.docs-header h1{flex:1;white-space:nowrap;margin:0;font-size:18px;font-weight:900;color:#67e8f9}
.docs-back,.docs-menu-toggle{
    border:1px solid #475569;border-radius:8px;padding:6px 12px;
    font-size:13px;font-weight:bold;color:#e2e8f0;
}
.docs-back:hover,.docs-menu-toggle:hover{background:rgba(255,255,255,.08)}
.docs-menu-toggle{display:none}

.docs-body{display:flex;gap:24px;max-width:1100px;margin:0 auto;padding:16px}
.docs-nav{
    flex:none;width:230px;align-self:flex-start;position:sticky;top:64px;
    display:flex;flex-direction:column;gap:2px;
}
.docs-group{margin:12px 0 4px;font-size:11px;font-weight:bold;color:#64748b;letter-spacing:1px}
.docs-group:first-child{margin-top:0}
.docs-nav-item{
    text-align:left;border-radius:8px;padding:7px 10px;
    font-size:13px;line-height:1.4;color:#cbd5e1;
}
.docs-nav-item:hover{background:rgba(255,255,255,.06)}
.docs-nav-item.active{background:#0e7490;color:#fff;font-weight:bold}

.docs-content{flex:1;min-width:0;font-size:15px;line-height:1.8;overflow-wrap:anywhere}
.docs-content :deep(h1){margin:0 0 12px;font-size:26px;font-weight:900;color:#67e8f9;line-height:1.35}
.docs-content :deep(h2){margin:32px 0 10px;padding-bottom:6px;border-bottom:1px solid #334155;font-size:20px;font-weight:900;color:#a5f3fc}
.docs-content :deep(h3){margin:24px 0 8px;font-size:16px;font-weight:bold;color:#fde68a}
.docs-content :deep(p){margin:8px 0}
.docs-content :deep(ul),.docs-content :deep(ol){margin:8px 0;padding-left:1.5em}
.docs-content :deep(ul){list-style:disc}
.docs-content :deep(ol){list-style:decimal}
.docs-content :deep(li){margin:3px 0}
.docs-content :deep(a){color:#38bdf8;text-decoration:underline}
.docs-content :deep(hr){margin:20px 0;border:0;border-top:1px solid #334155}
.docs-content :deep(blockquote){margin:12px 0;padding:6px 14px;border-left:4px solid #0e7490;background:rgba(255,255,255,.04);color:#cbd5e1}
.docs-content :deep(code){border-radius:4px;background:rgba(255,255,255,.1);padding:1px 5px;font-size:.9em;color:#fcd34d}
.docs-content :deep(pre){margin:12px 0;padding:12px 14px;overflow-x:auto;border-radius:10px;background:#0b1220;border:1px solid #1e293b}
.docs-content :deep(pre code){background:none;padding:0;color:#cbd5e1;font-size:12px;line-height:1.5;white-space:pre}
.docs-content :deep(table){display:block;max-width:100%;margin:12px 0;overflow-x:auto;border-collapse:collapse;font-size:13px;line-height:1.6}
.docs-content :deep(th),.docs-content :deep(td){border:1px solid #334155;padding:6px 10px;text-align:left;vertical-align:top}
.docs-content :deep(th){background:#1b2330;font-weight:bold;color:#e2e8f0;white-space:nowrap}
.docs-content :deep(input[type=checkbox]){margin-right:6px}

@media (max-width:760px){
    .docs-menu-toggle{display:block}
    .docs-back{padding:6px 10px;font-size:12px}
    .docs-back-label{display:none}
    .docs-header h1{text-align:center}
    .docs-body{display:block;padding:12px 16px}
    .docs-nav{display:none;position:static;width:auto;margin-bottom:16px;padding:8px;border:1px solid #334155;border-radius:10px;background:#1b2330}
    .docs-nav.open{display:flex}
    .docs-content{font-size:14px}
    .docs-content :deep(h1){font-size:22px}
}
</style>
