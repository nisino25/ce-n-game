<template>
    <div v-if="!hasInitialized" class="absolute-center">
        <div class="loader"></div>
    </div>

    <div v-else class="min-h-screen bg-gray-100 py-10">

        <div class="max-w-6xl mx-auto">
            <div class="grid lg:grid-cols-[350px_1fr] gap-8">
                <!-- Left Panel -->
                <div class="bg-white rounded-xl shadow p-6 flex gap-2 items-center">
                    <div class="w-60 aspect-square mx-auto" v-html="avatarSvg"></div> 
                    <div>
                        <input type="text" placeholder="ぼうけんしゃの名前" class="border-gray-800 w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400" v-model="playerName">
                        <button class="my-3 p-3 bg-sky-600 text-white rounded-lg mr-2" @click="randomAll">🎲 シャッフル</button>
                        <button @click="goNext()" class="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg">▶ 次にすすむ</button>
                    </div>
                </div>

                <!-- Right Panel -->
                <div class="bg-white rounded-xl shadow p-6">
                    <div v-for="part in parts" :key="part.key" class="mb-4">
                        <div class="flex items-center gap-3">
                            <span class="font-semibold w-[70px] text-left">{{ part.label }}</span>
                            <button class="p-1 bg-gray-200 rounded" @click="change(part.key,-1)">◀</button>
                            <input type="range" min="0" max="47" v-model.number="avatar[part.key]" @input="avatarSvg = $buildAvatar(avatar)" class="flex-1">
                            <button class="p-1 bg-gray-200 rounded" @click="change(part.key,1)">▶</button>
                            <span class="w-[15px] text-left">{{ avatar[part.key] + 1 }}</span>
                            <button class="py-2 px-2 bg-blue-500 text-white rounded" @click="randomPart(part.key)">🎲</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>

<script>
import db from './../../firebase.js';
export default {

    data(){
        return {
            avatarSvg:"",
            avatar:{
                env:0,
                clo:0,
                head:0,
                mouth:0,
                eyes:0,
                top:0
            },
            parts:[
                { key:"env", label:"はいけい" },
                { key:"clo", label:"ふく" },
                { key:"head", label:"はだの色" },
                { key:"mouth", label:"口" },
                { key:"eyes", label:"目" },
                { key:"top", label:"かみ" }
            ],
            playerName:"てすと",

            cenId: null,
            hasInitialized: false,
        }
    },

    mounted(){
        console.clear()
        this.cenId = new URLSearchParams(location.search).get("cenId");
        this.initialCheck()
        this.randomAll();
    },

    methods:{
        randomAll(){
            Object.keys(this.avatar).forEach(key=>{
                this.avatar[key] = Math.floor(Math.random()*48);
            });
            this.avatarSvg = this.$buildAvatar(this.avatar);
        },
        randomPart(key){
            this.avatar[key] = Math.floor(Math.random()*48);
            this.avatarSvg = this.$buildAvatar(this.avatar);
        },
        change(key,value){
            this.avatar[key] += value;

            if(this.avatar[key] < 0)
                this.avatar[key] = 47;

            if(this.avatar[key] > 47)
                this.avatar[key] = 0;

            this.avatarSvg = this.$buildAvatar(this.avatar);
        },
        goNext(){
            if(this.playerName.trim() === ""){
                alert("名前を入力してください");
                return;
            }

            this.$router.push({
                name: "Intro",
                query: {
                    name: this.playerName,
                    avatar: JSON.stringify(this.avatar),
                    cenId: this.cenId
                }
            });
        },
        async initialCheck(){
            if(!this.cenId || this.cenId.trim() === ""){
                alert("cenIdが取得できませんでした。");
                this.$router.push("/error");
                return;
            }

            // const snapshot = await db.collection("users")
            // .get();
            
            // // console.log("All users:", snapshot.docs.map(doc => doc.data()));
            
            const snapshot = await db.collection("users")
                .where("cenId","==",this.cenId)
                .get();
            
            
            if(snapshot.empty){

                this.hasInitialized = true;
                console.log("No user found with cenId:", this.cenId);
                return false;
            }
            
            
            const user = snapshot.docs[0].data();
            
            console.log("User found:", user);

            if(user && user.cenId){
                localStorage.setItem("myTeam", this.potentialTeam);

                // const routes = {
                //     water: "/team/water",
                //     earth: "/team/earth",
                //     air: "/team/air"
                // };

                const teamNames = {
                    water: "🌊 水チーム",
                    earth: "🌱 土チーム",
                    air: "🍃 風チーム"
                };

                this.result = teamNames[user.team];
                localStorage.setItem("myTeam", user.team);

                this.$router.push("/monitor-room");

                // this.$router.push(routes[user.team]);
            }
                
            this.hasInitialized = true;

            return user;

        }
    }

}
</script>

<style>
    .absolute-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    }
    .loader {
    height: 45px;
    aspect-ratio: 1.2;
    --c:no-repeat repeating-linear-gradient(90deg,#000 0 20%,#0000 0 40%);
    background: 
        var(--c) 50% 0,
        var(--c) 50% 100%;
    background-size: calc(500%/6) 50%;
    animation: l10 1s infinite linear;


    }
    @keyframes l10 {
    33%  {background-position: 0   0   ,100% 100%}
    66%  {background-position: 0   100%,100% 0   }
    100% {background-position: 50% 100%,50%  0   }
    }
</style>