<template>
    <div class="min-h-screen bg-sky-100 flex items-center justify-center px-4">
        <div class="max-w-xl w-full bg-white rounded-2xl shadow-lg p-10 text-center">

            <h1 class="text-4xl font-bold text-sky-700 mb-6">
                ようこそ！
            </h1>

            <p class="text-xl text-gray-700 mb-3">
                いまからぼうけんがはじまるよ✨
            </p>

            <p class="text-lg text-gray-600 mb-10">
                まずは自分のチームを決めよう！<br>
                <span class="font-semibold">
                    風・土・水
                </span>
                のどれになるかな？
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    class="bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition"
                >
                    🌿 風
                </button>

                <button
                    class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition"
                >
                    🪨 土
                </button>

                <button
                    class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition"
                >
                    💧 水
                </button>
            </div>

            <div class="mt-10 flex flex-col items-center">

                <div
                    ref="wheel"
                    class="w-72 h-72 rounded-full bg-center bg-cover transition-transform duration-[3000ms] ease-out"
                    style="background-image: url('/images/madoka_wheel.png');"
                ></div>

                <button
                    @click="spinWheel"
                    :disabled="spinning"
                    class="mt-8 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white font-bold px-8 py-3 rounded-xl"
                >
                    まわす
                </button>

                <p
                    v-if="result"
                    class="mt-6 text-2xl font-bold"
                >
                    {{ result }}
                </p>

            </div>

        </div>
    </div>
</template>

<script>
export default {
    name: "IntroView",

    data() {
        return {
            spinning: false,
            result: "",

            teams: [],
            index: 0
        };
    },

    mounted() {
        this.resetTeams();
    },

    methods: {
        resetTeams() {
            this.teams = this.shuffle([
                "water",
                "earth",
                "air"
            ]);

            this.index = 0;
        },

        shuffle(array) {
            return [...array].sort(() => Math.random() - 0.5);
        },

        spinWheel() {

            if (this.spinning) {
                return;
            }

            this.spinning = true;
            this.result = "";

            const team = this.teams[this.index];

            this.index++;

            if (this.index >= this.teams.length) {
                this.resetTeams();
            }

            const randomSpin = Math.floor(Math.random() * 4) + 4;

            let offset = 0;

            switch (team) {
                case "water":
                    offset = 0;
                    break;

                case "earth":
                    offset = 120;
                    break;

                case "air":
                    offset = 240;
                    break;
            }

            const angle = offset + randomSpin * 360;

            this.$refs.wheel.style.transform =
                `rotate(${angle}deg)`;

            setTimeout(() => {

                localStorage.setItem("myTeam", team);

                const routes = {
                    water: "/team/water",
                    earth: "/team/earth",
                    air: "/team/air"
                };

                const teamNames = {
                    water: "🌊 水チーム",
                    earth: "🌱 土チーム",
                    air: "🍃 風チーム"
                };

                this.result = teamNames[team];

                this.$router.push(routes[team]);

            }, 3000);

        }
    }
};
</script>