import { reactive } from "vue";

// ■画面の表示言語（ja / en）。この端末の localStorage（uiLang）に保存し、画面を移動しても同じ言語で表示する
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

export function setLang(lang) {
    langState.current = lang === "en" ? "en" : "ja";
    try {
        localStorage.setItem(STORAGE_KEY, langState.current);
    } catch (e) {
        // 保存できなくても、今の画面の言語は切り替わる
    }
}

// ■日本語の文言と英語の文言を並べて書き、今の言語に合う方を返す（テンプレートでは $t として使う）
export function t(ja, en) {
    return langState.current === "en" ? en : ja;
}
