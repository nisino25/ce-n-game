// ■宝箱まわりの効果音（音声ファイルを使わず Web Audio API で鳴らす）
let audioCtx = null;

function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

// 短いノイズ（カチッという金属音や、風の音に使う）
function noiseBurst(ctx, when, length, freq, q, peak = 0.5) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(when);
}

// カギをあける音：カチッ、カチッと鳴って、鍵穴の中で回る「ジー」という音
export function playUnlockSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    noiseBurst(ctx, now, 0.05, 2600, 6);
    noiseBurst(ctx, now + 0.28, 0.05, 2200, 6);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, now + 0.1);
    osc.frequency.linearRampToValueAtTime(330, now + 0.6);
    gain.gain.setValueAtTime(0.0001, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + 0.1);
    osc.stop(now + 0.62);
}

// 箱をあける音：ギィーという木のきしみ、パカッ、そしてキラキラ
export function playChestOpenSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const creak = ctx.createOscillator();
    const creakGain = ctx.createGain();
    creak.type = "sawtooth";
    creak.frequency.setValueAtTime(140, now);
    creak.frequency.linearRampToValueAtTime(260, now + 0.5);
    creakGain.gain.setValueAtTime(0.0001, now);
    creakGain.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    creak.connect(creakGain).connect(ctx.destination);
    creak.start(now);
    creak.stop(now + 0.52);

    noiseBurst(ctx, now + 0.5, 0.12, 500, 2);

    [[1318.5, 0.6], [1567.98, 0.68], [1975.5, 0.76], [2637, 0.84]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.36);
    });
}

// カードが出てくる音：ふわっと風が抜けて、きらめきが上がっていく
export function playCardSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    noiseBurst(ctx, now, 0.45, 1200, 1, 0.2);

    [[784, 0], [987.8, 0.08], [1174.7, 0.16], [1568, 0.24]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.14, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.52);
    });
}
