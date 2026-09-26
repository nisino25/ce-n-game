<template>
    <div v-if="!hasInitialized" class="absolute-center">
        <div class="loader"></div>
    </div>

    <div v-else class="min-h-screen bg-gray-100 py-10">

        <div class="max-w-6xl mx-auto">
            <div class="grid lg:grid-cols-[350px_1fr] gap-8">
                <!-- Left Panel -->
                <div class="bg-white rounded-xl shadow p-6 flex gap-2 items-center">
                    <div class="w-40 aspect-square mx-auto" v-html="avatarSvg"></div>
                    <div>
                        <input type="text" placeholder="ぼうけんしゃの名前" class="border-gray-800 w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400" v-model="playerName">
                        <p v-if="nameError" class="text-red-600 text-sm mt-1">名前を入力してください</p>
                        <button class="my-3 p-3 bg-sky-600 text-white rounded-lg mr-2" @click="randomAll">🎲 シャッフル</button>
                        <div class="flex gap-2 mt-2">
                            <button @click="goNext()" class="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg">保存して進む</button>
                            <button @click="skipSave()" class="p-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">保存しないで進む</button>
                        </div>
                    </div>
                </div>

                <!-- Right Panel -->
                <div class="bg-white rounded-xl shadow p-6 grid grid-cols-2 gap-4">
                    <div v-for="part in parts" :key="part.key" class="mb-2">
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

        <!-- ■確認ダイアログ：ネイティブのconfirm()は環境によって動作しないため、画面内モーダルで代用する -->
        <div v-if="pendingAction" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div class="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl">
                <p class="mb-5 whitespace-pre-line">{{ pendingAction.message }}</p>
                <div class="flex gap-3 justify-center">
                    <button @click="confirmPendingAction" class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">はい</button>
                    <button @click="pendingAction = null" class="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">キャンセル</button>
                </div>
            </div>
        </div>
    </div>

</template>

<script>
import db from './../../firebase.js';
import { getSession, setSession } from '@/utils/session.js';
import { resetCurrentUserCache } from '@/utils/cards.js';
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
            playerName:"",
            nameError: false,
            pendingAction: null,

            loginCenId: null,
            hasInitialized: false,
            uid: null,

            currentUser: null,
        }
    },

    mounted(){
        console.clear()
        this.loginCenId = getSession("loginCenId");
        this.initialCheck()
        // this.randomAll();
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
                this.nameError = true;
                return;
            }
            this.nameError = false;

            this.pendingAction = {
                message: "この内容を保存してモニタールームに進みますか？",
                run: () => this.saveAndGoHome()
            };
        },
        async saveAndGoHome(){
            this.currentUser.name = this.playerName;
            this.currentUser.avatar = this.avatar;

            await db.collection("users").doc(this.uid).update({
                ...this.currentUser
            });

            setSession("playerData", JSON.stringify(this.currentUser));
            // ■MonitorRoom側のgetCurrentUser()が古い内容をキャッシュしたままにならないようにする
            resetCurrentUserCache();

            // go to home
            this.$router.push({ name: "Home" });
        },
        // ■変更を保存せずにモニタールームへ戻る（名前・アバターの編集内容は破棄）
        skipSave(){
            this.pendingAction = {
                message: "保存せずにモニタールームへ戻りますか？\n名前・アバターの変更内容は破棄されます。",
                run: () => this.$router.push({ name: "Home" })
            };
        },
        confirmPendingAction(){
            const action = this.pendingAction;
            this.pendingAction = null;
            if (action) action.run();
        },
        async initialCheck(){

            // const snapshot = await db.collection("users")
            // .get();
            
            // // console.log("All users:", snapshot.docs.map(doc => doc.data()));
            
            const snapshot = await db.collection("users")
                .where("cenId","==",this.loginCenId)
                .get();
            
            
            if(snapshot.empty){
                this.hasInitialized = true;
                console.log("No user found with cenId:", this.loginCenId);
                return false;
            }
            
            
            // const user = snapshot.docs[0].data();
            const userDoc = snapshot.docs[0];
            const user = userDoc.data();

            this.playerName = user.name || "";
            console.log("User found:", user);
            // const uid = userDoc.id;
            this.uid = userDoc.id;

            if(user.avatar) {
                this.avatar = {
                    env: user.avatar.env || 0,
                    clo: user.avatar.clo || 0,
                    head: user.avatar.head || 0,
                    mouth: user.avatar.mouth || 0,
                    eyes: user.avatar.eyes || 0,
                    top: user.avatar.top || 0
                };
            } else {
                this.avatar = {
                    env: 0,
                    clo: 0,
                    head: 0,
                    mouth: 0,
                    eyes: 0,
                    top: 0
                };
            }
            this.avatarSvg = this.$buildAvatar(this.avatar);

            console.log("Avatar loaded:", this.avatar);
                
            this.hasInitialized = true;

            this.currentUser = user;

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