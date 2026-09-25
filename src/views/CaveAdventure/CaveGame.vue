<template>
  <div class="top-info absolute top-8 left-8 text-white text-lg font-bold z-10">
    <!-- ■追加：出口ゲート -->
    <div id="returnGate" @click="returnHome">
        ◉
        <div>ダンジョン出口</div>
    </div>
    <!-- ■追加：他洞窟へのワープ -->
    <div id="forestWarpGate" @click="warpToNextDungeon">
        ◉
        <div>他洞窟への<br>ワープ</div>
    </div>
  </div>

    <div v-if="areaInfo" class="keyCount absolute top-4 right-4 text-white text-lg font-bold z-10">
      <span class="key-badge" :style="{ background: areaInfo.keyColor }">🔑</span>
      {{ areaInfo.name }}のカギ：<span :key="keyBumpId" class="key-count-num" :class="{ bump: keyBumpId > 0, lose: keyBumpLose }">{{ keyCount }}</span>本

        <!-- ■洞窟エンブレム（エリアに応じて固定） -->
        <img
            :src="areaInfo.emblem"
            :alt="areaInfo.name"
            class="w-[180px] h-[80px] object-contain mt-2"
        />

        <!-- ■この洞窟のアイコンの見方（エリアごとに変わる）。スマホ幅では迷路の下に表示 -->
        <ul class="legend legend-side">
            <li v-for="item in legendItems" :key="item.label">
                <span class="legend-icon" :class="item.badgeClass" :style="item.badgeStyle">{{ item.icon }}</span>
                {{ item.label }}
            </li>
        </ul>
    </div>

    <!-- ■カギを取ったときの演出（取ったマスの上に表示） -->
    <div
        v-for="pop in keyPops"
        :key="pop.id"
        class="key-pop"
        :style="{ left: pop.x + 'px', top: pop.y + 'px', fontSize: pop.size + 'px' }"
    >
        <span class="key-pop-ring" :class="{ 'hit-ring': pop.hit }"></span>
        <span class="key-pop-icon">{{ pop.icon }}</span>
        <span v-if="pop.text" class="key-pop-text" :class="{ 'lose-text': pop.hit }">{{ pop.text }}</span>
    </div>

    <!-- Warp -->
    <div ref="warp" id="warpEffect"></div>

    <!-- ■敵にぶつかったときの赤いフラッシュ -->
    <div v-if="hitFlashId" :key="hitFlashId" class="hit-flash"></div>

    <!-- wrap all page -->
    <div ref="mazeWrap" class="bg-[#111] w-full h-auto">
        <!-- Canvas -->
        <canvas ref="canvas" class="mx-auto"></canvas>

        <ul v-if="areaInfo" class="legend legend-bottom">
            <li v-for="item in legendItems" :key="item.label">
                <span class="legend-icon" :class="item.badgeClass" :style="item.badgeStyle">{{ item.icon }}</span>
                {{ item.label }}
            </li>
        </ul>
    </div>

</template>

<script>
import {
    CAVE_AREAS,
    CAVE_AREA_IDS,
    loadCaveKeys,
    saveCaveKeys,
    saveLastCaveArea,
    takeNextCaveArea
} from "./caveAreas.js";

// ■敵の動き
const ENEMY_DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const ENEMY_WANDER_INTERVAL = 650; // うろうろ中の移動間隔(ms)
const ENEMY_CHASE_INTERVAL = 400; // 追いかけ中の移動間隔(ms)
const ENEMY_SIGHT_RANGE = 7; // 壁にさえぎられずにまっすぐ見通せる距離（マス）
const ENEMY_LOSE_TIME = 3000; // 見えなくなってからこの時間(ms)で見失う
const ENEMY_STUN_TIME = 2000; // ぶつかった後に敵が止まる時間(ms)

// ■効果音：音声ファイルを使わず Web Audio API で鳴らす
let audioCtx = null;

const getAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
};

export default {

    data() {

        return {

            canvas: null,
            ctx: null,

            CELL: 0,

            COLS: 15,
            ROWS: 25,
            caveKeys: {},  // ■エリアごとのカギ保有数（caveAreas.js）

            home: {
                r: 1,
                c: 1
            },

            goal: {
                r: 23,
                c: 13
            },

            maze: [],
            items: [],
            enemies: [],

            player: null,

            enemyAppeared: false,
            enemyMoveCounter: 0,
            
            // ■追加：木処理
            stage: "cave",
            forestGate: {},

            // ■現在の洞窟のエリア（kanagawa / hokkaido / kyoto）。洞窟の色（ステージ）はエリアで固定
            area: "",

            // ■追加：ステージの色設定と対応アイコン
            stageData: {
                cave: { 
                    wall: "#555",
                    floor: "#111",
                    gateIcon: "🪙"
                },
                forest: {
                    wall: "#2f6b2f",
                    floor: "#8fd15b",
                    gateIcon: "🌳"
                },
                water: { 
                    wall: "#0d5fb8",
                    floor: "#9fdcff",
                    gateIcon: "🐟"
                },
                air: { 
                    wall: "#8EA8C7",
                    floor: "#DFF5FF",
                    gateIcon: "🐦"
                }
            },
            playerMoveCounter: 0,

            // ■カギ取得・敵ヒットの演出
            keyPops: [],
            hitFlashId: 0,
            invincibleUntil: 0,
            isWarping: false,
            keyPopSeq: 0,
            keyBumpId: 0,
            keyBumpLose: false, // true: カギが減ったとき（赤く弾む）
        };

    },

    mounted() {

        this.canvas = this.$refs.canvas;
        this.ctx = this.canvas.getContext("2d");
        // ■エリアごとのカギ数を読み込む
        this.caveKeys = loadCaveKeys();


        this.resize();

        window.addEventListener(
            "resize",
            this.resize
        );

        this.canvas.addEventListener(
            "pointermove",
            this.handlePointerMove
        );

        // ブラウザは操作があるまで音を鳴らせないため、タップ/クリック時に音声を有効化しておく
        this.canvas.addEventListener(
            "pointerdown",
            getAudioContext
        );

        this.loadAvatar();

        // 洞窟の入口で選んだエリアで始める（選ばれていなければランダム）
        this.resetGame(takeNextCaveArea());

        // ■敵はプレイヤーの操作と関係なく、一定間隔で動かす
        this.enemyTimer = setInterval(this.enemyTick, 100);

    },

    beforeUnmount() {

        window.removeEventListener(
            "resize",
            this.resize
        );

        this.canvas.removeEventListener(
            "pointermove",
            this.handlePointerMove
        );

        this.canvas.removeEventListener(
            "pointerdown",
            getAudioContext
        );

        clearInterval(this.enemyTimer);

    },

    methods: {

        // ■エリアをランダムに選び、洞窟のタイプ（色）もエリアに合わせて固定する
        // exclude を指定すると、そのエリア以外から選ぶ（ワープ時に同じエリアにならないように）
        // target を指定すると、そのエリアにする
        selectArea(exclude, target) {
            if (CAVE_AREAS[target]) {
                this.area = target;
            } else {
                const candidates = CAVE_AREA_IDS.filter(id => id !== exclude);
                this.area = candidates[Math.floor(Math.random() * candidates.length)];
            }
            this.stage = CAVE_AREAS[this.area].stage;
        },

        returnHome() {

            const warp = this.$refs.warp;
            if (warp) {
                warp.style.width = "300vmax";
                warp.style.height = "300vmax";
            }

            setTimeout(() => {
                // this.$router.back();
                this.$router.push({ name: 'CaveEntrance' });
            }, 600);

        },

        resize() {

            this.CELL = Math.min(
                window.innerWidth / this.COLS,
                window.innerHeight / this.ROWS
            );

            this.canvas.width = this.CELL * this.COLS;
            this.canvas.height = this.CELL * this.ROWS;

        },

        resetGame(areaId) {
            this.selectArea(null, areaId);

            this.createMaze();
            this.createForestGate();

            this.createItems();

            this.enemies = [];

            this.enemyAppeared = false;

            this.enemyMoveCounter = 0;

            this.player = {
                r: 1,
                c: 1
            };
            this.playerMoveCounter = 0;

            this.draw();

        },

        createMaze() {

            this.maze = Array.from(

                {
                    length: this.ROWS
                },

                () => Array(this.COLS).fill(1)

            );

            const dig = (r, c) => {

                this.maze[r][c] = 0;

                const dirs = [

                    [0, 1],
                    [1, 0],
                    [0, -1],
                    [-1, 0]

                ].sort(() => Math.random() - 0.5);

                dirs.forEach(([dr, dc]) => {

                    const nr = r + dr * 2;
                    const nc = c + dc * 2;

                    if (

                        nr > 0 &&
                        nr < this.ROWS - 1 &&
                        nc > 0 &&
                        nc < this.COLS - 1 &&
                        this.maze[nr][nc]

                    ) {

                        this.maze[r + dr][c + dc] = 0;

                        dig(nr, nc);

                    }

                });

            };

            dig(1, 1);

        },
        // ■追加：ステージ間ゲート変更
        createForestGate() {
            let r, c;

            do {
                r = Math.floor(Math.random() * this.ROWS);
                c = Math.floor(Math.random() * this.COLS);
            } while (
                this.maze[r][c] ||
                (r === 1 && c === 1) ||
                (r === this.goal.r && c === this.goal.c)
            );

            this.forestGate = { r, c };
        },
        //  -----

        createItems() {

            const colors = [

                "red",
                "blue",
                "yellow",
                "green"

            ];

            this.items = [];

            colors.forEach(color => {

                let r;
                let c;

                do {

                    r = Math.floor(
                        Math.random() * this.ROWS
                    );

                    c = Math.floor(
                        Math.random() * this.COLS
                    );

                } while (

                    this.maze[r][c] ||

                    (
                        r === 1 &&
                        c === 1
                    ) ||

                    (
                        r === this.goal.r &&
                        c === this.goal.c
                    )

                );

                this.items.push({

                    r,
                    c,
                    color,

                    get: false

                });

            });

        },

        // ■敵の出現：プレイヤーから離れた通路に出す（いきなり隣に出ないように）
        spawnEnemy() {
            const candidates = [];

            for (let r = 0; r < this.ROWS; r++) {
                for (let c = 0; c < this.COLS; c++) {
                    if (this.maze[r][c]) continue;
                    if (Math.abs(r - this.player.r) + Math.abs(c - this.player.c) < 8) continue;
                    if (this.nearGoal(r, c) || this.nearRemainingKey(r, c)) continue;
                    if (this.enemies.some(e => e.r === r && e.c === c)) continue;
                    candidates.push({ r, c });
                }
            }

            if (!candidates.length) return;

            const { r, c } = candidates[Math.floor(Math.random() * candidates.length)];

            this.enemies.push({
                r,
                c,
                dir: [0, 0],
                mode: "wander", // wander（うろうろ） | chase（見つけて追いかける）
                nextMoveAt: Date.now() + 800,
                lastSeenAt: 0,
                stunnedUntil: 0,
                bubble: null, // 頭の上の「❗」「❓」
                bubbleUntil: 0
            });
        },

        // ■プレイヤーから各マスまでの迷路上の距離（幅優先探索）
        distancesFromPlayer() {
            const dist = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(Infinity));
            const queue = [[this.player.r, this.player.c]];
            dist[this.player.r][this.player.c] = 0;

            while (queue.length) {
                const [r, c] = queue.shift();
                for (const [dr, dc] of ENEMY_DIRS) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (this.maze[nr]?.[nc] !== 0 || dist[nr][nc] !== Infinity) continue;
                    dist[nr][nc] = dist[r][c] + 1;
                    queue.push([nr, nc]);
                }
            }

            return dist;
        },

        canEnemyEnter(enemy, r, c) {
            if (this.maze[r]?.[c] !== 0) return false;
            if (this.nearGoal(r, c)) return false;
            if (this.nearRemainingKey(r, c)) return false;
            if (this.enemies.some(e => e !== enemy && e.r === r && e.c === c)) return false;
            return true;
        },

        // ■敵からプレイヤーが見えるか：同じ行か列で、間に壁がなく、一定距離以内
        canSeePlayer(enemy) {
            const { r, c } = enemy;
            const { r: pr, c: pc } = this.player;
            if (r !== pr && c !== pc) return false;

            const distance = Math.abs(r - pr) + Math.abs(c - pc);
            if (distance > ENEMY_SIGHT_RANGE) return false;

            const dr = Math.sign(pr - r);
            const dc = Math.sign(pc - c);
            for (let i = 1; i < distance; i++) {
                if (this.maze[r + dr * i][c + dc * i]) return false;
            }
            return true;
        },

        setBubble(enemy, bubble) {
            enemy.bubble = bubble;
            enemy.bubbleUntil = Date.now() + 900;
        },

        // ■うろうろ：通路はまっすぐ進み、分かれ道で曲がる。行き止まりなら引き返す
        wanderStep(enemy) {
            const [dr, dc] = enemy.dir;
            const options = ENEMY_DIRS.filter(([ddr, ddc]) => this.canEnemyEnter(enemy, enemy.r + ddr, enemy.c + ddc));
            if (!options.length) return null;

            const forward = options.find(([ddr, ddc]) => ddr === dr && ddc === dc);
            const turns = options.filter(([ddr, ddc]) => !(ddr === -dr && ddc === -dc));

            // まっすぐ行ける一本道ならそのまま進む
            if (forward && turns.length === 1) return forward;

            const choices = turns.length ? turns : options;
            return choices[Math.floor(Math.random() * choices.length)];
        },

        // ■追いかける：迷路の最短ルートでプレイヤーに近づく
        chaseStep(enemy, dist) {
            const here = dist[enemy.r][enemy.c];
            const step = ENEMY_DIRS.find(([dr, dc]) =>
                dist[enemy.r + dr]?.[enemy.c + dc] < here &&
                this.canEnemyEnter(enemy, enemy.r + dr, enemy.c + dc)
            );
            return step || this.wanderStep(enemy);
        },

        enemyTick() {
            if (!this.enemies.length || this.isWarping || !this.maze.length) return;

            const now = Date.now();
            let changed = now < this.invincibleUntil; // 無敵中は点滅させるため毎回描き直す
            let moved = false;
            let dist = null;

            this.enemies.forEach(enemy => {
                if (enemy.bubble && now >= enemy.bubbleUntil) {
                    enemy.bubble = null;
                    changed = true;
                }

                // 見つかったら追いかけてくる。見えない時間が続くと見失う
                if (this.canSeePlayer(enemy)) {
                    enemy.lastSeenAt = now;
                    if (enemy.mode === "wander" && now >= enemy.stunnedUntil) {
                        enemy.mode = "chase";
                        enemy.nextMoveAt = Math.min(enemy.nextMoveAt, now + 250);
                        this.setBubble(enemy, "❗");
                        this.playNoticeSound();
                        changed = true;
                    }
                } else if (enemy.mode === "chase" && now - enemy.lastSeenAt > ENEMY_LOSE_TIME) {
                    enemy.mode = "wander";
                    this.setBubble(enemy, "❓");
                    changed = true;
                }

                if (now < enemy.nextMoveAt || now < enemy.stunnedUntil) return;

                dist = dist || this.distancesFromPlayer();

                const step = enemy.mode === "chase"
                    ? this.chaseStep(enemy, dist)
                    : this.wanderStep(enemy);

                if (step) {
                    enemy.r += step[0];
                    enemy.c += step[1];
                    enemy.dir = step;
                    moved = true;
                }

                enemy.nextMoveAt = now + (enemy.mode === "chase" ? ENEMY_CHASE_INTERVAL : ENEMY_WANDER_INTERVAL);
                changed = true;
            });

            // 敵が動いたときだけ当たり判定（止まっている敵に重なり続けても連続ヒットしない）
            if (moved && this.checkEnemyHit()) return;
            if (changed) this.draw();
        },

        // ■敵とぶつかったら、いまのエリアのカギが1本へる（カギが無ければスタートに戻る）
        checkEnemyHit() {
            const hitEnemy = this.enemies.find(e => e.r === this.player.r && e.c === this.player.c);
            if (!hitEnemy || Date.now() < this.invincibleUntil) return false;

            const now = Date.now();
            this.invincibleUntil = now + ENEMY_STUN_TIME;
            this.playHitSound();
            this.hitFlashId++;

            // 画面を揺らす（毎回アニメーションをやり直す）
            const mazeWrap = this.$refs.mazeWrap;
            mazeWrap.classList.remove("hit-shake");
            void mazeWrap.offsetWidth;
            mazeWrap.classList.add("hit-shake");

            // ぶつかった敵はしばらく目を回して止まる
            hitEnemy.mode = "wander";
            hitEnemy.stunnedUntil = now + ENEMY_STUN_TIME;
            hitEnemy.bubble = "💫";
            hitEnemy.bubbleUntil = now + ENEMY_STUN_TIME;

            if (this.caveKeys[this.area] > 0) {
                this.caveKeys[this.area]--;
                saveCaveKeys(this.caveKeys);
                this.showPop(this.player.r, this.player.c, { icon: "🔑", text: "-1", hit: true });
                this.keyBumpId++;
                this.keyBumpLose = true;
            } else {
                this.showPop(this.player.r, this.player.c, { icon: "💥", hit: true });
                this.player = { r: 1, c: 1 };
            }

            this.draw();
            return true;
        },

      moveTo(x, y) {

          if (this.isWarping) {
              return;
          }

          const targetCol = Math.floor(x / this.CELL);
          const targetRow = Math.floor(y / this.CELL);

          let dc = targetCol - this.player.c;
          let dr = targetRow - this.player.r;

          if (Math.abs(dc) > Math.abs(dr)) {

              dc = Math.sign(dc);
              dr = 0;

          } else {

              dr = Math.sign(dr);
              dc = 0;

          }

          const nr = this.player.r + dr;
          const nc = this.player.c + dc;

          if (this.maze[nr]?.[nc]) {
              return;
          }

          // プレイヤーが別のマスに移動していない場合は処理しない
          if (nr === this.player.r && nc === this.player.c) {
              return;
          }

          if (
              nr === this.goal.r &&
              nc === this.goal.c &&
              this.items.filter(i => i.get).length === 0
          ) {
              return;
          }

          this.player = {
              r: nr,
              c: nc
          };

          this.playerMoveCounter++;

          // ■追加：木ゲートから別ステージへワープ
          if (
              this.player.r === this.forestGate.r &&
              this.player.c === this.forestGate.c
          ) {
              this.warpToNextDungeon();
              return;
          }
          // ------------

          if (
              this.playerMoveCounter > 1 &&
              this.player.r === this.home.r &&
              this.player.c === this.home.c
          ) {

              this.returnHome();

              // this.resetGame();

              return;

          }

          this.items.forEach(item => {

              if (
                  !item.get &&
                  item.r === nr &&
                  item.c === nc
              ) {

                  item.get = true;

                  // ■いまのエリアのカギとして確保
                  this.caveKeys[this.area]++;
                  saveCaveKeys(this.caveKeys);

                  this.playKeySound();
                  this.showKeyPop(item.r, item.c);

                  // ■カギ2本目で1体目、3本目で2体目の敵が出る
                  const gotKeys = this.items.filter(i => i.get).length;

                  if (gotKeys === 2 && !this.enemyAppeared) {
                      this.enemyAppeared = true;
                      this.spawnEnemy();
                  } else if (gotKeys === 3 && this.enemies.length < 2) {
                      this.spawnEnemy();
                  }

              }

          });

          // 自分から敵にぶつかった場合
          if (this.checkEnemyHit()) {
              return;
          }

          if (
              this.player.r === this.goal.r &&
              this.player.c === this.goal.c
          ) {

              sessionStorage.setItem(

                  "gameState",

                  JSON.stringify({
                      player: this.player,
                      items: this.items,
                      enemies: this.enemies,
                      enemyAppeared: this.enemyAppeared,
                      enemyMoveCounter: this.enemyMoveCounter

                  })

              );

              // ■宝箱画面で、このエリアのカギを使うようにする
              saveLastCaveArea(this.area);

              // ■カギ数はlocalStorageの"caveKeys"で管理しているため、URLには載せない
              this.$router.push("./cave-end");

              return;

          }

          this.draw();

      },

      // ■追加：ステージ間ワープ
      warpToNextDungeon() {
          const warp = this.$refs.warp;
          this.isWarping = true;

          if (warp) {
              warp.style.width = "300vmax";
              warp.style.height = "300vmax";
          }

          setTimeout(() => {

              // ■別エリアの洞窟へ（洞窟の色もそのエリアのものに切り替わる）
              this.selectArea(this.area);

              this.createMaze();
              this.createForestGate();
              this.createItems();

              this.enemies = [];
              this.enemyAppeared = false;
              this.enemyMoveCounter = 0;

              // ■迷路は毎回作り直すため、固定座標だと壁の中に出てしまうことがある。
              // 通路のマスからランダムに出現位置を選ぶ
              const next = this.randomSpawnPoint();
              this.player.r = next.r;
              this.player.c = next.c;

              if (warp) {
                  warp.style.width = "0";
                  warp.style.height = "0";
              }

              this.isWarping = false;
              this.draw();

          }, 700);
      },
      // -----------

      // ■カギ取得音：高い音を3つ続けて「キラーン」
      playKeySound() {
          const ctx = getAudioContext();
          if (!ctx) return;

          const now = ctx.currentTime;
          [[1318.5, 0], [1975.5, 0.07], [2637, 0.14]].forEach(([freq, delay]) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "triangle";
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.0001, now + delay);
              gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.4);
              osc.connect(gain).connect(ctx.destination);
              osc.start(now + delay);
              osc.stop(now + delay + 0.45);
          });
      },

      // ■カギ取得の演出：取ったマスからカギが飛び出して消える＋右上の本数が弾む
      showKeyPop(r, c) {
          this.showPop(r, c, { icon: "🔑", text: "+1" });
          this.keyBumpId++;
          this.keyBumpLose = false;
      },

      // マスの上にアイコンを飛び出させる演出（カギ取得・敵ヒット共通）
      showPop(r, c, { icon, text = "", hit = false }) {
          const rect = this.canvas.getBoundingClientRect();
          const id = ++this.keyPopSeq;

          this.keyPops.push({
              id,
              icon,
              text,
              hit,
              x: rect.left + (c + 0.5) * this.CELL,
              y: rect.top + (r + 0.5) * this.CELL,
              size: Math.max(22, this.CELL)
          });

          setTimeout(() => {
              this.keyPops = this.keyPops.filter(pop => pop.id !== id);
          }, 1000);
      },

      // ■敵に気づかれた音：短く2回「ピピッ」
      playNoticeSound() {
          const ctx = getAudioContext();
          if (!ctx) return;

          const now = ctx.currentTime;
          [[880, 0], [1175, 0.09]].forEach(([freq, delay]) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "square";
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.0001, now + delay);
              gain.gain.exponentialRampToValueAtTime(0.08, now + delay + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);
              osc.connect(gain).connect(ctx.destination);
              osc.start(now + delay);
              osc.stop(now + delay + 0.1);
          });
      },

      // ■敵にぶつかった音：低い音が下がっていく「ブブッ」
      playHitSound() {
          const ctx = getAudioContext();
          if (!ctx) return;

          const now = ctx.currentTime;
          [[0, 0.16], [0.18, 0.28]].forEach(([delay, length]) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(320, now + delay);
              osc.frequency.exponentialRampToValueAtTime(90, now + delay + length);
              gain.gain.setValueAtTime(0.0001, now + delay);
              gain.gain.exponentialRampToValueAtTime(0.2, now + delay + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + length);
              osc.connect(gain).connect(ctx.destination);
              osc.start(now + delay);
              osc.stop(now + delay + length + 0.02);
          });
      },

      // ■ワープ後の出現位置：通路で、スタート・ゴール・ワープゲート・カギと重ならないマス
      randomSpawnPoint() {
          const candidates = [];

          for (let r = 0; r < this.ROWS; r++) {
              for (let c = 0; c < this.COLS; c++) {
                  if (this.maze[r][c]) continue;
                  if (r === this.home.r && c === this.home.c) continue;
                  if (r === this.goal.r && c === this.goal.c) continue;
                  if (r === this.forestGate.r && c === this.forestGate.c) continue;
                  if (this.items.some(item => item.r === r && item.c === c)) continue;

                  candidates.push({ r, c });
              }
          }

          return candidates[Math.floor(Math.random() * candidates.length)];
      },

      handlePointerMove(e) {
          const rect = this.canvas.getBoundingClientRect();
          this.moveTo( e.clientX - rect.left, e.clientY - rect.top);
      },

      draw() {

          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          // 現在のステージ設定を取得
          const currentStageInfo = this.stageData[this.stage] || this.stageData.cave;

          // Maze
          for (let r = 0; r < this.ROWS; r++) {

              for (let c = 0; c < this.COLS; c++) {    

                  this.ctx.fillStyle =
                      this.maze[r][c] ? currentStageInfo.wall : currentStageInfo.floor;

                  this.ctx.fillRect(
                      c * this.CELL,
                      r * this.CELL,
                      this.CELL,
                      this.CELL
                  );
                  // -------------
                  // this.ctx.fillStyle = this.maze[r][c] ? "#555" : "#111";
                  // this.ctx.fillRect(c * this.CELL, r * this.CELL, this.CELL, this.CELL);
              }

          }

          // Home
          const homeX =this.home.c * this.CELL + this.CELL / 2;
          const homeY =this.home.r * this.CELL + this.CELL / 2;

          this.ctx.font = `${this.CELL * 0.8}px serif`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";

          this.ctx.fillText("🏛️",homeX, homeY);

          // ■修正：ワープゲート
          if (this.forestGate.r !== undefined) {
              const gateX =
                  this.forestGate.c * this.CELL + this.CELL / 2;
              const gateY =
                  this.forestGate.r * this.CELL + this.CELL / 2;

              this.ctx.font = `${this.CELL * 0.8}px serif`;
              this.ctx.fillText(currentStageInfo.gateIcon, gateX, gateY);
          }
          // ---------

          // Goal
          const goalX = this.goal.c * this.CELL + this.CELL / 2;
          const goalY = this.goal.r * this.CELL + this.CELL / 2;

          this.ctx.font = `${this.CELL * 0.9}px serif`;

          if (
              this.items.filter(item => item.get).length >= 1
          ) {
              this.ctx.fillText("🎁", goalX, goalY);
          } else {
              this.ctx.fillText("🔒", goalX,goalY);
          }

          // Keys
          this.items.forEach(item => {

              if (item.get) {
                  return;
              }

              const x = item.c * this.CELL + this.CELL / 2;

              const y = item.r * this.CELL + this.CELL / 2;

              this.ctx.font = `${this.CELL * 0.75}px serif`;

              this.ctx.fillText( "🔑", x, y);

          });

          // Enemies
          this.enemies.forEach(enemy => {
              const x = enemy.c * this.CELL + this.CELL / 2;
              const y = enemy.r * this.CELL + this.CELL / 2;

              this.ctx.font = `${this.CELL * 0.8}px serif`;

              this.ctx.fillText("🎃", x, y);

              // 気づいた「❗」・見失った「❓」
              if (enemy.bubble) {
                  this.ctx.font = `${this.CELL * 0.6}px serif`;
                  this.ctx.fillText(enemy.bubble, x + this.CELL * 0.35, y - this.CELL * 0.6);
              }

          });

          // Player
          const playerX = this.player.c * this.CELL + this.CELL / 2;
          const playerY = this.player.r * this.CELL + this.CELL / 2;

          // アバター画像は一度だけ作って使い回す（毎回作ると描画が遅れて残像が出るため）
          if (!this.avatarImg || !this.avatarImg.complete) return;

          const size = this.CELL * 0.9;

          // 敵にぶつかった直後の無敵中は点滅させる
          const blinking = Date.now() < this.invincibleUntil && Math.floor(Date.now() / 120) % 2 === 0;
          this.ctx.globalAlpha = blinking ? 0.25 : 1;

          this.ctx.imageSmoothingEnabled = true;
          this.ctx.imageSmoothingQuality = "high";

          this.ctx.drawImage(
              this.avatarImg,
              playerX - size / 2,
              playerY - size / 2,
              size,
              size
          );

          this.ctx.globalAlpha = 1;

      },
      loadAvatar() {
          const currentPlayerData = JSON.parse(localStorage.getItem("playerData"));
          const avatarSvg = this.$buildAvatar(currentPlayerData?.avatar);
          const highResSvg = avatarSvg.replace(
              "<svg",
              '<svg width="300" height="300"'
          );

          const avatarImg = new Image();
          avatarImg.onload = () => this.draw();
          avatarImg.src =
              `data:image/svg+xml;charset=utf-8,${encodeURIComponent(highResSvg)}`;
          this.avatarImg = avatarImg;
      },

      nearGoal(r, c) {

          return (

              Math.abs(r - this.goal.r) +
              Math.abs(c - this.goal.c)

          ) <= 1;

      },
      // ■まだ取っていないカギの上・となりには敵が入れない（カギの前で待ちぶせさせない）
      nearRemainingKey(r, c) {

          return this.items.some(item =>
              !item.get &&
              Math.abs(r - item.r) + Math.abs(c - item.c) <= 1
          );

      },
    },

    computed: {
        areaInfo() {
            return CAVE_AREAS[this.area] || null;
        },

        keyCount() {
            return this.caveKeys[this.area] || 0;
        },

        legendItems() {
            if (!this.areaInfo) return [];
            return [
                { icon: "🔑", label: `カギ（${this.areaInfo.name}）` },
                { icon: "🎃", label: "てき" },
                { icon: (this.stageData[this.stage] || this.stageData.cave).gateIcon, label: "ワープ" },
                { icon: "🔒", label: "ゴール（カギを取ると🎁）" },
                { icon: "🏛️", label: "出口" }
            ];
        }
    },

};
</script>

<style scoped>
canvas{
    touch-action:none;
}
.legend{
    margin-top:8px;padding:8px 10px;
    list-style:none;
    background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);border-radius:10px;
    font-size:14px;font-weight:bold;line-height:1.2;
}
.legend li{display:flex;align-items:center;gap:8px;padding:3px 0}
.legend-icon{
    display:inline-flex;align-items:center;justify-content:center;
    width:1.9em;height:1.9em;font-size:14px;flex:none;
}
.legend-bottom{display:none}
@media (max-width: 767px){
    .legend-side{display:none}
    .legend-bottom{
        display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;
        margin:10px 12px;color:#fff;font-size:13px;
    }
}
.key-pop{
    position:fixed;z-index:20;pointer-events:none;
    width:1em;height:1em;
    transform:translate(-50%,-50%);
}
.key-pop-icon,.key-pop-ring,.key-pop-text{position:absolute;left:50%;top:50%}
.key-pop-icon{
    line-height:1;
    filter:drop-shadow(0 0 6px #ffd84d);
    animation:key-pop-rise .9s ease-out forwards;
}
.key-pop-ring{
    width:1.2em;height:1.2em;margin:-.6em 0 0 -.6em;
    border:3px solid #ffd84d;border-radius:50%;
    box-shadow:0 0 12px #ffd84d;
    animation:key-pop-ring .6s ease-out forwards;
}
.key-pop-text{
    font-size:.6em;font-weight:900;color:#ffe066;white-space:nowrap;
    text-shadow:0 0 4px #000,0 0 8px #000;
    animation:key-pop-text .9s ease-out forwards;
}
@keyframes key-pop-rise{
    0%{transform:translate(-50%,-50%) scale(.6)}
    25%{transform:translate(-50%,-60%) scale(1.5) rotate(-15deg)}
    100%{transform:translate(-50%,-190%) scale(1) rotate(10deg);opacity:0}
}
@keyframes key-pop-ring{
    0%{transform:scale(.3);opacity:1}
    100%{transform:scale(2.4);opacity:0}
}
@keyframes key-pop-text{
    0%{transform:translate(20%,-50%);opacity:0}
    20%{opacity:1}
    100%{transform:translate(20%,-260%);opacity:0}
}
.key-pop-ring.hit-ring{border-color:#ff4d4d;box-shadow:0 0 14px #ff4d4d}
.hit-flash{
    position:fixed;inset:0;z-index:15;pointer-events:none;
    background:radial-gradient(circle,rgba(255,40,40,.15) 30%,rgba(255,0,0,.55) 100%);
    animation:hit-flash .45s ease-out forwards;
}
@keyframes hit-flash{
    from{opacity:1}
    to{opacity:0}
}
.hit-shake{animation:hit-shake .35s ease-in-out}
@keyframes hit-shake{
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(7px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(3px)}
}
.key-pop-text.lose-text{color:#ff5a5a}
.key-count-num{display:inline-block}
.key-count-num.bump.lose{animation-name:key-count-lose}
@keyframes key-count-lose{
    0%{transform:scale(1)}
    40%{transform:scale(1.7);color:#ff5a5a}
    100%{transform:scale(1)}
}
.key-count-num.bump{animation:key-count-bump .45s ease-out}
@keyframes key-count-bump{
    0%{transform:scale(1)}
    40%{transform:scale(1.7);color:#ffe066}
    100%{transform:scale(1)}
}
@media (prefers-reduced-motion: reduce){
    .key-pop-icon,.key-pop-ring,.key-pop-text,.key-count-num.bump,.hit-flash,.hit-shake{animation-duration:.01s}
}
.key-badge{
    display:inline-flex;align-items:center;justify-content:center;
    width:1.6em;height:1.6em;border-radius:50%;
    border:2px solid #fff;font-size:.8em;vertical-align:middle;
}
*{box-sizing:border-box; }
body{
margin:0;font-family:sans-serif;height:100vh;
display:flex;justify-content:center;align-items:center;flex-direction:column;
background:radial-gradient(circle,#5b4732,#1d1711);
}
#result{
  color:#fff;
  font-weight:900;
  font-size:36px;
  letter-spacing:2px;
  text-shadow:
    3px 3px 0 #000,
    0 0 10px #000,
    0 0 20px gold;
  margin-bottom:20px;
}

.chest{
position:relative;width:340px;height:240px;cursor:pointer;
}
.lid{
position:absolute;top:0;width:100%;height:110px;
border:6px solid #d4af37;border-radius:170px 170px 0 0;
background:repeating-linear-gradient(90deg,#5a341c 0,#734624 20px,#5a341c 40px);
transform-origin:bottom;transition:1s;
}
.base{
position:absolute;bottom:0;width:100%;height:140px;
border:6px solid #d4af37;
background:repeating-linear-gradient(90deg,#5a341c 0,#734624 20px,#5a341c 40px);
}

.lidBand,.baseBand{
position:absolute;width:14px;
background:linear-gradient(90deg,#8b6518,#f5df85,#8b6518);
}
.lidBand{top:0;height:98px}
.baseBand{top:0;height:128px}
.lb1,.bb1{left:58px}
.lb2,.bb2{left:132px}
.lb3,.bb3{left:206px}
.lb4,.bb4{left:280px}

.lock{
position:absolute;left:50%;top:118px;transform:translateX(-50%);
width:55px;height:70px;border-radius:10px;
background:gold;
}

.lock:before{
content:"";position:absolute;left:50%;top:16px;transform:translateX(-50%);
width:16px;height:16px;background:#3a2415;border-radius:50%;
}
.lock:after{
content:"";position:absolute;left:50%;top:30px;transform:translateX(-50%);
width:8px;height:22px;background:#3a2415;border-radius:0 0 4px 4px;
}

.open .lid{transform:rotateX(-125deg)}
button{margin:8px;padding:10px 16px}

.overlay,.book{
position:fixed;inset:0;background:rgba(0,0,0,.75);
display:none;justify-content:center;align-items:center;
}
.card{
background:#fff;border-radius:16px;padding:20px;
width:300px;text-align:center;
}
#collectionGrid{
display:flex;gap:10px;overflow-x:auto;
padding:10px;margin-top:10px;
}
.smallCard{
flex:0 0 auto;width:120px;height:170px;
border:2px solid #d4af37;border-radius:10px;
padding:8px;background:#fffdf5;text-align:center;
}
.icon{font-size:70px}
.smallIcon{font-size:40px}
.bookPanel{
width:95%;height:80%;background:white;border-radius:16px;padding:16px;
}

/* 帰還ゲートのボタンデザイン */
#returnGate {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid #00ff00;
  color: #00ff00;
  background: rgba(0,255,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
    text-align: center;       /*文字の中央寄せ */
    line-height: 1.2;
  cursor: pointer;
  box-shadow:
    0 0 20px #00ff00,
    inset 0 0 20px #00ff00;
  animation: pulse 2s infinite;
  z-index: 1000;

  margin-bottom: 30px; /* 下に余白を追加 */
}

/* ■追加：他洞窟へのワープボタンデザイン */
#forestWarpGate {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid #ff00ff;
  color: #ff00ff;
  background: rgba(255,0,255,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.2;
  font-size: 13px;
  cursor: pointer;
  box-shadow:
    0 0 20px #ff00ff,
    inset 0 0 20px #ff00ff;
  animation: pulse 2s infinite;
  z-index: 1000;
}

@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
/* ワープ時の画面反転（白く広がる）演出 */
#warpEffect {
  position: fixed;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: black;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;
  transition: width 1.5s ease, height 1.5s ease;
}

</style>