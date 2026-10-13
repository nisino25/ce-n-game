import db, { firebase } from "@/firebase.js";

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
// 会員IDと洞窟IDから、保存先のドキュメントを決める
function getCaveKeyDoc(cenId, areaId) {
    if (!cenId) {
        throw new Error("会員IDが取得できません。再ログインしてください。");
    }

    if (!CAVE_AREAS[areaId]) {
        throw new Error("洞窟IDが正しくありません: " + areaId);
    }

    const docId = `${encodeURIComponent(String(cenId))}_${areaId}`;

    return db.collection("caveKeys").doc(docId);
}

// ■カギはエリアごとに分けて localStorage の "caveKeys" に保存する（例: { kanagawa: 2, hokkaido: 0, kyoto: 1 }）
// const KEYS_STORAGE = "caveKeys";

// export function loadCaveKeys() {
//     let saved = {};
//     try {
//         saved = JSON.parse(localStorage.getItem(KEYS_STORAGE) || "{}");
//     } catch (error) {
//         saved = {};
//     }
//     return Object.fromEntries(
//         CAVE_AREA_IDS.map(id => [id, Number(saved[id]) || 0])
//     );
// }

// 会員の全洞窟のカギ数を取得する
export async function loadCaveKeys(cenId) {
    const entries = await Promise.all(
        CAVE_AREA_IDS.map(async (areaId) => {
            const doc = await getCaveKeyDoc(cenId, areaId).get();

            const count = doc.exists
                ? Number(doc.data().count) || 0
                : 0;

            return [areaId, Math.max(0, count)];
        })
    );

    return Object.fromEntries(entries);
}
// カギを取得（+1）または消費（-1）する
export async function changeCaveKey(cenId, areaId, delta) {
    if (delta !== 1 && delta !== -1) {
        throw new Error("カギの変更数は +1 または -1 にしてください。");
    }
    const docRef = getCaveKeyDoc(cenId, areaId);
    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const currentCount = doc.exists
            ? Math.max(0, Number(doc.data().count) || 0)
            : 0;

        // カギがない場合は消費しない
        if (delta === -1 && currentCount === 0) {
            return 0;
        }
        const nextCount = currentCount + delta;
        transaction.set(
            docRef,
            {
                cenId: String(cenId),
                areaId: areaId,
                count: nextCount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );
        return nextCount;
    });
}


// export function saveCaveKeys(keys) {
//     localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
// }

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
