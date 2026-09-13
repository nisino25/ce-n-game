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
                陣取りゲーム
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

						<div
							class="w-[80px] aspect-square mx-auto fixed left-[15%] bottom-[10%] z-[500] transform -translate-x-1/2
							rounded-full border-4 border-yellow-400 ring-4 ring-blue-500
							shadow-[0_0_10px_rgba(59,130,246,1),0_0_25px_rgba(59,130,246,0.8)]
							animate-pulse cursor-pointer transition-all duration-1000"
							v-html="avatarSvg"
							@click="showProfileModal = true"
							:class="isTransitioning? 'left-[50%]' : ''"
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
            <div class="absolute bottom-[5%] right-[5%] grid grid-cols-5 gap-2">
              <template v-for="(member) in onlineTeamMembers" :key="member.uid">
								<div
									class="w-[50px] aspect-square rounded-full border-2 border-blue-400"
									v-html="member.avatarSvg"
								>
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

				onlineTeamMembers() {
						// also cannot be same id as me
						// cenId cannot be same as currentPlayerData.cenId

						// return this.teamMembers.filter(member => member.isOnline);
						return this.teamMembers.filter(member => member.isOnline && member.uid !== this.currentPlayerData.uid && member.cenId !== this.currentPlayerData.cenId);
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
  .monitor{
      position:relative;
      width:min(260px,17.5vw);
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
      padding:0.5em 0;
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