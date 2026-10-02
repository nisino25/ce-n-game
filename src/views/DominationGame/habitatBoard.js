// ■すみか（海・町・森）に合わせた陣取りゲームの盤面をつくる（試作）
//   「地図の六角形＝その街の場所」にしたとき、場所のすみかで盤面の地形の割合・かたちが変わるようにするためのもの。
//   いまのゲーム（DominationGame.vue の generateTiles）は、どの場所でも同じ作り方（ランダム）。
//   盤面の大きさ・地形の種類は DominationGame と同じ（town / forest / river / sea / dirt / undeveloped）。

export const AREA_COLORS = {
    town: "#B88E66",
    forest: "#768F7C",
    dirt: "#C2B5A6",
    river: "#8FAFBD",
    sea: "#5E7F9B",
    undeveloped: "#666666"
};

export const AREA_LABELS = {
    town: "町",
    forest: "森",
    dirt: "土",
    river: "川",
    sea: "海",
    undeveloped: "未開発地"
};

// すみかごとの地形の割合（合計1）と、海の置き方・川の本数
export const HABITATS = {
    sea: {
        label: "海",
        weights: { sea: 0.5, dirt: 0.14, town: 0.14, forest: 0.1, river: 0.04, undeveloped: 0.08 },
        seaEdges: 1, // 1辺を海にして、海岸のような盤面にする
        rivers: 1
    },
    town: {
        label: "町",
        weights: { town: 0.52, dirt: 0.1, forest: 0.12, river: 0.06, sea: 0.06, undeveloped: 0.14 },
        seaEdges: 0,
        rivers: 2
    },
    forest: {
        label: "森",
        weights: { forest: 0.58, dirt: 0.14, river: 0.08, town: 0.08, undeveloped: 0.12, sea: 0 },
        seaEdges: 0,
        rivers: 2
    },
    // 以下は地図の「場所」のすみかとして使う（田んぼ・湿原＝土、川・湖＝川）
    dirt: {
        label: "土",
        weights: { dirt: 0.42, undeveloped: 0.16, forest: 0.14, town: 0.12, river: 0.1, sea: 0.06 },
        seaEdges: 0,
        rivers: 2
    },
    river: {
        label: "川",
        weights: { forest: 0.24, dirt: 0.18, town: 0.18, undeveloped: 0.14, sea: 0.1, river: 0.16 },
        seaEdges: 0,
        rivers: 4
    }
};

// ふつうの盤面の地形の割合（すみかの影響がないときの基準）
export const BASE_WEIGHTS = { town: 0.26, forest: 0.24, dirt: 0.14, river: 0.08, sea: 0.14, undeveloped: 0.14 };

// ■場所のゲーム用：すみかの影響は「少しだけ」。基準の割合に、すみかの割合を influence の分だけ混ぜる
//   （influence=0.4 なら、海の場所でも海は2〜3割ほどで、ほかの地形もちゃんと残る）
export const SPOT_INFLUENCE = 0.4;

// 同じseedなら同じ盤面になる乱数（比較のときに、押すたびに変わらないようにする）
export function createRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ■場所のゲーム用の盤面。すみかの影響を少しだけ混ぜて、seedごとに別の盤面にする（同じseedなら何度でも同じ盤面）
export function generateSpotBoard(habitat, { rows = 15, cols = 30, seed = 1, influence = SPOT_INFLUENCE } = {}) {
    const config = HABITATS[habitat];
    if (!config) return generateHabitatBoard(habitat, { rows, cols, seed });
    const weights = {};
    Object.keys(BASE_WEIGHTS).forEach(area => {
        weights[area] = (1 - influence) * BASE_WEIGHTS[area] + influence * (config.weights[area] || 0);
    });
    return generateHabitatBoard(habitat, {
        rows, cols, seed,
        weights,
        seaEdges: config.seaEdges ? 1 : seed % 2, // 海の場所は1辺が海。ほかも盤面ごとに、海のある盤面とない盤面が混ざる
        rivers: config.rivers
    });
}

export function generateHabitatBoard(habitat, { rows = 15, cols = 30, seed = 1, weights, seaEdges, rivers } = {}) {
    const base = HABITATS[habitat] || HABITATS.town;
    const config = {
        weights: weights || base.weights,
        seaEdges: seaEdges === undefined ? base.seaEdges : seaEdges,
        rivers: rivers === undefined ? base.rivers : rivers
    };
    const rng = createRng(seed);
    const total = rows * cols;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

    const neighbors = (r, c) => [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols);
    const pick = list => list[Math.floor(rng() * list.length)];

    // 1. 地形ごとの目標のマス数
    const target = {};
    Object.entries(config.weights).forEach(([area, weight]) => {
        if (weight > 0) target[area] = Math.round(weight * total);
    });
    const remaining = { ...target };
    const cells = {}; // 地形ごとの、広げられるマス
    Object.keys(target).forEach(area => { cells[area] = []; });

    const claim = (area, r, c) => {
        grid[r][c] = area;
        cells[area].push([r, c]);
        remaining[area]--;
    };

    // 2. 種（海は指定の辺から、そのほかはランダムな場所から）
    if (config.seaEdges && target.sea) {
        const edge = Math.floor(rng() * 4);
        const seeds = Math.max(3, Math.floor((edge < 2 ? cols : rows) * 0.3));
        for (let i = 0; i < seeds; i++) {
            const r = edge === 0 ? 0 : edge === 1 ? rows - 1 : Math.floor(rng() * rows);
            const c = edge === 2 ? 0 : edge === 3 ? cols - 1 : Math.floor(rng() * cols);
            if (!grid[r][c]) claim("sea", r, c);
        }
    }
    Object.keys(target).forEach(area => {
        if (area === "river") return; // 川は最後に線として引く
        const seedCount = area === "sea" ? 0 : Math.max(2, Math.round(target[area] / 60));
        for (let i = 0; i < seedCount; i++) {
            const r = Math.floor(rng() * rows);
            const c = Math.floor(rng() * cols);
            if (!grid[r][c]) claim(area, r, c);
        }
    });

    // 3. 目標の残りが多い地形ほど選ばれやすいようにして、となりの空きマスへ広げる
    let guard = total * 40;
    while (guard-- > 0) {
        const open = Object.keys(cells).filter(area => area !== "river" && remaining[area] > 0 && cells[area].some(([r, c]) => neighbors(r, c).some(([nr, nc]) => !grid[nr][nc])));
        if (!open.length) break;
        const weightSum = open.reduce((sum, area) => sum + remaining[area], 0);
        let roll = rng() * weightSum;
        const area = open.find(a => (roll -= remaining[a]) < 0) || open[0];
        const frontier = cells[area].filter(([r, c]) => neighbors(r, c).some(([nr, nc]) => !grid[nr][nc]));
        const [r, c] = pick(frontier);
        const [nr, nc] = pick(neighbors(r, c).filter(([x, y]) => !grid[x][y]));
        claim(area, nr, nc);
    }

    // 4. 余った空きマスは、まわりに一番多い地形で埋める
    for (let pass = 0; pass < total; pass++) {
        let changed = false;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c]) continue;
                const around = neighbors(r, c).map(([nr, nc]) => grid[nr][nc]).filter(Boolean);
                if (!around.length) continue;
                const counts = {};
                around.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
                grid[r][c] = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
                changed = true;
            }
        }
        if (!changed) break;
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) grid[r][c] = "dirt";
        }
    }

    // 5. 川：ふちから反対側へ、ゆるく曲がりながら引く（海は上書きしない）
    for (let i = 0; i < config.rivers; i++) {
        const horizontal = rng() < 0.5;
        let r = horizontal ? Math.floor(rng() * rows) : 0;
        let c = horizontal ? 0 : Math.floor(rng() * cols);
        const steps = horizontal ? cols : rows;
        for (let s = 0; s < steps * 1.4; s++) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) break;
            if (grid[r][c] !== "sea") grid[r][c] = "river";
            if (rng() < 0.3) {
                if (horizontal) r += rng() < 0.5 ? -1 : 1;
                else c += rng() < 0.5 ? -1 : 1;
            } else if (horizontal) c++;
            else r++;
        }
    }

    // 6. ゲームと同じ形（id・row・col・area）の配列にして返す
    const tiles = [];
    let id = 1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            tiles.push({ id: id++, row: r, col: c, area: grid[r][c] });
        }
    }
    return tiles;
}

// 地形ごとのマス数と割合
export function summarizeBoard(tiles) {
    const counts = {};
    tiles.forEach(tile => { counts[tile.area] = (counts[tile.area] || 0) + 1; });
    return Object.entries(counts)
        .map(([area, count]) => ({ area, count, percent: Math.round((count / tiles.length) * 100) }))
        .sort((a, b) => b.count - a.count);
}
