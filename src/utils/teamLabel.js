import { t } from "@/utils/lang.js";

// ■陣取りゲームのチーム名を、画面に出す短い名前（英語モードでは英語）
// 中身のチーム名（水チームなど）は、ゲームの記録やDBで使っているので変えない
const SHORT_NAMES = {
    "水チーム": ["水", "Water"],
    "風チーム": ["風", "Air"],
    "土チーム": ["土", "Earth"]
};

export function teamShortName(name) {
    const hit = SHORT_NAMES[name];
    if (hit) return t(hit[0], hit[1]);
    return (name || "").replace("チーム", "");
}
