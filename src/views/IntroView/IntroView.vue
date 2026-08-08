<template>
    <!-- Intro Video -->
    <div v-if="showVideo" class="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <div id="player"></div>

        <p class="mt-6 text-white text-2xl">
            あと {{ remaining }} 秒
        </p>
    </div>

    <div v-else class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center px-4">
        <div class="max-w-xl w-full bg-slate-900/90 backdrop-blur rounded-2xl border border-slate-700 shadow-2xl shadow-cyan-500/10 p-10 text-center">

            <div class="flex gap2 justify-center items-center gap-4 mb-6">
                <div class="w-40 aspect-square " v-html="avatarSvg"></div> 
                <h1 class="text-2xl font-bold text-cyan-300 mb-6">
                    {{ playerName }}さん、<br>
                    ようこそ！
                </h1>
            </div>

            <p class="text-xl text-slate-200 mb-3">
                いまからぼうけんがはじまるよ✨<br>
                <strong class="text-red-500">{{ totalPlayers }}</strong>人のぼうけんしゃがあつまっています！
            </p>

            <p class="text-lg text-slate-400 mb-10">
                まずは自分のチームを決めよう！<br>
                <span class="font-semibold text-cyan-300">
                    風・土・水
                </span>
                のどれになるかな？
            </p>

            <div class="mt-10 flex flex-col items-center">

                <!-- <div
                    class="w-72 h-72 rounded-full bg-center bg-cover border-4 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-transform duration-[3000ms] ease-out"
                    style="background-image:url('/images/madoka_wheel.png')"
                ></div> -->
                <div ref="wheel" class="w-72 h-72 rounded-full bg-center bg-cover transition-transform duration-[3000ms] ease-out" style="background-image: url('/images/madoka_wheel.png');" ></div>
                <button
                    class="mt-8 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg hover:shadow-cyan-500/50"
                    @click="spinWheel"
                    :disabled="spinning"
                >
                    運命を決める
                </button>

                <p
                    v-if="result"
                    class="mt-6 text-2xl font-bold"
                >
                    {{ result }}
                </p>

            </div>

        </div>
    </div>
</template>

<script>
    // import db from './../../firebase.js';
    // import { arrayUnion } from "firebase/firestore";
    import db, { firebase } from './../../firebase.js';

    export default {
        name: "IntroView",
        

        data() {
            return {
                spinning: false,
                result: "",

                teams: [],
                index: 0,

                // showVideo: true,
                showVideo: false,

                remaining: 0,
                duration: 0,
                timer: null,

                playerName: "",
                cenId: null,
                avatar: null,
                avatarSvg: "",

                potentialTeam: "",
                totalPlayers: null,
            };
        },

        mounted() {
            console.clear();
            this.playerName = this.$route.query.name;
            this.avatar = JSON.parse(this.$route.query.avatar);
            this.avatarSvg = this.$buildAvatar(this.avatar);
            this.cenId = this.$route.query.cenId;

            this.getTeamCounts().then(counts => {
                console.log("Team counts:", counts);
            });

            this.resetTeams();
            this.loadYoutube();

        },

        methods: {

            resetTeams() {

                this.teams = this.shuffle([
                    "water",
                    "earth",
                    "air"
                ]);

                this.index = 0;

            },

            shuffle(array) {

                return [...array].sort(() => Math.random() - 0.5);

            },

            loadYoutube() {

                window.onYouTubeIframeAPIReady = () => {

                    this.player = new window.YT.Player("player", {

                        width: "960",
                        height: "540",

                        videoId: "xpT411XKhUg",

                        playerVars: {
                            autoplay: 1,
                            controls: 0,
                            rel: 0,
                            modestbranding: 1
                        },

                        events: {
                            onStateChange: this.onPlayerStateChange
                        }

                    });

                };

                if (!window.YT) {

                    const tag = document.createElement("script");
                    tag.src = "https://www.youtube.com/iframe_api";
                    document.body.appendChild(tag);

                } else {

                    window.onYouTubeIframeAPIReady();

                }

            },

            onPlayerStateChange(event) {

                // Video started playing
                if (event.data === window.YT.PlayerState.PLAYING) {

                    this.duration = Math.ceil(this.player.getDuration());

                    clearInterval(this.timer);

                    this.timer = setInterval(() => {

                        const current = this.player.getCurrentTime();

                        this.remaining = Math.max(
                            0,
                            Math.ceil(this.duration - current)
                        );

                    }, 200);

                }

                // Video ended
                if (event.data === window.YT.PlayerState.ENDED) {

                    clearInterval(this.timer);

                    this.showVideo = false;

                }

            },

            spinWheel() {
                this.createAccount();

                if (this.spinning) {
                    return;
                }

                this.spinning = true;
                this.result = "";

                // const team = this.teams[this.index];

                this.index++;

                if (this.index >= this.teams.length) {
                    this.resetTeams();
                }

                const randomSpin = Math.floor(Math.random() * 4) + 4;

                let offset = 0;

                const angle = offset + randomSpin * 360;

                this.$refs.wheel.style.transform = `rotate(${angle}deg)`;

                setTimeout(() => {

                    localStorage.setItem("myTeam", this.potentialTeam);
                    localStorage.setItem("playerName", this.playerName);

                    const routes = {
                        water: "/team/water",
                        earth: "/team/earth",
                        air: "/team/air"
                    };

                    const teamNames = {
                        water: "🌊 水チーム",
                        earth: "🌱 土チーム",
                        air: "🍃 風チーム"
                    };

                    this.result = teamNames[this.potentialTeam];

                    this.$router.push(routes[this.potentialTeam]);

                }, 3000);

            },
            
            async createAccount(){
                const uid = Date.now().toString();

                await db.collection("users").doc(uid).set({
                    uid,
                    name: this.playerName,
                    avatar: this.avatar,
                    team: this.potentialTeam,
                    cards: [],
                    level: 1,
                    coins: 0,
                    createdAt: new Date(),
                    cenId: this.cenId
                });

                 await db.collection("teams")
                    .doc(this.potentialTeam)
                    .update({
                        members: firebase.firestore.FieldValue.arrayUnion(uid)
                    });

                localStorage.setItem("playerUid", uid);

                console.log("Account created:", uid);

            },

            async getTeamCounts(){

                const snapshot = await db
                    .collection("teams")
                    .get();

                const counts = {};
                let total = 0;

                snapshot.forEach(doc=>{

                    const count = doc.data().members.length;

                    counts[doc.id] = count;

                    total += count;

                });


                const min = Math.min(...Object.values(counts));

                const potentialTeams = Object.keys(counts)
                    .filter(team => counts[team] === min);


                this.potentialTeam = potentialTeams[
                    Math.floor(Math.random() * potentialTeams.length)
                ];


                this.totalPlayers = total;


                return counts;
            }



        }
    };
</script>