// ■手元の開発環境（localhostや、スマホ確認用の同じWi-Fi内のIP）で開いているか。本番と見分けるためのDEMO表示に使う
export function isLocalEnv() {
    const host = window.location.hostname;
    return host === "localhost"
        || host === "127.0.0.1"
        || host === "[::1]"
        || host.endsWith(".local")
        || /^(192\.168|10)\./.test(host)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

// ■テストモード（カードを自由に足せる・AIテストエリアが出る）か。手元の開発環境、または URL に ?test=1 を付けたとき
export function isTestMode() {
    return isLocalEnv() || new URLSearchParams(window.location.search).get("test") === "1";
}
