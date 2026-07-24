<template>
    <div class="min-h-screen bg-sky-100 flex flex-col items-center px-6 py-8">

        <h1 class="text-5xl font-bold text-sky-800 drop-shadow mb-8">
            💨 空気のチームへようこそ
        </h1>

        <img
            src="/images/air.png"
            alt="空気の三充師"
            class="max-w-[80vw] max-h-[40vh] rounded-2xl shadow-2xl"
        >

        <p class="mt-8 text-xl text-sky-900 text-center leading-9">
            空気の三充師は、
            <br>
            ふわりと軽やかに世界をめぐる風の守護者。
            <br>
            やわらかな風でみんなの心をととのえ、
            <br>
            そっと背中を押してくれる存在です。
        </p>

        <button
            @click="goMonitor"
            class="mt-10 px-8 py-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-2xl font-bold transition"
        >
            コントロールルーム（空気）にいく
        </button>

    </div>
</template>

<script>
export default {
    name: "TeamAir",

    methods: {
        goMonitor() {
            localStorage.setItem("myTeam", "air");

            this.$router.push("/monitor-room");
        }
    }
};
</script>