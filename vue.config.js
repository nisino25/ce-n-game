const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,

  // ■docs/ のmdファイルを文字列として取り込む（ドキュメントページで表示するため）
  chainWebpack: config => {
    config.module.rule('md').test(/\.md$/).type('asset/source')
  },

  pwa: {
    // ■ホーム画面に追加できるPWAとしての設定
    // 起動先は本番のハブサイト（shineki-game）が「洞窟ゲーム」リンクで使っているのと同じ
    // /loginPage?cenId=... 形式にしている。cenIdをURLに埋め込むことで、iOSのstandalone
    // モードでlocalStorage/Cookieが引き継がれない場合でも、毎回このIDでログインし直せる
    // （LoginPage自体はログイン済みでも安全に再訪できるようrouter側を調整済み）
    name: 'ちきゅうたんけん隊',
    themeColor: '#0b1220',
    msTileColor: '#0b1220',
    appleMobileWebAppCapable: 'yes',
    // ■black-translucentだと画面がノッチの下まで敷き詰められ、ノッチ周りの余白が無くなってしまうため、
    // ステータスバー分をきちんと余白として確保できるblackに変更
    appleMobileWebAppStatusBarStyle: 'black',

    manifestOptions: {
      short_name: 'ちきゅうたんけん',
      background_color: '#0b1220',
      display: 'standalone',
      start_url: '/loginPage?cenId=33d85b19-663f-4849-87ae-a7232ff33fda'
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
