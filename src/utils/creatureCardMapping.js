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
    { value: "A", label: "A（さいこう）", labelEn: "A (Rarest)" },
    { value: "B", label: "B（とても）", labelEn: "B (Very rare)" },
    { value: "C", label: "C（めずらしい）", labelEn: "C (Rare)" },
    { value: "D", label: "D（ふつう）", labelEn: "D (Common)" }
];

export const LEVEL_OPTIONS = [
    { value: 1, label: "Lv1", labelEn: "Lv1" },
    { value: 2, label: "Lv2", labelEn: "Lv2" },
    { value: 3, label: "Lv3", labelEn: "Lv3" },
    { value: 4, label: "Lv4", labelEn: "Lv4" }
];

export const HABITAT_OPTIONS = [
    { value: "forest", label: "もり", labelEn: "Forest" },
    { value: "sea", label: "うみ", labelEn: "Sea" },
    { value: "river", label: "かわ・いけ", labelEn: "River / pond" },
    { value: "town", label: "まち・にわ", labelEn: "Town / garden" },
    { value: "soil", label: "つち", labelEn: "Soil" }
];

export function habitatFromText(text = "") {
    const rule = HABITAT_RULES.find(item => item.pattern.test(text));
    return rule ? { habitat: rule.habitat, terrain: rule.terrain } : DEFAULT_HABITAT;
}

// 栄養段階は API が 1〜5、カードの生態系レベルは 1〜4（5 は 4 にまとめる）
export function levelFromTrophicLevel(trophicLevel) {
    return Math.min(4, Math.max(1, Number(trophicLevel) || 1));
}

// 日本の9地方（API の distribution のキーと同じ。表示名と並び順）
export const REGION_TILES = [
    { key: "hokkaido", label: "北海道", labelEn: "Hokkaido" },
    { key: "tohoku", label: "東北", labelEn: "Tohoku" },
    { key: "kanto", label: "関東", labelEn: "Kanto" },
    { key: "chubu", label: "中部", labelEn: "Chubu" },
    { key: "kinki", label: "近畿", labelEn: "Kinki" },
    { key: "chugoku", label: "中国", labelEn: "Chugoku" },
    { key: "shikoku", label: "四国", labelEn: "Shikoku" },
    { key: "kyushu", label: "九州", labelEn: "Kyushu" },
    { key: "okinawa", label: "沖縄", labelEn: "Okinawa" }
];

// distribution（{ hokkaido: true, ... }）のうち、生息するとされた地方のキーの一覧
export function regionsFromDistribution(distribution) {
    if (!distribution) return [];
    return REGION_TILES.filter(tile => distribution[tile.key]).map(tile => tile.key);
}

// 候補1件 → カードの下書き。プレビュー画面で名前・レア度などを直してから登録する
export function candidateToCardDraft(candidate) {
    const habitatInfo = habitatFromText(candidate.habitat);
    const rarity = candidate.rarity || {};

    return {
        name: (candidate.name_ja || "").trim(),
        level: levelFromTrophicLevel(candidate.trophic_level),
        rarity: RARITY_BY_TIER[rarity.tier] || "D",
        habitat: habitatInfo.habitat,
        terrain: habitatInfo.terrain,
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
        habitatTextEn: candidate.habitat_en || "",
        description: candidate.description_for_kids || "",
        descriptionEn: candidate.description_for_kids_en || "",
        isDangerous: Boolean(candidate.is_dangerous),
        dangerNote: candidate.danger_note || "",
        dangerNoteEn: candidate.danger_note_en || "",
        rarityValue: typeof rarity.value === "number" ? rarity.value : null,
        rarityReason: rarity.reason || "",
        rarityReasonEn: rarity.reason_en || "",
        rarityTierLabelEn: rarity.tier_label_en || "",
        // 9地方それぞれに生息するか（{ hokkaido: true, ... }）
        distribution: candidate.distribution || null,
        regions: regionsFromDistribution(candidate.distribution),
        confidence: typeof candidate.confidence === "number" ? candidate.confidence : null
    };
}

// 登録前の入力チェック。問題があれば、画面に出す文章を返す（問題が無ければ空文字）
export function validateCardDraft(draft) {
    const name = (draft.name || "").trim();
    if (!name) return { ja: "なまえを入れてね", en: "Please enter a name" };
    if (name.length > CARD_NAME_MAX_LENGTH) {
        return { ja: `なまえは${CARD_NAME_MAX_LENGTH}もじまでだよ`, en: `The name can be up to ${CARD_NAME_MAX_LENGTH} characters` };
    }
    return null;
}
