// ■効果音（Web Audio APIで、その場で作る音。音声ファイルは使わない）。
//   ・スマホ（iPhoneなど）は、画面をタップしたあとでないと音が出ないため、最初のタップで unlock() する
//   ・ミュートの設定は localStorage の sfxMuted に保存する

let context = null;
let muted = false;
try {
    muted = localStorage.getItem("sfxMuted") === "1";
} catch (e) {
    muted = false;
}

function audio() {
    if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        context = new AudioContextClass();
    }
    if (context.state === "suspended") context.resume();
    return context;
}

// 1つの音を鳴らす。freq=高さ(Hz)、slideTo=その高さまで変化、at=何秒あとに鳴らすか
function tone({ freq, slideTo, type = "sine", at = 0, duration = 0.12, volume = 0.18 }) {
    if (muted) return;
    const ac = audio();
    if (!ac) return;
    const start = ac.currentTime + at;
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    // 音の出だしと終わりをなめらかにして、プチッというノイズを防ぐ
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ac.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
}

export const sfx = {
    // 最初のタップで呼ぶ（スマホで音を出せる状態にする）
    unlock() {
        audio();
    },

    isMuted() {
        return muted;
    },

    setMuted(value) {
        muted = !!value;
        try {
            localStorage.setItem("sfxMuted", muted ? "1" : "0");
        } catch (e) {
            // 保存できなくても、このあいだは有効
        }
    },

    // カードや丸いボタンをタップしたとき
    select() {
        tone({ freq: 660, slideTo: 880, type: "sine", duration: 0.07, volume: 0.14 });
    },

    // 自分がカードを置いたとき：ポン、ピン（上がる2音）
    place() {
        tone({ freq: 523, type: "triangle", duration: 0.12, volume: 0.2 });
        tone({ freq: 784, type: "triangle", at: 0.09, duration: 0.18, volume: 0.2 });
    },

    // 食べたとき：がぶっ（下がる音を2回）
    eat() {
        tone({ freq: 260, slideTo: 110, type: "square", duration: 0.12, volume: 0.12 });
        tone({ freq: 220, slideTo: 90, type: "square", at: 0.13, duration: 0.14, volume: 0.12 });
    },

    // AIがカードを置いたとき：ぽこっ（やわらかい音）
    aiPlace() {
        tone({ freq: 392, slideTo: 330, type: "sine", duration: 0.14, volume: 0.13 });
    },

    // 自分の番になったとき：ピンポン
    turn() {
        tone({ freq: 880, type: "sine", duration: 0.12, volume: 0.16 });
        tone({ freq: 1175, type: "sine", at: 0.11, duration: 0.2, volume: 0.16 });
    },

    skip() {
        tone({ freq: 330, slideTo: 247, type: "sawtooth", duration: 0.16, volume: 0.1 });
    },

    // 置けないなどの注意：ブッ
    error() {
        tone({ freq: 150, type: "square", duration: 0.16, volume: 0.1 });
    },

    // 勝ったとき：ドミソド（上がる）
    win() {
        [523, 659, 784, 1047].forEach((freq, index) => {
            tone({ freq, type: "triangle", at: index * 0.13, duration: 0.22, volume: 0.2 });
        });
        tone({ freq: 1047, type: "sine", at: 0.55, duration: 0.5, volume: 0.14 });
    },

    // 負けたとき：ソミド（下がる）
    lose() {
        [392, 330, 262].forEach((freq, index) => {
            tone({ freq, type: "sawtooth", at: index * 0.2, duration: 0.3, volume: 0.1 });
        });
    }
};
