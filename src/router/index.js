import { createRouter, createWebHistory } from "vue-router";

import Login from "@/views/Login/Login.vue";

import Intro from "@/views/IntroView/IntroView.vue";
import TeamAir from "@/views/Team/TeamAir.vue";
import TeamWater from "@/views/Team/TeamWater.vue";
import TeamEarth from "@/views/Team/TeamEarth.vue";

import MonitorRoom from "@/views/MonitorRoom/MonitorRoom.vue";

import CaveEntrance from "@/views/CaveAdventure/CaveEntrance.vue"
import CaveGame from "@/views/CaveAdventure/CaveGame.vue"
import CaveEnd from "@/views/CaveAdventure/CaveEnd.vue"

const routes = [
    {
        path: "/",
        redirect: "/login"
    },
    {
        path: "/login",
        name: "Login",
        component: Login
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
    
];

export default createRouter({
    history: createWebHistory(),
    routes
});