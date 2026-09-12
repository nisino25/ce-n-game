<template>
    <div
        class="min-h-screen flex flex-col items-center px-6 py-8"
        :class="teamConfig.bgClass"
    >
        <h1
            class="text-2xl font-bold drop-shadow mb-4"
            :class="teamConfig.titleClass"
        >
            {{ teamConfig.icon }} {{ teamConfig.title }}のチームへようこそ
        </h1>

        <img
            :src="teamConfig.image"
            :alt="teamConfig.alt"
            class="max-w-[80vw] max-h-[40vh] rounded-2xl shadow-2xl"
            :class="teamConfig.imageClass"
        >

        <p
            class="mt-4 text-lg text-center"
            :class="teamConfig.textClass"
        >
            {{ teamConfig.description[0] }}
            <br>
            {{ teamConfig.description[1] }}
            <br>
            {{ teamConfig.description[2] }}
            <br>
            {{ teamConfig.description[3] }}
        </p>

        <button
            @click="setAvatar"
            class="mt-2 px-8 py-2 rounded-xl text-white text-xl font-bold transition"
            :class="teamConfig.buttonClass"
        >
            アバターを決める
        </button>
    </div>
</template>

<script>
export default {
    name: "TeamIntro",

    computed: {
        team() {
            return this.$route.params.team || this.$route.query.team || localStorage.getItem("myTeam") || "water";
        },

        teamConfig() {
            const configs = {
                air: {
                    title: "空気",
                    icon: "💨",
                    image: "/images/air.png",
                    alt: "空気の三充師",
                    bgClass: "bg-sky-100",
                    titleClass: "text-sky-800",
                    textClass: "text-sky-900",
                    imageClass: "",
                    buttonClass: "bg-sky-500 hover:bg-sky-600",
                    description: [
                        "空気の三充師は、",
                        "ふわりと軽やかに世界をめぐる風の守護者。",
                        "やわらかな風でみんなの心をととのえ、",
                        "そっと背中を押してくれる存在です。"
                    ]
                },
                earth: {
                    title: "土",
                    icon: "🌱",
                    image: "/images/earth.png",
                    alt: "土の三充師",
                    bgClass: "bg-amber-50",
                    titleClass: "text-amber-900",
                    textClass: "text-amber-900",
                    imageClass: "shadow-amber-300",
                    buttonClass: "bg-amber-700 hover:bg-amber-800",
                    description: [
                        "土の三充師は、",
                        "大地のちからと育む心を持つ守護者。",
                        "しっかりと根を張り、世界をささえ、",
                        "いのちを育てるあたたかな存在です。"
                    ]
                },
                water: {
                    title: "水",
                    icon: "🌊",
                    image: "/images/water.png",
                    alt: "水の三充師",
                    bgClass: "bg-sky-950",
                    titleClass: "text-white",
                    textClass: "text-white",
                    imageClass: "shadow-sky-400",
                    buttonClass: "bg-sky-600 hover:bg-sky-700",
                    description: [
                        "水の三充師は、",
                        "しずかな力とやさしい心を持つ守護者。",
                        "きよらかな水の魔法で、世界をうるおし、",
                        "みんなをやさしく包みこむ存在です。"
                    ]
                }
            };

            return configs[this.team] || configs.water;
        }
    },

    methods: {
        setAvatar() {
            localStorage.setItem("myTeam", this.team);
            this.$router.push({
							name: "ProfileEditor"
					});
        }
    }
};
</script>
