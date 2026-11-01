// ■会員ごとのマニフェスト（ホーム画面に入れたときの開始URLに、会員IDを入れる）
// 呼び方: /.netlify/functions/manifest?cenId=…（ログイン中のページから、link rel="manifest" で読み込む）
const ICONS = [
  { src: "/img/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
  { src: "/img/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  { src: "/img/icons/android-chrome-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/img/icons/android-chrome-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

exports.handler = async function (event) {
  const cenId = (event.queryStringParameters && event.queryStringParameters.cenId) || "";
  // 会員IDの形（英数字とハイフンだけ）以外は、入れない
  const safeId = /^[0-9A-Za-z-]{8,64}$/.test(cenId) ? cenId : "";
  const startUrl = safeId ? `/loginPage?cenId=${encodeURIComponent(safeId)}` : "/loginPage";

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
      start_url: startUrl,
      icons: ICONS,
    }),
  };
};
