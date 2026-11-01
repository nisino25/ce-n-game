// ■会員ごとのマニフェスト（ホーム画面に入れたときの開始URLに、会員IDを入れる）
// /manifest.json へのアクセスは、この関数に回している（public/_redirects）。
// iPhoneはホーム画面に入れた時点で読んだマニフェストの開始URLを使うため、
// ページを読み込んだときのCookie（loginCenId）から、会員IDを入れたマニフェストを返す。
const ICONS = [
  { src: "/img/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
  { src: "/img/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  { src: "/img/icons/android-chrome-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/img/icons/android-chrome-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

// Cookieの値（loginCenId=...）を取り出す。無ければ空文字
function cenIdFromCookie(cookieHeader) {
  const match = (cookieHeader || "").match(/(?:^|;\s*)loginCenId=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

exports.handler = async function (event) {
  const query = (event.queryStringParameters && event.queryStringParameters.cenId) || "";
  const cookie = cenIdFromCookie(event.headers && event.headers.cookie);
  const cenId = query || cookie;
  // 会員IDの形（英数字とハイフンだけ）以外は、入れない
  const safeId = /^[0-9A-Za-z-]{8,64}$/.test(cenId) ? cenId : "";
  // 開始URLは、クエリではなくパス（/loginPage/会員ID）にする
  const startUrl = safeId ? `/loginPage/${safeId}` : "/loginPage";

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      name: "ちきゅうたんけん隊",
      short_name: "ちきゅうたんけん",
      theme_color: "#0b1220",
      background_color: "#0b1220",
      display: "standalone",
      // 範囲は必ず / にする（start_url が /loginPage/会員ID だと、既定の範囲が /loginPage/ になり、ログイン後の / がアプリの外扱いになるため）
      scope: "/",
      start_url: startUrl,
      icons: ICONS,
    }),
  };
};
