<template>

    <!-- Return Gate -->
    <button @click="returnHome">
        帰還ゲート
    </button>

    <!-- Warp -->
    <div ref="warp"></div>

    <!-- Canvas -->
    <canvas ref="canvas"></canvas>

</template>

<script>
export default {

    data() {

        return {

            canvas: null,
            ctx: null,

            CELL: 0,

            COLS: 15,
            ROWS: 25,

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
            enemyMoveCounter: 0

        };

    },

    mounted() {

        this.canvas = this.$refs.canvas;
        this.ctx = this.canvas.getContext("2d");

        this.resize();

        window.addEventListener(
            "resize",
            this.resize
        );

        this.canvas.addEventListener(
            "pointermove",
            this.handlePointerMove
        );

        this.resetGame();

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

    },

    methods: {

        returnHome() {

    const warp = this.$refs.warp;

    warp.style.width = "300vmax";
    warp.style.height = "300vmax";

    setTimeout(() => {

        localStorage.setItem(
            "showBeluga",
            "true"
        );

        this.$router.push("/monitor-room");

    }, 800);

},

        resize() {

    this.CELL = Math.min(
        window.innerWidth / this.COLS,
        window.innerHeight / this.ROWS
    );

    this.canvas.width = this.CELL * this.COLS;
    this.canvas.height = this.CELL * this.ROWS;

},

       resetGame() {

    this.createMaze();

    this.createItems();

    this.enemies = [];

    this.enemyAppeared = false;

    this.enemyMoveCounter = 0;

    this.player = {
        r: 1,
        c: 1
    };

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

        spawnEnemy() {

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

        this.maze[r][c]

    );

    this.enemies.push({

        r,
        c

    });

},

        moveEnemies() {

    this.enemyMoveCounter++;

    if (this.enemyMoveCounter % 3 !== 0) {
        return;
    }

    this.enemies.forEach(enemy => {

        let dr = 0;
        let dc = 0;

        const distance =
            Math.abs(this.player.r - enemy.r) +
            Math.abs(this.player.c - enemy.c);

        const chase = Math.random() < (
            distance <= 2 ? 0.2 : 0.5
        );

        if (chase) {

            dr = Math.sign(this.player.r - enemy.r);
            dc = Math.sign(this.player.c - enemy.c);

            if (
                Math.abs(this.player.r - enemy.r) >
                Math.abs(this.player.c - enemy.c)
            ) {

                dc = 0;

            } else {

                dr = 0;

            }

        } else {

            const dirs = [
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, 0]
            ];

            [dr, dc] =
                dirs[Math.floor(Math.random() * 4)];

        }

        const nr = enemy.r + dr;
        const nc = enemy.c + dc;

        if (this.maze[nr]?.[nc] !== 0) {
            return;
        }

        if (this.nearGoal(nr, nc)) {
            return;
        }

        if (this.blocksCriticalPath(nr, nc)) {
            return;
        }

        enemy.r = nr;
        enemy.c = nc;

        if (
            enemy.r === this.player.r &&
            enemy.c === this.player.c
        ) {

            this.player = {
                r: 1,
                c: 1
            };

        }

    });

},
moveTo(x, y) {

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

    if (
        this.player.r === this.home.r &&
        this.player.c === this.home.c
    ) {

        this.returnHome();

        this.resetGame();

        return;

    }

    this.items.forEach(item => {

        if (
            !item.get &&
            item.r === nr &&
            item.c === nc
        ) {

            item.get = true;

            if (
                this.items.filter(i => i.get).length === 2 &&
                !this.enemyAppeared
            ) {

                this.enemyAppeared = true;

                this.spawnEnemy();

            }

        }

    });

    if (this.enemyAppeared) {

        this.moveEnemies();

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

        const keyCount =
            this.items.filter(i => i.get).length;

        this.$router.push(
            `./cave-end?keys=${keyCount}`
        );

        return;

    }

    this.draw();

},

        handlePointerMove(e) {

            const rect = this.canvas.getBoundingClientRect();

            this.moveTo(
                e.clientX - rect.left,
                e.clientY - rect.top
            );

        },

        draw() {

    this.ctx.clearRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height
    );

    // Maze
    for (let r = 0; r < this.ROWS; r++) {

        for (let c = 0; c < this.COLS; c++) {

            this.ctx.fillStyle =
                this.maze[r][c] ? "#555" : "#111";

            this.ctx.fillRect(

                c * this.CELL,
                r * this.CELL,
                this.CELL,
                this.CELL

            );

        }

    }

    // Home
    const homeX =
        this.home.c * this.CELL + this.CELL / 2;

    const homeY =
        this.home.r * this.CELL + this.CELL / 2;

    this.ctx.font = `${this.CELL * 0.8}px serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.ctx.fillText(
        "🏛️",
        homeX,
        homeY
    );

    // Goal
    const goalX =
        this.goal.c * this.CELL + this.CELL / 2;

    const goalY =
        this.goal.r * this.CELL + this.CELL / 2;

    this.ctx.font = `${this.CELL * 0.9}px serif`;

    if (
        this.items.filter(item => item.get).length >= 1
    ) {

        this.ctx.fillText(
            "🎁",
            goalX,
            goalY
        );

    } else {

        this.ctx.fillText(
            "🔒",
            goalX,
            goalY
        );

    }

    // Keys
    this.items.forEach(item => {

        if (item.get) {
            return;
        }

        const x =
            item.c * this.CELL + this.CELL / 2;

        const y =
            item.r * this.CELL + this.CELL / 2;

        this.ctx.font =
            `${this.CELL * 0.75}px serif`;

        this.ctx.fillText(
            "🔑",
            x,
            y
        );

    });

    // Enemies
    this.enemies.forEach(enemy => {

        const x =
            enemy.c * this.CELL + this.CELL / 2;

        const y =
            enemy.r * this.CELL + this.CELL / 2;

        this.ctx.font =
            `${this.CELL * 0.8}px serif`;

        this.ctx.fillText(
            "💣",
            x,
            y
        );

    });

    // Player
    const playerX =
        this.player.c * this.CELL + this.CELL / 2;

    const playerY =
        this.player.r * this.CELL + this.CELL / 2;

    this.ctx.font =
        `${this.CELL * 0.8}px serif`;

    this.ctx.fillText(
        "😀",
        playerX,
        playerY
    );

},
getProtectedTarget() {

    const remainingItems = this.items.filter(
        item => !item.get
    );

    if (remainingItems.length > 0) {

        return remainingItems[
            remainingItems.length - 1
        ];

    }

    return this.goal;

},
nearGoal(r, c) {

    return (

        Math.abs(r - this.goal.r) +
        Math.abs(c - this.goal.c)

    ) <= 1;

},
blocksCriticalPath(r, c) {

    const target =
        this.getProtectedTarget();

    const before =

        Math.abs(
            this.player.r - target.r
        ) +

        Math.abs(
            this.player.c - target.c
        );

    const after =

        Math.abs(
            r - target.r
        ) +

        Math.abs(
            c - target.c
        );

    return after < before;

},


    }

};
</script>

<style scoped>

/* only the CSS that Tailwind can't replace */

canvas{

    touch-action:none;

}

</style>

<style>
*{box-sizing:border-box}
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
  position: fixed;
  left: 30px;
  top: 30px;
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