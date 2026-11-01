// ■ログインセッションの読み書き（要件定義: docs/requirements/01_login.md）
//
// iOSの「ホーム画面に追加」で起動したアプリ（standalone表示）は、Safariのタブで
// ログインした際のlocalStorageを引き継がない場合がある（iOS特有の既知の制限）。
// そのため、セッション関連の値はlocalStorageとCookieの両方に保存し、
// standalone起動直後などlocalStorageが空のときはCookie側から復元する。

const COOKIE_MAX_AGE_DAYS = 180;

// Cookieは、ホーム画面に入れたアプリ（iPhone）で、localStorageが空のときの復元に使う。
// ブラウザは大きいCookieを黙って捨てるため、入れるのは小さい値だけにする（会員情報は、絞った8項目だけ）
const COOKIE_KEYS = ["loginCenId", "playerUid", "myTeam", "loginDate", "playerData"];
// 1つのCookieは、これより大きくしない（大きすぎると、ブラウザが黙って捨てる）
const COOKIE_MAX_CHARS = 3000;

// 会員情報（playerData）に入れるのは、画面で使う項目だけ（カードの一覧など大きいものは入れない）
const PLAYER_FIELDS = ["uid", "cenId", "name", "avatar", "isAdmin", "team", "introCompleted", "tutorialCleared"];

function slimPlayerData(value) {
    try {
        const data = JSON.parse(value);
        const slim = {};
        PLAYER_FIELDS.forEach(field => {
            if (data && data[field] !== undefined) slim[field] = data[field];
        });
        return JSON.stringify(slim);
    } catch (error) {
        return value;
    }
}



function readCookie(key) {
    const escaped = key.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
    const match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(key, value, days) {
    const maxAge = days * 24 * 60 * 60;
    const cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    if (cookie.length > COOKIE_MAX_CHARS) {
        // 大きすぎるものは入れない（前の値が残らないように、消しておく）
        deleteCookie(key);
        return;
    }
    document.cookie = cookie;
}

function deleteCookie(key) {
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
}

export function getSession(key) {
    const local = localStorage.getItem(key);
    if (local !== null) {
        return local;
    }

    const cookie = COOKIE_KEYS.includes(key) ? readCookie(key) : null;
    if (cookie !== null) {
        // ■CookieにはあるがlocalStorageには無い＝standalone起動直後。localStorageにも復元しておく
        localStorage.setItem(key, cookie);
        return cookie;
    }

    return null;
}

export function setSession(key, value) {
    const stored = key === "playerData" ? slimPlayerData(value) : value;
    localStorage.setItem(key, stored);
    if (COOKIE_KEYS.includes(key)) {
        writeCookie(key, stored, COOKIE_MAX_AGE_DAYS);
    }
}

export function removeSession(key) {
    localStorage.removeItem(key);
    deleteCookie(key);
}
