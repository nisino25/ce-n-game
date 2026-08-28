<template>
    <!-- <button class="m-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm" @click="changeMode()">Change Mode</button> -->
    <template v-if="dominationMode == 'standard'">
        <div class="tiles-app p-5">
            <!--  --- Right side Area --- -->
                <div class="flex justify-between gap-4 mb-6">
                    <div>
                        <!-- 色の説明 -->
                        <h3>色の説明</h3>
                        <div>
                            <div class="grid grid-cols-4 gap-2">
                                <template v-for="(item,index) in terrainList" :key="item.key">
                                    <div   
                                        class="flex items-center gap-1"
                                        :class="{ 'col-span-2': index === terrainList.length - 1 }"
                                    >
                                        <div
                                            class="w-4 h-4 rounded-full"
                                            :style="{ background: areaColors[item.key] }"
                                        ></div>
                                        <span class="text-xs whitespace-nowrap">{{ item.label }}</span>
                                    </div>

                                </template>
                            </div>

                        </div>

                        <!-- レベルの説明 -->
                        <div>
                            <h3 class="text-sm font-medium mb-3">レベルとポイントの説明</h3>
                            <div class="flex justify-between items-center items-stretch">
                                <div v-for="tier in [1, 2, 3, 4]" :key="tier" class="text-center bg-gray-300 rounded block p-2">
                                    <div
                                        v-if="tier !== 1 && tier !== 4"
                                        class="mx-auto mb-2"
                                        :class="tierShapeClass(tier)"
                                        :style="tierShapeStyle(tier,'#555')"
                                        style="background: black; border-color: black"
                                    ></div>
                                    <span class="text-xs">
                                        <strong v-if="tier === 1" class="text-xl">&#9650;<br></strong>
                                        <strong v-if="tier === 4" class="text-xl">★<br></strong>
                                        <strong>Lv{{ tier }}</strong><br>
                                        <small class="whitespace-nowrap text-center">{{ getScoreForTile(tier) }}点</small>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- アクションボタン -->
                        <h3>アクションボタン</h3>
                        <div class="w-full">
                            <div class="grid grid-cols-2 gap-2 w-full">
                            <button 
                                @click="selectedCard = null" 
                                :disabled="!selectedCard"
                                class="px-1 py-2 rounded-md border text-sm"
                                :class="[
                                    selectedCard
                                        ? 'bg-gray-200 hover:bg-gray-300'
                                        : 'bg-gray-200 opacity-[0.4] cursor-not-allowed'
                                ]">
                                キャンセル
                            </button>
                            <button
                                class="px-1 py-2 rounded-md border bg-blue-200 text-sm"
                                @click="confirmSkip()"
                            >
                                スキップ
                            </button>
                            <button
                                class="px-1 py-2 rounded-md border bg-green-200 text-sm"
                                @click="confirmFinish()"
                            >
                                ゲーム終了
                            </button>
                            <button
                                class="px-1 py-2 rounded-md border bg-red-200 text-sm"
                                @click="backToMonitorRoom()"
                            >
                              戻る
                            </button>
													</div>
                        </div>
                    </div>
                    <!-- Tiles Area -->
                    <div class="w-full rounded-md bg-gray-200 p-4 flex-1">
                          <div
                              class="grid gap-1 w-full h-full"
                              :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }"
                          >
                            <div
                                v-for="tile in tiles"
                                :key="tile.id"
                                class="relative rounded-sm transition-transform duration-150 cursor-pointer"
                                :class="{
                                    'scale-[1.03] ring-4 ring-offset-1': tile.selected
                                }"
                                @click="onTileClick(tile, $event)"
                                :style="tileStyle(tile)"
                              >
                              <div 
                                  v-if="tile.validForSelection"
                                  class="
                                  animate-pulse
                                  absolute
                                  top-1/2
                                  left-1/2
                                  -translate-x-1/2
                                  -translate-y-1/2
                                  bg-golden
                                  w-[70%]
                                  rounded-full
                                  aspect-square
                                  bg-yellow-100"
                                  >
                              </div>
      
                              <div v-if="tile.ownerTeam" class="flex justify-center items-center w-full h-full">
                                <div
                                    :class="tierShapeClass(tile)"
                                    :style="tierShapeStyle(tile.placedCard?.tier, tile.ownerTeam, tile.eatenByPlayerId)"
                                >
                                    <span v-if="tile.placedCard?.tier === 4">★</span>
                                </div>
                              </div>
      
                            </div>
      
                            <!-- tile preview -->
      
                            <template v-if="tilePreviewCard">
                              <div
                              v-if="tilePreviewCard?.instanceId"
                              class="fixed inset-0 z-50 bg-black/40"
                              >
                              tilepreviewCard: {{ tilePreviewCard.id }} 
                                  <div
                                      class="absolute transition-all duration-300 ease-out z-[100] pointer-events-auto"
                                      :style="previewStyle"
                                  >
                                    <!-- Close Button -->
                                    <button
                                        class="absolute -top-3 -right-3 bg-white rounded-full shadow px-2 py-1 text-sm"
                                        @click="tilePreviewCard = null; previewStyle = {}"
                                    >
                                        ✕
                                    </button>
      
                                    <CreatureCard
                                        :creature="tilePreviewCard"
                                        class="w-full h-full rounded-lg shadow-xl"
                                    />
                                  </div>
                              </div>
                            </template>
                          </div>
                    </div>
                </div>
              <!-- ---------preview all the unique cards------------- -->
              <!-- <hr class="my-6">
              <div class="grid grid-cols-3 gap-4">
                <CreatureCard 
                    :creature="card" 
                    v-for="(card, index) in allCards.sort((a, b) =>
                        a.area === b.area
                        ? a.tier - b.tier
                        : a.area.localeCompare(b.area)
                    )" :key="index"/>
              </div> -->


            <div class="relative">
                <!-- プレイヤーリスト -->
                <!-- <h3 class="text-lg font-semibold absolute bottom-full left-0">プレイヤーリスト</h3> -->
                <div>
                  <div v-if="gameState=='finished'">
                    <div class="absolute inset-0 bg-black/50 z-10 flex items-center justify-center w-full h-full">
                      <div class="bg-white p-6 rounded-lg shadow-lg text-center z-20">
                        <h2 class="text-2xl font-bold mb-4">ゲーム終了！</h2>
                        <p class="text-lg mb-4">最終スコア</p>  
                        <ul class="text-left mb-4">
                          <li v-for="player in players" :key="player.id" class="mb-2">
                            <span :style="{ color: player.color }" class="font-semibold">{{ player.name }}</span>: {{ player.score }}点
                          </li>
                        </ul>
                        <hr>
                        <!-- もう一回 -->
                        <button class="mt-4 px-4 py-2 bg-green-500 text-white rounded-md" @click="resetTiles()">もう一回遊ぶ</button>
                      </div>
                    </div>
                  </div>
                  <div class="grid grid-cols-3 gap-3">
                      <div
                          v-for="player in players"
                          :key="player.id"
                          class="p-3 border rounded-md flex flex-col gap-2 relative"
                          :style="{ background: currentPlayerId === player.id ? '#FFC72C' : '' }"
                        >
                        <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-md" :style="{ background: player.color }"></div>
                            <div class="flex-1 text-sm">
                              <span class="font-medium">{{ player.name }}: {{ player.score }}点</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <template
                                v-for="(group, index) in groupHandByTier(hands[player.id])"
                                :key="group.tier"
                            >
                              <div
                                class="w-full pb-2"
                                :class="{ 'border-b border-color-slate-300': index !== groupHandByTier(hands[player.id]).length - 1 }"
                                >
    
                                
                                <div class="flex flex-wrap gap-2 items-center">
                                    <div class="mb-1">
                                        <span class="text-xs text-slate-400 mb-1">Lv{{ group.tier }}:</span> 
                                    </div>
                                    <div
                                        v-for="card in group.cards"
                                        :key="card.id"
                                        class="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer"
                                        :class="areaBadgeClass(card, player.id)"
                                        @click="previewCard(card, player.id)"
                                    >
                                        <span>{{ card.label }}</span>
                                        <span class="text-slate-500">×{{ card.holdingCount }}</span>
                                    </div>
                                </div>
                              </div>
                            </template>
                        </div>
                      </div>
                  </div>
                </div>
            </div>
        </div>
        <!-- Modal -->
        <div
            v-if="modalCard && isPreviewing"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="closePreview"
          >
            <div class="relative p-4 bg-white rounded-lg shadow-lg w-full max-w-sm">

                <!-- Close Button -->
                <button
                    class="absolute -top-3 -right-3 bg-white rounded-full shadow px-2 py-1 text-sm"
                    @click="closePreview"
                >
                    ✕
                </button>

                <!-- 🔥 ここで既存コンポーネントを使う -->
                <CreatureCard :creature="modalCard" class="mx-auto"/>

                <div class="button-container flex justify-center mt-4">
                    <button @click="useCard()" class="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">選択する</button>
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
import CreatureCard from './CreatureCard.vue';
export default {
    // name: 'Tiles20x20',
    data() {
      const cols = 30
      const rows = 15

      return {
        cols,
        rows,
        tiles: [],
        currentPlayerId: null,
        currentType: null,
       
        players: [
            { id: 1, name: '水チーム', color: '#00BFA6', score: 0 }, // teal (water but not blue)
            { id: 2, name: '空気チーム', color: '#9B5DE5', score: 0 }, // purple (air = light / abstract)
            { id: 3, name: '土チーム', color: '#FFB97A', score: 0 }  // sand/orange (earth)
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

        allCards: [
          {id:'オオワシ', get label(){return this.id}, area: 'land', count: 1, food:["虫","小動物"], tier: 4},
          {id:'キタキツネ', get label(){return this.id}, area: 'land', count: 2, food:["さかな"], tier: 3},
          {id:'エゾタヌキ', get label(){return this.id}, area: 'land', count: 2, food:["虫","植物"], tier: 2},
          {id:'エゾリス', get label(){return this.id}, area: 'land', count: 3, food:["植物"], tier: 2},
          {id:'オコジョ', get label(){return this.id}, area: 'land', count: 3, food:["虫","小動物"], tier: 2},
          {id:'カヤネズミ', get label(){return this.id}, area: 'land', count: 3, food:["植物"], tier: 2},
          {id:'エゾウサギ', get label(){return this.id}, area: 'land', count: 3, food:["植物"], tier: 2},
          {id:'ミミズ', get label(){return this.id}, area: 'land', count: 10, food:["植物"], tier: 1},
          {id:'アブラムシ', get label(){return this.id}, area: 'land', count: 4, food:["植物"], tier: 1},
          {id:'カナブン', get label(){return this.id}, area: 'land', count: 4, food:["植物"], tier: 1},
          {id:'シオカラトンボ', get label(){return this.id}, area: 'land', count: 3, food:["虫"], tier: 1},
          {id:'モンシロチョウ', get label(){return this.id}, area: 'land', count: 4, food:["植物"], tier: 1},
          {id:'カマキリ', get label(){return this.id}, area: 'land', count: 3, food:["虫"], tier: 1},
          {id:'ミツバチ', get label(){return this.id}, area: 'land', count: 4, food:["植物"], tier: 1},
          {id:'シジミチョウ', get label(){return this.id}, area: 'land', count: 4, food:["植物"], tier: 1},
          {id:'イトウ', get label(){return this.id}, area: 'water', count: 1, food:["魚","小動物"], tier: 4},
          {id:'オショロコマ', get label(){return this.id}, area: 'water', count: 1, food:["魚","小動物"], tier: 3},
          {id:'ニジマス', get label(){return this.id}, area: 'water', count: 1, food:["虫"], tier: 3},
          {id:'ヤマメ', get label(){return this.id}, area: 'water', count: 1, food:["虫"], tier: 2},
          {id:'ウグイ', get label(){return this.id}, area: 'water', count: 1, food:["藻類"], tier: 2},
          {id:'ヤゴ', get label(){return this.id}, area: 'water', count: 1, food:["虫"], tier: 1},
          {id:'カゲロウの幼虫', get label(){return this.id}, area: 'water', count: 2, food:["藻類"], tier: 1},
          {id:'ゲンゴロウ', get label(){return this.id}, area: 'water', count: 1, food:["植物"], tier: 1},
          {id:'川エビ', get label(){return this.id}, area: 'water', count: 4, food:["藻類"], tier: 1},
          {id:'オタマジャクシ', get label(){return this.id}, area: 'water', count: 4, food:["藻類"], tier: 2},
          {id:'シマエナガ', get label(){return this.id}, area: 'land', count: 3, food:["虫"], tier: 2},
          {id:'エゾモモンガ', get label(){return this.id}, area: 'land', count: 3, food:["植物"], tier: 2},
          {id:'ヒグマ', get label(){return this.id}, area: 'land', count: 1, food:["植物","小動物"], tier: 4},
          {id:'タンチョウツル', get label(){return this.id}, area: 'land', count: 1, food:["植物","虫","魚"], tier: 4},
          {id:'エゾサンショウウオ', get label(){return this.id}, area: 'water', count: 1, food:["植物"], tier: 2},
          {id:'シマフクロウ', get label(){return this.id}, area: 'land', count: 1, food:["魚","小動物"], tier: 4},
          {id:'ヒメネズミ', get label(){return this.id}, area: 'land', count: 3, food:["植物"], tier: 2},
          {id:'モグラ', get label(){return this.id}, area: 'land', count: 3, food:["虫"], tier: 2},
          {id:'アカガエル', get label(){return this.id}, area: 'water', count: 3, food:["植物"], tier: 2},
          {id:'アブ', get label(){return this.id}, area: 'land', count: 3, food:["小動物","中動物","大動物"], tier: 1},
          {id:'エゾシカ', get label(){return this.id}, area: 'land', count: 2, food:["植物"], tier: 4},
          {id:'モンシロチョウ', get label(){return this.id}, area: 'land', count: 1, food:["植物"], tier: 1},
        ],

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

        gameState: 'playing' // 'playing' or 'finished'


      }
    },
    methods: {
        backToMonitorRoom() {
            this.$router.push({ name: 'MonitorRoom' });
        },
        onTileClick(tile, event) {
          console.log(tile)
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

            // alert("すでにカードが置いてあるタイルだよ")
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

          // if(this.currentType === null) return; // no type selected
          if (!tile.validForSelection) {
            alert("このタイルにはこのカードは置けないよ")
            return // not valid for selection
          }

          tile.ownerTeam = this.currentPlayerId
          tile.placedCard = this.selectedCard

          const points = this.getScoreForTile(this.selectedCard.tier)
          this.currentPlayer.score += points

            this.handleEating(tile)


          //カードを削除
          const hand = this.hands[this.currentPlayerId]

          const index = hand.findIndex(card => card.id === this.selectedCard.id)

          if (index !== -1) {
              hand.splice(index, 1)
          }


          console.log(this.hands[this.currentPlayerId])
          this.selectedCard = null
          this.updateValidTiles()
          // this.updateScores()
          this.skipCount = 0
          this.goToNextPlayer()
        },
        handleEating(placedTile) {
            const neighbors = this.getNeighbors(placedTile)

            neighbors.forEach(n => {
                // if the neibghot is lower than the placed tile, then it gets eaten
                if(!n.placedCard || !placedTile.placedCard) return
                if(n.placedCard.tier >= placedTile.placedCard.tier) return
                // mark as eaten
                n.eatenByTileId = placedTile.id
                n.eatenByPlayerId = this.currentPlayerId
            })
        },

        getScoreForTile(tier) {
            if (!tier) return 0

            if (tier === 1) return 1
            if (tier === 2) return 3
            if (tier === 3) return 5
            if (tier === 4) return 8

            return tier * 2
        },
        resetTiles() {
            if (!confirm("本当にタイルをリセットしますか？現在の進行状況は失われます。")) return;

            this.generateTiles()
            this.initializeHands()
            this.gameState = 'playing'
            this.currentPlayerId = this.players[0].id

            this.players.forEach(p => (p.score = 0))
        },
        teamColor(teamId) {
            const player = this.players.find(p => p.id === teamId)
            return player ? player.color : '#000'
        },
        tileStyle(tile) {
            // const base = {
            //     background: this.typeColors[tile.type] || '#ccc',
            //     width: '100%',
            //     aspectRatio: '1 / 1'
            // }
            const base = {
                background: this.areaColors[tile.area] || '#ccc',
                width: '100%',
                aspectRatio: '1 / 1'
            }

            // if has a card placed, then change the background to the card color
            // if(tile.placedCard) {
            //     base.background = this.typeColors[tile.placedCard.area] || '#ccc'
            // }

            // if tile is eatenm then change the background eater color
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

            //
            // if(tile.eatenByPlayerId) {
            //     const eaterPlayer = this.players.find(p => p.id === tile.eatenByPlayerId)
            //     if(eaterPlayer) {
            //         base.background = this.teamColor(eaterPlayer.id) 
            //     }
            // }



            // pulse for valid tiles
            //if (tile.validForSelection) {
                //base.animation = 'pulse 1s infinite'
                //base.background = 'gold'
                //return base
            //}

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
            console.log("updating valid tiles for card: ")
            console.log(this.selectedCard)

            const tier = this.selectedCard.tier
            this.tiles.forEach(t => {
              // 初期化
              t.validForSelection = false

              if (t.area === "undeveloped") return
              if (t.ownerTeam !== null) return
              
              // if area is water then only water cards can be placed, if area is land then only land cards can be placed
              if (t.area === "river" || t.area === "sea") {
                  if (this.selectedCard.area !== "water") return
              } else {
                  if (this.selectedCard.area !== "land") return
              }
            

              // Lv1は無条件OK
              if (tier === 1) {
                  t.validForSelection = true
                  return
              }

              const neighbors = this.getNeighbors(t)

              // 1つ下のtierを2つ以上持っているかチェック
              // but the card doesnt count if it is already eaten
              const lowerTier = tier - 1    
              const count = neighbors.filter(n => n.placedCard?.tier === lowerTier && !n.eatenByTileId).length
              t.validForSelection = count >= 2

                // const lowerTier = tier - 1

                // const count = neighbors.filter(n => n.placedCard?.tier === lowerTier).length

                // t.validForSelection = count >= 2
            })
        },
        // getNeighbors(tile) {
        //     const { row, col } = tile
        //     return this.tiles.filter(t =>
        //         (t.row === row && Math.abs(t.col - col) === 1) ||
        //         (t.col === col && Math.abs(t.row - row) === 1)
        //     )
        // },
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

        buildDeck(cardDefs) {
            return cardDefs.flatMap(card => {
                return Array.from({ length: card.count }, (_, index) => ({
                    id: card.id,
                    label: card.label,
                    area: card.area,
                    tier: card.tier,
                    food: card.food,
                    // optional: unique instance id
                    instanceId: (card.id === "モンシロチョウ" && card.count === 1) ? `${card.id}-4` : `${card.id}-${index}`
                }));
            });
        },


        initializeHands() {
          const unshuffledDeck = this.buildDeck(this.allCards)
          console.log(unshuffledDeck)

          // 3/26以降は戻す----------------------------
          const deck = this.shuffleArray(
              this.buildDeck(this.allCards)
          );

          console.log("Shuffled Deck:", deck);

          const playerCount = this.players.length;
          const cardsPerPlayer = Math.floor(deck.length / playerCount);

          this.players.forEach((player, index) => {
              this.hands[player.id] = deck.slice(
                  index * cardsPerPlayer,
                  (index + 1) * cardsPerPlayer
              );
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
            this.isPreviewing = true
            this.modalCard = card
        },

        useCard() {
          // alert(`You selected ${card.label}! Implement card effects here.`)
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
            // if(isEaten) {
            //     // eaten then just show the grey color
            //     return {
            //         background: '#66666688',
            //         color: '#66666688',
            //         borderBottomColor: '#66666688'
            //     }
            // }

            if (tier === 1) {
                if(isEaten) {
                    // make it black but a little bit grey
                    return { borderBottomColor: '#66666688' }
                }
                return { borderBottomColor: this.teamColor(color) }
            }

            if (tier === 4) {
                if(isEaten) {
                    return { color: '#66666688' }
                }
                return { color: this.teamColor(color) }
            }

            if(isEaten) {
                return { background: '#66666688' }
            }
            return { background: this.teamColor(color) }
        },

        confirmSkip() {
            if (confirm("本当にスキップしますか？")) {
                this.skipCount++
                if(this.skipCount >= this.players.length) {
                    alert("全員がスキップしたので、ゲームを終了します。")
                    this.finishGame();
                    return;
                } else {                
                    this.goToNextPlayer()
                }
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
        },


    },
    mounted() {
        console.clear()

        this.initializeHands();

        // set the first player as the current player on mount
        if (this.players.length > 0) {
            this.currentPlayerId = this.players[0].id
        }
        
        this.generateTiles();

        this.dominationMode = 'standard';
    },
    components: {
        CreatureCard
    },
    computed: {
      currentPlayer() {
          return this.players.find(p => p.id === this.currentPlayerId)
      }
    }

}
</script>

<style scoped>
  h3{
    font-size: 1rem;
    font-weight: bold;
    background: linear-gradient(90deg, #ff7e5f, #feb47b);
    display: inline-block;
    padding: 0.25rem 0.5rem;
    width: auto;
    margin: 1rem;
    margin-left: unset;
    /* -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;  */
  }

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

</style>
