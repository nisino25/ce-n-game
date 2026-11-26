// ■京都のABゲームの問題（チュートリアル・黒いマスのかんきょうチャレンジで使う）
// 形は abGameQuestions（Firestore）と同じ。correct は "A"（海ごみ対策）か "C"（里山再生）
// 画像は public/images/ABGames/kyoto/ にある
// bComment（画面の上の一言）は仮の文。確認して直してください
export const KYOTO_QUESTIONS = [
    {
        location: "kyoto",
        order: 1,
        bComment: "ゆたかな里山にするためには、手入れ（間伐（かんばつ）：木をまびくこと）が必要だよ！",
        imgB: "kyoto/B1.jpg",
        qaImage: "kyoto/QA1.png",
        qaCredit: "全国森林組合連合会 認証マーク",
        correct: "C",
        showIcons: [11, 12, 13, 15, 17],
        comment:
            "ゆたかな里山にするためには、手入れ（間伐（かんばつ）：木をまびくこと）が必要だよ！"
    },
    {
        location: "kyoto",
        order: 2,
        bComment: "海にごみがたくさん流れついているよ。",
        imgB: "kyoto/B2.png",
        qaImage: "kyoto/QA2.jpg",
        correct: "A",
        showIcons: [6, 11, 12, 13, 14, 17],
        comment:
            "海ごみを減らすいちばん大事な活動だよ！"
    },
    {
        location: "kyoto",
        order: 3,
        bComment: "海に落ちたプラスチックが、いつまでも残ってしまうよ。",
        imgB: "kyoto/B3.png",
        qaImage: "kyoto/QA3.jpg",
        qaCredit: "一般社団法人日本バイオプラスチック協会 認証マーク",
        correct: "A",
        showIcons: [6, 9, 11, 12, 14, 17],
        comment:
            "プラスチックにかわるもので、自然に分解される新しいそざいがあるよ"
    },
    {
        location: "kyoto",
        order: 4,
        bComment: "まちの中にも、里山の植物やいきものがふえたらいいね。",
        imgB: "kyoto/B4.jpg",
        qaImage: "kyoto/QA4.JPG",
        qaCredit: "日新電機株式会社 CSR活動より",
        correct: "C",
        showIcons: [6, 11, 13, 15],
        comment:
            "まちの中で里山のめずらしい植物やいきものがみられると、みんなワクワクしながら自然にふれられて、里山を大事にしたい気もちがふくらんだり、守りたいと思う人がふえるよ。"
    }
];
