import db from "@/firebase.js";
import { setSession } from "@/utils/session.js";
import { resetCurrentUserCache } from "@/utils/cards.js";

// ■ログインの処理。LoginPage（ce-n.orgからのリンク）と BypassLoginPage（手元の確認用）で同じものを使う
// 成功したら、既存会員はHome、初回はIntroへ進む。失敗したら画面に出すエラー文を返す（問題なければ空文字）
export async function loginWithCenId(cenId, router) {
    console.log("Introへ渡す cenId:", cenId);
    // 最大2回までリトライする仕組み（一時的な通信エラー対策）
    let maxRetries = 2;
    let findMeResult = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const findMeUrl = `https://www.ce-n.org/_functions/findMe?id=${encodeURIComponent(cenId)}`;
            const findMeResponse = await fetch(findMeUrl);
            findMeResult = await findMeResponse.json();
            break; // 成功したらループを抜ける
        } catch (fetchError) {
            console.warn(`findMe 通信リトライ (${i + 1}/${maxRetries}):`, fetchError);
            if (i === maxRetries - 1) {
                // 通信自体が完全に失敗した場合のフェイルセーフ（必要に応じてそのまま通すかエラーにするか）
                console.error("findMe APIへの接続に失敗しました。続行します。");
                findMeResult = null; // API確認スキップ扱いにすることも可能
            } else {
                await new Promise(r => setTimeout(r, 1000)); // 1秒待ってリトライ
            }
        }
    }

    if (findMeResult.message) {
        router.push({ name: "Error" });
        return "";
    }

    try {
        // Firestoreからのデータ取得にもリトライを挟むとさらに安全
        let snapshot = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                snapshot = await db
                    .collection("users")
                    .where("cenId", "==", cenId)
                    .get();
                break;
            } catch (dbError) {
                if (i === maxRetries - 1) throw dbError;
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // ★ 検索結果を確認するログ
        console.log("=== LoginPage 判定 ===");
        console.log("受け取った cenId:", cenId);
        console.log("users検索件数:", snapshot.size);
        console.log(
            "検索結果:",
            snapshot.docs.map(doc => ({
                uid: doc.id,
                cenId: doc.data().cenId,
                team: doc.data().team
            }))
        );

        if (!snapshot.empty) {
            // 既存会員：保存済みのゲームを再開
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            // ★ ここで中身を丸ごとコンソールに出してみる
            console.log("【デバッグ】取得したuserDataの中身:", userData);
            console.log("【デバッグ】introCompletedの値:", userData.introCompleted, " (型:", typeof userData.introCompleted, ")");

            if (userData.introCompleted === true) {
                setSession("loginCenId", cenId);
                setSession("playerUid", userDoc.id);
                setSession("playerData", JSON.stringify(userData));
                setSession("myTeam", userData.team);
                // 同じ画面の中に前の会員のキャッシュが残らないように、次の会員の情報は取り直す
                resetCurrentUserCache();
                router.push({ name: "Home" });
                return "";
            }
        }
        // usersにデータがない場合だけ、初回INTROへ
        console.log("Introへ渡す cenId:", cenId);
        router.push({
            name: "Intro",
            query: { cenId }
        });
        return "";
    } catch (error) {
        console.error("Failed to check user:", error);
        return "確認に失敗しました。通信状況を確認してください。";
    }
}
