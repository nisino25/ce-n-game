// ■洞窟のエリア設定：エリアごとに洞窟のタイプ（色）を固定し、カギもエリアごとに分ける
// stage は CaveGame.vue の stageData のキー（壁・床の色・ワープゲートのアイコン）
// keyColor はカギ数表示のバッジの色（迷路上のカギのアイコンは共通の🔑）
export const CAVE_AREAS = {
    kanagawa: {
        name: "神奈川",
        emblem: "/images/cave/kanagawaEmblem.png",
        stage: "forest",
        keyColor: "#1f7a1f"
    },
    hokkaido: {
        name: "北海道",
        emblem: "/images/cave/hokkaidoEnblem.png",
        stage: "water",
        keyColor: "#0d4fa0"
    },
    kyoto: {
        name: "京都",
        emblem: "/images/cave/kyotoEmblem.png",
        stage: "cave",
        keyColor: "#d4af37"
    }
};

export const CAVE_AREA_IDS = Object.keys(CAVE_AREAS);

// ■カギはエリアごとに分けて localStorage の "caveKeys" に保存する（例: { kanagawa: 2, hokkaido: 0, kyoto: 1 }）
const KEYS_STORAGE = "caveKeys";

export function loadCaveKeys() {
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(KEYS_STORAGE) || "{}");
    } catch (error) {
        saved = {};
    }
    return Object.fromEntries(
        CAVE_AREA_IDS.map(id => [id, Number(saved[id]) || 0])
    );
}

export function saveCaveKeys(keys) {
    localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

// ■最後に遊んだ洞窟のエリア（宝箱画面でどのエリアのカギを使うかの初期値）
const LAST_AREA_STORAGE = "lastCaveArea";

export function saveLastCaveArea(areaId) {
    sessionStorage.setItem(LAST_AREA_STORAGE, areaId);
}

export function loadLastCaveArea() {
    const areaId = sessionStorage.getItem(LAST_AREA_STORAGE);
    return CAVE_AREAS[areaId] ? areaId : null;
}

// ■洞窟の入口で選んだダンジョンのエリア（洞窟画面を開いたときに一度だけ使う）
const NEXT_AREA_STORAGE = "nextCaveArea";

export function saveNextCaveArea(areaId) {
    sessionStorage.setItem(NEXT_AREA_STORAGE, areaId);
}

export function takeNextCaveArea() {
    const areaId = sessionStorage.getItem(NEXT_AREA_STORAGE);
    sessionStorage.removeItem(NEXT_AREA_STORAGE);
    return CAVE_AREAS[areaId] ? areaId : null;
}
