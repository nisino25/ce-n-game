<template>
    <div class="relative h-screen w-full">

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
        <div
            ref="map"
            class="h-screen w-full"
        ></div>

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

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "© OpenStreetMap"
            }
        ).addTo(this.map);

        this.createStartMarkers();

    },

    methods: {

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