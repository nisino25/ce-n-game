const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,

  pwa: {
    // ■ホーム画面に追加できるPWAとしての設定
    // （起動先はモニタールーム＝アプリのホーム。/loginPageにすると未ログイン時に
    //   ce-n.orgへ即リダイレクトされる問題は解消できないため、Homeのままにしている）
    name: 'ちきゅうたんけん隊',
    themeColor: '#0b1220',
    msTileColor: '#0b1220',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black-translucent',

    manifestOptions: {
      short_name: 'ちきゅうたんけん',
      background_color: '#0b1220',
      display: 'standalone',
      start_url: '/'
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
