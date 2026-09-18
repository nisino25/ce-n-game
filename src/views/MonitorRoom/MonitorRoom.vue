<template>
    <div class="relative w-screen h-screen overflow-hidden bg-slate-950 padding-4" :style="themeVars">

        <!-- Background -->
        <div class="absolute inset-0 room-bg"></div>

        <!-- Title -->
        <h1 class="m-4 room-title text-3xl font-bold tracking-wider">
            SECRET BASE CONTROL ROOM
        </h1>

        <!-- Floor -->
        <!-- <div
            id="roomFloor"
            class="absolute left-1/2 -translate-x-1/2 -bottom-52 w-[1400px] h-[900px]"
            :class="floorClass"
        ></div> -->

        <!-- Top Monitors -->
        <div class="flex justify-evenly items-center">
            <!-- Planet -->
            <div class="monitor">
                <div class="flex flex-col items-center">
                    <div class="text-6xl animate-bounce my-4">🌍</div>

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
            <!-- <button
                class="monitor offline"
                @click="goRepair"
                >
                生きもの修復
            </button> -->
            <button
                class="monitor"
                @click="changeMode('dominationMap')"
            >
                野生にもどそう！
            </button>

            <button
							class="monitor offline"
							style="padding: 1.5em 0 !important;"
            >
                生き物スキャン
            </button>
    
    
            <!-- Team -->
            <button
                class="monitor"
                @click="goTeamRoom"
            >
                <template v-if="myTeam">

                    <div class="text-center">

                        <div class="font-bold">
                            {{ currentPlayerName }}さん、<br>
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
        <div ref="doorEl" class="my-8 mx-auto w-[80%] h-64 flex justify-center items-center relative">
            <div class="door-left panel bg-gray-700 h-full w-[90px] relative z-100 transition-transform duration-1000 z-20" :style="{transform: isTransitioning ? 'translateX(-75px)' : 'translateX(0)'}">
                <div class="door-line absolute h-full w-[2px] right-0"></div>
            </div>
            <div class="door-right panel bg-gray-700 h-full w-[90px] relative z-100 transition-transform duration-1000 z-20  " :style="{transform: isTransitioning ? 'translateX(75px)' : 'translateX(0)'}">
                <div class="door-line absolute h-full w-[2px] left-0"></div>
            </div>
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 bg-gray-800 bg-opacity-80 px-4 py-2 rounded-lg shadow-lg room-accent-text text-lg font-bold">
                <span class="">出動中</span>
            </div>
						
        </div>

        <!-- Console -->
        <div class="consoles realtive flex justify-between items-center w-[400px] mx-auto">
            <div
                class="relative w-44 h-16 bg-gray-700 border-2 border-gray-500 room-console flex justify-center items-center"
                >
                <div class="text-center room-accent-text text-sm">
                    <div class="desk-monitor">{{ teamEmoji }} {{ teamName }}</div>
                </div>
            </div>

            <!-- Right Console -->
            <div
                class="relative w-44 h-16 bg-gray-700 border-2 border-gray-500 room-console flex justify-center items-center"
            >
                <div class="text-center room-accent-text text-sm">
                    <div class="desk-monitor">{{ teamEmoji }} {{ teamName }}</div>
                </div>
            </div>

						<div
							ref="avatarEl"
							class="w-[80px] aspect-square mx-auto fixed left-[15%] bottom-[10%] z-[500] transform -translate-x-1/2
							rounded-full border-4 border-yellow-400 room-avatar-ring
							cursor-pointer transition-all duration-1000"
							:class="{ 'animate-pulse': !isTransitioning }"
							v-html="avatarSvg"
							@click="showProfileModal = true"
							:style="avatarTransitionStyle"
						></div>

						<!-- Profile Modal -->
						<div
								v-if="showProfileModal"
								class="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
								@click.self="showProfileModal = false"
							>
							<div class="bg-white rounded-xl shadow-xl p-6 w-[300px]">
									<h2 class="text-xl font-bold text-center mb-5">
											メニュー
									</h2>

									<button
											class="w-full p-3 mb-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
											@click="editProfile"
									>
											プロフィール編集
									</button>

									<button
											class="w-full p-3 mb-3 bg-red-500 hover:bg-red-600 text-white rounded-lg"
											@click="logout"
									>
											ログアウト
									</button>
									<button
											class="w-full p-3 bg-gray-300 hover:bg-gray-400 rounded-lg"
											@click="showProfileModal = false"
									>
											閉じる
									</button>
							</div>
						</div>

            <!-- Workers -->
            <div class="absolute inset-x-[4%] top-[34%] bottom-[6%] pointer-events-none">
              <template v-for="(member) in onlineTeamMembers" :key="member.uid">
								<div class="wanderer" :style="wanderStyle(member)">
									<div
										class="wanderer-inner w-[50px] aspect-square rounded-full border-2 room-worker-avatar"
										v-html="member.avatarSvg"
									>
									</div>
								</div>
              </template>
            </div>
        </div>

    </div>
</template>
<script>
import db from './../../firebase.js';

export default {
    name: "MonitorRoom",
		
    data() {
			const myTeam = localStorage.getItem("myTeam");
			const currentPlayerData = JSON.parse(localStorage.getItem("playerData"));
			const currentPlayerName = currentPlayerData?.name;
			const avatarSvg = this.$buildAvatar(currentPlayerData?.avatar);
		
			return {
				status: "監視システム正常",
				isTransitioning: false,
				isDocking: false,
				avatarFrom: null,
				doorTarget: null,

				myTeam,
				currentPlayerName,
				currentPlayerData,
				avatarSvg,


				collection: JSON.parse(
						localStorage.getItem("collection") || "[]"
				),


				belugaMessage: "",

				teamMembers: [],

				showProfileModal: false
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
        },

        teamTheme() {
            const themes = {
                water: {
                    accent: "#22d3ee",
                    bgGlow: "#15324a",
                    bgDark: "#030a12",
                    titleGlow: "#67e8f9"
                },
                earth: {
                    accent: "#4ade80",
                    bgGlow: "#1f3320",
                    bgDark: "#060d04",
                    titleGlow: "#86efac"
                },
                air: {
                    accent: "#7dd3fc",
                    bgGlow: "#33475a",
                    bgDark: "#10181f",
                    titleGlow: "#bae6fd"
                }
            };

            return themes[this.myTeam] || {
                accent: "#00ffff",
                bgGlow: "#1c2435",
                bgDark: "#05070d",
                titleGlow: "#67e8f9"
            };
        },

        themeVars() {
            return {
                "--team-accent": this.teamTheme.accent,
                "--team-bg-glow": this.teamTheme.bgGlow,
                "--team-bg-dark": this.teamTheme.bgDark,
                "--team-title-glow": this.teamTheme.titleGlow
            };
        },

				onlineTeamMembers() {
						// also cannot be same id as me
						// cenId cannot be same as currentPlayerData.cenId

						// return this.teamMembers.filter(member => member.isOnline);
						return this.teamMembers.filter(member => member.isOnline && member.uid !== this.currentPlayerData.uid && member.cenId !== this.currentPlayerData.cenId);
				},

				avatarTransitionStyle() {
						if (this.isDocking && this.doorTarget) {
								return {
										left: `${this.doorTarget.left}px`,
										top: `${this.doorTarget.top}px`,
										bottom: "auto",
										transform: "translate(-50%, -50%) scale(0.15)",
										opacity: 0
								};
						}

						if (this.isTransitioning && this.avatarFrom) {
								return {
										left: `${this.avatarFrom.left}px`,
										top: `${this.avatarFrom.top}px`,
										bottom: "auto",
										transform: "translate(-50%, -50%) scale(1)",
										opacity: 1
								};
						}

						return {};
				}
    },

    async mounted() {


        this.teamMembers = await this.getTeamMembers();
				// console.log("Current Player Data:", this.currentPlayerData);
				// console.log("My Team:", this.myTeam);
				// console.log("Current Player Name:", this.currentPlayerName);
				// console.log("Current Player Avatar:", this.currentPlayerAvatar);	

        console.log("Team Members:", this.teamMembers);
				console.log("Online Team Members:", this.onlineTeamMembers);
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
            if (this.isTransitioning) {
                return;
            }

            const avatarEl = this.$refs.avatarEl;
            const doorEl = this.$refs.doorEl;

            if (avatarEl && doorEl) {
                const avatarRect = avatarEl.getBoundingClientRect();
                const doorRect = doorEl.getBoundingClientRect();

                // 現在のアバターの見た目の位置を、bottom基準からpx指定のtop/leftに
                // 一度固定してから動かすことで、auto→数値の瞬間移動を防ぐ
                this.avatarFrom = {
                    left: avatarRect.left + avatarRect.width / 2,
                    top: avatarRect.top + avatarRect.height / 2
                };
                this.doorTarget = {
                    left: doorRect.left + doorRect.width / 2,
                    top: doorRect.top + doorRect.height / 2
                };

                this.isTransitioning = true;

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this.isDocking = true;
                    });
                });
            } else {
                this.isTransitioning = true;
            }

            setTimeout(() => {
                this.isTransitioning = false;
                this.isDocking = false;
                this.avatarFrom = null;
                this.doorTarget = null;
                this.$router.push(`/${mode}`);
            }, 1500); // 1秒後に遷移
        },
        hashSeed(str) {
            let hash = 0;

            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }

            return Math.abs(hash);
        },
        seededRandom(seed, index) {
            const x = Math.sin(seed + index * 7919) * 10000;

            return x - Math.floor(x);
        },
        wanderStyle(member) {
            const seed = this.hashSeed(member.uid || member.cenId || "wanderer");
            const rand = index => this.seededRandom(seed, index);
            const pct = (min, max, index) => `${(min + rand(index) * (max - min)).toFixed(1)}%`;

            return {
                "--p0x": pct(0, 85, 1),
                "--p0y": pct(0, 80, 2),
                "--p1x": pct(0, 85, 3),
                "--p1y": pct(0, 80, 4),
                "--p2x": pct(0, 85, 5),
                "--p2y": pct(0, 80, 6),
                "--p3x": pct(0, 85, 7),
                "--p3y": pct(0, 80, 8),
                "--wander-duration": `${(16 + rand(9) * 10).toFixed(1)}s`,
                "--wander-delay": `-${(rand(10) * 14).toFixed(1)}s`
            };
        },
        async getTeamMembers() {
            const snapshot = await db
                .collection("users")
                .where("team", "==", this.myTeam)
                .get();

            return snapshot.docs.map(doc => {
                const user = doc.data();
                const enteredAt = user.enteredMonitorRoomAt?.seconds * 1000;
                const isOnline = enteredAt && Date.now() - enteredAt <= 10 * 60 * 1000; 
                // const isOnline = enteredAt && Date.now() - enteredAt <= 200 * 60 * 60 * 1000; 

                return {
                    ...user,
                    avatarSvg: this.$buildAvatar(user.avatar),
                    isOnline
                };
            });
        },
        editProfile() {
					this.$router.push({
							name: "ProfileEditor",
							query: {cenId: this.currentPlayerData.cenId}
					});
        },
				logout() {
					localStorage.removeItem("playerUid");
					localStorage.removeItem("playerData");
					localStorage.removeItem("myTeam");
					localStorage.removeItem("loginCenId");
					this.$router.push({ name: "LoginPage" });
				}
    }
};
</script>
<style scoped>
  .room-bg{
      background: radial-gradient(circle at center, var(--team-bg-glow, #1c2435), var(--team-bg-dark, #05070d));
      transition: background 1s ease;
  }

  .room-title{
      color: var(--team-title-glow, #67e8f9);
      filter: drop-shadow(0 0 12px var(--team-accent, #00ffff));
      transition: color 1s ease, filter 1s ease;
  }

  .room-accent-text{
      color: var(--team-accent, #00ffff);
  }

  .room-console{
      box-shadow: 0 0 15px var(--team-accent, cyan);
      transition: box-shadow 1s ease;
  }

  .door-line{
      background: var(--team-accent, #0ff);
      transition: background 1s ease;
  }

  .room-avatar-ring{
      box-shadow: 0 0 0 4px var(--team-accent, #3b82f6), 0 0 10px var(--team-accent, #3b82f6), 0 0 25px var(--team-accent, #3b82f6);
      transition: box-shadow 1s ease;
  }

  /* 他ユーザーが画面上をふわふわ歩き回る演出 */
  .wanderer{
      position: absolute;
      width: 50px;
      height: 50px;
      animation: wander var(--wander-duration, 20s) ease-in-out infinite;
      animation-delay: var(--wander-delay, 0s);
  }

  @keyframes wander{
      0%   { left: var(--p0x); top: var(--p0y); }
      25%  { left: var(--p1x); top: var(--p1y); }
      50%  { left: var(--p2x); top: var(--p2y); }
      75%  { left: var(--p3x); top: var(--p3y); }
      100% { left: var(--p0x); top: var(--p0y); }
  }

  .wanderer-inner{
      width: 100%;
      height: 100%;
      animation: bob 2.4s ease-in-out infinite;
  }

  @keyframes bob{
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
  }

  .room-worker-avatar{
      border-color: var(--team-accent, #60a5fa);
      box-shadow: 0 0 8px var(--team-accent, #60a5fa);
      transition: border-color 1s ease, box-shadow 1s ease;
  }

  .monitor{
      position:relative;
      width:min(260px,17.5vw);
      min-width:120px;
      /* height:min(140px,12vw); */
      height: auto;
      min-height:70px;

      border:4px solid var(--team-accent, #0ff);
      background:#001d24;
      box-shadow:0 0 20px var(--team-accent, #0ff);
      cursor:pointer;
      overflow:hidden;

      display:flex;
      justify-content:center;
      align-items:center;
      white-space:nowrap;
      color:var(--team-accent, #00ffff);
      font-size:clamp(12px,1.5vw,24px);
      font-weight:bold;
      text-shadow:0 0 5px var(--team-accent, #0ff),0 0 15px var(--team-accent, #0ff);
      text-align:center;
      padding:0.5em 0;
      transition: border-color 1s ease, box-shadow 1s ease, color 1s ease, text-shadow 1s ease;
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
      background: var(--team-accent, #0ff);
      box-shadow: 0 0 15px var(--team-accent, #0ff);
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