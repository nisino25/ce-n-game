<template>
    <div class="relative h-screen w-full">

        <div id="returnGate" @click="returnHome">
            <span class="gate-core"></span>
            <span class="gate-label">帰還ゲート</span>
        </div>
        <div id="warpEffect"></div>
        <!-- Start Message -->
        <div
            v-if="showStartScreen"
            class="map-hint absolute bottom-12 left-1/2 z-[1000] -translate-x-1/2"
        >
            まちを タップしてね
        </div>

        <!-- ■ひとつもどる：拡大したあと、日本全体の地図にもどす -->
        <button
            v-if="showTitle"
            class="map-back absolute right-4 top-5 z-[1000]"
            @click="backToJapan"
        >
            <span class="map-back-arrow">◀</span> もどる
        </button>

        <!-- Title -->
        <div
            v-if="showTitle"
            class="map-title absolute left-1/2 top-5 z-[1000] -translate-x-1/2"
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

        <!-- ■平塚市の画面だけ：どのチームが、いくつのゲームに勝っているか（赤＝AIの勝ち） -->
        <div
            v-if="showTally && showTitle"
            class="absolute bottom-4 left-1/2 z-[1000] flex max-w-[96vw] -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-2xl bg-[#10151c]/90 px-3 py-2 shadow-lg"
        >
            <span class="mr-0.5 text-xs font-bold text-slate-300">{{ isAiTest ? '勝率' : 'かった かず' }}</span>
            <span
                v-for="team in ['water', 'air', 'earth']"
                :key="team"
                class="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-black text-slate-900"
                :style="{ background: teamColors[team] }"
            >
                {{ teamNames[team] }} {{ teamTally[team] }}<template v-if="isAiTest"> ({{ tallyTotal ? Math.round(teamTally[team] / tallyTotal * 100) : 0 }}%)</template>
            </span>
            <span v-if="isAiTest" class="ml-0.5 text-xs font-bold text-slate-400">{{ tallyTotal }}戦</span>
        </div>

        <!-- ■案内メッセージ（ゲームの画面から追い返されたときなど） -->
        <div
            v-if="notice"
            class="absolute left-1/2 top-20 z-[1500] w-[90%] max-w-sm -translate-x-1/2 rounded-xl bg-black/85 px-4 py-3 text-center text-sm font-bold text-yellow-100 shadow-lg"
        >
            {{ notice }}
        </div>

        <!-- ■場所をタップ：その場所の3つのゲームから選ぶ -->
        <div
            v-if="spotSheet"
            class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
            @click.self="spotSheet = null"
        >
            <div class="w-full max-w-sm rounded-2xl border-2 border-cyan-300 bg-[#10151c] p-5 text-white shadow-[0_0_24px_rgba(0,255,255,.35)]">
                <p class="text-center text-2xl font-black">
                    {{ spotSheet.icon }} {{ spotSheet.name }}
                    <span class="ml-1 rounded-full bg-white/15 px-2 py-0.5 align-middle text-xs font-bold">{{ habitatLabel(spotSheet.habitat) }}</span>
                </p>
                <p class="mb-4 mt-1 text-center text-sm font-bold text-cyan-200">どの ゲームを あそぶ？</p>

                <!-- ■自分はどこか1つのゲームでしか遊べない：あそび中のゲームがあるときの案内 -->
                <div
                    v-if="myActiveSlots[spotSheet.city] && myActiveSlots[spotSheet.city].spotId !== spotSheet.id"
                    class="mb-3 rounded-xl border border-yellow-300/60 bg-yellow-300/10 p-3 text-sm font-bold text-yellow-100"
                >
                    {{ spotSheet.city === 'hiratsuka' ? '平塚市' : '釧路市' }}では、いま「{{ myActiveSlots[spotSheet.city].spotName }} ゲーム{{ myActiveSlots[spotSheet.city].gameNo }}」を あそび中だよ。
                    おわらせると、ほかの ゲームが あそべるよ。
                    <button class="mt-2 w-full rounded-lg bg-yellow-300 px-3 py-2 font-black text-slate-900" @click="goToMyActiveSlot(spotSheet.city)">
                        ▶ そこへ いく
                    </button>
                </div>

                <div class="flex flex-col gap-2.5">
                    <button
                        v-for="gameNo in [1, 2, 3]"
                        :key="gameNo"
                        class="flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left active:scale-[.98] disabled:cursor-not-allowed"
                        :style="gameButtonStyle(slotInfo(spotSheet, gameNo), isSlotDisabled(spotSheet, gameNo))"
                        :disabled="isSlotDisabled(spotSheet, gameNo)"
                        @click="startSpotGame(spotSheet, gameNo)"
                    >
                        <span class="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-black/25 text-2xl font-black">{{ gameNo }}</span>
                        <span>
                            <span class="block text-lg font-black">ゲーム{{ gameNo }}</span>
                            <span class="block text-sm font-bold">{{ gameStateLabel(slotInfo(spotSheet, gameNo)) }}</span>
                        </span>
                    </button>
                </div>

                <button
                    class="mt-4 w-full rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold hover:bg-white/10"
                    @click="spotSheet = null"
                >
                    やめる
                </button>
            </div>
        </div>

        <!-- ■地域チュートリアル（初回のみ）：拡大のあと、六角形が出る前に YouTube視聴 → ABゲーム（提案B） -->
        <div
            v-if="tutorial"
            class="fixed inset-0 z-[3000] flex items-center justify-center overflow-y-auto bg-black/75 p-4"
        >
            <div
                v-show="tutorial.phase === 'video'"
                class="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl"
            >
                <p class="mb-3 text-center text-lg font-bold">
                    {{ tutorial.cityName }}のチュートリアル動画を見よう！
                </p>
                <div class="relative w-full overflow-hidden rounded-xl bg-black" style="padding-top: 56.25%;">
                    <div ref="tutorialPlayer" class="absolute inset-0 h-full w-full"></div>
                </div>
                <p class="mt-3 text-center text-sm text-gray-500">
                    動画が終わると、つぎは ABゲームだよ
                </p>
            </div>

            <div
                v-if="tutorial.phase === 'game'"
                class="my-auto max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#f4f1e8] shadow-xl"
            >
                <ABGameProposalB embedded @finish="finishTutorial" />
            </div>
        </div>

    </div>
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import db from "@/firebase.js";
import { getSession } from "@/utils/session.js";
import { isTestMode } from "@/utils/env.js";
import mapSpotsSeed from "./mapSpots.json";
import ABGameProposalB from "@/views/ABGame/ABGameProposalB.vue";
import { slotId, isFresh, TEAM_COLORS, TEAM_NAMES } from "@/utils/dominationSlots.js";

// ■日本全体の表示範囲（九州の南〜北海道の北）
const JAPAN_BOUNDS = [[30.9, 129.3], [45.8, 146.2]];

// ■六角形の並び：5段（4・3・4・3・4個）。一番長い段も4個にして、六角形を大きくする
const HEX_ROWS = [4, 3, 4, 3, 4];

// ■すみかの札（六角形の中に出す。色ではなく文字で伝える：色はゲームの結果を塗るために取っておく）
const HABITAT_LABELS = { town: "町", forest: "森", dirt: "土", river: "川", sea: "海" };


// ■地域ごとのチュートリアル動画（YouTubeの動画ID）
const TUTORIAL_VIDEOS = {
    hiratsuka: "LkptvoPEU9c", // https://youtu.be/LkptvoPEU9c 平塚紹介動画
    kushiro: "scAUVlCOpsY" // https://youtu.be/scAUVlCOpsY 釧路紹介動画
};

let youtubeApiPromise = null;

const loadYouTubeApi = () => {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise(resolve => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (prev) prev();
            resolve(window.YT);
        };
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
    });
    return youtubeApiPromise;
};

export default {
    components: { ABGameProposalB },

    data() {
        return {

            map: null,

            showStartScreen: true,

            showTitle: false,

            title: "日本",

            hiratsukaMarker: null,

            kushiroMarker: null,
            testMarker: null,
            // ■追加：エリア表示
            honeycombLayers: [],
            spots: mapSpotsSeed.spots, // 場所の一覧。Firestoreのmapspots（loadSpots）で上書きする。読めないときは同梱のデータを使う
            directCity: null, // 街の六角形の画面から始めたときの街（hiratsuka / kushiro）
            hexRadius: 80, // いまの六角形の大きさ（画面のピクセル）
            slots: {}, // 「場所ID-ゲーム番号」→ { state: none / mine / other / won, ownerName, winnerTeam }
            myActiveSlots: {}, // 街ごとの、自分があそび中のゲーム（街ごとに1つだけ。平塚と釧路は1つずつ同時に遊べる）
            teamTally: { water: 0, air: 0, earth: 0 }, // チームごとの勝った数
            teamColors: TEAM_COLORS,
            teamNames: TEAM_NAMES,
            notice: "",
            spotShapes: {}, // 場所ID → 地図に描いたひし形（塗り直し用）
            spotSheet: null, // 3つのゲームを選ぶ画面を開いている場所
            zoomTimers: [], // 拡大の演出で予約しているタイマー（もどるときに取り消す）

            // ■地域チュートリアル
            uid: null,
            tutorialCleared: {},
            userLoading: null,
            // ■最後に入った場所（平塚市・釧路市）。ハチの巣をタップして陣取りゲームに入るときに保存し、モニタールームの「つづきから」で使う
            currentPlace: null,
            tutorial: null // { location, cityName, phase: "video" | "game", onDone }

        };
    },

    computed: {
        // ■水・風・土のチームごとの勝った数を出す（平塚市の画面だけ）
        showTally() {
            return !!this.currentPlace && (this.currentPlace.city === "hiratsuka" || this.currentPlace.city === "aitest");
        },

        // ■AIテストでは、勝った数に加えて、勝率（おわったゲームのうち、そのチームが勝った割合）を出す
        isAiTest() {
            return !!this.currentPlace && this.currentPlace.city === "aitest";
        },

        tallyTotal() {
            return this.teamTally.water + this.teamTally.air + this.teamTally.earth;
        }
    },

    mounted() {

        // ■陣取りゲームの「平塚市にもどる」から来たときは、日本の地図を見せず、その街の六角形の画面から始める
        const directCity = mapSpotsSeed.cities[this.$route.query.city] && (!mapSpotsSeed.cities[this.$route.query.city].test || isTestMode()) ? this.$route.query.city : null;
        this.directCity = directCity;
        if (directCity) {
            this.currentPlace = { city: directCity, cityName: mapSpotsSeed.cities[directCity].name };
            this.showStartScreen = false;
            this.showTitle = true;
            this.title = this.currentPlace.cityName;
        }

        // ■ゲームの画面から追い返されたときの案内
        const notices = {
            busy: "そのゲームは、ほかの人が あそび中だったよ",
            done: "そのゲームは、もう おわっているよ",
            active: "この街で あそび中の ゲームが あるよ。おわらせてから、ほかの ゲームを あそんでね",
            nogame: "そのゲームは、もう 見られないよ"
        };
        if (notices[this.$route.query.notice]) this.showNotice(notices[this.$route.query.notice]);

        this.map = L.map(this.$refs.map, {
            zoomControl: false,
            zoomSnap: 0.25
        });
        // ■最初は仮の位置。コンテナの大きさが決まったら、下のResizeObserverで九州〜北海道がちょうど入る大きさに合わせる
        this.map.setView([37.5, 138], 5);

        // ■日本地図：遊べる地域（神奈川・北海道）だけを緑に光らせ、ほかの都道府県はうすく見せる。
        //   境界図は軽くした自前のデータ（public/geo/japan-simple.json、約120KB）。以前は外部の13MBのデータを毎回読んでいた
        fetch("/geo/japan-simple.json")
          .then(response => response.json())
          .then(data => {
            const others = L.geoJSON(data, {
              filter: feature => !feature.properties.playable,
              interactive: false,
              style: {
                fillColor: "#94a3b8",
                fillOpacity: 0.12,
                color: "#ffffff",
                opacity: 0.25,
                weight: 0.6
              }
            });
            const playable = L.geoJSON(data, {
              filter: feature => feature.properties.playable,
              interactive: false,
              style: {
                className: "play-region",
                fillColor: "#34d399",
                fillOpacity: 0.7,
                color: "#d1fae5",
                opacity: 0.95,
                weight: 1.6
              }
            });
            this.japanLayer = L.layerGroup([others, playable]);
            // 街の六角形の画面から始めたときは、日本の地図は「もどる」のときのために持っておくだけにする
            if (!this.directCity) this.japanLayer.addTo(this.map);
          })
          .catch(error => {
            console.error("日本地図の読み込みに失敗しました:", error);
          });

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
// Stadia Maps・CARTOはlocalhost以外ではAPIキーが必要でNetlify上では表示されないため
// キー不要の国土地理院 淡色地図を使用
L.tileLayer(
    "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    {
        maxZoom: 18,
        // 元のStadia(alidade_smooth)に近いシンプルな見た目にするため、CSSで彩度を落とす
        className: "simple-tiles",
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>国土地理院</a>"
    }
).addTo(this.map);
        // 街の六角形の画面から始めたときは、街のふだは出さない（「◀ もどる」で日本の地図にもどったときに出す）
        if (!this.directCity) this.createStartMarkers();

        this.userLoading = this.loadUser();
        this.loadSpots();

        // マウント直後はコンテナの高さが0のことがあり、地図が上端にしか描画されないため
        // サイズが変わったら再計算する
        this.japanFitted = false;
        this.resizeObserver = new ResizeObserver(() => {
            if (!this.map) return;
            this.map.invalidateSize();
            if (!this.japanFitted && this.$refs.map.clientHeight > 0) {
                if (this.directCity) {
                    // ■街の六角形の画面：その街の中心に合わせて、六角形を出す
                    this.japanFitted = true;
                    const center = mapSpotsSeed.cities[this.directCity].center;
                    this.map.setView(center, 13, { animate: false });
                    this.createHoneycomb(center);
                } else if (this.showStartScreen) {
                    // ■最初に大きさが決まった瞬間に、日本全体（九州〜北海道）に合わせる
                    this.japanFitted = true;
                    this.map.fitBounds(JAPAN_BOUNDS, { padding: [8, 8], animate: false });
                }
            }
        });
        this.resizeObserver.observe(this.$refs.map);

    },

    beforeUnmount() {
        this.destroyTutorialPlayer();
        if (this.resizeObserver) this.resizeObserver.disconnect();
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

        // ■拡大した画面から、最初の日本全体の地図にもどす（演出の途中でも押せる）
        backToJapan() {
            this.zoomTimers.forEach(clearTimeout);
            this.zoomTimers = [];

            if (this.showHoneycombHandler) this.map.off("moveend", this.showHoneycombHandler);
            this.clearHoneycomb();

            // ■日本の緑の地域は、拡大が終わってから出す（拡大の途中で出すと、緑の光の形が、四角くくずれて見える）
            if (this.showJapanHandler) this.map.off("moveend", this.showJapanHandler);
            let japanShown = false;
            const showJapan = () => {
                if (japanShown) return;
                japanShown = true;
                if (this.japanLayer && !this.map.hasLayer(this.japanLayer)) this.japanLayer.addTo(this.map);
            };
            this.showJapanHandler = showJapan;
            this.map.once("moveend", showJapan);
            this.zoomTimers.push(setTimeout(showJapan, 4000));

            if (this.hiratsukaMarker) this.map.removeLayer(this.hiratsukaMarker);
            if (this.kushiroMarker) this.map.removeLayer(this.kushiroMarker);
            if (this.testMarker) this.map.removeLayer(this.testMarker);
            this.createStartMarkers();

            this.currentPlace = null;
            this.showTitle = false;
            this.showStartScreen = true;
            this.title = "日本";

            this.map.flyToBounds(JAPAN_BOUNDS, { padding: [8, 8], animate: true, duration: 2.5 });
        },

        createStartMarkers() {
            // ■平塚市・釧路市は同じデザインのマーカーにそろえる（光る緑の地域の上に、タップできる街として出す）
            const cityMarker = (position, name, onClick) => L.marker(position, {
                icon: L.divIcon({
                    className: "",
                    // 名前のふだだけ。街の場所（緑の地域）が隠れないよう、ふだは地点の少し下に置く。
                    html: `<div class="city-marker">${name}</div>`,
                    iconSize: [160, 34],
                    iconAnchor: [80, -22]
                })
            })
                .addTo(this.map)
                .on("click", onClick);

            this.hiratsukaMarker = cityMarker([35.3150, 139.3497], "平塚市", () => this.startHiratsuka());
            this.kushiroMarker = cityMarker([42.9849, 144.3814], "釧路市", () => this.startKushiro());
            // ■AIテストエリア（テストモードのときだけ）：平塚・釧路とは別に、AIとの試しのゲームを、何回でも遊べる
            if (isTestMode()) this.testMarker = cityMarker([37.5, 134.5], "🧪 AIテスト", () => this.startAiTest());
        },


        // ■場所（六角形）の一覧をFirestoreの mapSpots から取る。空・失敗のときは同梱のデータ（mapSpots.json）のまま
        async loadSpots() {
            try {
                const snapshot = await db.collection("mapSpots").get();
                const spots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Firestoreに無い街（AIテスト。同梱のデータだけにある）は、同梱のデータから足す
                const cities = new Set(spots.map(spot => spot.city));
                const extra = mapSpotsSeed.spots.filter(spot => !cities.has(spot.city));
                if (spots.length) this.spots = [...spots, ...extra].sort((a, b) => (a.order || 0) - (b.order || 0));
            } catch (error) {
                console.error("場所の一覧の読み込みに失敗しました（同梱のデータを使います）:", error);
            }
        },

        // ■ログイン中ユーザーのチュートリアル完了フラグを取得
        async loadUser() {
            const cenId = getSession("loginCenId");
            if (!cenId) return;

            try {
                const snapshot = await db.collection("users")
                    .where("cenId", "==", cenId)
                    .get();
                if (snapshot.empty) return;

                const userDoc = snapshot.docs[0];
                this.uid = userDoc.id;
                this.tutorialCleared = userDoc.data().tutorialCleared || {};
            } catch (error) {
                console.error("ユーザー情報の取得に失敗しました:", error);
            }
        },

        // ■未完了の地域なら、チュートリアル（動画→ABゲーム）を挟んでから進む（拡大が終わったあと、六角形が出る前）
        async withTutorial(location, cityName, onDone) {
            if (this.tutorial) return;

            await this.userLoading;

            if (this.tutorialCleared[location]) {
                onDone();
                return;
            }

            this.tutorial = { location, cityName, phase: "video", onDone };

            const YT = await loadYouTubeApi();
            await this.$nextTick();

            const goToGame = () => {
                this.destroyTutorialPlayer();
                // ■動画が終わったら、ABゲームへ（そのあと六角形が出る）
                if (this.tutorial) this.tutorial.phase = "game";
            };

            // ■YT.PlayerはVueのリアクティブにすると動作が壊れるため、dataに入れず保持する
            try {
                this.tutorialPlayer = new YT.Player(this.$refs.tutorialPlayer, {
                    videoId: TUTORIAL_VIDEOS[location],
                    width: "100%",
                    height: "100%",
                    playerVars: { rel: 0, playsinline: 1 },
                    events: {
                        onStateChange: (event) => {
                            if (event.data === YT.PlayerState.ENDED) goToGame();
                        },
                        // 動画が再生できない場合に進めなくならないよう、ゲームへ進める
                        onError: goToGame
                    }
                });
            } catch (error) {
                console.error("チュートリアル動画の読み込みに失敗しました:", error);
                goToGame();
            }
        },

        async finishTutorial() {
            const { location, onDone } = this.tutorial;

            this.tutorialCleared = { ...this.tutorialCleared, [location]: true };

            if (this.uid) {
                try {
                    await db.collection("users").doc(this.uid).update({
                        [`tutorialCleared.${location}`]: true
                    });
                } catch (error) {
                    console.error("チュートリアル完了フラグの保存に失敗しました:", error);
                }
            }

            this.tutorial = null;
            onDone();
        },

        destroyTutorialPlayer() {
            if (this.tutorialPlayer) {
                this.tutorialPlayer.destroy();
                this.tutorialPlayer = null;
            }
        },

        startHiratsuka() {
            this.currentPlace = { city: "hiratsuka", cityName: "平塚市" };
            this.startZoom("平塚市", [35.3250, 139.3497], 13);
        },

        startKushiro() {
            this.currentPlace = { city: "kushiro", cityName: "釧路市" };
            this.startZoom("釧路市", [42.9849, 144.3814], 13);
        },

        // ■その街の「場所」を、ハチの巣のように並べた六角形で表示する（4・3・4・3・4個の5段で18か所）。
        //   六角形は3つのひし形に分かれていて、1つ1つが「その場所の3つのゲーム」。
        //   ゲームが終わるたびに、そのひし形が勝ったチームの色で塗られる（AIが勝ったら赤）。
        //   すみかは色ではなく、絵文字・名前・「森」などの札で伝える。タップすると、3つのゲームから選ぶ
        createHoneycomb(cityPos) {
            this.clearHoneycomb();

            const city = this.currentPlace ? this.currentPlace.city : null;
            if (!city || !mapSpotsSeed.cities[city]) return;

            const ZOOM = 13;
            // 六角形の大きさ（画面のピクセル）。19個が横にも縦にも収まる大きさにする
            // 横は画面の幅いっぱい（一番長い段は、六角形の幅の4つぶん）。縦に収まらないときは、縦に合わせる
            const radius = Math.min(88, Math.floor(this.$refs.map.clientWidth / 7.05), Math.floor(this.$refs.map.clientHeight / 8.8));
            this.hexRadius = radius;
            const origin = this.map.project(L.latLng(cityPos), ZOOM);
            const toLatLng = (x, y) => this.map.unproject(L.point(x, y), ZOOM);

            // 文字の大きさも、六角形の大きさに合わせる
            const iconSize = Math.round(radius * 0.3);
            const nameSize = Math.max(9, Math.round(radius * 0.19));
            const chipSize = Math.max(8, Math.round(radius * 0.15));

            this.spots.filter(spot => spot.city === city).forEach(spot => {
                // 段（row）ごとに、中央にそろえて並べる（4個の段と3個の段が、ハチの巣のように交互にかみ合う）
                const cx = origin.x + radius * Math.sqrt(3) * (spot.col - (HEX_ROWS[spot.row] - 1) / 2);
                const cy = origin.y + radius * 1.5 * (spot.row - 2);

                // 六角形の6つの角（少しすき間をあけるため、半径より少し小さくする）
                const corner = i => {
                    const angle = Math.PI / 3 * i + Math.PI / 6;
                    return [cx + (radius - 3) * Math.cos(angle), cy + (radius - 3) * Math.sin(angle)];
                };
                const center = [cx, cy];

                // ■3つのゲーム＝3つのひし形（中心と、となりあう3つの角）
                const rhombi = [0, 1, 2].map(k => L.polygon(
                    [center, corner(2 * k), corner(2 * k + 1), corner((2 * k + 2) % 6)].map(point => toLatLng(point[0], point[1])),
                    { className: "hex-appear", stroke: true, color: "#ffffff", weight: 1.5, opacity: 0.8, interactive: false, ...this.rhombusStyle(null) }
                ).addTo(this.map));

                // ■外枠（ここがタップされる）
                const outline = L.polygon(
                    [0, 1, 2, 3, 4, 5].map(i => toLatLng(...corner(i))),
                    { className: "hex-appear", color: "#ffffff", weight: 3, fill: true, fillOpacity: 0 }
                ).addTo(this.map);
                outline.on("mouseover", () => outline.setStyle({ weight: 6 }));
                outline.on("mouseout", () => outline.setStyle({ weight: 3 }));
                outline.on("click", () => { this.spotSheet = spot; });

                const label = L.marker(toLatLng(cx, cy), {
                    interactive: false,
                    icon: L.divIcon({
                        className: "",
                        html: `<div class="spot-label hex-appear-html" style="--icon:${iconSize}px;--name:${nameSize}px;--chip:${chipSize}px"><span class="spot-icon">${spot.icon}</span><span class="spot-name">${spot.name}</span><span class="spot-habitat">${HABITAT_LABELS[spot.habitat] || ""}</span><span class="spot-playing" style="display:none"></span><span class="spot-other" style="display:none"></span></div>`,
                        iconSize: [radius * 1.6, radius * 1.5],
                        iconAnchor: [radius * 0.8, radius * 0.75]
                    })
                }).addTo(this.map);

                this.spotShapes[spot.id] = { rhombi, label };
                this.honeycombLayers.push(...rhombi, outline, label);
            });

            this.loadGameStates();
        },

        clearHoneycomb() {
            this.honeycombLayers.forEach(layer => this.map.removeLayer(layer));
            this.honeycombLayers = [];
            this.spotShapes = {};
            this.spotSheet = null;
        },

        // ■ひし形の色：まだ＝暗いガラス色／自分があそび中＝きいろ／ほかの人があそび中＝しろ／
        //   勝ち＝勝ったチームの色／AIが勝ち＝赤（「ほかの人」は、文字が読めるように、少し落ち着いた色にしている）
        rhombusStyle(info) {
            const state = info ? info.state : "none";
            if (state === "mine") return { fillColor: "#facc15", fillOpacity: 0.95 };
            if (state === "other") return { fillColor: "#94a3b8", fillOpacity: 0.9 };
            if (state === "won") return { fillColor: TEAM_COLORS[info.winnerTeam] || "#34d399", fillOpacity: 0.92 };
            return { fillColor: "#0b1220", fillOpacity: 0.62 };
        },

        // ■ゲーム枠のようすを読み込んで、ひし形を塗る（街の六角形が出たときに1回だけ）。
        //   枠のようすは軽い mapSlots から読む（ゲームの盤面そのものは読まない）
        async loadGameStates() {
            await this.userLoading;
            const city = this.currentPlace ? this.currentPlace.city : null;
            if (!city) return;

            const slots = {};
            const tally = { water: 0, air: 0, earth: 0 };
            try {
                const [citySnap, mineSnap] = await Promise.all([
                    db.collection("mapSlots").where("city", "==", city).get(),
                    this.uid
                        ? db.collection("mapSlots").where("ownerUid", "==", this.uid).where("state", "==", "playing").get()
                        : Promise.resolve(null)
                ]);

                citySnap.docs.forEach(doc => {
                    const data = doc.data();
                    const key = `${data.spotId}-${data.gameNo}`;
                    if (data.state === "finished") {
                        // ■AIが勝った枠（昔のデータ）は、決着にしない（色をつけず、ほかの人が再戦できる）
                        // AIテストは、AIが勝ったときも、勝ったチームの色をぬる
                        if (data.humanWon !== false || data.test) {
                            slots[key] = { state: "won", ownerName: data.ownerName, winnerTeam: data.winnerTeam };
                            if (tally[data.winnerTeam] !== undefined) tally[data.winnerTeam]++;
                        }
                    } else if (data.state === "playing" && isFresh(data.updatedAt) && !data.test) {
                        slots[key] = { state: data.ownerUid === this.uid ? "mine" : "other", ownerName: data.ownerName };
                    }
                });

                // 自分があそび中のゲーム（街ごとに1つ）
                const mineBy = {};
                if (mineSnap) {
                    mineSnap.docs.map(doc => doc.data()).filter(data => isFresh(data.updatedAt) && !data.test).forEach(data => {
                        const mineSpot = this.spots.find(spot => spot.id === data.spotId);
                        mineBy[data.city] = { spotId: data.spotId, gameNo: data.gameNo, spotName: mineSpot ? mineSpot.name : "" };
                    });
                }
                this.myActiveSlots = mineBy;
            } catch (error) {
                console.error("ゲームの状態の読み込みに失敗しました:", error);
            }

            this.slots = slots;
            this.teamTally = tally;
            this.paintSpots();
        },

        paintSpots() {
            Object.entries(this.spotShapes).forEach(([spotId, shape]) => {
                let mine = 0;
                let other = 0;
                shape.rhombi.forEach((rhombus, index) => {
                    const info = this.slots[`${spotId}-${index + 1}`];
                    rhombus.setStyle(this.rhombusStyle(info));
                    // ■あそび中のひし形は、ゆっくり点滅させて、一覧のなかでも目に入るようにする
                    const element = rhombus.getElement();
                    if (element) {
                        element.classList.toggle("hex-playing", !!info && info.state === "mine");
                        element.classList.toggle("hex-other", !!info && info.state === "other");
                    }
                    if (info && info.state === "mine") mine++;
                    if (info && info.state === "other") other++;
                });
                // ■あそび中の札：自分（きいろ）と、ほかの人（しろ）
                const root = shape.label.getElement();
                const mineTag = root && root.querySelector(".spot-playing");
                const otherTag = root && root.querySelector(".spot-other");
                // 六角形が小さいスマホでは、札が六角形からはみ出さないよう、短い言葉にする
                const compact = this.hexRadius < 60;
                if (mineTag) {
                    mineTag.style.display = mine ? "block" : "none";
                    mineTag.textContent = compact ? "▶ あなた" : "▶ あなた あそび中";
                }
                if (otherTag) {
                    otherTag.style.display = other ? "block" : "none";
                    otherTag.textContent = compact
                        ? (other > 1 ? `👥 ${other}` : "👥 ひと")
                        : (other > 1 ? `👥 ほかの人 ${other}` : "👥 ほかの人 あそび中");
                }
            });
        },

        slotInfo(spot, gameNo) {
            return this.slots[`${spot.id}-${gameNo}`] || { state: "none" };
        },

        // ■同じ街で、自分が別のゲームをあそび中のときは、新しいゲームは始められない（街ごとに1つだけ）
        isLockedByMyGame(spot, gameNo) {
            const active = this.myActiveSlots[spot.city];
            return !!active && !(active.spotId === spot.id && active.gameNo === gameNo);
        },

        isSlotDisabled(spot, gameNo) {
            const state = this.slotInfo(spot, gameNo).state;
            // ■ほかの人があそび中・決着ずみの枠は、「観戦」で入れる（見るだけ）
            return state === "none" && this.isLockedByMyGame(spot, gameNo);
        },

        habitatLabel(habitat) {
            return HABITAT_LABELS[habitat] || "";
        },

        // ■ゲーム選択ボタンの色：ひし形の色と同じ
        gameButtonStyle(info, disabled) {
            const dim = disabled && info.state === "none" ? { opacity: 0.4 } : {};
            if (info.state === "won") return { background: TEAM_COLORS[info.winnerTeam] || "#34d399", borderColor: "#fff", color: "#10151c" };
            if (info.state === "mine") return { background: "rgba(250,204,21,.22)", borderColor: "#facc15", color: "#fef9c3" };
            if (info.state === "other") return { background: "#94a3b8", borderColor: "#fff", color: "#10151c" };
            return { background: "rgba(255,255,255,.06)", borderColor: "#67e8f9", color: "#fff", ...dim };
        },

        gameStateLabel(info) {
            // AIテストは、何回でも、最初から遊べる（前の結果の色は、そのまま残る）
            if (this.isAiTest) return info.state === "won" ? `${TEAM_NAMES[info.winnerTeam] || ""}チームが かった（もういちど あそべる）` : "あそべるよ";
            if (info.state === "mine") return "つづきから あそぶ";
            if (info.state === "other") return `${info.ownerName ? info.ownerName + "さんが " : "ほかの人が "}あそび中 👀 観戦できるよ`;
            if (info.state === "won") return `${TEAM_NAMES[info.winnerTeam] || ""}チームが かったよ 👀 観戦できるよ`;
            return "あそべるよ";
        },

        // ■AIテストエリア：街と同じ、六角形（18か所×3ゲーム）。何回でも、最初から遊べて、勝ったチームの色がぬられる（勝率が見える）。
        //   テラは入らない。動画・ABゲームのチュートリアルもなし
        startAiTest() {
            const city = mapSpotsSeed.cities.aitest;
            this.currentPlace = { city: "aitest", cityName: city.name };
            this.startZoom(city.name, city.center, 13);
        },

        // ■3つのゲームのどれかを選んで、陣取りゲームへ
        startSpotGame(spot, gameNo) {
            if (this.isSlotDisabled(spot, gameNo)) return;
            const cityInfo = mapSpotsSeed.cities[spot.city];
            // ■ほかの人があそび中・決着ずみの枠は、観戦モード（見るだけ）で入る
            const state = this.slotInfo(spot, gameNo).state;
            if ((state === "other" || state === "won") && !cityInfo.test) localStorage.setItem("dominationSpectate", "1");
            else localStorage.removeItem("dominationSpectate");
            localStorage.setItem("dominationRoomCode", slotId(spot.id, gameNo));
            localStorage.setItem("dominationPlace", JSON.stringify({
                city: spot.city,
                cityName: cityInfo.name,
                spotId: spot.id,
                spotName: spot.name,
                habitat: spot.habitat,
                gameNo,
                test: !!cityInfo.test
            }));
            this.$router.push("/dominationGame");
        },

        // ■あそび中のゲームがある場所へ（別のゲームを始めようとしたときの案内から）
        goToMyActiveSlot(city) {
            const active = this.myActiveSlots[city];
            const spot = active ? this.spots.find(item => item.id === active.spotId) : null;
            if (spot) this.startSpotGame(spot, active.gameNo);
        },

        showNotice(message) {
            this.notice = message;
            clearTimeout(this.noticeTimer);
            this.noticeTimer = setTimeout(() => { this.notice = ""; }, 5000);
        },

        // ■日本全体から街へ、ひと続きでなめらかに拡大する（途中で止まったり、別の動きに切りかわったりしない）。
        //   拡大が終わってから（初回は、動画とABゲームのあとに）、六角形をふわっと出す
        startZoom(cityName, cityPos, cityZoom) {
            if (this.japanLayer) {
              this.map.removeLayer(this.japanLayer);
            }

            this.showStartScreen = false;
            this.showTitle = true;
            this.title = cityName;

            if (this.hiratsukaMarker) {
                this.map.removeLayer(this.hiratsukaMarker);
            }
            if (this.kushiroMarker) {
                this.map.removeLayer(this.kushiroMarker);
            }
            if (this.testMarker) {
                this.map.removeLayer(this.testMarker);
            }

            this.zoomTimers.forEach(clearTimeout);
            this.zoomTimers = [];
            if (this.showJapanHandler) this.map.off("moveend", this.showJapanHandler);

            this.map.invalidateSize();
            this.map.flyTo(cityPos, cityZoom, { animate: true, duration: 2.5, easeLinearity: 0.15 });

            // 拡大が終わったら六角形を出す（うまく終わりを拾えなかったときのために、保険のタイマーも置く）
            let shown = false;
            const showHoneycomb = () => {
                if (shown) return;
                shown = true;
                // ■初回だけ、六角形の前にチュートリアル（動画→ABゲーム）。終わってから六角形を出す
                const city = this.currentPlace;
                if (!city) return;
                const tutorialArea = city.city === "aitest" ? (location, name, done) => done() : this.withTutorial;
                tutorialArea.call(this, city.city, cityName, () => {
                    // チュートリアル中に「もどる」などで街を離れていたら、六角形は出さない
                    if (this.currentPlace && this.currentPlace.city === city.city && this.showTitle) this.createHoneycomb(cityPos);
                });
            };
            this.showHoneycombHandler = showHoneycomb;
            this.map.once("moveend", showHoneycomb);
            this.zoomTimers.push(setTimeout(showHoneycomb, 4500));
        }

    }

};
</script>

<style scoped>


:deep(.spot-label) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
    color: #fff;
    text-align: center;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85), 0 0 6px rgba(0, 0, 0, 0.6);
}

:deep(.spot-icon) {
    font-size: var(--icon, 26px);
    line-height: 1;
}

:deep(.spot-habitat) {
    margin-top: 1px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.45);
    padding: 0 8px;
    font-size: var(--chip, 11px);
    font-weight: 900;
    line-height: 1.5;
    text-shadow: none;
}

/* ■六角形は、ズームが終わってからふわっと出す */
:deep(.hex-appear) {
    animation: hex-fade 0.9s ease-out both;
}

:deep(.hex-appear-html) {
    animation: hex-fade 0.9s ease-out both;
}

@keyframes hex-fade {
    from { opacity: 0; }
    to { opacity: 1; }
}

:deep(.spot-playing) {
    margin-top: 1px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: clip;
    border-radius: 999px;
    background: #facc15;
    color: #1f2937;
    padding: 0 6px;
    font-size: var(--chip, 11px);
    font-weight: 900;
    line-height: 1.5;
    text-shadow: none;
    white-space: nowrap;
}

/* ■自分（きいろ）とほかの人（しろ）のあそび中は、点滅の速さを変える */
:deep(.hex-playing) {
    animation: playing-pulse 1.3s ease-in-out infinite !important;
}

:deep(.hex-other) {
    animation: playing-pulse 2.2s ease-in-out infinite !important;
}

:deep(.spot-other) {
    margin-top: 1px;
    max-width: 100%;
    overflow: hidden;
    border-radius: 999px;
    background: #f1f5f9;
    color: #1f2937;
    padding: 0 6px;
    font-size: var(--chip, 11px);
    font-weight: 900;
    line-height: 1.5;
    text-shadow: none;
    white-space: nowrap;
}

@keyframes playing-pulse {
    0%, 100% { fill-opacity: 0.95; }
    50% { fill-opacity: 0.45; }
}

:deep(.spot-name) {
    max-width: 100%;
    overflow-wrap: anywhere;
    font-size: var(--name, 13px);
    font-weight: 900;
    line-height: 1.2;
}

:deep(.city-marker) {
    width: max-content;
    margin: 0 auto;
    white-space: nowrap;
    border-radius: 999px;
    border: 2px solid #34d399;
    background: linear-gradient(180deg, rgba(10, 34, 26, 0.92), rgba(5, 18, 14, 0.92));
    color: #d1fae5;
    padding: 4px 14px 5px 12px;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-align: center;
    text-shadow: 0 0 8px rgba(52, 211, 153, 0.9);
    box-shadow: 0 0 14px rgba(52, 211, 153, 0.65), inset 0 0 8px rgba(52, 211, 153, 0.25);
    animation: city-pulse 1.8s ease-in-out infinite;
}
:deep(.city-marker)::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 7px;
    border-radius: 50%;
    background: #6ee7b7;
    box-shadow: 0 0 8px #34d399;
    vertical-align: middle;
}

@keyframes city-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

:deep(.play-region) {
    filter: drop-shadow(0 0 5px rgba(52, 211, 153, 0.9)) drop-shadow(0 0 14px rgba(52, 211, 153, 0.6));
    animation: region-glow 2.4s ease-in-out infinite;
}

@keyframes region-glow {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.8)) drop-shadow(0 0 10px rgba(52, 211, 153, 0.45)); }
    50% { filter: drop-shadow(0 0 8px rgba(110, 255, 190, 1)) drop-shadow(0 0 20px rgba(52, 211, 153, 0.75)); }
}

:deep(.simple-tiles) {
    filter: saturate(0.25) contrast(0.85) brightness(1.08);
}

#returnGate {
    position: fixed;
    left: 14px;
    top: 14px;
    width: 84px;
    height: 84px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: radial-gradient(circle at 50% 40%, rgba(34, 211, 238, 0.28), rgba(6, 14, 26, 0.92) 70%);
    box-shadow: 0 0 22px rgba(34, 211, 238, 0.55), inset 0 0 18px rgba(34, 211, 238, 0.35);
    z-index: 1000;
}
/* まわりをまわる光の輪 */
#returnGate::before {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(from 0deg, rgba(34, 211, 238, 0), #22d3ee, rgba(167, 139, 250, 0.9), rgba(34, 211, 238, 0));
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
    animation: gate-spin 3s linear infinite;
}
#returnGate .gate-core {
    width: 22px;
    height: 22px;
    margin-bottom: 4px;
    border-radius: 50%;
    border: 2px solid #a5f3fc;
    background: radial-gradient(circle, #e0f7ff 0 25%, transparent 30%);
    box-shadow: 0 0 10px #22d3ee;
    animation: gate-breathe 2s ease-in-out infinite;
}
#returnGate .gate-label {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #cffafe;
    text-shadow: 0 0 6px rgba(34, 211, 238, 0.9);
}
#returnGate:active { transform: scale(0.95); }

@keyframes gate-spin {
    to { transform: rotate(360deg); }
}
@keyframes gate-breathe {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.18); opacity: 1; }
}

/* ■地図の上のボタン・見出し：モニタールームと同じ、暗いガラスに光るふち */
.map-title,
.map-back,
.map-hint {
    border: 1.5px solid rgba(103, 232, 249, 0.75);
    background: linear-gradient(180deg, rgba(14, 26, 44, 0.9), rgba(6, 12, 24, 0.9));
    color: #e0f7ff;
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.4), inset 0 0 10px rgba(34, 211, 238, 0.12);
    text-shadow: 0 0 8px rgba(34, 211, 238, 0.7);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
}
.map-title {
    padding: 7px 26px 8px;
    border-radius: 14px;
    font-size: 21px;
    font-weight: 900;
    letter-spacing: 0.18em;
    white-space: nowrap;
}
.map-title::before {
    content: "";
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-right: 10px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px #34d399;
    vertical-align: middle;
}
.map-back {
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.08em;
}
.map-back:hover { background: rgba(34, 211, 238, 0.22); }
.map-back:active { transform: scale(0.96); }
.map-back-arrow { font-size: 11px; margin-right: 2px; color: #67e8f9; }
.map-hint {
    padding: 9px 24px;
    border-radius: 999px;
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 0.1em;
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

/* ■日本全体が見えるよう、中央を広めにあけて、まわりだけ暗くする */
.map-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 500;

    background: radial-gradient(
        ellipse at center,
        transparent 0%,
        transparent 62%,
        rgba(0, 0, 0, 0.45) 100%
    );
}
</style>