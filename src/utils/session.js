// ■ログインセッションの読み書き（要件定義: docs/requirements/01_login.md）
//
// iOSの「ホーム画面に追加」で起動したアプリ（standalone表示）は、Safariのタブで
// ログインした際のlocalStorageを引き継がない場合がある（iOS特有の既知の制限）。
// そのため、セッション関連の値はlocalStorageとCookieの両方に保存し、
// standalone起動直後などlocalStorageが空のときはCookie側から復元する。

const COOKIE_MAX_AGE_DAYS = 180;

function readCookie(key) {
    const escaped = key.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
    const match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(key, value, days) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(key) {
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
}

export function getSession(key) {
    const local = localStorage.getItem(key);
    if (local !== null) {
        return local;
    }

    const cookie = readCookie(key);
    if (cookie !== null) {
        // ■CookieにはあるがlocalStorageには無い＝standalone起動直後。localStorageにも復元しておく
        localStorage.setItem(key, cookie);
        return cookie;
    }

    return null;
}

export function setSession(key, value) {
    localStorage.setItem(key, value);
    writeCookie(key, value, COOKIE_MAX_AGE_DAYS);
}

export function removeSession(key) {
    localStorage.removeItem(key);
    deleteCookie(key);
}
