<template>
    <!-- Intro Video -->
    <div v-if="showVideo" class="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <div class="video-wrapper">
            <div id="player"></div>
        </div>

        <p class="mt-6 text-white text-2xl" @click="showVideo = false;">
            あと {{ remaining }} 秒
        </p>
    </div>

    <div v-else class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center px-4">
        <div class="max-w-xl w-full bg-slate-900/90 backdrop-blur rounded-2xl border border-slate-700 shadow-2xl shadow-cyan-500/10 p-10 text-center">

            <p class="text-xl text-slate-200 mb-3">
                いまからぼうけんがはじまるよ✨<br>
                <strong class="text-red-500">{{ totalPlayers }}</strong>人のぼうけんしゃがあつまっています！
            </p>

            <p class="text-lg text-slate-400 mb-4">
                まずは自分のチームを決めよう！<br>
                <span class="font-semibold text-cyan-300">
                    風・土・水
                </span>
                のどれになるかな？
            </p>

            <div class="mt-4 flex flex-col items-center">
                 <div class="relative">
                    <div
                        ref="wheel"
                        class="w-40 aspect-square rounded-full bg-center bg-cover transition-transform duration-[3000ms] ease-out"
                        style="background-image: url('/images/wheel_v3.png');"
                    ></div>

                    <!-- Stationary arrow -->
                    <div class="absolute right-[-50px] top-1/2 -translate-y-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[30px] border-b-red-500 rotate-[270deg]"></div>
                </div>
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
    import { setSession } from '@/utils/session.js';

    export default {
        name: "IntroView",
        

        data() {
            return {
                spinning: false,
                result: "",

                teams: [],
                index: 0,

                showVideo: true,
                // showVideo: false,

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
            // console.clear();
            console.log("Introが受け取った cenId:", this.$route.query.cenId);
            // this.playerName = this.$route.query.name;
            // this.avatar = JSON.parse(this.$route.query.avatar);
            // this.avatarSvg = this.$buildAvatar(this.avatar);
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

            async spinWheel() {
                if (this.spinning) {
                    return;
                }

                // this.createAccount();
                this.spinning = true;
                this.result = "";
                // ■挿入
                try {
                    // 会員登録とチーム登録の完了を待つ
                    await this.createAccount();
                } catch (error) {
                    console.error("Account creation failed:", error);
                    this.spinning = false;
                    return;
                }
                // ■ここまで
                this.index++;

                if (this.index >= this.teams.length) {
                    this.resetTeams();
                }

                const randomSpin = Math.floor(Math.random() * 4) + 4;

                const teamAngles = {
                    water: 160,
                    earth: 50,
                    air: 290
                };

                const finalAngle = teamAngles[this.potentialTeam];
                const angle = randomSpin * 360 + finalAngle;

                this.$refs.wheel.style.transform = `rotate(${angle}deg)`;

                setTimeout(() => {
                    const teamNames = {
                        water: "🌊 水チーム",
                        earth: "🌱 土チーム",
                        air: "🍃 風チーム"
                    };

                    this.result = teamNames[this.potentialTeam];

                    setTimeout(() => {
                        setSession("myTeam", this.potentialTeam);
                        this.$router.push(`/teamIntro?team=${this.potentialTeam}`);
                    }, 2500);
                }, 3000);
            },
            
            async createAccount(){
                // cenIdが一致する既存会員を確認
                const snapshot = await db
                    .collection("users")
                    .where("cenId", "==", this.cenId)
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    // 既存会員の場合
                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();
                    const oldTeam = userData.team; // 以前のチームがあれば保持
                    // 1. users コレクションを更新（チームとイントロ完了フラグを今回決まったものに更新）
                    await db.collection("users").doc(userDoc.id).update({
                        team: this.potentialTeam,
                        introCompleted: true,
                        introCompletedAt: firebase.firestore.Timestamp.now()
                    });
                    // 2. もしチームが変わった場合、古いteamsのmembersから外し、新しいteamsのmembersに追加する
                    const batch = db.batch();
                    if (oldTeam && oldTeam !== this.potentialTeam) {
                        const oldTeamRef = db.collection("teams").doc(oldTeam);
                        batch.update(oldTeamRef, {
                            members: firebase.firestore.FieldValue.arrayRemove(userDoc.id)
                        });
                    }
                    const newTeamRef = db.collection("teams").doc(this.potentialTeam);
                    batch.update(newTeamRef, {
                        members: firebase.firestore.FieldValue.arrayUnion(userDoc.id)
                    });
                    await batch.commit();
                    // 3. セッションの更新
                    const latestUserData = { ...userData, team: this.potentialTeam, introCompleted: true };
                    setSession("playerUid", userDoc.id);
                    setSession("playerData", JSON.stringify(latestUserData));
                    setSession("myTeam", this.potentialTeam); // 決定したチームをセット
                    setSession("loginCenId", this.cenId);
                    console.log("既存会員のチームを更新しました:", userDoc.id, "チーム:", this.potentialTeam);
                    return;
                }

                // 初回会員だけ新規作成
                const uid = Date.now().toString();
                const userData = {
                    uid,
                    name: this.playerName,
                    avatar: this.avatar,
                    team: this.potentialTeam,
                    cards: [],
                    level: 1,
                    createdAt: new Date(),
                    cenId: this.cenId,
                    enteredMonitorRoomAt: firebase.firestore.Timestamp.now(),
                    introCompleted: true
                };
                await db.collection("users").doc(uid).set({
                    ...userData
                });

                await db.collection("teams")
                    .doc(this.potentialTeam)
                    .update({
                        members: firebase.firestore.FieldValue.arrayUnion(uid)
                    });

                setSession("playerUid", uid);
                setSession("playerData", JSON.stringify(userData));
                setSession("myTeam", this.potentialTeam);
                setSession("loginCenId", this.cenId);
                console.log("新規アカウント作成:", uid, "チーム:", this.potentialTeam);
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
            },

        }
    };
</script>

<style scoped>
/* 動画をスマートフォンでも縦で見やすく、画面に収まるようにする調整 */
.video-wrapper {
    width: 100%;
    max-width: 800px;
    aspect-ratio: 16 / 9; /* 基本の横長比率を維持しつつレスポンシブ化 */
    max-height: 80vh;
    display: flex;
    justify-content: center;
    align-items: center;
}
/* YouTubeのiframe（#player）を親要素いっぱいに合わせる */
#player {
    width: 100% !important;
    height: 100% !important;
}
/* スマートフォン（縦持ち）のときの調整 */
@media (max-width: 767px) {
    .video-wrapper {
        width: 100%;
        height: auto;
        aspect-ratio: 9 / 16; /* スマホで縦長に見せたい場合はここを調整できます */
        max-height: 70vh;
    }
}
</style>