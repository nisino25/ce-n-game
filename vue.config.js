const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,

  pwa: {
    // ■洞窟ゲーム専用のPWAとしてホーム画面に追加できるようにする
    // （アプリ全体は1つのSPAなので中身は同じバンドルだが、アイコン・名前・起動直後の画面を
    //   洞窟ゲームに固定することで、ユーザー体験としては洞窟ゲーム専用アプリに見せる）
    name: '洞窟たんけん隊',
    themeColor: '#0b1220',
    msTileColor: '#0b1220',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black-translucent',

    manifestOptions: {
      short_name: '洞窟たんけん',
      background_color: '#0b1220',
      display: 'standalone',
      // ■ホーム画面から起動すると、モニタールームではなく洞窟探検の入り口に直接入る
      start_url: '/cave-adventure/cave-entrance'
    },

    workboxPluginMode: 'GenerateSW',
    workboxOptions: {
      // ■アプリ本体の更新をすぐ反映させたいので、常に最新のnetwork優先＋古いキャッシュは自動破棄
      skipWaiting: true,
      clientsClaim: true,
      navigateFallback: '/index.html',
      // Firebase/外部API呼び出しはservice workerでキャッシュしない
      navigateFallbackDenylist: [/^\/__/, /\/api\//]
    }
  }
})
