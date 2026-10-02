import { createRouter, createWebHistory } from "vue-router";

import LoginPage from "@/views/LoginPage/LoginPage.vue";

import Intro from "@/views/IntroView/IntroView.vue";
import TeamIntro from "@/views/Team/TeamIntro.vue";
import MonitorRoom from "@/views/MonitorRoom/MonitorRoom.vue";

import DominationGame from "@/views/DominationGame/DominationGame.vue";
import DominationMap from "@/views/DominationGame/DominationMap.vue";

import CaveEntrance from "@/views/CaveAdventure/CaveEntrance.vue";
import CaveGame from "@/views/CaveAdventure/CaveGame.vue";
import CaveEnd from "@/views/CaveAdventure/CaveEnd.vue";

import ErrorView from "@/views/ErrorView/ErrorView.vue";

import ProfileEditor from "@/views/Settings/ProfileEditor.vue";

import ABGame from "@/views/ABGame/ABGame.vue";
import CardLibrary from "@/views/CardLibrary/CardLibrary.vue";
import ABGameProposalB from "@/views/ABGame/ABGameProposalB.vue";

import CreatureScan from "@/views/CreatureScan/CreatureScan.vue";

import { getSession } from "@/utils/session.js";

import CardAdmin from "@/views/Admin/CardAdmin.vue";
import DocsView from "@/views/Docs/DocsView.vue";
import NoticeBoard from "@/views/NoticeBoard/NoticeBoard.vue";
import CommentsAdmin from "@/views/Admin/CommentsAdmin.vue";
import HabitatCompare from "@/views/HabitatCompare/HabitatCompare.vue";
import DeviceStats from "@/views/Admin/DeviceStats.vue";


const routes = [
    {
        path: "/",
        name: "Home",
        component: MonitorRoom
    },
    {
        path: "/monitor-room",
        redirect: "/"
    },

    {
        path: "/loginPage",
        name: "LoginPage",
        component: LoginPage
    },

    {
        path: "/intro",
        name: "Intro",
        component: Intro
    },

    {
        path: "/teamIntro",
        name: "TeamIntro",
        component: TeamIntro
    },

    {
        path: "/cave-adventure/cave-entrance",
        name: "CaveEntrance",
        component: CaveEntrance
    },
    {
        path: "/cave-adventure/cave-game",
        name: "CaveGame",
        component: CaveGame
    },
    {
        path: "/cave-adventure/cave-end",
        name: "CaveEnd",
        component: CaveEnd
    },

    {
        path: "/dominationGame",
        name: "DominationGame",
        component: DominationGame
    },

    {
        path: "/dominationMap",
        name: "DominationMap",
        component: DominationMap
    },

    {
        path: "/settings/profile-editor",
        name: "ProfileEditor",
        component: ProfileEditor
    },

    {
        path: "/error",
        name: "Error",
        component: ErrorView
    },

    // ■仮設置：本来は陣取りゲーム(地図)側に組み込む予定
    {
        path: "/ab-game",
        name: "ABGame",
        component: ABGame
    },

    // ■カードライブラリ：登録されている全カードと自分の所持枚数（仮：モニタールームの仮リンクから）
    {
        path: "/card-library",
        name: "CardLibrary",
        component: CardLibrary
    },

    // ■操作感・レイアウトを見直した別案（既存のABGameはそのまま残し、比較用に並行して置いている）
    {
        path: "/ab-game-b",
        name: "ABGameB",
        component: ABGameProposalB
    },

    // ■カード管理画面
    { 
        path: "/card-admin", 
        name: "CardAdmin", 
        component: CardAdmin 
    },
    
    // ■かんばん：これからのアップデートのお知らせと、みんなの声（コメント）を送る場所
    {
        path: "/notice-board",
        name: "NoticeBoard",
        component: NoticeBoard
    },

    // ■みんなの声を読む画面（管理者用の仮画面。モニタールームの仮リンクから）
    {
        path: "/comments-admin",
        name: "CommentsAdmin",
        component: CommentsAdmin
    },

    // ■どんな端末で使われているかの集計（管理者用の仮画面。モニタールームの仮リンクから）
    {
        path: "/device-stats",
        name: "DeviceStats",
        component: DeviceStats
    },

    // ■試作：すみか（海・町・森）で盤面がどう変わるかの比較ページ（比較が終わったら削除する）
    {
        path: "/habitat-compare",
        name: "HabitatCompare",
        component: HabitatCompare
    },

    // ■ドキュメント一覧（docs/ のmdを表示。モニタールームの仮リンクから）
    {
        path: "/docs",
        name: "Docs",
        component: DocsView
    },

    {
        path: "/creature-scan",
        name: "CreatureScan",
        component: CreatureScan
    }
];


const router = createRouter({
    history: createWebHistory(),
    routes
});


// router.beforeEach((to) => {
//     // login or intro should be all user free
//     if (to.name === "LoginPage" ||
//         to.name === "Intro" ||
//         to.name === "TeamIntro") {
//         return true;
//     }

//     const loginCenId = localStorage.getItem("loginCenId");

//     if (!loginCenId) {
//         return {
//             name: "LoginPage"
//         };
//     }

//     return true;
// });

router.beforeEach((to) => {
    const loginCenId = getSession("loginCenId");

    // ■Errorページは未ログイン状態（例：ce-n.orgに存在しないIDでのログイン試行）でも
    // 表示できる必要があるため、ログイン判定より先に常に許可する
    if (to.name === "Error") {
        return true;
    }

    // ■ドキュメントページは、ログインしていない人にも、URLで見せられるようにする（共有用）。
    //   ページには検索エンジンに出さない指定（noindex）を付けている（DocsView.vue）
    if (to.name === "Docs") {
        return true;
    }

    // ■LoginPageはPWAの起動先やce-n.org側のリンクから何度でも訪れる想定のため、
    // ログイン済みでもErrorにはせず、そのままHomeへ通す（再度findMeを叩き直す必要は無い）
    if (to.name === "LoginPage") {
        if (loginCenId) {
            return { name: "Home" };
        }
        return true;
    }

    // ■Introは新規登録フローなので、ログイン済みでの再訪はErrorへ（誤って登録し直すのを防ぐ）
    const publicRoutes = ["Intro"];

    if (publicRoutes.includes(to.name)) {
        if (loginCenId) {
            return { name: "Error" };
        }
        return true;
    }

    if (!loginCenId) {
        return { name: "LoginPage" };
    }

    return true;
});


export default router;