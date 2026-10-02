// ■地図の「場所」の3つのゲーム（ゲーム枠）で、みんなが共有する決まりごと。
//   ゲーム枠は街全体で共有する（同じ枠は、同時に1人しか遊べない）。
//   枠のようす（誰が遊び中か・どのチームが勝ったか）は、軽い Firestore の `mapSlots/{枠ID}` に入れ、
//   地図はこれだけを読む（ゲームの盤面そのものは `dominationGames/{枠ID}`）。

// 遊び中のまま、これだけ動きが無かったら「やめた」とみなして、ほかの人が使えるようにする
export const SLOT_STALE_MS = 3 * 60 * 60 * 1000;

export const TEAM_COLORS = { water: "#00BFA6", air: "#9B5DE5", earth: "#FFB97A" };
export const TEAM_NAMES = { water: "水", air: "風", earth: "土" };
export const AI_COLOR = "#ef4444";

// 枠のID（＝陣取りゲームのルームコード）。例：hiratsuka-komayama-2
export function slotId(spotId, gameNo) {
    return `${spotId}-${gameNo}`;
}

// 遊び中の枠が、まだ動いている（やめられていない）か
export function isFresh(updatedAt) {
    const time = updatedAt ? new Date(updatedAt).getTime() : 0;
    return Number.isFinite(time) && Date.now() - time < SLOT_STALE_MS;
}
