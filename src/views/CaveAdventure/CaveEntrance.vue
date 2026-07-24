<template>
    <div
        v-if="showStart"
        class="fixed inset-0 flex items-center justify-center bg-black"
    >
        <button
            class="absolute inset-0"
            @click="startGame"
        ></button>

        <img
            src="/images/cave/cave-entrance.png"
            class="w-[90vw] max-w-[700px] rounded-xl"
        >
    </div>
</template>

<script>
export default {

    data() {
        return {
            showStart: true
        };
    },

    methods: {

        startGame() {
            this.$router.push("/cave-adventure/cave-game");
        }

    }

};
</script>