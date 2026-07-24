<template>
    <div class="min-h-screen bg-sky-950 flex flex-col items-center px-6 py-8">

        <h1 class="text-5xl font-bold text-white drop-shadow mb-8">
            🌊 水のチームへようこそ
        </h1>

        <img
            src="/images/water.png"
            alt="水の三充師"
            class="max-w-[80vw] max-h-[40vh] rounded-2xl shadow-2xl shadow-sky-400"
        >

        <p class="mt-8 text-xl text-white text-center leading-9">
            水の三充師は、
            <br>
            しずかな力とやさしい心を持つ守護者。
            <br>
            きよらかな水の魔法で、世界をうるおし、
            <br>
            みんなをやさしく包みこむ存在です。
        </p>

        <button
            @click="goMonitor"
            class="mt-10 px-8 py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-2xl font-bold transition"
        >
            コントロールルーム（水）にいく
        </button>
    </div>
</template>

<script>
export default {
    name: "TeamWater",

    methods: {
        goMonitor() {
            localStorage.setItem("myTeam", "water");

            this.$router.push("/monitor-room");
        }
    }
};
</script>