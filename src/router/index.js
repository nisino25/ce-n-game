import { createRouter, createWebHistory } from "vue-router";

import LoginPage from "@/views/LoginPage/LoginPage.vue";

import Intro from "@/views/IntroView/IntroView.vue";
import TeamAir from "@/views/Team/TeamAir.vue";
import TeamWater from "@/views/Team/TeamWater.vue";
import TeamEarth from "@/views/Team/TeamEarth.vue";

import MonitorRoom from "@/views/MonitorRoom/MonitorRoom.vue";

import DominationGame from "@/views/DominationGame/DominationGame.vue";
import DominationMap from "@/views/DominationGame/DominationMap.vue";

import CaveEntrance from "@/views/CaveAdventure/CaveEntrance.vue"
import CaveGame from "@/views/CaveAdventure/CaveGame.vue"
import CaveEnd from "@/views/CaveAdventure/CaveEnd.vue"

import ErrorView from "@/views/ErrorView/ErrorView.vue";

import ProfileEditor from "@/views/Settings/ProfileEditor.vue";

const routes = [
    {
        path: "/",
        redirect: "/loginPage"
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
        path: "/team/air",
        component: TeamAir
    },
    {
        path: "/team/water",
        component: TeamWater
    },
    {
        path: "/team/earth",
        component: TeamEarth
    },

    {
        path: "/monitor-room",
        name: "MonitorRoom",
        component: MonitorRoom
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
    
];

export default createRouter({
    history: createWebHistory(),
    routes
});