<template>
    <div class="relative w-screen h-screen overflow-hidden bg-slate-950 padding-4">

        <!-- Background -->
        <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_center,#1c2435,#05070d)]"
        ></div>

        <!-- Title -->
        <h1
            class="m-4 text-cyan-300 text-3xl font-bold tracking-wider drop-shadow-[0_0_12px_#00ffff]"
        >
            SECRET BASE CONTROL ROOM
        </h1>

        <!-- Status -->
        <!-- <div
            class="absolute top-16 left-1/2 -translate-x-1/2 text-cyan-300 text-xl"
        >
            {{ status }}
        </div> -->

        <!-- Floor -->
        <!-- <div
            id="roomFloor"
            class="absolute left-1/2 -translate-x-1/2 -bottom-52 w-[1400px] h-[900px]"
            :class="floorClass"
        ></div> -->

        <!-- Top Monitors -->
        <div
            class="flex justify-evenly items-center"
        >
            <!-- Planet -->
            <div class="monitor">
                <div class="flex flex-col items-center">
                    <div class="text-6xl animate-bounce">
                        🌍
                    </div>

                    <div class="text-xs">
                        🌱95% 💧90% 🌬98%
                    </div>
                </div>
            </div>

            <!-- Cave -->
            <button
                class="monitor"
                @click="changeMode('cave-adventure/cave-entrance')"
            >
                洞窟探検
            </button>

            <!-- Repair -->
            <button
                class="monitor offline"
                @click="goRepair"
                >
                生きもの修復
            </button>
    
            <!-- Team -->
            <button
                class="monitor"
                @click="goTeamRoom"
            >
                <template v-if="myTeam">

                    <div class="text-center">

                        <div class="font-bold">
                            {{ playerName }}さん、<br>
                            ようこそ、{{ teamName }}へ
                        </div>

                        <div class="text-sm mt-2">
                            チーム人数：{{ teamMembers.length }}名
                        </div>

                        <div class="text-sm">
                            チーム保有カード：{{ teamCards }}枚
                        </div>

                        <div class="text-sm">
                            個人保有カード：{{ personalCards }}枚
                        </div>

                    </div>

                </template>

                <template v-else>
                    🔒 LOCK
                </template>

            </button>

        </div>

        <!-- Door -->
        <div class="my-8 mx-auto w-[80%] h-64 flex justify-center items-center relative">
            <div class="door-left panel bg-gray-700 h-full w-[90px] relative z-100 transition-transform duration-1000 z-20" @click="changeMode('cave-adventure/cave-entrance')" :style="{transform: isTransitioning ? 'translateX(-75px)' : 'translateX(0)'}">
                <div class="door-line absolute h-full w-[2px] right-0 bg-[#0ff]"></div>
            </div>
            <div class="door-right panel bg-gray-700 h-full w-[90px] relative z-100 transition-transform duration-1000 z-20  " @click="changeMode('cave-adventure/cave-entrance')" :style="{transform: isTransitioning ? 'translateX(75px)' : 'translateX(0)'}">
                <div class="door-line absolute h-full w-[2px] left-0 bg-[#0ff]"></div>
            </div>
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 bg-gray-800 bg-opacity-80 px-4 py-2 rounded-lg shadow-lg text-cyan-300 text-lg font-bold">
                <span class="">出動中</span>
            </div>
        </div>

        <!-- Console -->
        <div class="consoles realtive flex justify-between items-center w-[400px] mx-auto">
            <div
                class="relative w-44 h-16 bg-gray-700 border-2 border-gray-500 shadow-[0_0_15px_cyan] flex justify-center items-center"
                >
                <div class="text-center text-cyan-300 text-sm">
                    <div class="desk-monitor">{{ teamEmoji }} {{ teamName }}</div>
                </div>
            </div>
    
            <!-- Right Console -->
            <div
                class="relative w-44 h-16 bg-gray-700 border-2 border-gray-500 shadow-[0_0_15px_cyan] flex justify-center items-center"
            >
                <div class="text-center text-cyan-300 text-sm">
                    <div class="text-center text-cyan-300 text-sm">
                        <div class="desk-monitor">{{ teamEmoji }} {{ teamName }}</div>
                    </div>
                </div>
            </div>

            <!-- Workers -->
            <div
                v-for="worker in workers"
                :key="worker.id"
                class="absolute text-3xl"
                :style="{
                    left: worker.x + 'px',
                    top: worker.y + 'px'
                }"
            >
                {{ worker.icon }}
            </div>
        </div>




        <!-- Beluga Event -->
        <div
            v-if="showBeluga"
            class="absolute inset-0 pointer-events-none"
        >

            <!-- <img
                src="@/assets/beluga.png"
                class="absolute left-60 top-24 w-80"
            > -->

            <div
                class="absolute right-52 top-72 bg-white rounded-2xl p-4 max-w-xs text-sm"
            >
                {{ belugaMessage }}
            </div>

        </div>

    </div>
</template>
<script>
import db from './../../firebase.js';

export default {
    name: "MonitorRoom",

    data() {
        return {
            status: "監視システム正常",
            isTransitioning: false,

            myTeam: null,
            playerName: null,
            // earth
            // water
            // air
            // null

            workers: [
                {
                    id: 1,
                    icon: "👨‍💻",
                    x: 220,
                    y: 390
                },
                {
                    id: 2,
                    icon: "👩‍💻",
                    x: 280,
                    y: 390
                },
                {
                    id: 3,
                    icon: "👨‍💻",
                    x: window.innerWidth - 280,
                    y: 390
                },
                {
                    id: 4,
                    icon: "👩‍💻",
                    x: window.innerWidth - 220,
                    y: 390
                }
            ],

            collection: JSON.parse(
                localStorage.getItem("collection") || "[]"
            ),

            showBeluga: false,

            belugaMessage: "",

            teamMembers: [],
        };
    },

    computed: {
        personalCards() {
            return this.collection.length;
        },

        teamCards() {
            return this.personalCards * 9;
        },

        teamName() {
            switch (this.myTeam) {
                case "earth":
                    return "土の部屋";

                case "water":
                    return "水の部屋";

                case "air":
                    return "風の部屋";

                default:
                    return "";
            }
        },

        teamEmoji() {
            switch (this.myTeam) {
                case "earth":
                    return "🌱";

                case "water":
                    return "💧";

                case "air":
                    return "🍃";

                default:
                    return "";
            }
        },

        floorClass() {
            switch (this.myTeam) {
                case "earth":
                    return "earth-floor";

                case "water":
                    return "water-floor";

                case "air":
                    return "air-floor";

                default:
                    return "";
            }
        }
    },

    async mounted() {
        this.myTeam = localStorage.getItem("myTeam");

        this.playerName = localStorage.getItem("playerName");

        if (
            this.collection.length >= 2 &&
            localStorage.getItem("showBeluga") === "true"
        ) {
            // this.showBeluga = true;

            // this.belugaMessage = "生きものカードが集まったので、\n早く陣地に戻そう！";

            // localStorage.removeItem("showBeluga");
        }

        this.teamMembers = await this.getTeamMembers();

        console.log("Team Members:", this.teamMembers);
    },

    methods: {
        goRepair() {
            if (this.collection.length < 2) {
                this.status = "カード不足";
                return;
            }

            this.status = "生きもの修復へ";

            // this.$router.push("/repair");
        },

        goCave() {
            this.status = "洞窟探検へ";

            // this.$router.push("/cave");
        },

        goTeamRoom() {
            if (!this.myTeam) {
                this.status = "アクセス拒否：属性未決定";
                return;
            }

            switch (this.myTeam) {
                case "earth":
                    // this.$router.push("/earth-room");
                    break;

                case "water":
                    // this.$router.push("/water-room");
                    break;

                case "air":
                    // this.$router.push("/air-room");
                    break;
            }
        },
        changeMode(mode) {
            this.isTransitioning = true;

            setTimeout(() => {
                this.isTransitioning = false;
                this.$router.push(`/${mode}`);
            }, 1500); // 1秒後に遷移
        },
        async getTeamMembers() {
            const snapshot = await db
                .collection("users")
                .where("team", "==", this.myTeam)
                .get();

            return snapshot.docs.map(doc => doc.data());
        }
    }
};
</script>
<style scoped>
.monitor{
    position:relative;
    width:min(260px,20vw);
    min-width:120px;
    /* height:min(140px,12vw); */
    height: auto;
    min-height:70px;

    border:4px solid #0ff;
    background:#001d24;
    box-shadow:0 0 20px #0ff;
    cursor:pointer;
    overflow:hidden;

    display:flex;
    justify-content:center;
    align-items:center;
    white-space:nowrap;
    color:#00ffff;
    font-size:clamp(12px,1.5vw,24px);
    font-weight:bold;
    text-shadow:0 0 5px #0ff,0 0 15px #0ff;
    text-align:center;
}
.monitor::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
        repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(255,255,255,.04) 4px
        );
    pointer-events: none;
}

.monitor::after {
    content: "";
    position: absolute;
    left: 0;
    width: 100%;
    height: 4px;
    background: rgba(0,255,255,.9);
    box-shadow: 0 0 15px #0ff;
    animation: scan 2s linear infinite;
}

@keyframes scan {
    from {
        top: -4px;
    }

    to {
        top: calc(100% + 4px);
    }
    
}
.monitor.offline {
    position: relative;
    overflow: hidden;
    background: #050505;
    border: 2px solid #444;
    color: #666;
}

.monitor.offline::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
        linear-gradient(
            135deg,
            transparent 46%,
            rgba(255,255,255,.25) 47%,
            transparent 48%
        ),
        linear-gradient(
            40deg,
            transparent 70%,
            rgba(255,255,255,.15) 71%,
            transparent 72%
        );
    pointer-events: none;
}

.monitor.offline::after {
    content: "NO SIGNAL";
    position: absolute;
    bottom: 0 !important;
    top: unset !important;
    height: 30%;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    color: #ff4444;
    letter-spacing: 2px;
    animation: flicker 1.5s infinite;
}

@keyframes flicker {
    0%,100% { opacity: 1; }
    50% { opacity: .4; }
}
</style>