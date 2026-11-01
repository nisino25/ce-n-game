<template>
    <div v-if="!hasInitialized" class="absolute-center">
        <div class="loader"></div>
    </div>

    <div v-else class="min-h-screen bg-gray-100">
        <!-- ■上にそろえたアバター（スクロールしても見える） -->
        <div class="sticky top-0 z-40 bg-white shadow">
            <div class="max-w-3xl mx-auto px-3 py-2 flex gap-3 items-start">
                <div class="flex flex-col items-center gap-2 shrink-0">
                    <div class="w-20" v-html="avatarSvg"></div>
                    <button class="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-sm whitespace-nowrap" @click="randomAll">🎲 {{ $t('シャッフル', 'Shuffle') }}</button>
                </div>
                <div class="flex-1 min-w-0 flex flex-col gap-2">
                    <div class="flex justify-end">
                        <div class="inline-flex rounded-lg overflow-hidden border border-gray-400 bg-white text-xs font-bold" role="group" aria-label="表示言語 / Language">
                            <button type="button" class="px-2.5 py-1" :class="lang === 'ja' ? 'bg-sky-600 text-white' : 'text-gray-700 hover:bg-gray-100'" @click="changeLang('ja')">日本語</button>
                            <button type="button" class="px-2.5 py-1" :class="lang === 'en' ? 'bg-sky-600 text-white' : 'text-gray-700 hover:bg-gray-100'" @click="changeLang('en')">English</button>
                        </div>
                    </div>
                    <input type="text" :placeholder="$t('ぼうけんしゃの名前', 'Adventurer name')" class="w-full border-gray-800 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400" v-model="playerName">
                    <div class="flex gap-2">
                        <button @click="goNext()" class="flex-1 min-w-0 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">{{ $t('保存', 'Save') }}</button>
                        <button @click="skipSave()" class="flex-1 min-w-0 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg">{{ $t('スキップ', 'Skip') }}</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-3xl mx-auto px-3 py-3">

            <p v-if="nameError" class="text-red-600 text-sm mb-2">{{ $t('名前を入力してください', 'Please enter your name') }}</p>
            <p v-if="hasInitialized && !currentUser" class="text-red-600 text-sm mb-2">{{ $t('会員情報が見つからないため、保存できません。ログインし直してください', 'Your member record was not found, so changes cannot be saved. Please log in again.') }}</p>

            <!-- ■部品ごとに1行：左にラベル、真ん中はサムネイルを横にスライド、右はその部品のシャッフル -->
            <div class="bg-white rounded-xl shadow p-2 pr-0">
                <div v-for="part in rows" :key="part.key" class="flex items-center gap-2 py-2 border-b border-gray-200 last:border-b-0">
                    <div class="w-14 shrink-0 flex flex-col items-center">
                        <span class="text-xs font-bold text-gray-700 leading-tight">{{ $t(part.ja, part.en) }}</span>
                        <button class="px-1.5 py-0.5 bg-blue-500 text-white rounded text-xs leading-tight" @click="randomPart(part.key)">🎲</button>
                    </div>
                    <div :data-strip="part.key" class="thumb-strip flex-1 min-w-0 flex gap-2 overflow-x-auto scroll-smooth py-1 pr-3">
                        <button
                            v-for="thumb in part.thumbs"
                            :key="thumb.index"
                            type="button"
                            :data-index="thumb.index"
                            class="thumb shrink-0 w-[72px] rounded-xl border-2 p-1 bg-sky-50 transition"
                            :class="avatar[part.key] === thumb.index ? 'border-sky-600' : 'border-transparent'"
                            @click="pick(part.key, thumb.index)"
                        >
                            <div class="aspect-square w-full" v-html="thumb.svg"></div>
                        </button>
                    </div>
                </div>
            </div>

        </div>

        <!-- ■確認ダイアログ：ネイティブのconfirm()は環境によって動作しないため、画面内モーダルで代用する -->
        <div v-if="pendingAction" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div class="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl">
                <p class="mb-5 whitespace-pre-line">{{ pendingAction.message }}</p>
                <div class="flex gap-3 justify-center">
                    <button @click="confirmPendingAction" class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">{{ $t('はい', 'Yes') }}</button>
                    <button @click="pendingAction = null" class="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg">{{ $t('キャンセル', 'Cancel') }}</button>
                </div>
            </div>
        </div>
    </div>

</template>

<script>
import db from './../../firebase.js';
import { getSession, setSession } from '@/utils/session.js';
import { resetCurrentUserCache } from '@/utils/cards.js';
import { getLang, setLang } from '@/utils/lang.js';
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
                { key:"env", ja:"はいけい", en:"BG" },
                { key:"clo", ja:"ふく", en:"Outfit" },
                { key:"head", ja:"はだの色", en:"Skin" },
                { key:"mouth", ja:"口", en:"Mouth" },
                { key:"eyes", ja:"目", en:"Eyes" },
                { key:"top", ja:"かみ", en:"Hair" }
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

    computed:{
        lang(){
            return getLang();
        },
        // 部品ごとの行（48種類のサムネイル）。ほかの部品は、いまの組み合わせのまま
        rows(){
            return this.parts.map(part => ({
                ...part,
                thumbs: Array.from({ length: 48 }, (_, index) => ({
                    index,
                    svg: this.$buildAvatar({ ...this.avatar, [part.key]: index }),
                })),
            }));
        },
    },

    mounted(){
        this.$nextTick(() => this.parts.forEach(part => this.showSelectedThumb(part.key, false)));
        console.clear()
        this.loginCenId = getSession("loginCenId");
        this.initialCheck()
        // this.randomAll();
    },

    methods:{
        changeLang(lang){
            setLang(lang);
        },
        randomAll(){
            Object.keys(this.avatar).forEach(key=>{
                this.avatar[key] = Math.floor(Math.random()*48);
            });
            this.avatarSvg = this.$buildAvatar(this.avatar);
        },
        // サムネイルを選んだら、その部品を変える
        pick(key, index){
            this.avatar[key] = index;
            this.avatarSvg = this.$buildAvatar(this.avatar);
            this.$nextTick(() => this.showSelectedThumb(key, true));
        },

        // 選んでいるサムネイルを、その行の真ん中に出す（横だけ動かす）
        showSelectedThumb(key, smooth){
            const strip = this.$el.querySelector(`[data-strip="${key}"]`);
            const el = strip && strip.querySelector(`[data-index="${this.avatar[key]}"]`);
            if (!el) return;
            strip.scrollTo({
                left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2,
                behavior: smooth ? "smooth" : "auto",
            });
        },

        randomPart(key){
            this.avatar[key] = Math.floor(Math.random()*48);
            this.avatarSvg = this.$buildAvatar(this.avatar);
            this.$nextTick(() => this.showSelectedThumb(key, true));
        },

        goNext(){
            // ■会員情報（users）が無いと保存先がないので、保存せずに止める
            if(!this.currentUser) return;

            if(this.playerName.trim() === ""){
                this.nameError = true;
                return;
            }
            this.nameError = false;

            this.pendingAction = {
                message: this.$t("この内容を保存してモニタールームに進みますか？", "Save these changes and go to the Monitor Room?"),
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
                message: this.$t("保存せずにモニタールームへ戻りますか？\n名前・アバターの変更内容は破棄されます。", "Go back to the Monitor Room without saving?\nYour name and avatar changes will be discarded."),
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

<style scoped>
.thumb-strip { scrollbar-width: none; }
.thumb-strip::-webkit-scrollbar { display: none; }
</style>
