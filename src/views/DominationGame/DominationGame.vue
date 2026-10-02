<template>
    <template v-if="dominationMode == 'standard'">
        <div class="domination-app app-shell bg-slate-100">

            <!-- Header: title + scoreboard -->
            <header class="app-header bg-white">
                <div class="max-w-[1500px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        <h1 class="whitespace-nowrap text-base sm:text-lg font-bold text-slate-700">陣取りゲーム</h1>

                        <button
                            class="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full pl-3 pr-2.5 py-1 font-mono font-bold tracking-wider text-slate-600 transition"
                            :title="roomLabelText() ? '' : 'クリックでコピー'"
                            @click="roomLabelText() ? null : copyRoomCode()"
                        >
                            <span class="text-slate-400">{{ roomLabelText() ? '📍' : '🔑ルーム' }}</span>
                            <span class="truncate">{{ roomLabelText() || roomCode }}</span>
                            <span v-if="roomLabelText()"></span>
                            <span v-else-if="roomCodeCopied" class="text-emerald-600 font-sans font-normal">コピーしました！</span>
                            <span v-else class="text-slate-400 font-sans font-normal">📋</span>
                        </button>

                        <!-- ■ヘッダーの右はし：？（説明をモーダルで）／🔍（盤面ぜんたい、スマホのみ） -->
                        <div class="ml-auto flex flex-none items-center gap-1.5 sm:gap-2">
                            <button class="header-tool" :aria-label="sfxMuted ? '効果音をつける' : '効果音を消す'" @click="toggleSfx">{{ sfxMuted ? '🔇' : '🔊' }}</button>
                            <button class="header-tool" aria-label="地形・レベルの説明を見る" @click="isShowingTuorial = true">?</button>
                            <button
                                class="header-tool sm:hidden"
                                :class="{ 'header-tool-on': boardOverview }"
                                :aria-label="boardOverview ? 'もとの大きさにもどす' : '盤面ぜんたいを見る'"
                                @click="toggleOverview"
                            >
                                🔍
                            </button>
                        </div>

                    </div>

                    <!-- ■チーム名と点数は、スマホでも必ず1行（3チームが横一列）。スマホでは「風 0点」のように短くする -->
                    <div class="flex w-full flex-nowrap gap-1.5 sm:w-auto sm:gap-2">
                        <div
                            v-for="player in players"
                            :key="player.id"
                            class="flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full border-2 px-1.5 py-1.5 text-xs transition-all sm:flex-none sm:gap-2 sm:pl-2 sm:pr-3 sm:text-sm"
                            :class="player.id === currentPlayerId ? 'shadow-md' : 'opacity-60'"
                            :style="{
                                borderColor: player.color,
                                background: player.id === currentPlayerId ? player.color + '1a' : 'transparent'
                            }"
                        >
                            <span class="h-2.5 w-2.5 flex-none rounded-full sm:h-3 sm:w-3" :style="{ background: player.color }"></span>
                            <span class="font-semibold">{{ player.name.replace('チーム', '') }}<span class="hidden sm:inline">チーム</span></span>
                            <span v-if="player.isAI" class="text-xs" title="AIが操作します">🤖</span>
                            <span class="font-bold">{{ player.score }}点</span>
                            <span
                                v-if="player.id === currentPlayerId"
                                class="text-xs font-bold"
                                :style="{ color: player.color }"
                            >
                                ▶<span class="hidden sm:inline">手番</span>
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

            <div class="app-body">
            <div ref="mainArea" class="app-main">
            <div class="max-w-[1500px] mx-auto px-1.5 py-2 sm:p-4 flex flex-col lg:flex-row gap-3 sm:gap-4 items-start">

                <!-- Board（スマホでは、枠をなくして画面いっぱいに。縦長の盤面にして、マスを大きくする） -->
                <div class="board-wrap flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 p-3 overflow-auto">
                    <div
                        class="board-grid grid gap-[2px] mx-auto"
                        :style="{ '--cols': cols, '--rows': rows, maxWidth: boardOverview ? overviewWidth + 'px' : '1100px' }"
                    >
                        <div
                            v-for="tile in tiles"
                            :key="tile.id"
                            class="board-tile relative rounded-[2px] cursor-pointer transition-transform duration-150"
                            :data-tile-id="tile.id"
                            :class="{ 'scale-[1.05] ring-2 ring-offset-1 z-10': tile.selected, 'ai-last': tile.id === lastAiTileId }"
                            @click="onTileClick(tile)"
                            :style="[tileStyle(tile), { '--tr': tile.row + 1, '--tc': tile.col + 1 }]"
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

                    <!-- current player hand -->
                    <div v-if="gameState === 'playing' && currentPlayer" class="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 p-4">
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
                    <div class="hidden lg:grid bg-white rounded-xl shadow-sm border border-slate-200 p-3 grid-cols-2 gap-2">
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
                            v-if="gameState === 'playing'"
                            class="px-2 py-2.5 rounded-lg border border-red-400 bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition"
                            @click="showResignConfirm = true"
                        >
                            🏳 まけました
                        </button>
                        <button
                            class="px-2 py-2.5 rounded-lg border border-rose-300 bg-rose-100 hover:bg-rose-200 text-sm font-medium transition"
                            @click="backFromGame()"
                        >
                            {{ backLabelText() }}
                        </button>
                    </div>
                </div>
            </div>
            </div>
            </div>

            <!-- ■スマホ・タブレット：手札とボタンを、画面の下にまとめて固定する（盤面をスクロールしても、いつでも使える） -->
            <div class="game-dock lg:hidden" :style="{ '--turn-color': currentPlayer ? currentPlayer.color : '#64748b' }">
                <!-- ■あなたの手札（ほかの部分と見分けがつくよう、枠・タイトルつきの別のエリア） -->
                <div class="dock-panel dock-hand-panel">
                    <div class="dock-panel-title">
                        <span>🃏 あなたの手札</span>
                        <span v-if="gameState === 'playing' && currentPlayer && currentPlayer.isAI" class="dock-note">🤖 {{ currentPlayer.name }}が 考えているよ…</span>
                        <span v-else-if="selectedCard" class="dock-note dock-note-ok">「{{ selectedCard.label }}」→ きいろい マスに おけるよ</span>
                    </div>
                    <div v-if="gameState === 'playing' && currentPlayer && !currentPlayer.isAI" class="dock-hand">
                        <template v-for="group in groupHandByTier(hands[currentPlayerId])" :key="group.tier">
                            <button
                                v-for="card in group.cards"
                                :key="card.id"
                                class="dock-chip border"
                                :class="areaBadgeClass(card, currentPlayerId)"
                                @click="previewCard(card, currentPlayerId)"
                            >
                                <span class="dock-lv">{{ group.tier }}</span>{{ card.label }}<small>×{{ card.holdingCount }}</small>
                            </button>
                        </template>
                        <span v-if="!hands[currentPlayerId] || hands[currentPlayerId].length === 0" class="dock-empty">手札がありません</span>
                    </div>
                </div>

                <!-- ■そうさボタン（手札とは別の、色のちがうエリア） -->
                <div class="dock-panel dock-actions-panel">
                    <div class="dock-actions">
                        <button
                            v-if="gameState === 'playing'"
                            class="dock-button"
                            :disabled="currentPlayer?.isAI"
                            @click="confirmSkip()"
                        >
                            ⏭ スキップ
                        </button>
                        <button
                            v-if="gameState === 'playing'"
                            class="dock-button dock-button-danger"
                            @click="showResignConfirm = true"
                        >
                            🏳 まけました
                        </button>
                        <button class="dock-button dock-button-back" @click="backFromGame()">
                            {{ backLabelText() }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- ■タイルをタップ：置かれているカードを、共通のカードの見た目（カードライブラリと同じ）で大きく表示 -->
            <GameCardFocus
                v-if="tilePreviewCard"
                :card="tilePreviewCard"
                :display="focusDisplay(tilePreviewCard, tilePreviewTeam)"
                @close="tilePreviewCard = null"
            />

            <!-- finished game modal -->
            <div v-if="gameState === 'finished'" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                <div class="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm w-full">
                    <h2 class="text-2xl font-bold mb-1">ゲーム終了！</h2>
                    <p v-if="finishedResult" class="mb-1 text-lg font-black" :style="{ color: finishedResult.humanWon ? '#059669' : '#dc2626' }">
                        {{ finishedResult.humanWon ? 'かったよ！' : (finishedResult.resigned ? 'まけました…' : 'AIが かったよ') }}
                    </p>
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
                    <!-- ■地図の場所のゲームは、おわった枠はそのまま残る（もう一回はできない）ので、街の画面にもどる -->
                    <button
                        v-if="isSlotGame()"
                        class="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition"
                        @click="backFromGame()"
                    >
                        {{ backLabelText() }}
                    </button>
                    <button
                        v-else
                        class="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition"
                        @click="resetTiles()"
                    >
                        もう一回遊ぶ
                    </button>
                </div>
            </div>
        </div>

        <!-- ■まけました：確認（画面の中のダイアログ） -->
        <div
            v-if="showResignConfirm"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            @click.self="showResignConfirm = false"
        >
            <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                <p class="mb-1 text-xl font-black">まけましたに する？</p>
                <p class="mb-5 text-sm text-slate-600">AIの かちに なって、このゲームは おわるよ。</p>
                <div class="flex flex-col gap-2">
                    <button class="rounded-xl bg-red-500 px-4 py-3 font-bold text-white hover:bg-red-600" @click="resign()">まけました</button>
                    <button class="rounded-xl border border-slate-300 px-4 py-3 font-bold hover:bg-slate-100" @click="showResignConfirm = false">やめる</button>
                </div>
            </div>
        </div>

        <!-- ■地形・レベルの説明（はてなボタンから開くモーダル） -->
        <div
            v-if="isShowingTuorial"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            @click.self="isShowingTuorial = false"
        >
            <div class="relative w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl">
                <button class="absolute -top-3 -right-3 rounded-full bg-white px-2 py-1 text-sm shadow" @click="isShowingTuorial = false">✕</button>
                <p class="text-center text-base font-black text-slate-700">地形と レベルの せつめい</p>
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
        </div>

        <!-- ■スキップの確認（画面の中のダイアログ） -->
        <div
            v-if="showSkipConfirm"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            @click.self="showSkipConfirm = false"
        >
            <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                <p class="mb-1 text-xl font-black">スキップする？</p>
                <p class="mb-5 text-sm text-slate-600">カードを おかずに、つぎの チームに じゅんばんを わたすよ。</p>
                <div class="flex flex-col gap-2">
                    <button class="rounded-xl bg-sky-500 px-4 py-3 font-bold text-white hover:bg-sky-600" @click="doSkip()">スキップする</button>
                    <button class="rounded-xl border border-slate-300 px-4 py-3 font-bold hover:bg-slate-100" @click="showSkipConfirm = false">やめる</button>
                </div>
            </div>
        </div>

        <!-- ■操作の結果を知らせるメッセージ -->
        <div v-if="toastMessage" class="game-toast">{{ toastMessage }}</div>

        <!-- ■手札のカードをタップ：同じ共通のカード表示で、「選択する」ボタンつき -->
        <GameCardFocus
            v-if="modalCard && isPreviewing"
            :card="modalCard"
            :display="focusDisplay(modalCard, currentPlayerId)"
            selectable
            @close="closePreview"
            @select="useCard()"
        />
    </template>
    <template v-else>
        <!-- ■データ読み込み中（tiles/handsの準備ができるまで）のプレースホルダー -->
        <div class="flex items-center justify-center h-screen text-white text-lg font-bold">
            よみこみ中...
        </div>
    </template>
</template>

<script>
import db from '../../firebase.js';
import GameCardFocus from './GameCardFocus.vue';
import { getSession } from '@/utils/session.js';
import { generateSpotBoard } from './habitatBoard.js';
import { isFresh } from '@/utils/dominationSlots.js';
import { sfx } from '@/utils/sfx.js';
import {
    fetchCardLibrary,
    getCurrentUser,
    toDisplayCard,
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

      const humanPlayerId = TEAM_ID_BY_NAME[getSession('myTeam')] || 1

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
        slotOwner: null, // 地図のゲーム枠を遊んでいる人 { uid, name, team }
        resigned: false, // 「まけました」で終わったか
        showResignConfirm: false,
        showSkipConfirm: false,
        sfxMuted: sfx.isMuted(), // 効果音のミュート
        lastAiTileId: null, // AIが最後にカードを置いたタイル（ピコンピコン点滅させる）
        toastMessage: '',
        savedPlace: null, // ルームに保存されていた場所（地図から入り直さなかったときに引き継ぐ）

        players: [
            { id: 1, name: '水チーム', color: '#00BFA6', score: 0, isAI: humanPlayerId !== 1 }, // teal (water but not blue)
            { id: 2, name: '風チーム', color: '#9B5DE5', score: 0, isAI: humanPlayerId !== 2 }, // purple (air = light / abstract)
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

        // ■tiles/handsの準備が整うまでの読み込み中プレースホルダー表示に使う。mounted()で'standard'に切り替わる
        dominationMode: 'loading',

        selectedCard: null,
        modalCard: null,

        isPreviewing: false,

        tilePreviewCard: null,
        tilePreviewTeam: null, // タイルにあるカードの持ち主のチーム（プレイヤーID）
        previewStyle: {},

        skipCount: 0,

        gameState: 'playing', // 'playing' or 'finished'

        isShowingTuorial: false,
        boardOverview: false, // 虫眼鏡：盤面ぜんたいを1画面に収める（スマホ）
        overviewWidth: 300,

        isAiThinking: false
      }
    },
    methods: {
        // ■地図の場所から始めたゲームは、「ホーム」ではなく、その街（平塚市など）の六角形の画面にもどる
        backFromGame() {
            const place = this.loadPlace()
            if (place && place.city) {
                this.$router.push({ name: 'DominationMap', query: { city: place.city } })
                return
            }
            this.backToMonitorRoom()
        },

        backLabelText() {
            const place = this.loadPlace()
            return place && place.cityName ? `📍 ${place.cityName}にもどる` : '🏠 ホームにもどる'
        },

        backToMonitorRoom() {
            this.$router.push({ name: 'Home' });
        },
        async onTileClick(tile) {
          if (this.currentPlayer?.isAI) return // AIの手番中は操作不可
          if (this.isPlacingCard) return // カードの保存中は操作不可

          if(tile.placedCard) {
            this.tilePreviewTeam = tile.ownerTeam
            this.tilePreviewCard = tile.placedCard
            return
          }
          if(!this.selectedCard) {
              this.showToast("カードを選択してからタイルを選んでね")
              return
          }
          if(tile.area === 'undeveloped') {
              this.showToast("まだ動物たちが住めないから、環境をなおしてね")
              return; // cannot select undeveloped
          }

          if(tile.ownerTeam !== null) return; // already owned

          if (!tile.validForSelection) {
            this.showToast("このタイルにはこのカードは置けないよ")
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
                  this.showToast("カードを置けませんでした。通信状況を確認して、もう一度ためしてね")
                  return
              }
              this.isPlacingCard = false

              if (!placed) {
                  // すでにほかのゲームで使われていたカードは手札から外す
                  this.removeFromHand(hand, card)
                  this.selectedCard = null
                  this.updateValidTiles()
                  this.saveGame()
                  this.showToast(`「${card.label}」は、ほかのゲームですでに使われていたよ`)
                  return
              }
          }

          tile.ownerTeam = this.currentPlayerId
          tile.placedCard = card

          const points = this.getScoreForTile(card.tier)
          this.currentPlayer.score += points

          const ate = this.handleEating(tile)
          sfx.place()
          if (ate) setTimeout(() => sfx.eat(), 160)
          this.lastAiTileId = null // 自分が置いたら、AIの点滅は消す

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
            let eatenCount = 0

            neighbors.forEach(n => {
                // if the neibghot is lower than the placed tile, then it gets eaten
                if(!n.placedCard || !placedTile.placedCard) return
                if(n.placedCard.tier >= placedTile.placedCard.tier) return
                // mark as eaten
                n.eatenByTileId = placedTile.id
                n.eatenByPlayerId = this.currentPlayerId
                eatenCount++

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

            return eatenCount
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

            this.resigned = false
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

                this.savedPlace = data.place || null
                this.slotOwner = data.ownerUid ? { uid: data.ownerUid, name: data.ownerName || '', team: data.ownerTeam || '', updatedAt: data.updatedAt || '', gameState: data.gameState || 'playing' } : null
                this.resigned = !!(data.result && data.result.resigned)
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

        // ■最後に地図から入った場所（{city, cityName}）。ルームの「場所」として一緒に保存する
        loadPlace() {
            try {
                return JSON.parse(localStorage.getItem('dominationPlace')) || this.savedPlace
            } catch (e) {
                return this.savedPlace
            }
        },

        // ■地図の場所から始めたゲームは、長いルームコードの代わりに「場所 ゲーム番号」を表示する
        roomLabelText() {
            const place = this.loadPlace()
            if (!place) return ''
            if (place.spotName && place.gameNo) return `${place.spotName} ゲーム${place.gameNo}`
            return place.cityName || ''
        },

        // ■カードを共通のカード表示（カードライブラリ・宝箱と同じ）で出すためのデータ。
        //   カードライブラリにないカード（古い保存）は null を返し、旧表示にもどる
        focusDisplay(card, teamId) {
            const library = this.cardLibrary.find(item => item.cardId === card.cardId)
            if (!library) return null
            const player = this.players.find(item => item.id === teamId)
            const ownerName = player && player.isAI ? 'AI' : ((this.slotOwner && this.slotOwner.name) || 'あなた')
            return toDisplayCard(library, { team: TEAM_NAME_BY_ID[teamId], ownerName })
        },

        // ■虫眼鏡：盤面ぜんたい（縦長の15列×30行）が、上の見出しと下のバーのあいだに収まる幅にする
        toggleOverview() {
            this.boardOverview = !this.boardOverview
            if (this.boardOverview) {
                const area = this.$refs.mainArea
                const room = (area ? area.clientHeight : window.innerHeight - 300) - 34
                this.overviewWidth = Math.max(180, Math.min(window.innerWidth - 12, Math.floor(room * this.rows / this.cols)))
            }
        },

        // ■場所とゲーム番号から、盤面の元になる数（同じ場所・同じ番号なら必ず同じ数）
        spotSeed(spotId, gameNo) {
            let hash = 0
            for (let i = 0; i < spotId.length; i++) {
                hash = (hash * 31 + spotId.charCodeAt(i)) % 1000003
            }
            return hash * 10 + gameNo
        },

        // ■ゲームが終わったときの結果。得点が一番高いチームが勝ち。地図の六角形を塗るのに使う
        //   humanWon=false（AIチームの勝ち）なら、地図では灰色になる
        computeResult() {
            if (this.gameState !== 'finished') return null
            // 「まけました」のときは、得点にかかわらずAIの勝ち（得点が一番高いAIチームを勝ちにする）
            const winner = this.resigned
                ? (this.sortedPlayersByScore.find(player => player.isAI) || this.sortedPlayersByScore[0])
                : this.sortedPlayersByScore[0]
            if (!winner) return null
            return {
                winnerId: winner.id,
                winnerTeam: TEAM_NAME_BY_ID[winner.id],
                humanWon: winner.id === this.humanPlayerId,
                resigned: this.resigned
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
                    place: this.loadPlace(),
                    result: this.computeResult(),
                    ownerUid: this.slotOwner ? this.slotOwner.uid : null,
                    ownerName: this.slotOwner ? this.slotOwner.name : null,
                    ownerTeam: this.slotOwner ? this.slotOwner.team : null,
                    updatedAt: new Date().toISOString()
                })
            } catch (e) {
                console.error('陣取りゲームの保存に失敗しました', e)
            }

            if (this.isSlotGame()) this.saveSlotStatus()
        },

        // ■地図に出す「ゲーム枠のようす」（誰が遊び中か・勝ったチーム）を、軽いドキュメントにも書く
        async saveSlotStatus() {
            const place = this.loadPlace()
            if (!place || !this.slotOwner) return
            const result = this.computeResult()
            try {
                await db.collection('mapSlots').doc(this.roomCode).set({
                    city: place.city,
                    spotId: place.spotId,
                    gameNo: place.gameNo,
                    state: this.gameState === 'finished' ? 'finished' : 'playing',
                    ownerUid: this.slotOwner.uid,
                    ownerName: this.slotOwner.name,
                    ownerTeam: this.slotOwner.team,
                    winnerTeam: result ? result.winnerTeam : null,
                    humanWon: result ? result.humanWon : null,
                    updatedAt: new Date().toISOString()
                })
            } catch (e) {
                console.error('ゲーム枠のようすの保存に失敗しました', e)
            }
        },

        // ■ゲーム枠に入ってよいかの判断に使う情報を読む（ユーザー・この枠のようす・自分があそび中の枠）。
        //   他の読み込みと同時に進める
        async fetchSlotContext() {
            let user = null
            try {
                user = await getCurrentUser()
                if (!user) return { user: null }
                const [slotDoc, mine] = await Promise.all([
                    db.collection('mapSlots').doc(this.roomCode).get(),
                    db.collection('mapSlots').where('ownerUid', '==', user.uid).where('state', '==', 'playing').get()
                ])
                return { user, slot: slotDoc.exists ? slotDoc.data() : null, mineDocs: mine.docs }
            } catch (e) {
                console.error('ゲーム枠のようすの確認に失敗しました', e)
                return { user, slot: null, mineDocs: [] }
            }
        },

        // ■ゲーム枠に入ってよいか調べる（通信はしない。fetchSlotContext の結果で決める）。
        //   入れないときは、理由つきで街の画面にもどして blocked:true を返す。
        //   loaded は「保存されたゲームを読み込めたか」。前の人がやめた枠は読み込まなかったことにして、最初からやり直す
        checkSlotAccess(loaded, context) {
            const place = this.loadPlace()
            const user = context.user
            const goBack = notice => {
                this.$router.replace({ name: 'DominationMap', query: { city: place.city, notice } })
                return { blocked: true, loaded }
            }
            if (!user) return goBack('busy')

            const me = { uid: user.uid, name: user.name || '', team: TEAM_NAME_BY_ID[this.humanPlayerId] }

            if (loaded && this.slotOwner && this.slotOwner.uid !== user.uid) {
                if (this.slotOwner.gameState === 'finished') return goBack('done')
                if (isFresh(this.slotOwner.updatedAt)) return goBack('busy')
                loaded = false // 前の人がやめたまま長く動いていない枠は、最初からやり直して使う
            }

            if (loaded) {
                // 持ち主の記録が無い古い保存は、自分のものにする
                if (!this.slotOwner) this.slotOwner = me
                return { blocked: false, loaded: true }
            }

            // 新しく始める枠：すでにほかの人のものになっていないか（地図に出ている枠のようす）
            const slot = context.slot
            if (slot && slot.ownerUid && slot.ownerUid !== user.uid) {
                if (slot.state === 'finished') return goBack('done')
                if (isFresh(slot.updatedAt)) return goBack('busy')
            }

            // 自分が同じ街のほかの枠であそび中なら、始められない
            // 同時に遊べるのは、1つの街（エリア）につき1つ。ちがう街（平塚と釧路など）なら、1つずつ同時に遊べる
            const other = context.mineDocs.find(doc => doc.id !== this.roomCode && doc.data().city === place.city && isFresh(doc.data().updatedAt))
            if (other) return goBack('active')

            this.slotOwner = me
            return { blocked: false, loaded: false }
        },

        // ■地図の「場所」から始めたゲーム（ゲーム枠）かどうか
        isSlotGame() {
            const place = this.loadPlace()
            return !!(place && place.spotId && place.gameNo)
        },

        // ■「まけました」：AIの勝ちとして、このゲームを終わらせる
        resign() {
            this.showResignConfirm = false
            this.resigned = true
            this.finishGame()
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

        // ■現在のroomCodeのゲームを読み込む。無ければ新規に生成して保存する
        async loadOrInitGame() {
            this.savedPlace = null
            this.slotOwner = null
            this.resigned = false
            this.isAiThinking = false
            this.selectedCard = null
            this.tilePreviewCard = null

            const slot = this.isSlotGame()
            const team = TEAM_NAME_BY_ID[this.humanPlayerId]

            // ■読み込みは、1つずつ順番に待たず、いっぺんに始める。
            //   （順番に待つと、通信が遅いスマホでは、待ち時間がそのまま積み上がって、読み込み中が長くなる）
            const [library, savedLoaded, instances, slotContext] = await Promise.all([
                this.cardLibrary.length
                    ? Promise.resolve(this.cardLibrary)
                    : fetchCardLibrary().catch(e => {
                        console.error('カードライブラリの読み込みに失敗しました', e)
                        return []
                    }),
                this.loadSavedGame(),
                fetchTeamCollectionInstances(team).catch(e => {
                    console.error('チームの所持カードの読み込みに失敗しました', e)
                    return []
                }),
                slot ? this.fetchSlotContext() : Promise.resolve(null)
            ])
            this.cardLibrary = library

            let loaded = savedLoaded

            // ■地図のゲーム枠：ほかの人が遊んでいる・遊び終えた枠には入れない。自分はどこか1つのゲームでしか遊べない
            if (slot) {
                const access = this.checkSlotAccess(loaded, slotContext)
                if (access.blocked) return
                loaded = access.loaded
            }

            if (loaded) {
                // ■保存後にメンバーが新しくカードを集めたり、別のゲームで使ったりしているので、
                // 人間チームの手札はDBの所持カードから作り直す
                this.hands[this.humanPlayerId] = this.shuffleArray(this.handFromInstances(instances))
            } else {
                await this.initializeHands(instances)
                this.generateTiles()
                this.gameState = 'playing'
                this.currentPlayerId = this.players[0].id
                this.skipCount = 0
                this.players.forEach(p => (p.score = 0))
            }

            // ■保存の完了は待たない（画面を先に出す。保存の失敗は saveGame の中で記録する）
            this.saveGame()

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
            } else if (this.gameState === 'playing' && !this.players[nextIndex].isAI) {
                setTimeout(() => sfx.turn(), 250) // 自分の番になった合図
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
                // ■地図の「場所」から始めたゲームは、その場所のすみかを少しだけ反映した盤面にする。
                //   場所・ゲーム番号ごとに盤面は固定（同じ場所の同じゲームは、何度開いても同じ盤面）
                const place = this.loadPlace()
                if (place && place.habitat && place.spotId) {
                    const seed = this.spotSeed(place.spotId, place.gameNo || 1)
                    this.tiles = generateSpotBoard(place.habitat, { rows: this.rows, cols: this.cols, seed })
                        .map(tile => ({ ...tile, type: 'none', selected: false, ownerTeam: null }))
                    return
                }

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
        // ■チームの所持カード（DBの cardInstances）から、人間チームの手札を作る
        handFromInstances(instances) {
            const libraryById = Object.fromEntries(this.cardLibrary.map(card => [card.cardId, card]))
            return instances
                .filter(instance => libraryById[instance.cardId])
                .map(instance => toDominationCard(libraryById[instance.cardId], instance.instanceId))
        },

        async fetchHumanHand() {
            const team = TEAM_NAME_BY_ID[this.humanPlayerId]
            try {
                return this.handFromInstances(await fetchTeamCollectionInstances(team))
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

        // instances を渡すと、通信せずにその所持カードで手札を作る（読み込みを同時に進めるため）
        async initializeHands(instances) {
            const humanHand = this.shuffleArray(instances ? this.handFromInstances(instances) : await this.fetchHumanHand())
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

        // ------------------------
        previewCard(card, playerId) {
            if(this.currentPlayerId !== playerId) return
            if(this.currentPlayer?.isAI) return
            this.isPreviewing = true
            this.modalCard = card
            sfx.select()
        },

        useCard() {
          this.selectedCard = this.modalCard
          this.isPreviewing = false
          this.modalCard = null
          sfx.select()

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

        // ■スキップ：画面の中の確認ダイアログを出す（標準の confirm は、埋め込みのブラウザなどで出ずに止まることがあるため）
        confirmSkip() {
            if (this.currentPlayer?.isAI) return
            this.showSkipConfirm = true
        },

        doSkip() {
            this.showSkipConfirm = false
            if (this.currentPlayer?.isAI) return

            sfx.skip()
            this.lastAiTileId = null
            this.skipCount++
            if (this.skipCount >= this.players.length) {
                this.showToast('全員がスキップしたので、ゲームを終了します。')
                this.finishGame()
                return
            }
            this.goToNextPlayer()
            this.saveGame()
            this.maybeTriggerAI()
        },

        // ■効果音のオン・オフ
        toggleSfx() {
            sfx.setMuted(!this.sfxMuted)
            this.sfxMuted = sfx.isMuted()
            if (!this.sfxMuted) sfx.select()
        },

        // ■AIが最後にカードを置いたタイルを、ピコンピコン点滅させる（自分が動くまで）。画面の外なら、見える場所までスクロールする
        markAiTile(tileId) {
            this.lastAiTileId = tileId
            this.$nextTick(() => {
                const element = document.querySelector(`[data-tile-id="${tileId}"]`)
                const area = this.$refs.mainArea
                if (!element || !area) return
                const tileBox = element.getBoundingClientRect()
                const areaBox = area.getBoundingClientRect()
                if (tileBox.top < areaBox.top || tileBox.bottom > areaBox.bottom) {
                    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
                }
            })
        },

        // ■画面の中のメッセージ（数秒で消える）
        showToast(message) {
            sfx.error()
            this.toastMessage = message
            clearTimeout(this.toastTimer)
            this.toastTimer = setTimeout(() => { this.toastMessage = '' }, 4500)
        },

        finishGame(){
          this.gameState = 'finished'
          this.currentPlayerId = null
          this.isAiThinking = false
          this.lastAiTileId = null
          const result = this.computeResult()
          if (result) setTimeout(() => (result.humanWon ? sfx.win() : sfx.lose()), 300)
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

            const ate = this.handleEating(tile)
            sfx.aiPlace()
            if (ate) setTimeout(() => sfx.eat(), 160)
            this.markAiTile(tile.id)

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

        // スマホは、画面をタップしたあとでないと音が出ないので、最初のタップで音を使える状態にする
        window.addEventListener('pointerdown', () => sfx.unlock(), { once: true })

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
        GameCardFocus
    },
    computed: {
      currentPlayer() {
          return this.players.find(p => p.id === this.currentPlayerId)
      },
      finishedResult() {
          return this.computeResult()
      },

      sortedPlayersByScore() {
          return [...this.players].sort((a, b) => b.score - a.score)
      }
    }

}
</script>

<style scoped>
  /* ■盤面：スマホ（640px未満）では、縦長（15列×30行）に置き直して、マスを大きくする。枠もなくして画面いっぱいにする */
  .board-grid{
      grid-template-columns: repeat(var(--cols), minmax(14px, 1fr));
  }
  .board-tile{
      grid-row: var(--tr);
      grid-column: var(--tc);
  }
  @media (max-width: 639px){
      .board-wrap{
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          border-radius: 0;
          overflow: visible;
      }
      .board-grid{
          grid-template-columns: repeat(var(--rows), minmax(0, 1fr));
          gap: 1px;
      }
      .board-tile{
          grid-row: var(--tc);
          grid-column: var(--tr);
      }
  }

  /* ■画面のつくり：スマホ・タブレットでは、画面全体はスクロールさせない。
     上（見出し）と下（手札・ボタン）は固定で、まん中の盤面の部分だけがスクロールする */
  .app-shell{
      display: flex;
      flex-direction: column;
      min-height: 100vh;
  }
  /* 上の部分：ずっと見えるようにして、下とのさかいめを太い線とかげではっきりさせる */
  .app-header{
      position: sticky;
      top: 0;
      z-index: 30;
      border-bottom: 3px solid #64748b;
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
  }
  .app-body{
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
  }
  @media (max-width: 1023px){
      .app-shell{
          height: 100vh;
          height: 100dvh;
          min-height: 0;
          overflow: hidden;
      }
      .app-main{
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
      }
  }

  /* ■AIが最後に置いたタイル：ピコンピコン点滅（自分が動くまで） */
  .board-tile.ai-last{
      position: relative;
      z-index: 5;
      animation: ai-blink 0.7s ease-in-out infinite;
  }
  @keyframes ai-blink{
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
      50% { transform: scale(1.5); box-shadow: 0 0 0 3px #fff, 0 0 10px 5px rgba(250, 204, 21, 0.95); }
  }

  /* ■ヘッダー右はしの丸いボタン（？・🔍） */
  .header-tool{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: 2px solid #94a3b8;
      border-radius: 50%;
      background: #fff;
      font-size: 16px;
      font-weight: 900;
      line-height: 1;
      color: #475569;
  }
  .header-tool:active{ transform: scale(0.93); }
  .header-tool-on{
      border-color: #0ea5e9;
      background: #e0f2fe;
      color: #0369a1;
  }

  /* ■操作の結果を知らせる、画面の中のメッセージ（標準のダイアログは、埋め込みのブラウザなどで出ないことがあるため） */
  .game-toast{
      position: fixed;
      left: 50%;
      bottom: 150px;
      z-index: 80;
      width: 90%;
      max-width: 360px;
      transform: translateX(-50%);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.95);
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
      text-align: center;
      color: #fef9c3;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  /* ■下の手札・ボタン（スマホ・タブレット）。盤面の明るい色のマスとはっきり分けるため、濃い色にして、
     上に今の手番のチームの色の線をひく。さらに、「手札」と「ボタン」は、色もわくも別のエリアにする */
  .game-dock{
      flex: none;
      background: #0b1220;
      border-top: 4px solid var(--turn-color, #64748b);
      border-radius: 14px 14px 0 0;
      box-shadow: 0 -10px 24px rgba(15, 23, 42, 0.35);
      padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 8px;
  }
  /* 広い画面（1024px以上）では、右のサイドバーに手札とボタンがあるので、下のバーは出さない */
  @media (min-width: 1024px){
      .game-dock{ display: none; }
  }
  .dock-panel{
      border-radius: 12px;
      padding: 6px 8px;
  }
  /* 手札エリア：うすい紺色の、枠つきの面。タイトルつき */
  .dock-hand-panel{
      background: #1e293b;
      border: 1px solid #475569;
  }
  .dock-panel-title{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #cbd5e1;
  }
  .dock-note{
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-align: right;
  }
  .dock-note-ok{
      color: #6ee7b7;
  }
  /* ボタンエリア：もっと濃い面。手札とは色もわくもちがう */
  .dock-actions-panel{
      background: #020617;
      border: 1px solid #1e293b;
      padding: 6px;
  }
  /* 手札：2行。はみ出す分は横にスクロール */
  .dock-hand{
      display: grid;
      grid-template-rows: repeat(2, auto);
      grid-auto-flow: column;
      grid-auto-columns: max-content;
      gap: 6px 5px;
      overflow-x: auto;
      padding-bottom: 2px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
  }
  .dock-hand::-webkit-scrollbar{ display: none; }
  .dock-chip{
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      border-radius: 999px;
      padding: 3px 9px 3px 4px;
      font-size: 12px;
      font-weight: 600;
  }
  .dock-lv{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.75);
      font-size: 10px;
      font-weight: 800;
      color: #fff;
  }
  .dock-chip small{
      font-size: 10px;
      color: #64748b;
  }
  .dock-empty{
      font-size: 12px;
      color: #94a3b8;
  }
  /* ボタン：高さを使わないよう、1段（アイコンと文字を横に並べる） */
  .dock-actions{
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 6px;
  }
  .dock-button{
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      border: 1px solid #334155;
      border-radius: 10px;
      background: #1e293b;
      padding: 8px 4px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      color: #e2e8f0;
      white-space: nowrap;
  }
  .dock-button:active:not(:disabled){ transform: scale(0.96); }
  .dock-button:disabled{ opacity: 0.35; }
  .dock-button-danger{ background: #7f1d1d; border-color: #b91c1c; color: #fecaca; }
  .dock-button-back{ background: #14532d; border-color: #15803d; color: #bbf7d0; }

  /* ■はてな・虫眼鏡の丸いボタン */
  .round-button{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 2px solid #94a3b8;
      border-radius: 50%;
      background: #fff;
      font-size: 14px;
      font-weight: 900;
      line-height: 1;
      color: #475569;
  }
  .round-button-on{
      border-color: #0ea5e9;
      background: #e0f2fe;
      color: #0369a1;
  }

</style>
