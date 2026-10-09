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

// ■写真をブラウザ上で縮小して data URL にする（canvas で描き直すので、位置情報などのEXIFも消える）
// 戻り値: { dataUrl, bytes, width, height, withinLimit }
export async function compressCardImage(file) {
    const bitmap = await createImageBitmap(file);
    try {
        const longSide = Math.max(bitmap.width, bitmap.height);
        let result = null;

        for (const edge of IMAGE_EDGE_STEPS) {
            const scale = Math.min(1, edge / longSide);
            const width = Math.round(bitmap.width * scale);
            const height = Math.round(bitmap.height * scale);

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

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

// ■顔が写っているかを、ブラウザの FaceDetector で調べる
// 戻り値: true（顔あり）/ false（顔なし）/ null（この端末では調べられない・失敗）
export async function detectFace(file) {
    if (typeof window.FaceDetector !== "function") return null;

    const bitmap = await createImageBitmap(file);
    try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(bitmap);
        return faces.length > 0;
    } catch (error) {
        console.error("顔の検出に失敗しました:", error);
        return null;
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

    const card = {
        name: draft.name.trim(),
        image: imageDataUrl,
        level: draft.level,
        rarity: draft.rarity,
        region: draft.region,
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
        description: draft.description,
        isDangerous: draft.isDangerous,
        dangerNote: draft.dangerNote,
        rarityValue: draft.rarityValue,
        rarityReason: draft.rarityReason,
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
