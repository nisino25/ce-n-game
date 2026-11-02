import { reactive } from "vue";
import db from "@/firebase.js";
import { getSession } from "@/utils/session.js";

// ■画面の表示言語（ja / en）。この端末の localStorage（uiLang）にも保存し、画面を移動しても同じ言語で表示する
// ■ログイン中の会員は、会員のデータ（users の uiLang）にも保存する。端末が変わっても同じ言語で表示するため
const STORAGE_KEY = "uiLang";

function readSavedLang() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ja";
    } catch (e) {
        // localStorageが使えない端末（プライベートブラウズなど）は日本語で表示する
        return "ja";
    }
}

const langState = reactive({ current: readSavedLang() });

export function getLang() {
    return langState.current;
}

// この端末の表示だけを変える（サーバーには保存しない）
function applyLocalLang(lang) {
    langState.current = lang === "en" ? "en" : "ja";
    try {
        localStorage.setItem(STORAGE_KEY, langState.current);
    } catch (e) {
        // 保存できなくても、今の画面の言語は切り替わる
    }
}

// 会員の言語を、会員のデータ（users）に保存する
async function saveLangToMember(lang) {
    const uid = getSession("playerUid");
    if (!uid) return;
    try {
        await db.collection("users").doc(uid).update({ uiLang: lang });
    } catch (e) {
        console.error("言語の保存に失敗しました:", e);
    }
}

// 言語を切り替える（この端末と、ログイン中の会員のデータの両方）
export function setLang(lang) {
    applyLocalLang(lang);
    saveLangToMember(langState.current);
}

// ログイン中の会員の言語を、会員のデータから読んで、この端末にも反映する（アプリを開いたとき）
export async function loadMemberLang() {
    const uid = getSession("playerUid");
    if (!uid) return;
    try {
        const snapshot = await db.collection("users").doc(uid).get();
        const saved = snapshot.exists ? snapshot.data().uiLang : null;
        if (saved === "en" || saved === "ja") applyLocalLang(saved);
    } catch (e) {
        console.error("言語の読み込みに失敗しました:", e);
    }
}

// ■日本語の文言と英語の文言を並べて書き、今の言語に合う方を返す（テンプレートでは $t として使う）
export function t(ja, en) {
    return langState.current === "en" ? en : ja;
}
