<template>
    <div class="min-h-screen bg-amber-50 flex flex-col items-center px-6 py-8">

        <h1 class="text-5xl font-bold text-amber-900 drop-shadow mb-8">
            🌱 土のチームへようこそ
        </h1>

        <img
            src="/images/earth.png"
            alt="土の三充師"
            class="max-w-[80vw] max-h-[40vh] rounded-2xl shadow-2xl shadow-amber-300"
        >

        <p class="mt-8 text-xl text-amber-900 text-center leading-9">
            土の三充師は、
            <br>
            大地のちからと育む心を持つ守護者。
            <br>
            しっかりと根を張り、世界をささえ、
            <br>
            いのちを育てるあたたかな存在です。
        </p>

        <button
            @click="goMonitor"
            class="mt-10 px-8 py-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-2xl font-bold transition"
        >
            コントロールルーム（土）にいく
        </button>

    </div>
</template>

<script>
export default {
    name: "TeamEarth",

    methods: {
        goMonitor() {
            localStorage.setItem("myTeam", "earth");

            this.$router.push("/monitor-room");
        }
    }
};
</script>