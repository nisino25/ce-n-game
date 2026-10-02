// ■テラ（ポイント）：ハブサイト（shineki-game）と同じく、ce-n.org（Wix）側の `totalPoints` を使う。
// Firestoreには持たない。詳細は docs/currency.md 参照。

const CE_N_FUNCTIONS = "https://www.ce-n.org/_functions";

// ■取得（読み込み）：findMe の返事に入っている totalPoints。読むだけなのでce-n.org側のデータは変わらない
//   ハブ側の取り方と同じ。見つからない会員IDのときは {message: "..."} が返る
export async function fetchTotalPoints(cenId) {
    const response = await fetch(`${CE_N_FUNCTIONS}/findMe?id=${encodeURIComponent(cenId)}`);
    const result = await response.json();
    if (result.message) return null;
    return result.totalPoints || 0;
}

// ■更新（加算）：ハブと同じ updatePoints。**GETなのにce-n.org側のポイントが実際に書き換わる**ので、
//   呼ぶのは「ポイントを増やすと決めた処理」だけにする（動作確認で気軽に呼ばない）。
//   返事は配列で、[0].totalPoints が更新後の合計。increment は加算する点数（整数）
export async function addPoints(cenId, increment) {
    const response = await fetch(`${CE_N_FUNCTIONS}/updatePoints?id=${encodeURIComponent(cenId)}&increment=${increment}`);
    if (!response.ok) throw new Error("ポイントの更新に失敗しました");
    const result = await response.json();
    return result[0].totalPoints;
}
