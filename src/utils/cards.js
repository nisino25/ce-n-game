// ■生きものカードのDB操作（要件定義: docs/requirements/04_cards.md）
//
// - cards/{cardId}              … カードライブラリ（生きものの種類ごとの情報。名前・画像・レベルなどはここにだけある）
// - cardInstances/{instanceId}  … プレイヤーが持っている1枚ごとのカード（cardId でカードライブラリを参照する）
import db, { firebase } from "@/firebase.js";
import { getSession } from "@/utils/session.js";

// ■すみかにもどそう！（陣取りゲーム）を遊ぶのに必要な手元のカード枚数
export const MIN_CARDS_FOR_DOMINATION = 10;

export const TEAM_LABELS = { earth: "土", water: "水", air: "風" };

// 地域（地方）の名前。生き物カードは、生息する地方を複数持てる（API の distribution と同じ9地方）
export const REGION_LABELS = {
    hokkaido: "北海道エリア",
    tohoku: "東北エリア",
    kanto: "関東エリア",
    chubu: "中部エリア",
    kinki: "近畿エリア",
    chugoku: "中国エリア",
    shikoku: "四国エリア",
    kyushu: "九州エリア",
    okinawa: "沖縄エリア"
};

// 以前の地域名（神奈川・京都）は、いまの地方に読み替える
const LEGACY_REGION_ALIASES = { kanagawa: "kanto", kyoto: "kinki" };

export function normalizeRegion(region) {
    return LEGACY_REGION_ALIASES[region] || region;
}

// カードが属する地域の一覧。生き物カードは regions（複数）、それ以外は region（ひとつ）
export function cardRegions(card) {
    const list = Array.isArray(card.regions) ? card.regions : [card.region];
    return list.filter(Boolean).map(normalizeRegion);
}

export const TERRAIN_LABELS = { land: "陸", water: "水辺" };

const HABITAT_ICONS = {
    forest: "/images/card/すみかアイコン（森）.png",
    sea: "/images/card/すみかアイコン（海）.png",
    river: "/images/card/すみかアイコン（川）.png",
    town: "/images/card/すみかアイコン（町）.png",
    soil: "/images/card/すみかアイコン（土）.png"
};

const LEVEL_ICONS = {
    1: "/images/card/生態系レベル１.png",
    2: "/images/card/生態系レベル２.png",
    3: "/images/card/生態系レベル３.png",
    4: "/images/card/生態系レベル４.png"
};

// ■宝箱から出る確率の重み（レア度ごと。仮の値。docs/requirements/04_cards.md 6章 #5）
const RARITY_WEIGHTS = { A: 5, B: 15, C: 30, D: 50 };

// ■ログイン中のユーザー（users/{uid}）。cenId から探して、同じ画面の中では使い回す
let currentUserPromise = null;

export function getCurrentUser() {
    if (!currentUserPromise) {
        currentUserPromise = (async () => {
            const cenId = getSession("loginCenId");
            if (!cenId) return null;

            const snapshot = await db.collection("users")
                .where("cenId", "==", cenId)
                .get();
            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return { uid: doc.id, ...doc.data() };
        })().then(user => {
            // 見つからなかった結果は覚えない（次に呼んだとき、もう一度取りに行く）
            if (!user) currentUserPromise = null;
            return user;
        }).catch(error => {
            currentUserPromise = null;
            throw error;
        });
    }
    return currentUserPromise;
}

// ■プロフィール保存直後・ログイン/ログアウト直後など、次回のgetCurrentUser()を
// 必ずFirestoreへ取りに行かせたいときに呼ぶ（呼ばないとSPA内では古い内容がキャッシュされ続ける）
export function resetCurrentUserCache() {
    currentUserPromise = null;
}

// ■カードライブラリ（公開中のカード）
// ■カードの画像は cards/{id} には入れず、cardImages/{id} に入れる（一覧を軽くするため）。
// 移行前のカードは cards/{id}.image に画像が残っているので、そちらも読めるようにしておく
export async function fetchCardLibraryList() {
    const snapshot = await db.collection("cards")
        .where("published", "==", true)
        .get();
    return snapshot.docs
        .map(doc => ({ cardId: doc.id, ...doc.data() }))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ja"));
}

// ■カード1枚の画像。読んだものは覚えておき、同じ画像を2回読まない
const cardImageCache = new Map();
export function fetchCardImage(cardId) {
    if (!cardImageCache.has(cardId)) {
        const promise = (async () => {
            const imageDoc = await db.collection("cardImages").doc(cardId).get();
            if (imageDoc.exists) return imageDoc.data().image || "";
            // 移行前のカードは、cards/{id} の image を読む
            const cardDoc = await db.collection("cards").doc(cardId).get();
            return cardDoc.exists ? cardDoc.data().image || "" : "";
        })().catch(error => {
            // 失敗した結果は覚えない（次に呼んだとき、もう一度取りに行く）
            cardImageCache.delete(cardId);
            throw error;
        });
        cardImageCache.set(cardId, promise);
    }
    return cardImageCache.get(cardId);
}

// ■複数のカードの画像をまとめて読む（戻り値: { カードID: 画像 }）
export async function fetchCardImages(cardIds) {
    const images = await Promise.all(cardIds.map(cardId => fetchCardImage(cardId)));
    return Object.fromEntries(cardIds.map((cardId, index) => [cardId, images[index]]));
}

// ■カードの画像を保存する（スキャンで登録したとき・管理画面で画像を選んだとき）
export function saveCardImage(cardId, image) {
    cardImageCache.delete(cardId);
    return db.collection("cardImages").doc(cardId).set({
        image,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ■カードライブラリ（宝箱・陣取りなどで使う。画像もすべて付けて返す）
export async function fetchCardLibrary() {
    const cards = await fetchCardLibraryList();
    // 画像がカード本体に残っているもの（移行前）はそのまま使い、無いものは cardImages から読む
    const missingIds = cards.filter(card => !card.image).map(card => card.cardId);
    const images = missingIds.length ? await fetchCardImages(missingIds) : {};
    return cards.map(card => ({ ...card, image: card.image || images[card.cardId] || "" }));
}

// ■カードを作った人（users/{uid}）のアバター。一度読んだものは覚えておく
const userAvatarCache = new Map();
export function fetchUserAvatar(uid) {
    if (!userAvatarCache.has(uid)) {
        const promise = db.collection("users").doc(uid).get()
            .then(doc => (doc.exists ? doc.data().avatar || null : null))
            .catch(error => {
                userAvatarCache.delete(uid);
                throw error;
            });
        userAvatarCache.set(uid, promise);
    }
    return userAvatarCache.get(uid);
}

// ■カードライブラリは、洞窟に入ったときに先に読んでおき、宝箱の画面ではそれを使い回す
let cardLibraryPromise = null;

export function getCardLibrary() {
    if (!cardLibraryPromise) {
        cardLibraryPromise = fetchCardLibrary().catch(error => {
            // 失敗した結果は覚えない（次に呼んだとき、もう一度取りに行く）
            cardLibraryPromise = null;
            throw error;
        });
    }
    return cardLibraryPromise;
}

// ■洞窟に入った時点で、宝箱に必要なデータを裏で読み始める（失敗しても、宝箱を開くときにもう一度読む）
export function prefetchChestData() {
    getCardLibrary().catch(() => {});
    getCurrentUser().catch(() => {});
}

// ■自分が持っているカード（全ステータス）
export async function fetchMyCardInstances(uid) {
    const snapshot = await db.collection("cardInstances")
        .where("ownerUid", "==", uid)
        .get();
    return snapshot.docs.map(doc => ({ instanceId: doc.id, ...doc.data() }));
}

// ■手元にある（まだ盤面に置いていない）カードの枚数
export async function countCollectionCards(where) {
    let query = db.collection("cardInstances").where("status", "==", "collection");
    Object.entries(where).forEach(([field, value]) => {
        query = query.where(field, "==", value);
    });
    const snapshot = await query.get();
    return snapshot.size;
}

// ■宝箱から出すカードを選ぶ：そのエリアのカードから、レア度の重みで抽選。
// そのエリアのカードが無ければ、全カードから選ぶ
export function drawCard(library, region) {
    const target = normalizeRegion(region);
    const regionCards = library.filter(card => cardRegions(card).includes(target));

    // くじに入るのは、公開されている銀フレームのカード。スキャンで作ったカードは、管理画面で「洞窟で出す」をONにしたものだけ
    const drawableCards = library.filter(card => card.published === true && (card.source === "scan"
        ? card.caveOk === true
        : card.frame === "silver"));
    // 指定地域のカードに絞り込む
    const pool = regionCards.filter(card => drawableCards.includes(card));
    // const pool = regionCards.length ? regionCards : library;
    if (!pool.length) return null;

    const weights = pool.map(card => RARITY_WEIGHTS[card.rarity] || 1);
    let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < pool.length; i++) {
        roll -= weights[i];
        if (roll < 0) return pool[i];
    }
    return pool[pool.length - 1];
}

// ■カードを1枚、自分の所持カードとして登録する
export async function addCardInstance({ card, user, obtainedFrom }) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const instance = {
        cardId: card.cardId,
        ownerUid: user.uid,
        ownerName: user.name || "",
        team: user.team || "",
        obtainedAt: now,
        obtainedFrom,
        status: "collection",
        dominationRoomCode: null,
        tileId: null,
        placedAt: null,
        eatenAt: null,
        eatenByInstanceId: null,
        statusUpdatedAt: now
    };
    const ref = await db.collection("cardInstances").add(instance);
    return { instanceId: ref.id, ...instance };
}

// ■カード表示用のデータ（カードライブラリの情報＋所持カードの情報）
export function toDisplayCard(card, instance = null) {
    let group = "";
    if (instance && instance.team) {
        group = TEAM_LABELS[instance.team] || instance.team || "";
    }
    return {
        cardId: card.cardId,
        name: card.name,
        // 英語モードで出す名前（スキャンでとったカードだけ入っている）
        nameEn: card.nameEn || "",
        icon: card.image || "",
        level: LEVEL_ICONS[card.level] || "",
        levelNumber: card.level,
        rare: card.rarity || "",
        area2: HABITAT_ICONS[card.habitat] || "",
        group: group,
        owner: instance ? instance.ownerName : "",
        // スキャンでとったカードは、保存された枠に関係なくゴールド
        card: card.source === "scan" ? "gold" : card.frame || "silver",
        // 植物は、植物用の台紙を使う（生産者のバッジ）
        plant: card.category === "plant"
    };
}

// ------------------------------------------------------------
// ■陣取りゲーム（すみかにもどそう！）で使う所持カード
// ------------------------------------------------------------

// チームのメンバー全員の、手元にある（まだ盤面に置いていない）カード
export async function fetchTeamCollectionInstances(team) {
    const snapshot = await db.collection("cardInstances")
        .where("team", "==", team)
        .where("status", "==", "collection")
        .get();
    return snapshot.docs.map(doc => ({ instanceId: doc.id, ...doc.data() }));
}

// 自分が持っている、手元にある（まだ盤面に置いていない）カード。図鑑の「もっている」から、盤面に置いたものを除いたもの
export async function fetchMyCollectionInstances(uid) {
    if (!uid) return [];
    const snapshot = await db.collection("cardInstances")
        .where("ownerUid", "==", uid)
        .where("status", "==", "collection")
        .get();
    return snapshot.docs.map(doc => ({ instanceId: doc.id, ...doc.data() }));
}

// 所持カードを盤面に置く。同じカードが別のゲームで同時に使われないよう、
// トランザクションで「まだ手元にある（collection）」ことを確かめてから placed にする。
// 置けたら true、すでに使われていたら false
export async function placeCardInstance(instanceId, roomCode, tileId) {
    const ref = db.collection("cardInstances").doc(instanceId);
    return db.runTransaction(async transaction => {
        const doc = await transaction.get(ref);
        if (!doc.exists || doc.data().status !== "collection") return false;

        const now = firebase.firestore.FieldValue.serverTimestamp();
        transaction.update(ref, {
            status: "placed",
            dominationRoomCode: roomCode,
            tileId,
            placedAt: now,
            statusUpdatedAt: now
        });
        return true;
    });
}

// 盤面で食べられた所持カードを eaten にする（[{ instanceId, eatenByInstanceId }]）
export async function markCardInstancesEaten(eatenList) {
    if (!eatenList.length) return;

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    eatenList.forEach(({ instanceId, eatenByInstanceId }) => {
        batch.update(db.collection("cardInstances").doc(instanceId), {
            status: "eaten",
            eatenAt: now,
            eatenByInstanceId: eatenByInstanceId || null,
            statusUpdatedAt: now
        });
    });
    await batch.commit();
}

// 陣取りゲームの手札用のカード（カードライブラリの情報を、陣取りゲームの形に合わせる）
export function toDominationCard(card, instanceId, isVirtual = false) {
    return {
        id: card.name,
        label: card.name,
        // 英語モードで出す名前（スキャンでとったカードだけ入っている）
        labelEn: card.nameEn || "",
        area: card.terrain,
        tier: card.level,
        food: card.food || [],
        cardId: card.cardId,
        instanceId,
        // true: AIチーム用の仮のカード（所持カードではないのでDBは更新しない）
        isVirtual
    };
}
