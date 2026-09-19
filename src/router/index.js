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
import ABGameProposalB from "@/views/ABGame/ABGameProposalB.vue";


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

    // ■操作感・レイアウトを見直した別案（既存のABGameはそのまま残し、比較用に並行して置いている）
    {
        path: "/ab-game-b",
        name: "ABGameB",
        component: ABGameProposalB
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
    const loginCenId = localStorage.getItem("loginCenId");

    // how do i use these globally

    const publicRoutes = ["LoginPage", "Intro"];

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