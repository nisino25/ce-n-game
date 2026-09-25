<template>
    <!-- <button class="m-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm" @click="changeMode()">Change Mode</button> -->
    <template v-if="dominationMode == 'standard'">
        <div class="domination-app min-h-screen bg-slate-100">

            <!-- Header: title + scoreboard -->
            <header class="bg-white border-b border-slate-200 shadow-sm">
                <div class="max-w-[1500px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                    <div class="flex items-center gap-3">
                        <h1 class="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <span>🗺️</span><span>陣取りゲーム</span>
                        </h1>

                        <button
                            class="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full pl-3 pr-2.5 py-1 font-mono font-bold tracking-wider text-slate-600 transition"
                            title="クリックでコピー"
                            @click="copyRoomCode"
                        >
                            <span class="text-slate-400">🔑ルーム</span>
                            <span>{{ roomCode }}</span>
                            <span v-if="roomCodeCopied" class="text-emerald-600 font-sans font-normal">コピーしました！</span>
                            <span v-else class="text-slate-400 font-sans font-normal">📋</span>
                        </button>

                        <button
                            class="text-xs text-slate-400 hover:text-slate-600 underline whitespace-nowrap"
                            @click="changeRoom"
                        >
                            ルームを変える
                        </button>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        <div
                            v-for="player in players"
                            :key="player.id"
                            class="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border-2 text-sm transition-all"
                            :class="player.id === currentPlayerId ? 'shadow-md scale-105' : 'opacity-60'"
                            :style="{
                                borderColor: player.color,
                                background: player.id === currentPlayerId ? player.color + '1a' : 'transparent'
                            }"
                        >
                            <span class="w-3 h-3 rounded-full flex-none" :style="{ background: player.color }"></span>
                            <span class="font-semibold whitespace-nowrap">{{ player.name }}</span>
                            <span v-if="player.isAI" class="text-xs" title="AIが操作します">🤖</span>
                            <span class="font-bold whitespace-nowrap">{{ player.score }}点</span>
                            <span
                                v-if="player.id === currentPlayerId"
                                class="text-xs font-bold whitespace-nowrap"
                                :style="{ color: player.color }"
                            >
                                ▶手番
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <!-- AI thinking banner -->
            <transition name="fade">
                <div
                    v-if="isAiThinking"
                    class="bg-amber-50 border-b border-amber-200 text-amber-800 text-center text-sm py-2 font-medium"
                >
                    🤖 {{ currentPlayer?.name }}が考え中…
                </div>
            </transition>

            <div class="max-w-[1500px] mx-auto p-4 flex flex-col lg:flex-row gap-4 items-start">

                <!-- Board -->
                <div class="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 p-3 overflow-auto">
                    <div
                        class="grid gap-[2px] mx-auto"
                        :style="{ gridTemplateColumns: `repeat(${cols}, minmax(14px, 1fr))`, maxWidth: '1100px' }"
                    >
                        <div
                            v-for="tile in tiles"
                            :key="tile.id"
                            class="relative rounded-[2px] cursor-pointer transition-transform duration-150"
                            :class="{ 'scale-[1.05] ring-2 ring-offset-1 z-10': tile.selected }"
                            @click="onTileClick(tile, $event)"
                            :style="tileStyle(tile)"
                        >
                            <div
                                v-if="tile.validForSelection"
                                class="animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] rounded-full aspect-square bg-yellow-200"
                            ></div>

                            <div v-if="tile.ownerTeam" class="flex justify-center items-center w-full h-full">
                                <div
                                    :class="tierShapeClass(tile)"
                                    :style="tierShapeStyle(tile.placedCard?.tier, tile.ownerTeam, tile.eatenByPlayerId)"
                                >
                                    <span v-if="tile.placedCard?.tier === 4">★</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="w-full lg:w-[340px] flex-none flex flex-col gap-3">

                    <!-- legend toggle -->
                    <button
                        class="text-xs text-slate-500 hover:text-slate-700 underline self-start"
                        @click="isShowingTuorial = !isShowingTuorial"
                    >
                        {{ isShowingTuorial ? '説明を閉じる ▲' : '地形・レベルの説明を見る ▼' }}
                    </button>

                    <div v-if="isShowingTuorial" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
                        <div>
                            <div class="grid grid-cols-2 gap-2">
                                <template v-for="item in terrainList" :key="item.key">
                                    <div class="flex items-center gap-1.5">
                                        <div class="w-3.5 h-3.5 rounded-full flex-none" :style="{ background: areaColors[item.key] }"></div>
                                        <span class="text-xs whitespace-nowrap">{{ item.label }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <div>
                            <div class="text-xs font-bold text-slate-600 mb-2">レベルとポイント</div>
                            <div class="grid grid-cols-4 gap-1.5">
                                <div v-for="tier in [1, 2, 3, 4]" :key="tier" class="text-center bg-slate-100 rounded-lg p-2">
                                    <div
                                        v-if="tier === 2 || tier === 3"
                                        class="mx-auto mb-1.5 w-5 h-5 bg-slate-600"
                                        :class="{ 'rounded-full': tier === 3 }"
                                    ></div>
                                    <div class="text-xs leading-tight">
                                        <strong v-if="tier === 1" class="text-lg block">&#9650;</strong>
                                        <strong v-if="tier === 4" class="text-lg block">★</strong>
                                        <strong>Lv{{ tier }}</strong>
                                        <div class="text-[10px] text-slate-500">{{ getScoreForTile(tier) }}点</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- current player hand -->
                    <div v-if="gameState === 'playing' && currentPlayer" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <template v-if="currentPlayer.isAI">
                            <div class="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
                                <span class="text-2xl">🤖</span>
                                <span>{{ currentPlayer?.name }}が手を考えています…</span>
                            </div>
                        </template>
                        <template v-else>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-5 h-5 rounded-md flex-none" :style="{ background: currentPlayer?.color }"></div>
                                <span class="font-bold text-sm">{{ currentPlayer?.name }}</span>
                                <span class="text-sm text-slate-500 ml-auto">{{ currentPlayer?.score }}点</span>
                            </div>

                            <div
                                v-if="selectedCard"
                                class="mb-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2"
                            >
                                「{{ selectedCard.label }}」を選択中 → 黄色く光るマスに配置できます
                            </div>

                            <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                <div
                                    v-for="group in groupHandByTier(hands[currentPlayerId])"
                                    :key="group.tier"
                                >
                                    <div class="text-[11px] font-bold text-slate-400 mb-1">Lv{{ group.tier }}</div>
                                    <div class="flex flex-wrap gap-1.5">
                                        <button
                                            v-for="card in group.cards"
                                            :key="card.id"
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition"
                                            :class="areaBadgeClass(card, currentPlayerId)"
                                            @click="previewCard(card, currentPlayerId)"
                                        >
                                            <span>{{ card.label }}</span>
                                            <span class="text-slate-500">×{{ card.holdingCount }}</span>
                                        </button>
                                    </div>
                                </div>

                                <p
                                    v-if="!hands[currentPlayerId] || hands[currentPlayerId].length === 0"
                                    class="text-xs text-slate-400 text-center py-4"
                                >
                                    手札がありません
                                </p>
                            </div>
                        </template>
                    </div>

                    <!-- actions -->
                    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 grid grid-cols-2 gap-2">
                        <button
                            @click="selectedCard = null"
                            :disabled="!selectedCard"
                            class="px-2 py-2.5 rounded-lg border text-sm font-medium transition"
                            :class="selectedCard ? 'bg-slate-100 hover:bg-slate-200 border-slate-300' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'"
                        >
                            キャンセル
                        </button>
                        <button
                            class="px-2 py-2.5 rounded-lg border text-sm font-medium transition"
                            :class="currentPlayer?.isAI ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-sky-100 hover:bg-sky-200 border-sky-300'"
                            :disabled="currentPlayer?.isAI"
                            @click="confirmSkip()"
                        >
                            スキップ
                        </button>
                        <button
                            class="px-2 py-2.5 rounded-lg border border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-sm font-medium transition"
                            @click="confirmFinish()"
                        >
                            ゲーム終了
                        </button>
                        <button
                            class="px-2 py-2.5 rounded-lg border border-rose-300 bg-rose-100 hover:bg-rose-200 text-sm font-medium transition"
                            @click="backToMonitorRoom()"
                        >
                            🏠 ホームにもどる
                        </button>
                        <button
                            class="col-span-2 px-2 py-2.5 rounded-lg border border-orange-300 bg-orange-100 hover:bg-orange-200 text-sm font-medium transition"
                            @click="startNewMap()"
                        >
                            🔄 新規マップで再開
                        </button>
                    </div>
                </div>
            </div>

            <!-- tile preview overlay (placed card on the board) -->
            <div
                v-if="tilePreviewCard"
                class="fixed inset-0 z-50 bg-black/40"
                @click.self="tilePreviewCard = null; previewStyle = {}"
            >
                <div class="absolute transition-all duration-300 ease-out z-[100]" :style="previewStyle">
                    <button
                        class="absolute -top-3 -right-3 bg-white rounded-full shadow px-2 py-1 text-sm"
                        @click="tilePreviewCard = null; previewStyle = {}"
                    >
                        ✕
                    </button>
                    <CreatureCard :creature="tilePreviewCard" class="w-full h-full rounded-lg shadow-xl" />
                </div>
            </div>

            <!-- finished game modal -->
            <div v-if="gameState === 'finished'" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                <div class="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm w-full">
                    <h2 class="text-2xl font-bold mb-1">ゲーム終了！</h2>
                    <p class="text-sm text-slate-500 mb-4">最終スコア</p>
                    <ul class="text-left mb-5 space-y-2">
                        <li
                            v-for="player in sortedPlayersByScore"
                            :key="player.id"
                            class="flex items-center justify-between px-3 py-2 rounded-lg"
                            :style="{ background: player.color + '15' }"
                        >
                            <span class="font-semibold flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full" :style="{ background: player.color }"></span>
                                {{ player.name }}
                                <span v-if="player.isAI" class="text-xs">🤖</span>
                            </span>
                            <span class="font-bold">{{ player.score }}点</span>
                        </li>
                    </ul>
                    <button
                        class="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition"
                        @click="resetTiles()"
                    >
                        もう一回遊ぶ
                    </button>
                </div>
            </div>
        </div>

        <!-- card select modal -->
        <div
            v-if="modalCard && isPreviewing"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="closePreview"
          >
            <div class="relative p-4 bg-white rounded-2xl shadow-xl w-full max-w-sm">

                <!-- Close Button -->
                <button
                    class="absolute -top-3 -right-3 bg-white rounded-full shadow px-2 py-1 text-sm"
                    @click="closePreview"
                >
                    ✕
                </button>

                <CreatureCard :creature="modalCard" class="mx-auto"/>

                <div class="button-container flex justify-center mt-4">
                    <button @click="useCard()" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">選択する</button>
                </div>

            </div>
        </div>
    </template>
    <template v-else>
        <div class="map-control-mode p-6">
            <h2 class="text-2xl font-bold mb-4">Map Control Mode</h2>
            <img v-if="mapStep == 0" src="https://cdn.qleanmarket.amanaimages.com/uploads/items/049/874/36/preview/FYI04987436.jpg" @click="mapStep++">
            <img v-if="mapStep == 1" src="https://img.jtrip.co.jp/uploads/210720185839_hokkaido.jpg" @click="mapStep++">
            <img v-if="mapStep == 2" src="https://www.kushiro.pref.hokkaido.lg.jp/fs/2/5/9/8/5/5/3/_/map350_kushiro.gif" @click="changeMode()">
            <!-- Add your Map Control Mode specific UI here -->
        </div>
    </template>
</template>

<script>
import db from '../../firebase.js';
import CreatureCard from './CreatureCard.vue';
import {
    fetchCardLibrary,
    fetchTeamCollectionInstances,
    placeCardInstance,
    markCardInstancesEaten,
    toDominationCard
} from '@/utils/cards.js';

// ■陣取りゲームは操作端末1台で複数チームが遊ぶ「共有の1ゲーム」という前提のため、
// Firestoreには「ルームコード」ごとに1ドキュメント（進行中の1ゲーム分）として保存する。
// 別の端末・別のグループが同時に遊んでも、ルームコードが違えば互いのゲームに影響しない
const SAVE_COLLECTION = 'dominationGames'
const ROOM_CODE_STORAGE_KEY = 'dominationRoomCode'
const ROOM_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 0/O, 1/I/L等の紛らわしい文字は除外

function generateRoomCode() {
    let code = ''
    for (let i = 0; i < 4; i++) {
        code += ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)]
    }
    return code
}

// ■自分のチーム(localStorage.myTeam)以外の2チームは、既定でAIが操作する
const TEAM_ID_BY_NAME = { water: 1, air: 2, earth: 3 };
const TEAM_NAME_BY_ID = { 1: 'water', 2: 'air', 3: 'earth' };

// ■AIチームの山札（仮）：AIのチームにはプレイヤーがいないので所持カードが無い。
// カードライブラリから、人間チームの手札と同じ枚数（最低10枚）をレベルの重みで引いて作る
// （docs/requirements/04_cards.md 6章 #1 の仮対応）
const AI_MIN_HAND_SIZE = 10;
const AI_LEVEL_WEIGHTS = { 1: 4, 2: 3, 3: 2, 4: 1 };

// ■プレイヤーの所持カード（DBの cardInstances）かどうか。
// AIチームの仮のカードや、固定デッキ時代に保存されたカード（cardId が無い）はDBを更新しない
function isOwnedCard(card) {
    return !!(card && card.cardId && card.instanceId && !card.isVirtual)
}

export default {
    // name: 'Tiles20x20',
    data() {
      const cols = 30
      const rows = 15

      const humanPlayerId = TEAM_ID_BY_NAME[localStorage.getItem('myTeam')] || 1

      const roomCode = localStorage.getItem(ROOM_CODE_STORAGE_KEY) || generateRoomCode()
      localStorage.setItem(ROOM_CODE_STORAGE_KEY, roomCode)

      return {
        cols,
        rows,
        tiles: [],
        currentPlayerId: null,
        currentType: null,

        humanPlayerId,

        roomCode,
        roomCodeCopied: false,

        players: [
            { id: 1, name: '水チーム', color: '#00BFA6', score: 0, isAI: humanPlayerId !== 1 }, // teal (water but not blue)
            { id: 2, name: '空気チーム', color: '#9B5DE5', score: 0, isAI: humanPlayerId !== 2 }, // purple (air = light / abstract)
            { id: 3, name: '土チーム', color: '#FFB97A', score: 0, isAI: humanPlayerId !== 3 }  // sand/orange (earth)
        ],

        typeColors: {
            grass: '#7ED957', // green
            bug: 'blue', // brown
            animal: '#E04E4E', // red
            none: '#d1d5db' // grey
        },
        typePoints: {
            grass: 1,
            bug: 3,
            animal: 10
        },
        areaTypes: ['town', 'forest', 'river', 'sea'],
        areaColors: {
            town: '#B88E66',
            forest: '#768F7C',
            dirt: '#C2B5A6',
            river: '#8FAFBD',
            sea: '#5E7F9B',
            undeveloped: '#666666'
        },
        terrainList: [
            { key: 'town', label: '町' },
            { key: 'forest', label: '森' },
            { key: 'dirt', label: '土' },
            { key: 'river', label: '川' },
            { key: 'sea', label: '海' },
            { key: 'undeveloped', label: '未開発地' },
        ],

        // ■カードはFirestoreのカードライブラリ（cards）と所持カード（cardInstances）から作る
        // （以前の固定デッキ allCards は廃止。docs/requirements/04_cards.md）
        cardLibrary: [],
        isPlacingCard: false,

        // プレイヤーごとの手札
        hands: {},

        // dominationMode: 'standard',
        dominationMode: 'mapControl',
        mapStep: 0,

        selectedCard: null,
        modalCard: null,

        isPreviewing: false,

        tilePreviewCard: null,
        previewStyle: {},

        skipCount: 0,

        gameState: 'playing', // 'playing' or 'finished'

        isShowingTuorial: false,

        isAiThinking: false
      }
    },
    methods: {
        backToMonitorRoom() {
            this.$router.push({ name: 'Home' });
        },
        async onTileClick(tile, event) {
          if (this.currentPlayer?.isAI) return // AIの手番中は操作不可
          if (this.isPlacingCard) return // カードの保存中は操作不可

          if(tile.placedCard) {
            const rect = event.currentTarget.getBoundingClientRect()

            this.previewStyle = {
                top: rect.top + 'px',
                left: rect.left + 'px',
                width: rect.width + 'px',
                height: rect.height + 'px'
            }

            this.tilePreviewCard = tile.placedCard

            this.$nextTick(() => {
                // アニメーションで中央へ
                this.previewStyle = {
                    top: '50%',
                    left: '50%',
                    width: '260px',
                    height: 'auto',
                    transform: 'translate(-50%, -50%)'
                }
            })

            return
          }
          if(!this.selectedCard) {
              alert("カードを選択してからタイルを選んでね")
              return
          }
          if(tile.area === 'undeveloped') {
              alert("まだ動物たちが住めないから、環境をなおしてね")
              return; // cannot select undeveloped
          }

          if(tile.ownerTeam !== null) return; // already owned

          if (!tile.validForSelection) {
            alert("このタイルにはこのカードは置けないよ")
            return // not valid for selection
          }

          const card = this.selectedCard
          const hand = this.hands[this.currentPlayerId]

          // ■所持カードを「盤面に置いた（placed）」にする。別のゲームですでに使われていたら置けない
          if (isOwnedCard(card)) {
              this.isPlacingCard = true
              let placed = false
              try {
                  placed = await placeCardInstance(card.instanceId, this.roomCode, tile.id)
              } catch (e) {
                  console.error('カードの配置の保存に失敗しました', e)
                  this.isPlacingCard = false
                  alert("カードを置けませんでした。通信状況を確認して、もう一度ためしてね")
                  return
              }
              this.isPlacingCard = false

              if (!placed) {
                  // すでにほかのゲームで使われていたカードは手札から外す
                  this.removeFromHand(hand, card)
                  this.selectedCard = null
                  this.updateValidTiles()
                  this.saveGame()
                  alert(`「${card.label}」は、ほかのゲームですでに使われていたよ`)
                  return
              }
          }

          tile.ownerTeam = this.currentPlayerId
          tile.placedCard = card

          const points = this.getScoreForTile(card.tier)
          this.currentPlayer.score += points

          this.handleEating(tile)

          //カードを削除
          this.removeFromHand(hand, card)

          this.selectedCard = null
          this.updateValidTiles()
          this.skipCount = 0
          this.goToNextPlayer()
          this.saveGame()
          this.maybeTriggerAI()
        },
        handleEating(placedTile) {
            const neighbors = this.getNeighbors(placedTile)
            const eatenList = []

            neighbors.forEach(n => {
                // if the neibghot is lower than the placed tile, then it gets eaten
                if(!n.placedCard || !placedTile.placedCard) return
                if(n.placedCard.tier >= placedTile.placedCard.tier) return
                // mark as eaten
                n.eatenByTileId = placedTile.id
                n.eatenByPlayerId = this.currentPlayerId

                // ■食べられたのがプレイヤーの所持カードなら、DBでも eaten にする
                if (isOwnedCard(n.placedCard)) {
                    eatenList.push({
                        instanceId: n.placedCard.instanceId,
                        eatenByInstanceId: isOwnedCard(placedTile.placedCard) ? placedTile.placedCard.instanceId : null
                    })
                }
            })

            markCardInstancesEaten(eatenList).catch(e => {
                console.error('食べられたカードの保存に失敗しました', e)
            })
        },

        removeFromHand(hand, card) {
            const index = hand.findIndex(c => c.instanceId === card.instanceId)
            if (index !== -1) hand.splice(index, 1)
        },

        getScoreForTile(tier) {
            if (!tier) return 0

            if (tier === 1) return 1
            if (tier === 2) return 3
            if (tier === 3) return 5
            if (tier === 4) return 8

            return tier * 2
        },
        async resetTiles() {
            if (!confirm("本当にタイルをリセットしますか？現在の進行状況は失われます。")) return;

            this.generateTiles()
            await this.initializeHands()
            this.gameState = 'playing'
            this.currentPlayerId = this.players[0].id
            this.skipCount = 0
            this.selectedCard = null
            this.isAiThinking = false

            this.players.forEach(p => (p.score = 0))

            this.saveGame()
            this.maybeTriggerAI()
        },

        // ■保存されている進行中のゲームを読み込む。保存が無ければfalseを返す
        async loadSavedGame() {
            try {
                const doc = await db.collection(SAVE_COLLECTION).doc(this.roomCode).get()

                if (!doc.exists) return false

                const data = doc.data()

                if (!data || !Array.isArray(data.tiles) || data.tiles.length === 0) return false

                this.tiles = data.tiles
                this.hands = data.hands || {}
                this.skipCount = data.skipCount || 0
                this.gameState = data.gameState || 'playing'
                this.currentPlayerId = data.currentPlayerId ?? this.players[0].id

                if (Array.isArray(data.players)) {
                    data.players.forEach(saved => {
                        const player = this.players.find(p => p.id === saved.id)
                        if (player) player.score = saved.score || 0
                    })
                }

                return true
            } catch (e) {
                console.error('陣取りゲームの読み込みに失敗しました', e)
                return false
            }
        },

        // ■現在の進行状況をまるごと保存する
        async saveGame() {
            try {
                await db.collection(SAVE_COLLECTION).doc(this.roomCode).set({
                    tiles: this.tiles,
                    hands: this.hands,
                    players: this.players.map(p => ({ id: p.id, score: p.score })),
                    currentPlayerId: this.currentPlayerId,
                    skipCount: this.skipCount,
                    gameState: this.gameState,
                    updatedAt: new Date().toISOString()
                })
            } catch (e) {
                console.error('陣取りゲームの保存に失敗しました', e)
            }
        },

        // ■仮：保存済みの進行状況を破棄して、完全に新しいマップで最初から遊び直す（ルームは変えない）
        startNewMap() {
            this.resetTiles()
        },

        async copyRoomCode() {
            try {
                await navigator.clipboard.writeText(this.roomCode)
            } catch (e) {
                console.error('ルームコードのコピーに失敗しました', e)
                return
            }

            this.roomCodeCopied = true
            setTimeout(() => {
                this.roomCodeCopied = false
            }, 1500)
        },

        // ■別のルームコードに参加する（存在しなければそのコードで新しいルームが作られる）
        async changeRoom() {
            const input = prompt(
                '参加したいルームコードを入力してください。\n存在しないコードを入力すると、新しいルームが作られます。',
                this.roomCode
            )

            if (!input) return

            const code = input.trim().toUpperCase()

            if (!code || code === this.roomCode) return

            this.roomCode = code
            localStorage.setItem(ROOM_CODE_STORAGE_KEY, code)

            await this.loadOrInitGame()
        },

        // ■現在のroomCodeのゲームを読み込む。無ければ新規に生成して保存する
        async loadOrInitGame() {
            this.isAiThinking = false
            this.selectedCard = null
            this.tilePreviewCard = null

            if (!this.cardLibrary.length) {
                try {
                    this.cardLibrary = await fetchCardLibrary()
                } catch (e) {
                    console.error('カードライブラリの読み込みに失敗しました', e)
                }
            }

            const loaded = await this.loadSavedGame()

            if (loaded) {
                // ■保存後にメンバーが新しくカードを集めたり、別のゲームで使ったりしているので、
                // 人間チームの手札はDBの所持カードから作り直す
                await this.refreshHumanHand()
                await this.saveGame()
            } else {
                await this.initializeHands()
                this.generateTiles()
                this.gameState = 'playing'
                this.currentPlayerId = this.players[0].id
                this.skipCount = 0
                this.players.forEach(p => (p.score = 0))
                await this.saveGame()
            }

            this.maybeTriggerAI()
        },
        teamColor(teamId) {
            const player = this.players.find(p => p.id === teamId)
            return player ? player.color : '#000'
        },
        tileStyle(tile) {
            const base = {
                background: this.areaColors[tile.area] || '#ccc',
                width: '100%',
                aspectRatio: '1 / 1'
            }

           if (tile.eatenByTileId) {
                let currentTile = this.tiles.find(t => t.id === tile.eatenByTileId)

                // keep going up the chain until we find
                // a tile that has NOT been eaten
                while (currentTile && currentTile.eatenByTileId) {
                    const nextTile = this.tiles.find(
                        t => t.id === currentTile.eatenByTileId
                    )

                    // safety break in case of broken reference
                    if (!nextTile) {
                        break
                    }

                    currentTile = nextTile
                }

                if (currentTile) {
                    base.background = this.teamColor(currentTile.ownerTeam)
                }
            }

            if (tile.ownerTeam !== null) {
                base.boxShadow = `inset 0 0 0 3px ${this.teamColor(tile.ownerTeam)}55`
            }

            if (tile.selected) {
                base.transform = 'scale(1.03)'
            }

            return base
        },
        goToNextPlayer() {
            if (!this.players.length) return
            this.currentType = null
            this.selectedCard = null

            const currentIndex = this.players.findIndex(
                (p) => p.id === this.currentPlayerId
            )
            const nextIndex = (currentIndex + 1) % this.players.length
            this.currentPlayerId = this.players[nextIndex].id

            // check if everyones hand is empty
            const allEmpty = this.players.every(p => this.hands[p.id].length === 0)
            if (allEmpty) {
                this.finishGame()
            }
        },

        updateValidTiles() {
            this.tiles.forEach(t => t.validForSelection = false) // reset
            if(this.selectedCard === null) return

            this.tiles.forEach(t => {
              t.validForSelection = this.isTileValidForCard(t, this.selectedCard)
            })
        },

        // ■1マスが、あるカードを置けるかどうかの判定（人間の手札選択・AIの候補探索どちらからも使う）
        isTileValidForCard(t, card) {
            if (t.area === "undeveloped") return false
            if (t.ownerTeam !== null) return false

            // if area is water then only water cards can be placed, if area is land then only land cards can be placed
            if (t.area === "river" || t.area === "sea") {
                if (card.area !== "water") return false
            } else {
                if (card.area !== "land") return false
            }

            // Lv1は無条件OK
            if (card.tier === 1) return true

            // 1つ下のtierを2つ以上持っているかチェック（食われていないもののみ）
            const neighbors = this.getNeighbors(t)
            const lowerTier = card.tier - 1
            const count = neighbors.filter(n => n.placedCard?.tier === lowerTier && !n.eatenByTileId).length
            return count >= 2
        },

        getNeighbors(tile) {
            const { row, col } = tile

            return this.tiles.filter(t => {
                const rowDiff = Math.abs(t.row - row)
                const colDiff = Math.abs(t.col - col)

                // exclude itself (0,0) but include everything within 1 distance (including diagonals)
                return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0)
            })
        },

        randomArea() {
            const list = ['forest', 'dirt']
            return list[Math.floor(Math.random() * list.length)]
        },
        generateTiles() {
                this.tiles = []
                let id = 1

                // blank map
                for (let r = 0; r < this.rows; r++) {
									for (let c = 0; c < this.cols; c++) {
										this.tiles.push({
											id: id++,
											row: r,
											col: c,
											type: 'none',
											selected: false,
											ownerTeam: null,
											area: null
										})
									}
                }

                // oceans and rivers
                this.makeOcean()
                this.makeRivers(3)

                // --- Create town clusters ---
                const townSeeds = 8  // increase for larger towns
                for (let i = 0; i < townSeeds; i++) {
                        const r = Math.floor(Math.random() * this.rows)
                        const c = Math.floor(Math.random() * this.cols)
                        const tile = this.tiles.find(t => t.row === r && t.col === c)
                        if (!tile || tile.area) continue
                        tile.area = 'town'
                }

                // Expand towns more aggressively
                for (let i = 0; i < 400; i++) {
                        const tile = this.tiles[Math.floor(Math.random() * this.tiles.length)]
                        if (tile.area !== 'town') continue

                        const neighbors = this.getNeighbors(tile)
                        neighbors.forEach(n => {
                                if (!n.area && Math.random() < 0.75) {
                                        n.area = 'town'
                                }
                        })
                }

                // seeds for other land areas
                const seedCount = 12
                for (let i = 0; i < seedCount; i++) {
                        const r = Math.floor(Math.random() * this.rows)
                        const c = Math.floor(Math.random() * this.cols)
                        const tile = this.tiles.find(t => t.row === r && t.col === c)
                        if (!tile || tile.area) continue
                        tile.area = this.randomArea()
                }

                // expand land areas
                for (let i = 0; i < 300; i++) {
                        const tile = this.tiles[Math.floor(Math.random() * this.tiles.length)]
                        if (!tile.area || tile.area === 'sea' || tile.area === 'river') continue
                        const neighbors = this.getNeighbors(tile)
                        neighbors.forEach(n => {
                                if (!n.area && Math.random() < 0.6) n.area = tile.area
                        })
                }

                // leftover / undeveloped tiles
                this.tiles.forEach(t => {
                        if (!t.area) {
                                // ~1 in 7.5 tiles becomes undeveloped
                                if (Math.random() < 1/8) {
                                        t.area = 'undeveloped'
                                } else {
                                        t.area = this.randomArea()
                                }
                        }
                })
        },
        setArea(r, c, area) {
            const t = this.tiles.find(t => t.row === r && t.col === c)
            if (t) t.area = area
        },
        makeRivers(count = 2) {
            for (let r = 0; r < count; r++) {

                const edges = ['top', 'bottom', 'left', 'right']
                const startEdge = edges[Math.floor(Math.random() * edges.length)]

                let row, col
                let direction

                switch (startEdge) {
                    case 'top':
                        row = 0
                        col = Math.floor(Math.random() * this.cols)
                        direction = [1, 0] // go downward
                        break

                    case 'bottom':
                        row = this.rows - 1
                        col = Math.floor(Math.random() * this.cols)
                        direction = [-1, 0]
                        break

                    case 'left':
                        row = Math.floor(Math.random() * this.rows)
                        col = 0
                        direction = [0, 1]
                        break

                    case 'right':
                        row = Math.floor(Math.random() * this.rows)
                        col = this.cols - 1
                        direction = [0, -1]
                        break
                }

                const maxSteps = Math.floor((this.rows + this.cols) * 0.6)
                let steps = 0

                while (steps < maxSteps) {

                    const tile = this.tiles.find(t => t.row === row && t.col === col)
                    if (!tile || tile.area === 'sea' || tile.area === 'river') break

                    this.setArea(row, col, 'river')

                    // 70% go forward, 30% slight turn
                    if (Math.random() < 0.3) {
                        const turns = [
                            [direction[1], direction[0]],
                            [-direction[1], -direction[0]]
                        ]
                        direction = turns[Math.floor(Math.random() * turns.length)]
                    }

                    row += direction[0]
                    col += direction[1]

                    // boundary check
                    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) break

                    steps++
                }
            }
        },
        makeOcean() {
            const edges = ['top', 'bottom', 'left', 'right']

            // pick 1–2 edges only (reduce starting power)
            const shuffled = edges.sort(() => Math.random() - 0.5)
            const oceanEdges = shuffled.slice(0, Math.floor(Math.random() * 2) + 1)

            const seeds = []

            oceanEdges.forEach(edge => {
                let positions = []

                if (edge === 'top') {
                    positions = Array.from({ length: this.cols }, (_, i) => ({ row: 0, col: i }))
                }

                if (edge === 'bottom') {
                    positions = Array.from({ length: this.cols }, (_, i) => ({ row: this.rows - 1, col: i }))
                }

                if (edge === 'left') {
                    positions = Array.from({ length: this.rows }, (_, i) => ({ row: i, col: 0 }))
                }

                if (edge === 'right') {
                    positions = Array.from({ length: this.rows }, (_, i) => ({ row: i, col: this.cols - 1 }))
                }

                // smaller seed count
                const count = Math.max(2, Math.floor(positions.length * 0.25))

                for (let i = 0; i < count; i++) {
                    const p = positions[Math.floor(Math.random() * positions.length)]
                    seeds.push(p)
                    this.setArea(p.row, p.col, 'sea')
                }
            })

            // softer expansion
            for (let i = 0; i < 350; i++) {
                const tile = this.tiles[Math.floor(Math.random() * this.tiles.length)]

                if (tile.area !== 'sea') continue

                const neighbors = this.getNeighbors(tile)

                neighbors.forEach(n => {
                    if (!n.area && Math.random() < 0.35) {
                        n.area = 'sea'
                    }
                })
            }
        },
        makeTowns(count = 4) {
                const townSeeds = []

                // 1. pick random town center seeds
                for (let i = 0; i < count; i++) {
                        let tile = null

                        // avoid water
                        while (!tile || tile.area === 'sea' || tile.area === 'river') {
                                tile = this.tiles[Math.floor(Math.random() * this.tiles.length)]
                        }

                        tile.area = 'town'
                        townSeeds.push(tile)
                }

                // 2. town expansion
                for (let i = 0; i < 300; i++) {
                        const tile = this.tiles[Math.floor(Math.random() * this.tiles.length)]
                        if (tile.area !== 'town') continue

                        const neighbors = this.getNeighbors(tile)
                        neighbors.forEach(n => {
                                if (n.area === null || n.area === 'forest' || n.area === 'dirt') {
                                        if (Math.random() < 0.4) {
                                                n.area = 'town'
                                        }
                                }
                        })
                }
        },
        shuffleArray(array) {
            const arr = array.slice();
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        },

        // ■人間チームの手札：チームのメンバー全員の、手元にある所持カード
        async fetchHumanHand() {
            const team = TEAM_NAME_BY_ID[this.humanPlayerId]
            const libraryById = Object.fromEntries(this.cardLibrary.map(card => [card.cardId, card]))
            try {
                const instances = await fetchTeamCollectionInstances(team)
                return instances
                    .filter(instance => libraryById[instance.cardId])
                    .map(instance => toDominationCard(libraryById[instance.cardId], instance.instanceId))
            } catch (e) {
                console.error('チームの所持カードの読み込みに失敗しました', e)
                return []
            }
        },

        async refreshHumanHand() {
            this.hands[this.humanPlayerId] = this.shuffleArray(await this.fetchHumanHand())
        },

        // ■AIチームの手札（仮）：カードライブラリからレベルの重みで引いた仮のカード
        buildAIHand(playerId, size) {
            const weights = this.cardLibrary.map(card => AI_LEVEL_WEIGHTS[card.level] || 1)
            const total = weights.reduce((sum, w) => sum + w, 0)

            return Array.from({ length: size }, (_, index) => {
                let roll = Math.random() * total
                let card = this.cardLibrary[this.cardLibrary.length - 1]
                for (let i = 0; i < this.cardLibrary.length; i++) {
                    roll -= weights[i]
                    if (roll < 0) {
                        card = this.cardLibrary[i]
                        break
                    }
                }
                return toDominationCard(card, `ai-${playerId}-${index}`, true)
            })
        },

        async initializeHands() {
            const humanHand = this.shuffleArray(await this.fetchHumanHand())
            const aiHandSize = Math.max(humanHand.length, AI_MIN_HAND_SIZE)

            this.players.forEach(player => {
                this.hands[player.id] = player.id === this.humanPlayerId
                    ? humanHand
                    : this.buildAIHand(player.id, this.cardLibrary.length ? aiHandSize : 0)
            });
        },
        areaBadgeClass(card, playerId) {
            let baseClass = ''

            switch (card.area) {
                case 'land':
                    baseClass = 'bg-[#D7B899] text-[#6B4E2E] border-[#C5A57E]'
                    break
                case 'water':
                    baseClass = 'bg-[#9ECAD6] text-[#355F6B] border-[#7FB3C8]'
                    break
                default:
                    baseClass = 'bg-slate-100 text-slate-700 border-slate-300'
            }

            const isCurrent = this.selectedCard?.id === card.id && playerId === this.currentPlayerId

            if (isCurrent) {
                baseClass += ' animate-pulse ring-2 bg-[#90EE90] ring-green-400'
            }

            return baseClass
        },

        sortHandByTier(hand) {
            return hand?.slice().sort((a, b) => {

                // tier
                if (a.tier !== b.tier) {
                    return a.tier - b.tier;
                }

                // label
                return a.label.localeCompare(b.label, 'ja');
            });
        },
        compressHand(sortedHand) {
            if(!sortedHand) return [];
            const map = new Map();

            sortedHand?.forEach(card => {
                const key = card.label;

                if (!map.has(key)) {
                    map.set(key, {
                        ...card,
                        holdingCount: 1,
                    });
                } else {
                    map.get(key).holdingCount++;
                }
            });

            return Array.from(map.values());
        },
        getDisplayHand(hand) {
            if(!hand) return [];
            return this.compressHand(
                this.sortHandByTier(hand)
            );
        },
        groupHandByTier(hand) {
            const map = new Map();

            hand.forEach(card => {
                if (!map.has(card.tier)) {
                    map.set(card.tier, []);
                }
                map.get(card.tier).push(card);
            });

            return Array.from(map.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([tier, cards]) => ({
                    tier,
                    cards: this.compressHand(
                        cards.slice().sort((a, b) => {
                            if (a.area !== b.area) {
                                return a.area.localeCompare(b.area, 'ja');
                            }
                            return a.label.localeCompare(b.label, 'ja');
                        })
                    )
                }));
        },

        changeMode() {
            if(this.dominationMode === 'standard') {
                this.dominationMode = 'mapControl';
                this.mapStep = 0;
            } else {
                this.dominationMode = 'standard';
            }
        },

        // ------------------------
        previewCard(card, playerId) {
            if(this.currentPlayerId !== playerId) return
            if(this.currentPlayer?.isAI) return
            this.isPreviewing = true
            this.modalCard = card
        },

        useCard() {
          this.selectedCard = this.modalCard
          this.isPreviewing = false
          this.modalCard = null

          this.updateValidTiles()
        },

        closePreview() {
            this.modalCard = null
            this.isPreviewing = false
        },

        highestPlayerScore() {
          // if everyone 0
          if (this.players.every(p => p.score === 0)) {
              return null
          }

          return Math.max(...this.players.map(p => p.score))
        },

        tierShapeClass(tile) {

            if (tile.placedCard?.tier === 1) return "triangle"
            if (tile.placedCard?.tier === 2) return "w-5 h-5"
            if (tile.placedCard?.tier === 3) return "w-5 h-5 rounded-full"
            if (tile.placedCard?.tier === 4) return "text-3xl"

        },
        tierShapeStyle(tier,color, isEaten) {
            const fillColor = isEaten ? '#66666688' : this.teamColor(color)

            // ■置いたアイコンが背景の地形色に埋もれて見づらいため、
            // アイコンそのものに黒フチを付けてくっきり見えるようにする
            if (tier === 1) {
                // 三角形はborder-trickで作っているため、drop-shadowを4方向に重ねてフチを再現する
                return {
                    borderBottomColor: fillColor,
                    filter: 'drop-shadow(1px 0 0 #000) drop-shadow(-1px 0 0 #000) drop-shadow(0 1px 0 #000) drop-shadow(0 -1px 0 #000)'
                }
            }

            if (tier === 4) {
                return {
                    color: fillColor,
                    WebkitTextStroke: '1.5px #000',
                    textShadow: '0 0 2px rgba(0,0,0,0.6)'
                }
            }

            // tier 2（四角）・tier 3（丸）
            return {
                background: fillColor,
                border: '2px solid #000',
                boxSizing: 'border-box'
            }
        },

        confirmSkip() {
            if (this.currentPlayer?.isAI) return

            if (confirm("本当にスキップしますか？")) {
                this.skipCount++
                if(this.skipCount >= this.players.length) {
                    alert("全員がスキップしたので、ゲームを終了します。")
                    this.finishGame();
                    return;
                } else {
                    this.goToNextPlayer()
                }
                this.saveGame()
                this.maybeTriggerAI()
            }
        },

        confirmFinish() {
            if (confirm("本当にゲームを終了しますか？現在のスコアが表示されます。")) {
                this.finishGame();
            }
        },

        finishGame(){
          this.gameState = 'finished'
          this.currentPlayerId = null
          this.isAiThinking = false
          this.saveGame()
        },

        // ------------------------
        // AIプレイヤー関連
        // ------------------------

        // ■手番がAIなら自動で打たせる。人間の手番なら何もしない
        maybeTriggerAI() {
            if (this.gameState !== 'playing') return
            if (this.currentPlayer && this.currentPlayer.isAI) {
                this.playAITurn()
            }
        },

        // ■シンプルなAI: 手札からランダムに1枚選び、置けるマスがあればランダムな有効マスに置く。
        // どのカードも置ける場所が無ければスキップする
        findAIMove(hand) {
            const candidates = this.shuffleArray(hand || [])

            for (const card of candidates) {
                const validTiles = this.tiles.filter(t => this.isTileValidForCard(t, card))

                if (validTiles.length > 0) {
                    const tile = validTiles[Math.floor(Math.random() * validTiles.length)]
                    return { card, tile }
                }
            }

            return null
        },

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms))
        },

        async playAITurn() {
            if (this.gameState !== 'playing') return

            const player = this.currentPlayer
            if (!player || !player.isAI) return

            this.isAiThinking = true

            // 「考えている」感を出すための、少しだけのウェイト
            await this.delay(900 + Math.random() * 500)

            // ウェイト中に状況が変わっていたら中断（保存の再読込・リセット等）
            if (this.gameState !== 'playing' || this.currentPlayerId !== player.id) {
                this.isAiThinking = false
                return
            }

            const hand = this.hands[player.id] || []
            const move = this.findAIMove(hand)

            if (!move) {
                this.isAiThinking = false
                this.skipCount++

                if (this.skipCount >= this.players.length) {
                    this.finishGame()
                    return
                }

                this.goToNextPlayer()
                this.saveGame()
                this.maybeTriggerAI()
                return
            }

            const { card, tile } = move

            // ■別の端末で人間が操作していたチームの手札（所持カード）をAIが使う場合も、DBを placed にする
            if (isOwnedCard(card)) {
                let placed = false
                try {
                    placed = await placeCardInstance(card.instanceId, this.roomCode, tile.id)
                } catch (e) {
                    console.error('カードの配置の保存に失敗しました', e)
                }
                if (!placed) {
                    this.removeFromHand(hand, card)
                    this.isAiThinking = false
                    this.saveGame()
                    this.maybeTriggerAI()
                    return
                }
            }

            tile.ownerTeam = player.id
            tile.placedCard = card
            player.score += this.getScoreForTile(card.tier)

            this.handleEating(tile)

            this.removeFromHand(hand, card)

            this.skipCount = 0
            this.isAiThinking = false
            this.goToNextPlayer()
            this.saveGame()
            this.maybeTriggerAI()
        },

    },
    async mounted() {
        console.clear()

        // set the first player as the current player by default (保存データがあれば後で上書きされる)
        if (this.players.length > 0) {
            this.currentPlayerId = this.players[0].id
        }

        await this.loadOrInitGame();

        // ■tiles/handsの準備が整ってから'standard'表示へ切り替える
        // （先に切り替えるとhands[currentPlayerId]が未定義の状態でテンプレートが描画され例外になる）
        this.dominationMode = 'standard';
    },
    components: {
        CreatureCard
    },
    computed: {
      currentPlayer() {
          return this.players.find(p => p.id === this.currentPlayerId)
      },
      sortedPlayersByScore() {
          return [...this.players].sort((a, b) => b.score - a.score)
      }
    }

}
</script>

<style scoped>
  @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.7; }
  }

  .triangle{
      width:0;
      height:0;
      border-left:12px solid transparent;
      border-right:12px solid transparent;
      border-bottom:20px solid;
  }

  .fade-enter-active,
  .fade-leave-active{
      transition: opacity .2s ease;
  }

  .fade-enter-from,
  .fade-leave-to{
      opacity: 0;
  }

</style>
