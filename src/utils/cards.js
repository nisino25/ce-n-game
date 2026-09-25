// ■生きものカードのDB操作（要件定義: docs/requirements/04_cards.md）
//
// - cards/{cardId}              … カードライブラリ（生きものの種類ごとの情報。名前・画像・レベルなどはここにだけある）
// - cardInstances/{instanceId}  … プレイヤーが持っている1枚ごとのカード（cardId でカードライブラリを参照する）
import db, { firebase } from "@/firebase.js";

// ■野生にもどそう！（陣取りゲーム）を遊ぶのに必要な手元のカード枚数
export const MIN_CARDS_FOR_DOMINATION = 10;

export const TEAM_LABELS = { earth: "土", water: "水", air: "風" };

export const REGION_LABELS = { hokkaido: "北海道", kanagawa: "神奈川", kyoto: "京都" };

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
            const cenId = localStorage.getItem("loginCenId");
            if (!cenId) return null;

            const snapshot = await db.collection("users")
                .where("cenId", "==", cenId)
                .get();
            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return { uid: doc.id, ...doc.data() };
        })().catch(error => {
            currentUserPromise = null;
            throw error;
        });
    }
    return currentUserPromise;
}

// ■カードライブラリ（公開中のカード）
export async function fetchCardLibrary() {
    const snapshot = await db.collection("cards")
        .where("published", "==", true)
        .get();
    return snapshot.docs
        .map(doc => ({ cardId: doc.id, ...doc.data() }))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ja"));
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
    const regionCards = library.filter(card => card.region === region);
    const pool = regionCards.length ? regionCards : library;
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
    return {
        cardId: card.cardId,
        name: card.name,
        icon: card.image || "",
        level: LEVEL_ICONS[card.level] || "",
        levelNumber: card.level,
        rare: card.rarity || "",
        area2: HABITAT_ICONS[card.habitat] || "",
        group: instance ? TEAM_LABELS[instance.team] || "" : "",
        owner: instance ? instance.ownerName : "",
        card: card.frame || "silver"
    };
}

// ------------------------------------------------------------
// ■陣取りゲーム（野生にもどそう！）で使う所持カード
// ------------------------------------------------------------

// チームのメンバー全員の、手元にある（まだ盤面に置いていない）カード
export async function fetchTeamCollectionInstances(team) {
    const snapshot = await db.collection("cardInstances")
        .where("team", "==", team)
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
        area: card.terrain,
        tier: card.level,
        food: card.food || [],
        cardId: card.cardId,
        instanceId,
        // true: AIチーム用の仮のカード（所持カードではないのでDBは更新しない）
        isVirtual
    };
}
