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
                        <span class="docs-nav-icon">{{ doc.icon }}</span>
                        <span>{{ doc.label }}</span>
                    </button>
                </template>
            </nav>

            <!-- 本番への反映履歴：カード一覧（タップでモーダル） -->
            <div v-if="cardDoc" class="docs-content">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="deploy-intro" @click="onContentClick" v-html="cardDoc.introHtml"></div>
                <div class="deploy-cards">
                    <button
                        v-for="card in cardDoc.cards"
                        :key="card.title"
                        class="deploy-card"
                        :class="{ pending: card.pending }"
                        @click="openCard(card)"
                    >
                        <span class="deploy-meta">
                            <span class="deploy-date">{{ card.pending ? "これから" : card.date }}</span>
                            <span v-if="card.pr" class="deploy-pr">{{ card.pr }}</span>
                        </span>
                        <span class="deploy-title">{{ card.title }}</span>
                        <span class="deploy-summary">{{ card.summary }}</span>
                        <span v-if="card.meta.branch || card.meta.work" class="deploy-people">
                            <span v-if="card.meta.branch">🌱 {{ card.meta.branch.who }}</span>
                            <span v-if="card.meta.work">🛠 {{ card.meta.work.who }}</span>
                        </span>
                        <span class="deploy-more">くわしく見る ›</span>
                    </button>
                </div>
            </div>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <article v-else ref="content" class="docs-content" @click="onContentClick" v-html="html"></article>
        </div>

        <!-- 反映カードのモーダル -->
        <div v-if="openedCard" class="deploy-modal-back" @click.self="openedCard = null">
            <div class="deploy-modal" role="dialog" aria-modal="true">
                <button class="deploy-modal-close" aria-label="閉じる" @click="openedCard = null">✕</button>
                <div class="deploy-modal-meta">
                    <span class="deploy-date">{{ openedCard.pending ? "これから" : openedCard.date }}</span>
                    <span v-if="openedCard.pr" class="deploy-pr">{{ openedCard.pr }}</span>
                </div>
                <h2 class="deploy-modal-title">{{ openedCard.title }}</h2>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-if="openedCard.detailHtml" class="deploy-modal-people" v-html="openedCard.detailHtml"></div>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="docs-content deploy-modal-body" @click="onContentClick" v-html="openedCard.html"></div>
            </div>
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
    "image-storage.md",
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
// ■「共有用」タブに入れるもの（人に見せるための資料）
const SHARED = ["image-storage.md"];
// ■左の一覧に出す、短い名前とアイコン（無いものはmdの見出しをそのまま）
const NAV = {
    "deploy-log.md": ["📜", "反映の履歴"],
    "image-storage.md": ["💰", "画像の保存先と料金"],
    "currency.md": ["🪙", "テラ（ポイント）"],
    "TODO.md": ["✅", "やること"],
    "data-access.md": ["🗄️", "データの取得・更新"],
    "device-stats.md": ["📱", "端末の統計"],
    "requirements/00_overview.md": ["🧭", "全体"],
    "requirements/01_login.md": ["🔑", "ログイン"],
    "requirements/02_domination_game.md": ["🗺️", "陣取りゲーム"],
    "requirements/03_creature_scan.md": ["📷", "生き物スキャン"],
    "requirements/04_cards.md": ["🃏", "カード"],
    "requirements/05_map_habitat.md": ["📍", "地図と場所（試作）"]
};
docs.forEach(doc => {
    const nav = NAV[doc.path];
    doc.icon = nav ? nav[0] : "📄";
    doc.label = nav ? nav[1] : doc.title;
});
docs.sort((a, b) => orderOf(a.path) - orderOf(b.path) || a.path.localeCompare(b.path));

// ■反映履歴：「## 日付 PR #n：タイトル」ごとに、1枚のカードにする（見出しの下の最初の段落が、カードの説明）
const parseCards = source => {
    const [intro, ...chunks] = source.split(/^## /m);
    const cards = chunks.map(chunk => {
        const [headLine, ...rest] = chunk.split("\n");
        const meta = {};
        const lines = rest.filter(line => {
            const found = line.match(/^@(branch|work):\s*(.+)$/);
            if (!found) return true;
            const [who, detail = ""] = found[2].split("|").map(text => text.trim());
            meta[found[1]] = { who, detail };
            return false;
        });
        const body = lines.join("\n").replace(/\n---\s*$/, "").trim();
        const head = headLine.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(PR\s*#[^：:\s]+)\s*[：:]\s*(.+)$/);
        const summary = (body.split(/\n\s*\n/)[0] || "").replace(/^[-*]\s*/, "").replace(/[`*]/g, "").trim();
        return {
            date: head ? head[1] : "",
            pr: head ? head[2].replace(/\s+/g, "") : "",
            title: head ? head[3] : headLine.trim(),
            pending: !head,
            summary,
            meta,
            detailHtml: meta.branch || meta.work ? marked.parse(["- 🌱 ブランチ：" + (meta.branch ? meta.branch.who + (meta.branch.detail ? "（" + meta.branch.detail + "）" : "") : "—"), "- 🛠 おもな作業：" + (meta.work ? meta.work.who + (meta.work.detail ? "（" + meta.work.detail + "）" : "") : "—")].join("\n")) : "",
            html: marked.parse(body)
        };
    });
    return { introHtml: marked.parse(intro.replace(/\n---\s*$/, "")), cards };
};
const CARD_DOCS = { "deploy-log.md": true };

export default {
    name: "DocsView",

    data() {
        return {
            menuOpen: false,
            openedCard: null,
            currentPath: this.initialPath()
        };
    },

    computed: {
        groups() {
            const production = docs.filter(doc => PRODUCTION.includes(doc.path));
            const requirements = docs.filter(doc => doc.path.startsWith("requirements/"));
            const shared = docs.filter(doc => SHARED.includes(doc.path));
            const others = docs.filter(doc => !doc.path.startsWith("requirements/") && !PRODUCTION.includes(doc.path) && !SHARED.includes(doc.path));
            return [
                { label: "本番への反映", docs: production },
                { label: "共有用", docs: shared },
                { label: "しくみ・やること", docs: others },
                { label: "要件定義", docs: requirements }
            ].filter(group => group.docs.length);
        },

        cardDoc() {
            if (!CARD_DOCS[this.currentPath]) return null;
            const doc = docs.find(item => item.path === this.currentPath);
            return doc ? parseCards(doc.source) : null;
        },

        html() {
            const doc = docs.find(item => item.path === this.currentPath);
            return doc ? marked.parse(doc.source) : "<p>ドキュメントが見つかりません</p>";
        }
    },

    mounted() {
        window.addEventListener("keydown", this.onKeydown);
    },

    beforeUnmount() {
        window.removeEventListener("keydown", this.onKeydown);
    },

    methods: {
        onKeydown(event) {
            if (event.key === "Escape") this.openedCard = null;
        },

        initialPath() {
            const wanted = this.$route.query.doc;
            return docs.some(doc => doc.path === wanted) ? wanted : docs.length ? docs[0].path : "";
        },

        openCard(card) {
            this.openedCard = card;
        },

        openDoc(path) {
            this.openedCard = null;
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
    flex:none;width:236px;align-self:flex-start;position:sticky;top:64px;
    max-height:calc(100vh - 80px);overflow-y:auto;
    display:flex;flex-direction:column;gap:2px;padding-right:4px;
}
.docs-group{
    margin:18px 0 6px;padding:0 4px 4px;border-bottom:1px solid #334155;
    font-size:12px;font-weight:900;color:#67e8f9;letter-spacing:1px;
}
.docs-group:first-child{margin-top:0}
.docs-nav-item{
    display:flex;align-items:center;gap:8px;text-align:left;border-radius:8px;padding:8px 10px;
    font-size:14px;line-height:1.4;color:#cbd5e1;
}
.docs-nav-icon{flex:none;width:20px;text-align:center;font-size:15px}
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

/* ■読みやすさ：見出しごとにカードにする */
.docs-content :deep(h2){margin:28px 0 12px;padding:10px 14px;border:0;border-left:5px solid #22d3ee;border-radius:8px;background:rgba(34,211,238,.1)}
.docs-content :deep(h2 + ul),.docs-content :deep(h2 + p),.docs-content :deep(h2 + ol){margin-top:0}
.docs-content :deep(ul){padding-left:1.3em}
.docs-content :deep(li){margin:6px 0}
.docs-content :deep(li::marker){color:#22d3ee}
.docs-content :deep(li > ul){margin:4px 0}

/* ■本番への反映履歴：カード */
.deploy-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:16px}
.deploy-card{
    display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;
    border:1px solid #334155;border-radius:14px;padding:14px;background:#1b2330;
    transition:transform .15s,border-color .15s,background .15s;
}
.deploy-card:hover{transform:translateY(-2px);border-color:#22d3ee;background:#202b3a}
.deploy-card.pending{border-style:dashed;border-color:#64748b;background:rgba(255,255,255,.03)}
.deploy-date,.deploy-pr{display:inline-block;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:bold}
.deploy-date{background:#0e7490;color:#fff}
.deploy-pr{background:#f59e0b;color:#1f2937}
.deploy-meta{display:flex;flex-wrap:wrap;gap:6px}
.deploy-title{font-size:15px;font-weight:900;line-height:1.5;color:#e2e8f0}
.deploy-summary{font-size:13px;line-height:1.6;color:#94a3b8}
.deploy-people{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;font-weight:bold;color:#cbd5e1}
.deploy-modal-people{margin:0 0 12px;padding:8px 14px;border-radius:10px;background:rgba(255,255,255,.05);font-size:13px}
.deploy-modal-people :deep(ul){margin:0;padding-left:0;list-style:none}
.deploy-more{margin-top:auto;padding-top:4px;font-size:12px;font-weight:bold;color:#67e8f9}

.deploy-modal-back{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,12,.7)}
.deploy-modal{
    position:relative;width:100%;max-width:640px;max-height:85vh;overflow-y:auto;
    border:1px solid #334155;border-radius:16px;padding:22px 22px 26px;background:#10151c;
    box-shadow:0 20px 60px rgba(0,0,0,.6);
}
.deploy-modal-close{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:999px;font-size:16px;color:#e2e8f0;background:rgba(255,255,255,.08)}
.deploy-modal-close:hover{background:rgba(255,255,255,.18)}
.deploy-modal-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding-right:40px}
.deploy-modal-title{margin:0 0 10px;font-size:19px;font-weight:900;line-height:1.5;color:#a5f3fc}
.deploy-modal-body{font-size:14px}

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
