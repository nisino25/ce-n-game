// ■生き物判定API（ikimono-api）の結果を、カード（cards）の形に変換する
// 参照: docs/creature-scan-to-card.md / 連携ガイド（rarity.tier・trophic_level・habitat の値）
// ※ Firebase には触らない純粋な関数だけを置いている（動作確認しやすいように）

// レア度の段（API の tier）→ カードのレア度。A がいちばんめずらしい（cards.js の RARITY_WEIGHTS と同じ向き）
const RARITY_BY_TIER = {
    legendary: "A",
    very_rare: "B",
    rare: "C",
    uncommon: "D",
    common: "D"
};

// 撮影場所のヒント（自由入力）→ 洞窟の地域（cards の region）
const REGION_RULES = [
    { region: "hokkaido", pattern: /北海道|札幌|函館|旭川/ },
    { region: "kanagawa", pattern: /神奈川|横浜|鎌倉|川崎|藤沢|茅ヶ崎|平塚|相模/ },
    { region: "kyoto", pattern: /京都/ }
];

// すみかの文字（API の habitat は自由文）→ cards の habitat / terrain。上から順に当てはめる
const HABITAT_RULES = [
    { habitat: "sea", terrain: "water", pattern: /海|磯|浜|干潟|沿岸/ },
    { habitat: "river", terrain: "water", pattern: /川|河|水路|用水|池|田んぼ|水田|沼|湖|水辺|湿地/ },
    { habitat: "town", terrain: "land", pattern: /町|街|住宅|庭|公園|畑|都市|学校|家/ },
    { habitat: "soil", terrain: "land", pattern: /土|地面|地中|落ち葉|落葉|腐葉/ }
];
const DEFAULT_HABITAT = { habitat: "forest", terrain: "land" };

export const CARD_NAME_MAX_LENGTH = 20;

export const RARITY_OPTIONS = [
    { value: "A", label: "A（さいこう）" },
    { value: "B", label: "B（とても）" },
    { value: "C", label: "C（めずらしい）" },
    { value: "D", label: "D（ふつう）" }
];

export const LEVEL_OPTIONS = [
    { value: 1, label: "Lv1" },
    { value: 2, label: "Lv2" },
    { value: 3, label: "Lv3" },
    { value: 4, label: "Lv4" }
];

export const HABITAT_OPTIONS = [
    { value: "forest", label: "もり" },
    { value: "sea", label: "うみ" },
    { value: "river", label: "かわ・いけ" },
    { value: "town", label: "まち・にわ" },
    { value: "soil", label: "つち" }
];

export function habitatFromText(text = "") {
    const rule = HABITAT_RULES.find(item => item.pattern.test(text));
    return rule ? { habitat: rule.habitat, terrain: rule.terrain } : DEFAULT_HABITAT;
}

export function regionFromHint(hint = "") {
    const rule = REGION_RULES.find(item => item.pattern.test(hint));
    return rule ? rule.region : "";
}

// 栄養段階は API が 1〜5、カードの生態系レベルは 1〜4（5 は 4 にまとめる）
export function levelFromTrophicLevel(trophicLevel) {
    return Math.min(4, Math.max(1, Number(trophicLevel) || 1));
}

// 候補1件 → カードの下書き。プレビュー画面で名前・レア度などを直してから登録する
export function candidateToCardDraft(candidate, hint = "") {
    const habitatInfo = habitatFromText(candidate.habitat);
    const rarity = candidate.rarity || {};

    return {
        name: (candidate.name_ja || "").trim(),
        level: levelFromTrophicLevel(candidate.trophic_level),
        rarity: RARITY_BY_TIER[rarity.tier] || "D",
        habitat: habitatInfo.habitat,
        terrain: habitatInfo.terrain,
        region: regionFromHint(hint),
        // スキャンでとったカードは、ゴールドカード
        frame: "gold",
        food: [],

        // 図鑑で見るための情報（カードの絵柄には使わない）
        scientificName: (candidate.name_scientific || "").trim(),
        nameKana: (candidate.name_kana || "").trim(),
        nameEn: (candidate.name_en || "").trim(),
        category: candidate.category || "other",
        diet: candidate.diet || "",
        trophicLevel: Number(candidate.trophic_level) || null,
        habitatText: candidate.habitat || "",
        description: candidate.description_for_kids || "",
        isDangerous: Boolean(candidate.is_dangerous),
        dangerNote: candidate.danger_note || "",
        rarityValue: typeof rarity.value === "number" ? rarity.value : null,
        rarityReason: rarity.reason || "",
        confidence: typeof candidate.confidence === "number" ? candidate.confidence : null
    };
}

// 登録前の入力チェック。問題があれば、画面に出す文章を返す（問題が無ければ空文字）
export function validateCardDraft(draft) {
    const name = (draft.name || "").trim();
    if (!name) return "なまえを入れてね";
    if (name.length > CARD_NAME_MAX_LENGTH) return `なまえは${CARD_NAME_MAX_LENGTH}もじまでだよ`;
    return "";
}
