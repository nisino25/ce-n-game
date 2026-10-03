// ■効果音（Web Audio APIで、その場で作る音。音声ファイルは使わない）。
//   ・ゲーム機のような「ピコピコ」ではなく、水・木・風・鈴のような、静かで自然な音にしている（ゆったり・禅のような音）
//   ・置く音・選ぶ音・食べる音などは、フリー素材（CC0）の録音を使う。鈴の音（番・勝ち・負け）は、その場で作る
//   ・スマホ（iPhoneなど）は、画面をタップしたあとでないと音が出ないため、最初のタップで unlock() する
//   ・ミュートの設定は localStorage の sfxMuted に保存する

let context = null;
let master = null;
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

        // すべての音の出口：高い音をやわらかく削って、ほんのりと「ひびき」（エコー）をつける
        master = context.createGain();
        master.gain.value = 0.9;
        const soften = context.createBiquadFilter();
        soften.type = "lowpass";
        soften.frequency.value = 4200;
        master.connect(soften);
        soften.connect(context.destination);

        const echo = context.createDelay(1);
        echo.delayTime.value = 0.23;
        const feedback = context.createGain();
        feedback.gain.value = 0.32;
        const echoTone = context.createBiquadFilter();
        echoTone.type = "lowpass";
        echoTone.frequency.value = 1800;
        const wet = context.createGain();
        wet.gain.value = 0.28;
        soften.connect(echo);
        echo.connect(echoTone);
        echoTone.connect(feedback);
        feedback.connect(echo);
        echoTone.connect(wet);
        wet.connect(context.destination);
    }
    if (context.state === "suspended") context.resume();
    return context;
}

// ■録音の素材（public/sounds/pack/*.mp3。CC0の素材。出どころは public/sounds/CREDITS.txt）。
//   どの場面に、どの録音を使うかは、「音くらべ」の画面（/sound-test）で決める。決めたものは、この端末の localStorage（sfxSlots）に入る。
//   決めていない場面、読み込めないときは、下の、その場で作る音を使う
const buffers = {};
const loading = {};

function readSlots() {
    try {
        return JSON.parse(localStorage.getItem("sfxSlots")) || {};
    } catch (e) {
        return {};
    }
}
let slots = readSlots();

function loadFile(file) {
    if (buffers[file] || loading[file]) return loading[file] || Promise.resolve();
    const ac = audio();
    if (!ac) return Promise.resolve();
    loading[file] = fetch(`/sounds/pack/${file}.mp3`)
        .then(response => {
            if (!response.ok) throw new Error(`${file}: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(data => ac.decodeAudioData(data))
        .then(buffer => {
            buffers[file] = buffer;
        })
        .catch(() => {
            loading[file] = null;
        });
    return loading[file];
}

// 録音ファイルを1回鳴らす。鳴らせたら true。毎回、ほんの少し高さを変えて、同じ音ばかりにならないようにする
function playFile(file, { volume = 1, rate = 1, at = 0, vary = true } = {}) {
    if (muted) return true;
    const ac = audio();
    if (!ac) return false;
    const buffer = buffers[file];
    if (!buffer) {
        loadFile(file);
        return false;
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate * (vary ? 0.96 + Math.random() * 0.08 : 1);
    const gain = ac.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(master);
    source.start(ac.currentTime + at);
    return true;
}

// 場面（slot）に決めた録音があれば、それを鳴らす。決めていなければ false
function sample(slot, { volume = 1 } = {}) {
    const chosen = slots[slot];
    if (!chosen || !chosen.file) return false;
    return playFile(chosen.file, { volume: volume * (chosen.volume || 1) });
}

// やわらかい音を1つ。freq＝高さ(Hz)、slideTo＝その高さまで変化、overtone＝倍音（木や鈴らしさ）の強さ、
// attack＝出だしのなめらかさ（秒）、duration＝消えるまでの長さ（秒）
function tone({ freq, slideTo, at = 0, duration = 0.3, volume = 0.1, attack = 0.012, overtone = 0, overtoneRatio = 2.76 }) {
    if (muted) return;
    const ac = audio();
    if (!ac) return;
    const start = ac.currentTime + at;
    const voices = [{ ratio: 1, level: 1 }];
    if (overtone) voices.push({ ratio: overtoneRatio, level: overtone });
    voices.forEach(({ ratio, level }) => {
        const oscillator = ac.createOscillator();
        const gain = ac.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq * ratio, start);
        if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo * ratio, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume * level, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.05);
    });
}

// さーっ・ざざ…という、風・波・葉ずれのような音。filter＝フィルターの種類、freq＝中心の高さ、slideTo＝そこまで変化
function noise({ at = 0, duration = 0.3, volume = 0.06, filter = "lowpass", freq = 800, slideTo, attack = 0.04, q = 0.7 }) {
    if (muted) return;
    const ac = audio();
    if (!ac) return;
    const start = ac.currentTime + at;
    const length = Math.max(1, Math.floor(ac.sampleRate * duration));
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const biquad = ac.createBiquadFilter();
    biquad.type = filter;
    biquad.Q.value = q;
    biquad.frequency.setValueAtTime(freq, start);
    if (slideTo) biquad.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(biquad).connect(gain).connect(master);
    source.start(start);
    source.stop(start + duration + 0.05);
}

// 水のしずく：「ぽとん」。音がすっと上がって消える
function drop(freq, at = 0, volume = 0.1) {
    tone({ freq, slideTo: freq * 1.45, at, duration: 0.22, volume, attack: 0.006 });
    tone({ freq: freq * 2, slideTo: freq * 2.6, at, duration: 0.1, volume: volume * 0.3, attack: 0.004 });
}

// 木の音：「コッ」。やわらかく、丸い
function wood(freq, at = 0, volume = 0.1) {
    tone({ freq, slideTo: freq * 0.9, at, duration: 0.14, volume, attack: 0.004, overtone: 0.35, overtoneRatio: 2.4 });
}

// 鈴・うつわの音：「りーん」。ゆっくり消える（ペンタトニックの音で、どれを重ねても、にごらない）
function bell(freq, at = 0, volume = 0.07, duration = 1.4) {
    tone({ freq, at, duration, volume, attack: 0.02, overtone: 0.28, overtoneRatio: 2.76 });
    tone({ freq: freq * 4.1, at, duration: duration * 0.35, volume: volume * 0.12, attack: 0.01 });
}

// ペンタトニック（ドレミソラ）：C5 D5 E5 G5 A5 C6
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

// ■カードを置いたときの音を、置いた場所の地形で変える（海＝やさしい波／川＝しずく／森＝葉ずれ／町＝木のコトッ／土＝やわらかい土の音）。
//   scale＝音の大きさ（AIが置いたときは、少し小さくする）
const PLACE_SOUNDS = {
    sea(scale) {
        noise({ duration: 0.9, volume: 0.075 * scale, filter: "lowpass", freq: 350, slideTo: 1100, attack: 0.35, q: 0.4 });
        noise({ at: 0.45, duration: 0.7, volume: 0.05 * scale, filter: "lowpass", freq: 900, slideTo: 260, attack: 0.1, q: 0.4 });
        tone({ freq: 240, slideTo: 170, at: 0.05, duration: 0.4, volume: 0.1 * scale, attack: 0.05 });
    },
    river(scale) {
        drop(1180, 0, 0.1 * scale);
        drop(880, 0.15, 0.07 * scale);
        noise({ duration: 0.35, volume: 0.025 * scale, filter: "bandpass", freq: 2400, slideTo: 1800, attack: 0.1, q: 1.2 });
    },
    forest(scale) {
        noise({ duration: 0.5, volume: 0.06 * scale, filter: "bandpass", freq: 4200, slideTo: 2400, attack: 0.15, q: 0.9 });
        wood(330, 0.12, 0.07 * scale);
    },
    town(scale) {
        wood(740, 0, 0.1 * scale);
        wood(988, 0.1, 0.06 * scale);
    },
    dirt(scale) {
        tone({ freq: 118, slideTo: 72, duration: 0.3, volume: 0.17 * scale, attack: 0.012 });
        noise({ duration: 0.18, volume: 0.045 * scale, filter: "lowpass", freq: 420, attack: 0.02 });
    }
};

export const sfx = {
    // 最初のタップで呼ぶ（スマホで音を出せる状態にする）
    unlock() {
        audio();
        Object.values(slots).forEach(chosen => chosen && chosen.file && loadFile(chosen.file));
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

    // カードや丸いボタンをタップしたとき：木をそっとたたく音
    select() {
        if (!sample("select", { volume: 0.7 })) wood(560, 0, 0.07);
    },

    // 自分がカードを置いたとき：置いた場所の地形の音 ＋ 小さな鈴（置けたよ、の合図）
    place(area) {
        const terrain = PLACE_SOUNDS[area];
        if (!sample(`place_${area}`, { volume: 0.95 })) {
            if (terrain) terrain(1);
            else wood(660, 0, 0.1);
        }
        bell(PENTA[2], 0.22, 0.035, 0.9);
    },

    // 食べたとき：やわらかく低い、「ぼふっ」（こわくない音）
    eat() {
        if (sample("eat", { volume: 0.8 })) return;
        tone({ freq: 190, slideTo: 95, duration: 0.3, volume: 0.13, attack: 0.02 });
        noise({ duration: 0.2, volume: 0.04, filter: "lowpass", freq: 320, attack: 0.03 });
    },

    // AIがカードを置いたとき：自分より小さく、地形の音だけ
    aiPlace(area) {
        if (sample(`place_${area}`, { volume: 0.55 })) return;
        const terrain = PLACE_SOUNDS[area];
        if (terrain) terrain(0.6);
        else wood(520, 0, 0.06);
    },

    // 自分の番になったとき：うつわの鈴をひとつ「りーん」
    turn() {
        if (sample("turn", { volume: 0.8 })) return;
        bell(PENTA[3], 0, 0.06, 1.1);
    },

    // スキップ：ゆっくり下がる、やさしい音
    skip() {
        if (sample("skip", { volume: 0.7 })) return;
        tone({ freq: 392, slideTo: 330, duration: 0.5, volume: 0.07, attack: 0.04 });
    },

    // 置けないなどの注意：木を低くコトッ（しかる音ではなく、そっと知らせる）
    error() {
        if (sample("error", { volume: 0.7 })) return;
        wood(220, 0, 0.09);
    },

    // 勝ったとき：ペンタトニックの鈴が、ゆっくり上がっていく
    win() {
        if (sample("win", { volume: 0.9 })) return;
        [0, 1, 2, 3, 5].forEach((note, index) => {
            bell(PENTA[note], index * 0.2, 0.06, 1.6);
        });
    },

    // レベル4（頭の生きもの）が あらわれたとき：ふかい、うつわの鈴を2つ（ゆっくり、おごそかに）
    lord() {
        if (sample("lord", { volume: 0.9 })) return
        bell(130.81, 0, 0.12, 3.0)
        bell(196, 0.12, 0.08, 3.2)
        bell(PENTA[0], 0.4, 0.05, 2.2)
    },

    // 負けたとき：低い鈴をひとつ、ゆっくり消える
    lose() {
        if (sample("lose", { volume: 0.9 })) return;
        bell(329.63, 0, 0.07, 2.0);
        bell(246.94, 0.35, 0.05, 2.2);
    },

    // ----------------------------------------
    // 「音くらべ」の画面（/sound-test）用
    // ----------------------------------------
    // 場面の一覧（ゲームが鳴らしている名前）
    slotNames: ["select", "place_sea", "place_river", "place_forest", "place_town", "place_dirt", "eat", "turn", "lord", "skip", "error", "win", "lose"],

    // 場面ごとに、いま決めている録音
    getSlots() {
        return { ...slots };
    },

    // 場面に録音を決める（file が空ならもどす＝その場で作る音）
    setSlot(slot, file, volume = 1) {
        slots = { ...slots };
        if (file) {
            slots[slot] = { file, volume };
            loadFile(file);
        } else {
            delete slots[slot];
        }
        try {
            localStorage.setItem("sfxSlots", JSON.stringify(slots));
        } catch (e) {
            // 保存できなくても、このあいだは有効
        }
    },

    // 録音を、そのまま鳴らす（聞きくらべ用。ファイルが読み込めるまで待つ）
    async previewFile(file, volume = 1) {
        await loadFile(file);
        playFile(file, { volume, vary: false });
    },

    // 場面の、その場で作る音を鳴らす（録音のかわりの音）
    previewSynth(slot) {
        const saved = slots;
        slots = {};
        try {
            this.playSlot(slot);
        } finally {
            slots = saved;
        }
    },

    // 場面の名前で、いまの設定のまま鳴らす
    playSlot(slot) {
        if (slot.startsWith("place_")) return this.place(slot.slice(6));
        if (typeof this[slot] === "function") return this[slot]();
    }
};
