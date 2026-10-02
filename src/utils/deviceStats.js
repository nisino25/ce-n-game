// ■どんな端末で使われているかの統計（個人を特定しない、粗い分類だけ。人数ではなく「回数」を数える）
//   ・集めるもの：端末の種類（スマホ/タブレット/PC）・画面の幅の区分・OSの名前・ホーム画面アプリか
//   ・集めないもの：IPアドレス・ブラウザの情報の全文・正確な画面サイズ・端末ID・名前やcenIdとの紐づけ
//   ・送る先：このアプリのFirestore（deviceStats/{日付}）に、数字を足すだけ。外部の解析サービスには送らない
//   ・送る頻度：1つの端末につき、1日に1回
//   詳細は docs/device-stats.md 参照。

import db, { firebase } from "@/firebase.js";
import { isLocalEnv } from "@/utils/env.js";

const SENT_KEY = "deviceStatsSentDate";

// 画面の幅（CSSピクセル）の区分
export const WIDTH_BUCKETS = [
    { key: "w0-359", label: "〜359" },
    { key: "w360-399", label: "360〜399" },
    { key: "w400-599", label: "400〜599" },
    { key: "w600-1023", label: "600〜1023" },
    { key: "w1024up", label: "1024〜" }
];

function widthBucket(width) {
    if (width < 360) return "w0-359";
    if (width < 400) return "w360-399";
    if (width < 600) return "w400-599";
    if (width < 1024) return "w600-1023";
    return "w1024up";
}

// 端末の種類：指で操作する端末で、短いほうの辺が600px未満ならスマホ、それ以上ならタブレット。それ以外はPC
function deviceType() {
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const shortSide = Math.min(window.screen.width, window.screen.height);
    if (!coarse) return "pc";
    return shortSide < 600 ? "phone" : "tablet";
}

// OSの「名前だけ」（バージョンや型番は見ない）
function osName() {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/.test(ua)) return "ios";
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios"; // iPadOS（Macと名乗る）
    if (/Android/.test(ua)) return "android";
    if (/Windows/.test(ua)) return "windows";
    if (/Macintosh|Mac OS X/.test(ua)) return "mac";
    return "other";
}

// ホーム画面に追加したアプリ（PWA）として開いているか
function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
}

// 日本時間の日付（YYYY-MM-DD）
function todayJst() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

// 集計用のキー。例：phone__w400-599__ios__app
export function currentDeviceKey() {
    return [deviceType(), widthBucket(window.innerWidth), osName(), isStandalone() ? "app" : "web"].join("__");
}

// ■1日1回だけ、数字を足す。失敗しても、アプリの動きには影響させない。
//   開発用の環境（localhostなど）では送らない。options.docId は動作確認用（本番の集計とは別の場所に書く）
export async function sendDeviceStatsOnce(options = {}) {
    try {
        if (isLocalEnv() && !options.force) return false;

        const date = todayJst();
        if (!options.force && localStorage.getItem(SENT_KEY) === date) return false;

        const key = currentDeviceKey();
        await db.collection("deviceStats").doc(options.docId || date).set({
            date,
            total: firebase.firestore.FieldValue.increment(1),
            counts: { [key]: firebase.firestore.FieldValue.increment(1) }
        }, { merge: true });

        if (!options.force) localStorage.setItem(SENT_KEY, date);
        return true;
    } catch (error) {
        console.error("端末の統計の送信に失敗しました（アプリの動きには影響しません）:", error);
        return false;
    }
}
