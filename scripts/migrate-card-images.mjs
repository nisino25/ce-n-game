// ■カードの画像を cards/{id}.image から cardImages/{id}.image へ移す（図鑑の一覧を軽くするため）
//
// 使い方（順番どおりに実行する）:
//   1. node scripts/migrate-card-images.mjs --dry-run
//        → 件数と大きさを表示するだけ。書き込みはしない
//   2. node scripts/migrate-card-images.mjs --copy
//        → cardImages/{id} に画像をコピーする（cards は消さない。古いアプリはそのまま動く）
//   3. node scripts/migrate-card-images.mjs --backup <保存先のJSONファイル>
//        → cards の画像を、念のためファイルに保存する（消す前のバックアップ）
//   4. node scripts/migrate-card-images.mjs --strip <手順3のJSONファイル>
//        → cardImages と同じ画像が入っていることを確かめてから、cards の image を消す
//        ※ 新しいアプリを公開したあとに実行する（古いアプリは cards の image を読むため）

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteField,
    serverTimestamp
} from "firebase/firestore";
import fs from "node:fs";

// src/firebase.js と同じ設定（ブラウザ用の公開設定）
const firebaseConfig = {
    apiKey: "AIzaSyDaj52leB3TPH7Mp5KAwTyoBt9krQh84Fc",
    authDomain: "ce-n-game.firebaseapp.com",
    projectId: "ce-n-game",
    storageBucket: "ce-n-game.firebasestorage.app",
    messagingSenderId: "448721390153",
    appId: "1:448721390153:web:c9531b0afcb8350ad10d98",
    measurementId: "G-EXGZXMCC65"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const args = process.argv.slice(2);
const mode = args[0];

// 同時に進める数（多すぎると通信が詰まるため少なめ）
const CONCURRENCY = 5;

async function inPool(items, worker) {
    let next = 0;
    const runners = Array.from({ length: CONCURRENCY }, async () => {
        while (next < items.length) {
            const item = items[next++];
            await worker(item);
        }
    });
    await Promise.all(runners);
}

// 移すのは、画像そのもの（data:）が入っているカードだけ。/images/... のようなパスは軽いので、そのままにする
const isDataImage = card => card.image.startsWith("data:");

async function loadCards() {
    const snapshot = await getDocs(collection(db, "cards"));
    return snapshot.docs.map(d => ({ cardId: d.id, image: d.data().image || "", name: d.data().name || "" }));
}

async function dryRun() {
    const cards = await loadCards();
    const withImage = cards.filter(card => card.image);
    const dataImages = withImage.filter(isDataImage);
    const bytes = dataImages.reduce((sum, card) => sum + card.image.length, 0);
    console.log(`cards: ${cards.length}件`);
    console.log(`画像が入っているカード: ${withImage.length}件`);
    console.log(`  うち移す画像（data:）: ${dataImages.length}件（約 ${(bytes / 1024 / 1024).toFixed(1)} MB）`);
    console.log(`  そのままにする（/images/... のパス）: ${withImage.length - dataImages.length}件`);
    console.log("※ 書き込みはしていません");
}

async function copy() {
    const cards = (await loadCards()).filter(isDataImage);
    let copied = 0;
    let skipped = 0;
    await inPool(cards, async card => {
        const ref = doc(db, "cardImages", card.cardId);
        const existing = await getDoc(ref);
        if (existing.exists() && existing.data().image === card.image) {
            skipped++;
            return;
        }
        await setDoc(ref, { image: card.image, copiedAt: serverTimestamp() });
        copied++;
    });

    // コピーした画像を、読み直して確かめる
    const mismatches = [];
    await inPool(cards, async card => {
        const after = await getDoc(doc(db, "cardImages", card.cardId));
        if (!after.exists() || after.data().image !== card.image) mismatches.push(card.cardId);
    });
    console.log(`コピー: ${copied}件 / すでに同じ画像があった: ${skipped}件`);
    console.log(`確認: ${cards.length - mismatches.length}件 OK / 合わなかった: ${mismatches.length}件`);
    if (mismatches.length) console.log("合わなかったID:", mismatches);
}

async function backup(file) {
    if (!file) throw new Error("保存先のファイル名を指定してください（例: --backup ./card-images-backup.json）");
    const cards = (await loadCards()).filter(isDataImage);
    const data = Object.fromEntries(cards.map(card => [card.cardId, card.image]));
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(`バックアップ: ${cards.length}件を ${file} に保存しました`);
}

async function strip(file) {
    if (!file || !fs.existsSync(file)) throw new Error("手順3で作ったバックアップのファイルを指定してください");
    const backupData = JSON.parse(fs.readFileSync(file, "utf8"));
    const cards = (await loadCards()).filter(isDataImage);
    let stripped = 0;
    const skipped = [];
    await inPool(cards, async card => {
        // バックアップと、cardImages の両方が同じ画像であることを確かめてから消す
        const copyDoc = await getDoc(doc(db, "cardImages", card.cardId));
        const sameAsBackup = backupData[card.cardId] === card.image;
        if (!copyDoc.exists() || copyDoc.data().image !== card.image || !sameAsBackup) {
            skipped.push(card.cardId);
            return;
        }
        await updateDoc(doc(db, "cards", card.cardId), { image: deleteField() });
        stripped++;
    });
    console.log(`cards から画像を消しました: ${stripped}件`);
    if (skipped.length) console.log("そのままにしたID（コピーが合わない・バックアップと違う）:", skipped);
}

try {
    if (mode === "--dry-run") await dryRun();
    else if (mode === "--copy") await copy();
    else if (mode === "--backup") await backup(args[1]);
    else if (mode === "--strip") await strip(args[1]);
    else console.log("使い方: --dry-run | --copy | --backup <file> | --strip <file>");
} catch (error) {
    console.error("失敗しました:", error);
    process.exitCode = 1;
}
process.exit(process.exitCode || 0);
