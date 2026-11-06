// ■スキャンした写真をカードとして登録する（cards と cardInstances に、1つのバッチで書く）
// 方針: docs/creature-scan-to-card.md
import db, { firebase } from "@/firebase.js";

// Firestore の1ドキュメントは最大1MiB。画像は data URL（base64）で入るので、余裕を見て150KB以内にする
export const CARD_IMAGE_MAX_BYTES = 150 * 1024;

// 縮小サイズ・画質を、上限に収まるまで下げていく
const IMAGE_EDGE_STEPS = [512, 448, 384, 320];
const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5];

function dataUrlBytes(dataUrl) {
    return Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 3 / 4);
}

// WebP を書き出せない環境（一部のSafariなど）は JPEG にする
function encodeCanvas(canvas, quality) {
    const webp = canvas.toDataURL("image/webp", quality);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", quality);
}

// カードの写真の枠（CollectionCard の .image と同じ 138×123）
export const CARD_PHOTO_ASPECT = 138 / 123;

// ■写真のどこを切り取るか（枠の中に、拡大（zoom）と中心の位置（cx, cy は 0〜1）で決める）
// zoom 1 のときは、枠と同じ比率で、いちばん大きく入る範囲（＝カードで cover したときと同じ）
export function cropRect(srcW, srcH, edit) {
    const aspect = CARD_PHOTO_ASPECT;
    let baseW;
    let baseH;
    if (srcW / srcH > aspect) {
        baseH = srcH;
        baseW = srcH * aspect;
    } else {
        baseW = srcW;
        baseH = srcW / aspect;
    }
    const zoom = Math.max(1, edit.zoom || 1);
    const sw = baseW / zoom;
    const sh = baseH / zoom;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const sx = clamp((edit.cx ?? 0.5) * srcW - sw / 2, 0, srcW - sw);
    const sy = clamp((edit.cy ?? 0.5) * srcH - sh / 2, 0, srcH - sh);
    return { sx, sy, sw, sh };
}

// ■写真をブラウザ上で縮小して data URL にする（canvas で描き直すので、位置情報などのEXIFも消える）
// edit（{ zoom, cx, cy }）を渡すと、その範囲だけを切り取ってから縮小する（カードの枠と同じ比率になる）
// 戻り値: { dataUrl, bytes, width, height, withinLimit }
export async function compressCardImage(file, edit = null) {
    const bitmap = await createImageBitmap(file);
    try {
        const crop = edit ? cropRect(bitmap.width, bitmap.height, edit) : { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height };
        const longSide = Math.max(crop.sw, crop.sh);
        let result = null;

        for (const edge of IMAGE_EDGE_STEPS) {
            const scale = Math.min(1, edge / longSide);
            const width = Math.round(crop.sw * scale);
            const height = Math.round(crop.sh * scale);

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);

            for (const quality of QUALITY_STEPS) {
                const dataUrl = encodeCanvas(canvas, quality);
                const bytes = dataUrlBytes(dataUrl);
                result = { dataUrl, bytes, width, height, withinLimit: bytes <= CARD_IMAGE_MAX_BYTES };
                if (result.withinLimit) return result;
            }
        }

        // ここに来るのは、いちばん小さくしても上限を超えたとき（呼び出し側で止める）
        return result;
    } finally {
        bitmap.close();
    }
}

// ■同じ学名のカードが、もう何枚あるか（登録は止めない。プレビューで知らせるだけ）
export async function countSameSpecies(scientificName) {
    if (!scientificName) return 0;
    const snapshot = await db.collection("cards")
        .where("scientificName", "==", scientificName)
        .get();
    return snapshot.size;
}

// ■スキャンしたカードを登録する。cards（カード本体）と cardInstances（持ち主の1枚目）を、同時に書く
// 戻り値: 新しいカードのID（cardId）
export async function registerScannedCard({ draft, imageDataUrl, user }) {
    const cardRef = db.collection("cards").doc();
    const instanceRef = db.collection("cardInstances").doc();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // 画像は cardImages/{id} に入れる（cards 本体は軽いまま、図鑑の一覧を速くするため）
    await db.collection("cardImages").doc(cardRef.id).set({
        image: imageDataUrl,
        updatedAt: now
    });

    const card = {
        name: draft.name.trim(),
        level: draft.level,
        rarity: draft.rarity,
        habitat: draft.habitat,
        terrain: draft.terrain,
        frame: draft.frame,
        food: draft.food,
        published: true,

        // ■誰がとったか（図鑑で「じぶんがとった」を出すため）
        source: "scan",
        ownerUid: user.uid,
        ownerName: user.name || "",

        // ■図鑑用の情報（判定APIの結果）
        scientificName: draft.scientificName,
        nameKana: draft.nameKana,
        nameEn: draft.nameEn,
        category: draft.category,
        diet: draft.diet,
        trophicLevel: draft.trophicLevel,
        habitatText: draft.habitatText,
        habitatTextEn: draft.habitatTextEn,
        description: draft.description,
        descriptionEn: draft.descriptionEn,
        isDangerous: draft.isDangerous,
        dangerNote: draft.dangerNote,
        dangerNoteEn: draft.dangerNoteEn,
        rarityValue: draft.rarityValue,
        rarityReason: draft.rarityReason,
        rarityReasonEn: draft.rarityReasonEn,
        rarityTierLabelEn: draft.rarityTierLabelEn,
        distribution: draft.distribution,
        regions: draft.regions,
        confidence: draft.confidence,

        createdAt: now,
        updatedAt: now
    };

    const instance = {
        cardId: cardRef.id,
        ownerUid: user.uid,
        ownerName: user.name || "",
        team: user.team || "",
        obtainedAt: now,
        obtainedFrom: "scan",
        status: "collection",
        dominationRoomCode: null,
        tileId: null,
        placedAt: null,
        eatenAt: null,
        eatenByInstanceId: null,
        statusUpdatedAt: now
    };

    const batch = db.batch();
    batch.set(cardRef, card);
    batch.set(instanceRef, instance);
    await batch.commit();

    return cardRef.id;
}
