<template>
    <div class="relative h-screen w-full">

        <div id="returnGate" @click="returnHome">
        ◉
            <div>帰還ゲート</div>
        </div>
        <div id="warpEffect"></div>
        <!-- Start Message -->
        <div
            v-if="showStartScreen"
            class="absolute bottom-12 left-1/2 z-[1000] -translate-x-1/2 rounded-xl bg-white/90 px-5 py-2.5 text-2xl font-bold shadow"
        >
            赤い三角をクリック
        </div>

        <!-- Title -->
        <div
            v-if="showTitle"
            class="absolute left-1/2 top-5 z-[1000] -translate-x-1/2 rounded-xl bg-white/90 px-5 py-2.5 text-2xl font-bold"
        >
            {{ title }}
        </div>

        <!-- Leaflet Map -->
        <!-- <div
            ref="map"
            class="h-screen w-full"
        >
        </div> -->
        <!-- Leaflet Map -->
        <div class="relative h-screen w-full">
            <div
                ref="map"
                class="h-screen w-full"
            ></div>

            <div class="map-vignette"></div>
        </div>

    </div>
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default {

    data() {
        return {

            map: null,

            showStartScreen: true,

            showTitle: false,

            title: "日本",

            hiratsukaMarker: null,

            kushiroMarker: null

        };
    },

    mounted() {

        this.map = L.map(this.$refs.map, {
            zoomControl: false
        }).setView(
            [36.2048, 138.2529],
            5
        );

        // L.tileLayer(
        //     "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        //     {
        //         attribution: "© OpenStreetMap"
        //     }
        // ).addTo(this.map);
//         L.tileLayer(
//     "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
//     {
//         attribution: "© OpenStreetMap © CARTO"
//     }
// ).addTo(this.map);
// L.tileLayer(
//     "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
//     {
//         attribution: "© OpenStreetMap © CARTO"
//     }
// ).addTo(this.map);
// L.tileLayer(
//     "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
//     {
//         attribution: "© OpenStreetMap contributors, SRTM | OpenTopoMap"
//     }
// ).addTo(this.map);
// L.tileLayer(
//     "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png",
//     {
//         maxZoom: 20,
//         attribution: "© Stadia Maps © Stamen Design © OpenStreetMap"
//     }
// ).addTo(this.map);



// L.tileLayer(
//     "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
//     {
//         maxZoom: 20,
//         attribution: "© Stadia Maps © Stamen Design © OpenStreetMap"
//     }
// ).addTo(this.map);

// L.tileLayer(
//     "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png",
//     {
//         maxZoom: 20,
//         attribution: "© Stadia Maps © Stamen Design © OpenStreetMap"
//     }
// ).addTo(this.map);
// L.tileLayer(
//     "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
//     {
//         maxZoom: 16,
//         attribution: "© Stadia Maps © Stamen Design © OpenStreetMap"
//     }
// ).addTo(this.map);
// L.tileLayer(
//     "https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png",
//     {
//         maxZoom: 20,
//         attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap"
//     }
// ).addTo(this.map);
L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    {
        maxZoom: 20,
        attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap"
    }
).addTo(this.map);
        this.createStartMarkers();

    },

    methods: {
        returnHome() {
            const warp = document.getElementById("warpEffect");
            if (warp) {
                warp.style.width = "300vmax";
                warp.style.height = "300vmax";
            }

            setTimeout(() => {
                this.$router.push("/");
            }, 800);
        },

        createStartMarkers() {

            // 平塚市
            this.hiratsukaMarker = L.marker(
                [35.3150, 139.3497],
                {
                    icon: L.divIcon({
                        className: "",
                        html: `
                            <div class="
                                cursor-pointer
                                whitespace-nowrap
                                text-3xl
                                font-bold
                                text-red-500
                                animate-pulse
                            ">
                                ▲ 平塚市
                            </div>
                        `,
                        iconSize: [100, 40],
                        iconAnchor: [50, 20]
                    })
                }
            )
            .addTo(this.map)
            .on("click", () => {
                this.startHiratsuka();
            });


            // 釧路市
            this.kushiroMarker = L.marker(
                [42.9849, 144.3814],
                {
                    icon: L.divIcon({
                        className: "",
                        html: `
                            <div class="
                                cursor-pointer
                                whitespace-nowrap
                                rounded-lg
                                border-2
                                border-red-500
                                bg-white
                                px-2
                                py-1
                                text-sm
                                font-bold
                            ">
                                ■ 釧路市
                            </div>
                        `,
                        iconSize: [90, 40],
                        iconAnchor: [45, 20]
                    })
                }
            )
            .addTo(this.map)
            .on("click", () => {
                this.startKushiro();
            });

        },


        startHiratsuka() {

            this.startZoom(
                "神奈川県",
                [35.4478, 139.6425],
                9,

                "平塚市",
                [35.3150, 139.3497],
                14,

                "フィールド"
            );

        },


        startKushiro() {

            this.startZoom(
                "北海道",
                [43.2203, 142.8635],
                7,

                "釧路市",
                [42.9849, 144.3814],
                10,

                "釧路フィールド"
            );

        },


        startZoom(
            prefName,
            prefPos,
            prefZoom,

            cityName,
            cityPos,
            cityZoom,

            popupText
        ) {

            // Hide start UI
            this.showStartScreen = false;

            this.showTitle = true;

            // Remove clickable markers
            if (this.hiratsukaMarker) {
                this.map.removeLayer(this.hiratsukaMarker);
            }

            if (this.kushiroMarker) {
                this.map.removeLayer(this.kushiroMarker);
            }


            // Prefecture
            setTimeout(() => {

                this.map.invalidateSize();

                this.title = prefName;

                this.map.flyTo(
                    prefPos,
                    prefZoom,
                    {
                        animate: true,
                        duration: 2
                    }
                );

            }, 100);


            // City
            setTimeout(() => {

                this.title = cityName;

                this.map.flyTo(
                    cityPos,
                    cityZoom,
                    {
                        animate: true,
                        duration: 2
                    }
                );

            }, 2500);


            // Popup
            setTimeout(() => {

                L.marker(cityPos)
                    .addTo(this.map)
                    .bindPopup(popupText)
                    .openPopup();

            }, 5000);


            // Go to game
            setTimeout(() => {
              this.$router.push(`/dominationGame`);
            }, 6000);

        }

    }

};
</script>

<style scoped>


#returnGate {
    position: fixed;
    left: 7.5%;
    top: 30px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 4px solid #00ffff;
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.2;
    cursor: pointer;
    box-shadow:
        0 0 20px #00ffff,
        inset 0 0 20px #00ffff;
    animation: pulse 2s infinite;
    z-index: 1000;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

#warpEffect {
    position: fixed;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: white;
    transform: translate(-50%, -50%);
    z-index: 9999;
    pointer-events: none;
    transition: width 1.2s ease, height 1.2s ease;
}

/* .map-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 500;

    background:
        radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 0.55) 8%,
            rgba(255, 255, 255, 0.15) 18%,
            transparent 30%
        ),
        radial-gradient(
            circle at center,
            transparent 0%,
            rgba(0, 0, 0, 0.25) 20%,
            rgba(0, 0, 0, 0.65) 45%,
            rgba(0, 0, 0, 0.9) 70%,
            rgba(0, 0, 0, 0.98) 100%
        );
} */

.map-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 500;

    background:
        radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.45) 0%,
            rgba(255, 255, 255, 0.25) 8%,
            rgba(255, 255, 255, 0.08) 18%,
            transparent 30%
        ),
        radial-gradient(
            circle at center,
            transparent 0%,
            rgba(0, 0, 0, 0.25) 20%,
            rgba(0, 0, 0, 0.65) 45%,
            rgba(0, 0, 0, 0.9) 70%,
            rgba(0, 0, 0, 0.98) 100%
        );
}

</style>