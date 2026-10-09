<template>
    <template v-if="dominationMode == 'standard'">
        <div class="domination-app app-shell bg-slate-100" :class="{ spectating: spectator }">

            <!-- ■観戦モード：見るだけ。自分が観戦中だと、はっきり分かるように、ずっと出しておく -->
            <div v-if="spectator" class="spectator-banner">
                <span class="spectator-badge">👀 観戦モード</span>
                <span class="spectator-text">{{ resultView ? 'けっか くらべの ゲームを 見ているよ（見るだけ。さわれないよ）' : ownerLabel + 'の ゲームを 見ているよ（見るだけ。さわれないよ）' }}</span>
                <button class="spectator-back" @click="backFromGame()">もどる</button>
            </div>

            <!-- Header: title + scoreboard -->
            <header class="app-header bg-white">
                <div class="max-w-[1500px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        <h1 class="text-base sm:text-lg font-bold leading-tight text-slate-700">陣取り<br>ゲーム</h1>

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
                    v-if="isAiThinking && !aiOnlyMode"
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
                            :class="{ 'scale-[1.05] ring-2 ring-offset-1 z-10': tile.selected, 'ai-last': aiMoveTileIds.has(tile.id), 'ai-eaten': aiEatenIds.has(tile.id), 'tile-lord': isLord(tile), 'fixed-tile-pulse': tile.id === fixedTileId }"
                            @click="onTileClick(tile)"
                            :style="[tileStyle(tile), { '--tr': tile.row + 1, '--tc': tile.col + 1, '--ring': moveRing(tile) }]"
                        >
                            <div
                                v-if="tile.validForSelection"
                                class="animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] rounded-full aspect-square bg-yellow-200"
                            ></div>

                            <!-- ■レベル4（★）の「支配エリア」：まわり8マスを、そのチームの色で、ゆっくり光らせる -->
                            <span v-if="domainColor(tile)" class="tile-domain" :style="{ '--c': domainColor(tile) }"></span>

                            <!-- ■置いたあとも、その下が何の地形だったか分かるように、すみに小さな絵文字を出す -->
                            <span v-if="tile.ownerTeam && tile.area && !tile.eatenByTileId && !(gameState === 'finished' && showTerritory)" class="tile-terrain" aria-hidden="true">{{ areaIcon(tile.area) }}</span>

                            <!-- ■食べられたマスには、赤い「とまれ」（赤い丸＋斜線）を出す（もう使えない、が一目で分かる。小さい虫眼鏡の表示でも分かる） -->
                            <svg v-if="tile.eatenByTileId && !(gameState === 'finished' && showTerritory)" class="tile-eaten" viewBox="0 0 24 24" aria-hidden="true">
                                <circle class="tile-stop-under" cx="12" cy="12" r="10" />
                                <path class="tile-stop-under" d="M5 19L19 5" />
                                <circle class="tile-stop" cx="12" cy="12" r="10" />
                                <path class="tile-stop" d="M5 19L19 5" />
                            </svg>

                            <!-- ■置いたカードの形（Lv1=三角／Lv2=四角／Lv3=丸／Lv4=★）。
                                 SVGで作って、マスの大きさ（虫眼鏡・スマホ・PC）に合わせて拡大・縮小し、黒縁はどの大きさでも同じ太さで付ける -->
                            <div v-if="tile.ownerTeam && !(gameState === 'finished' && showTerritory)" class="flex justify-center items-center w-full h-full">
                                <svg
                                    class="tile-shape"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    :style="{ fill: shapeFill(tile), fillOpacity: tile.eatenByTileId ? 0.55 : 1 }"
                                >
                                    <polygon v-if="tile.placedCard?.tier === 1" points="12,3 22.5,21 1.5,21" />
                                    <rect v-else-if="tile.placedCard?.tier === 2" x="3" y="3" width="18" height="18" rx="1.5" />
                                    <circle v-else-if="tile.placedCard?.tier === 3" cx="12" cy="12" r="9" />
                                    <polygon v-else points="12,1.5 14.9,8.4 22.4,9 16.7,13.9 18.5,21.3 12,17.4 5.5,21.3 7.3,13.9 1.6,9 9.1,8.4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="w-full lg:w-[340px] flex-none flex flex-col gap-3">

                    <!-- current player hand -->
                    <div v-if="gameState === 'playing' && currentPlayer && !spectator" class="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <template v-if="currentPlayer.isAI">
                            <div class="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
                                <span class="text-2xl">🤖</span>
                                <span v-if="aiOnlyMode">AIが あそんでいます（見るだけ）</span>
                                <span v-else>{{ currentPlayer?.name }}が手を考えています…</span>
                            </div>
                        </template>
                        <template v-else>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-5 h-5 rounded-md flex-none" :style="{ background: currentPlayer?.color }"></div>
                                <span class="font-bold text-sm">{{ currentPlayer?.name }}</span>
                                <button v-if="testMode" class="test-card-button" @click="showTestCards = true">🧪 カードを えらぶ</button>
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
                                            :class="[areaBadgeClass(card, currentPlayerId), { 'chip-dim': !isPlaceable(card) }]"
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
                                    カードがありません
                                </p>
                            </div>
                        </template>
                    </div>

                    <!-- actions -->
                    <div class="hidden lg:grid bg-white rounded-xl shadow-sm border border-slate-200 p-3 grid-cols-2 gap-2">
                        <button
                            v-if="!spectator"
                            @click="selectedCard = null"
                            :disabled="!selectedCard"
                            class="px-2 py-2.5 rounded-lg border text-sm font-medium transition"
                            :class="selectedCard ? 'bg-slate-100 hover:bg-slate-200 border-slate-300' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'"
                        >
                            キャンセル
                        </button>
                        <button
                            v-if="!spectator"
                            class="px-2 py-2.5 rounded-lg border text-sm font-medium transition"
                            :class="[currentPlayer?.isAI ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-sky-100 hover:bg-sky-200 border-sky-300', { 'skip-glow': mustSkip }]"
                            :disabled="currentPlayer?.isAI"
                            @click="confirmSkip()"
                        >
                            スキップ
                        </button>
                        <button
                            v-if="gameState === 'playing' && !spectator"
                            class="px-2 py-2.5 rounded-lg border border-red-400 bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition"
                            @click="showResignConfirm = true"
                        >
                            🏳 まけました
                        </button>
                        <button
                            class="px-2 py-2.5 rounded-lg border border-rose-300 bg-rose-100 hover:bg-rose-200 text-sm font-medium transition"
                            :class="{ 'back-glow': mustSkip }"
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
                <div v-if="!spectator" class="dock-panel dock-hand-panel">
                    <div class="dock-panel-title">
                        <span>🃏 あなたのカード</span>
                        <button v-if="testMode && !spectator" class="test-card-button" @click="showTestCards = true">🧪 カードを えらぶ</button>
                        <span v-if="gameState === 'playing' && currentPlayer && currentPlayer.isAI && !aiOnlyMode" class="dock-note">🤖 {{ currentPlayer.name }}が 考えているよ…</span>
                        <span v-else-if="selectedCard" class="dock-note dock-note-ok">「{{ selectedCard.label }}」→ きいろい マスに おけるよ</span>
                    </div>
                    <div v-if="gameState === 'playing' && currentPlayer && !currentPlayer.isAI" class="dock-hand">
                        <template v-for="group in groupHandByTier(hands[currentPlayerId])" :key="group.tier">
                            <button
                                v-for="card in group.cards"
                                :key="card.id"
                                class="dock-chip border"
                                :class="[areaBadgeClass(card, currentPlayerId), { 'chip-dim': !isPlaceable(card) }]"
                                @click="previewCard(card, currentPlayerId)"
                            >
                                <span class="dock-lv">{{ group.tier }}</span>{{ card.label }}<small>×{{ card.holdingCount }}</small>
                            </button>
                        </template>
                        <span v-if="!hands[currentPlayerId] || hands[currentPlayerId].length === 0" class="dock-empty">カードがありません</span>
                    </div>
                </div>

                <!-- ■そうさボタン（手札とは別の、色のちがうエリア） -->
                <div class="dock-panel dock-actions-panel">
                    <div class="dock-actions">
                        <button
                            v-if="gameState === 'playing' && !spectator"
                            class="dock-button"
                            :class="{ 'skip-glow': mustSkip }"
                            :disabled="currentPlayer?.isAI"
                            @click="confirmSkip()"
                        >
                            ⏭ スキップ
                        </button>
                        <button
                            v-if="gameState === 'playing' && !spectator"
                            class="dock-button dock-button-danger"
                            @click="showResignConfirm = true"
                        >
                            🏳 まけました
                        </button>
                        <button class="dock-button dock-button-back" :class="{ 'back-glow': mustSkip }" @click="backFromGame()">
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

            <!-- ■ゲーム終了：結果（順位・1位のごほうび・じんち） -->
            <div v-if="gameState === 'finished' && !showTerritory && !replay" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                <div class="bg-white p-5 rounded-2xl shadow-xl text-center max-w-sm w-full max-h-[92vh] overflow-y-auto">
                    <h2 class="text-2xl font-bold mb-1">ゲーム終了！</h2>
                    <p v-if="spectator" class="mb-1 inline-block rounded-full bg-violet-100 px-4 py-1 text-sm font-black text-violet-700">👀 {{ resultView ? 'けっかの ゲーム' : '観戦：' + ownerLabel + 'の ゲーム' }}</p>
                    <p v-if="spectator && winnerPlayer" class="mb-2 text-lg font-black" :style="{ color: winnerPlayer.color }">🏆 {{ winnerPlayer.name }}の かち！</p>
                    <template v-if="!spectator">
                    <p v-if="finishedResult" class="mb-1 text-lg font-black" :style="{ color: finishedResult.humanWon ? '#059669' : '#dc2626' }">
                        {{ finishedResult.humanWon ? '1位！ かったよ！' : (finishedResult.resigned ? 'まけました…' : `${finishedResult.humanRank}位 だったよ`) }}
                    </p>

                    <!-- ■ゲームの得点と、順位のテラ（おわったときに、ぜんぶ見えるように） -->
                    <div v-if="finishedResult" class="mb-3 grid grid-cols-2 gap-2 text-sm font-bold">
                        <div class="rounded-xl bg-slate-100 px-3 py-2">
                            <div class="text-xs text-slate-500">じぶんの てんすう</div>
                            <div class="text-xl">{{ players.find(p => p.id === humanPlayerId)?.score ?? 0 }}点</div>
                        </div>
                        <div class="rounded-xl bg-amber-50 px-3 py-2">
                            <div class="text-xs text-slate-500">順位の テラ</div>
                            <div class="text-xl text-amber-700">+{{ rankBonusFor(finishedResult.humanRank) }}テラ</div>
                        </div>
                    </div>

                    <!-- ■1位のごほうび（テラ） -->
                    <p v-if="rewardTera" class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1 text-base font-black text-amber-700">
                        🎉 +{{ rewardTera }}テラ
                        <img src="/images/coin.png" alt="テラ" class="h-5 w-5 object-contain">
                    </p>
                    <p v-if="rewardTera && rewardParts" class="mb-2 text-xs font-bold text-amber-700">
                        てんすう {{ rewardParts.score }}点 ＋ {{ finishedResult ? finishedResult.humanRank : '' }}位ボーナス {{ rewardParts.bonus }}
                    </p>
                    <p v-else-if="rewardState === 'pending'" class="mb-2 text-sm font-bold text-amber-600">テラを もらっているよ…</p>
                    <p v-else-if="rewardState === 'error'" class="mb-2 text-sm font-bold text-red-500">テラを もらえなかったよ（ネットを たしかめて、あとで もういちど）</p>
                    <p v-else-if="isSlotGame() && !isTestPlace() && finishedResult && finishedResult.resigned" class="mb-2 text-xs font-bold text-slate-500">まけましたの ときは、テラは もらえないよ</p>
                    <p v-else-if="isTestPlace()" class="mb-2 text-xs font-bold text-violet-600">🧪 AIテスト：テラは もらえないよ。けっかは 地図の 色（勝率）に のこるよ</p>
                    <p v-else-if="isSlotGame() && finishedResult" class="mb-2 text-xs font-bold text-slate-500">てんすうぶんの テラ ＋ {{ rankRewardText }} もらえるよ</p>
                    <p v-if="isSlotGame() && !isTestPlace() && finishedResult && !finishedResult.humanWon" class="mb-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                        AIが かったので、この ばしょは 色が つかないよ。ほかの人も、もういちど ちょうせん できるよ
                    </p>

                    </template>

                    <p class="text-sm text-slate-500 mb-2">さいごの てんすう</p>
                    <ul class="text-left mb-4 space-y-2">
                        <li
                            v-for="player in sortedPlayersByScore"
                            :key="player.id"
                            class="flex items-center justify-between px-3 py-2 rounded-lg"
                            :style="{ background: player.color + '15' }"
                        >
                            <span class="font-semibold flex items-center gap-2">
                                <span class="rank-badge">{{ rankOf(player) }}位</span>
                                <span class="w-3 h-3 rounded-full" :style="{ background: player.color }"></span>
                                {{ player.name }}
                                <span v-if="player.isAI" class="text-xs">🤖</span>
                                <span v-else-if="!resultView" class="text-xs text-slate-500">（{{ spectator ? ownerLabel : 'あなた' }}）</span>
                            </span>
                            <span class="font-bold">{{ player.score }}点</span>
                        </li>
                    </ul>

                    <!-- ■じんち（おさえた マスの かず）と、生態系ピラミッド -->
                    <GameResultSummary :players="players" :tier-team="tierTeam" :self-id="spectator ? null : humanPlayerId">
                        <template #territory-extra>
                            <button class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" @click="showTerritory = true">
                                🗺 じんちを ばんめんで みる
                            </button>
                        </template>
                    </GameResultSummary>

                    <!-- ■ふりかえり：おわったゲームを、1手ずつ、はじめから見なおす -->
                    <button
                        v-if="moveLog.length"
                        class="mb-3 w-full rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 hover:bg-violet-100"
                        @click="startReplay()"
                    >
                        ▶ ふりかえる（{{ moveLog.length }}手を 1手ずつ 見る）
                    </button>

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

            <!-- ■じんちを盤面で見ているときの、チームごとのマスの数と、もどるボタン -->
            <div v-if="gameState === 'finished' && showTerritory" class="territory-panel">
                <span v-for="team in territory" :key="team.id" class="territory-chip" :style="{ background: team.color }">
                    {{ team.name.replace('チーム', '') }}{{ team.isAI ? '' : '（あなた）' }} {{ team.count }}マス
                </span>
                <button class="territory-back" @click="showTerritory = false">けっかを みる</button>
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

        <!-- ■テストモード：入ったら、じぶんであそぶか、AIにぜんぶまかせるかを選ぶ -->
        <div
            v-if="showModeChoice"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        >
            <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                <p class="mb-1 text-xl font-black">どっちで あそぶ？</p>
                <p class="mb-5 text-sm text-slate-600">AIに まかせると、どんどん すすむよ（ぜんぶ見るだけ）</p>
                <div class="flex flex-col gap-2">
                    <button class="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white hover:bg-emerald-600" @click="chooseMode(false)">🧑 じぶんで あそぶ</button>
                    <button class="rounded-xl bg-violet-500 px-4 py-3 font-bold text-white hover:bg-violet-600" @click="chooseMode(true)">🤖 AIに ぜんぶまかせる</button>
                </div>
            </div>
        </div>

        <!-- ■地形・レベルの説明（はてなボタンから開くモーダル） -->
        <div
            v-if="isShowingTuorial"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            @click.self="isShowingTuorial = false"
        >
            <div class="relative w-full max-w-sm">
                <button class="absolute -top-3 -right-3 z-10 rounded-full bg-white px-2 py-1 text-sm shadow" @click="isShowingTuorial = false">✕</button>
                <div class="max-h-[85vh] space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
                <p class="text-center text-lg font-black text-slate-700">あそびかた</p>

                <!-- ■ゲームの仕組み（やさしい言葉で） -->
                <ol class="space-y-2.5 text-left text-[13px] leading-relaxed text-slate-700">
                    <li class="flex gap-2">
                        <span class="rule-no">1</span>
                        <span><b>めざせ ナンバー1！</b> 3チームで、カードを ばんめんに おいて ポイントを あつめるよ。いちばん ポイントが たかい チームが かち。</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">2</span>
                        <span><b>じゅんばんに 1まい ずつ。</b> じぶんの ばんに、カードを えらんで、<b>きいろく ひかる マス</b>を タップ。おけない ときは「スキップ」。</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">3</span>
                        <span><b>おける ばしょ。</b> りくの いきものは <b>町・森・土</b>、みずの いきものは <b>川・海</b>。<b>くろい マス</b>（未開発地）には、そのままでは おけないよ。</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">4</span>
                        <span><b>かんきょうチャレンジ！</b> <b>くろい マス</b>を タップすると、かんきょうクイズ（<b>2もん</b>）が できるよ。<b>ぜんぶ 1かいで</b> あてたら せいこう！ マスが <b>となりの マスと おなじ ちけい</b>に なおって <b>+3てん</b>。（その ばんは、なおした マスには おけないよ。つぎの ばんから おけるよ）しっぱいすると ばんが つぎの チームに うつるよ。カードが なくても ちょうせん できるよ。</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">5</span>
                        <span><b>レベルの ルール。</b> <b>Lv1（▲）</b>は どこにでも おける。<b>Lv2（■）</b>は、まわりに <b>Lv1が 2こ いじょう</b> ある マスだけ。Lv3は Lv2が 2こ、Lv4は Lv3が 2こ いるところに おけるよ。（まわり ＝ たて・よこ・ななめの 8マス）</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">6</span>
                        <span><b>たべる！</b> レベルの たかい カードを おくと、まわりの <b>ひくい レベルの カード</b>を たべるよ。たべられた カードは はいいろに なって、おくための かずにも ならなくなる。</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">7</span>
                        <span><b>ポイント。</b> おいた カードの レベルで きまるよ（下の ひょう）。</span>
                    </li>
                    <li class="flex gap-2">
                        <span class="rule-no">8</span>
                        <span><b>おわり。</b> カードが なくなる、ぜんいんが スキップする、または「まけました」を おすと おわり。<b>1位・2位・3位</b>に なると、テラが もらえるよ（1位 +10、2位 +5、3位 +2）。</span>
                    </li>
                </ol>

                <!-- ■ちけい（すむ ばしょ）：盤面と同じ色・もようの見本つき -->
                <div class="border-t border-slate-200 pt-3">
                    <p class="legend-title">🗺 ちけい（いきものの すむ ばしょ）</p>
                    <div class="grid grid-cols-2 gap-2">
                        <div v-for="item in terrainList" :key="item.key" class="legend-terrain">
                            <span class="legend-swatch" :style="terrainSwatchStyle(item.key)"></span>
                            <span class="text-left leading-tight">
                                <b class="block text-[13px] text-slate-700">{{ item.label }}</b>
                                <small class="block text-[10px] font-bold text-slate-500">{{ item.hint }}</small>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- ■レベルと ポイント：盤面と同じ形。おける ばしょの ルールつき -->
                <div class="border-t border-slate-200 pt-3">
                    <p class="legend-title">⭐ レベルと ポイント</p>
                    <div class="grid grid-cols-4 gap-1.5">
                        <div v-for="tier in [1, 2, 3, 4]" :key="tier" class="legend-level">
                            <svg class="legend-shape" viewBox="0 0 24 24" aria-hidden="true" :style="{ fill: teamColor(humanPlayerId) }">
                                <polygon v-if="tier === 1" points="12,3 22.5,21 1.5,21" />
                                <rect v-else-if="tier === 2" x="3" y="3" width="18" height="18" rx="1.5" />
                                <circle v-else-if="tier === 3" cx="12" cy="12" r="9" />
                                <polygon v-else points="12,1.5 14.9,8.4 22.4,9 16.7,13.9 18.5,21.3 12,17.4 5.5,21.3 7.3,13.9 1.6,9 9.1,8.4" />
                            </svg>
                            <b class="text-[13px] text-slate-700">Lv{{ tier }}</b>
                            <span class="legend-points">{{ getScoreForTile(tier) }}点</span>
                            <small class="text-[9px] font-bold leading-tight text-slate-500">{{ tier === 1 ? 'どこでも' : `まわりに Lv${tier - 1}が 2こ` }}</small>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>

        <!-- ■ふりかえりのバー：1手ずつ進める・戻す・自動で再生 -->
        <div v-if="replay" class="replay-bar">
            <p class="replay-label">🎞 ふりかえり {{ replayLabel }}</p>
            <input
                class="replay-slider"
                type="range"
                min="0"
                :max="moveLog.length"
                :value="replay.index"
                @input="stepReplay(Number($event.target.value) - replay.index)"
            >
            <div class="replay-buttons">
                <button aria-label="はじめへ" @click="stepReplay(-moveLog.length)">⏮</button>
                <button aria-label="ひとつ もどる" @click="stepReplay(-1)">◀</button>
                <button class="replay-play" @click="toggleReplayPlay()">{{ replay.playing ? '⏸' : '▶' }}</button>
                <button aria-label="ひとつ すすむ" @click="stepReplay(1)">▶</button>
                <button aria-label="さいごへ" @click="stepReplay(moveLog.length)">⏭</button>
                <select class="replay-speed" aria-label="1手ごとの はやさ" :value="replay.interval" @change="setReplayInterval(Number($event.target.value))">
                    <option v-for="seconds in replayIntervals" :key="seconds" :value="seconds">{{ seconds }}秒 / 手{{ seconds <= 0.02 ? "（さいそく）" : "" }}</option>
                </select>
                <button class="replay-close" @click="closeReplay()">✕ とじる</button>
            </div>
        </div>

        <!-- ■テストモード（手元の開発環境、または ?test=1）：カードを自由に手札へ足す。テラは もらえなくなる -->
        <div v-if="testMode && showTestCards" class="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 sm:items-center" @click.self="showTestCards = false">
            <div class="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-4 shadow-xl">
                <div class="mb-2 flex items-center justify-between">
                    <p class="text-base font-black text-slate-700">🧪 テスト：カードを えらぶ</p>
                    <button class="header-tool" aria-label="とじる" @click="showTestCards = false">✕</button>
                </div>
                <p class="mb-2 text-xs font-bold text-slate-500">タップすると、じぶんの カードに ふえるよ（テスト用。DBには入らない・つかうと このゲームの テラは もらえない）</p>
                <div class="overflow-y-auto">
                    <div v-for="group in testCardGroups" :key="group.level" class="mb-3">
                        <p class="mb-1 text-xs font-black text-slate-600">Lv{{ group.level }}</p>
                        <div class="flex flex-wrap gap-1.5">
                            <button
                                v-for="card in group.cards"
                                :key="card.cardId"
                                class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-100"
                                @click="addTestCard(card)"
                            >
                                {{ card.name }}
                            </button>
                        </div>
                    </div>
                    <p v-if="!testCardGroups.length" class="py-6 text-center text-sm text-slate-400">カードを よみこみ中…</p>
                </div>
                <p v-if="testMessage" class="mt-2 text-center text-xs font-bold text-emerald-600">{{ testMessage }}</p>
            </div>
        </div>

        <!-- ■黒いマスの「かんきょうチャレンジ」（ABゲーム2問。ぜんぶ1回で正解なら成功） -->
        <div v-if="showChallenge" class="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-3">
            <div class="relative w-full max-w-lg">
                <button class="absolute -top-3 -right-3 z-10 rounded-full bg-white px-2 py-1 text-sm shadow" aria-label="やめる" @click="cancelChallenge">✕</button>
                <div class="max-h-[90vh] overflow-y-auto rounded-2xl bg-[#f4f1e8] shadow-xl">
                    <ABGameProposalB embedded challenge :question-count="2" @start="challengeStarted = true" @finish="onChallengeFinish" />
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

        <!-- ■レベル4（★）が おかれたとき：生態系の「頭の生きもの」が あらわれた、のおしらせ -->
        <transition name="lord-fade">
            <div v-if="lordBanner" class="lord-banner" :style="{ '--c': lordBanner.color }">
                <span class="lord-crown">👑</span>
                <span class="lord-text">
                    <b>{{ lordBanner.team }}チームの「{{ lordBanner.name }}」</b> が あらわれた！
                    <small>生態系の いちばん うえの いきもの。まわりを したがえているよ</small>
                </span>
            </div>
        </transition>

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
import GameResultSummary from './GameResultSummary.vue';
import ABGameProposalB from '@/views/ABGame/ABGameProposalB.vue';
import { getSession } from '@/utils/session.js';
import { generateSpotBoard } from './habitatBoard.js';
import { isFresh } from '@/utils/dominationSlots.js';
import { sfx } from '@/utils/sfx.js';
import { addPoints } from '@/utils/points.js';
import { isTestMode } from '@/utils/env.js';
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
// ■順位ごとにもらえるテラ（仮の数。ここを変えれば、もらえる数が変わる。3位は少なめ）。
//   ce-n.org の updatePoints で加算する（ハブサイトの「合計得点」にも反映される）。地図のゲーム（ゲーム枠）だけが対象。「まけました」は対象外
const RANK_REWARD_TERA = { 1: 10, 2: 5, 3: 2 }

// ■AIが「かしこく」打つ割合（0〜1）。かしこい手＝点の高いカードを、相手のカードを食べられる場所に置く。さらに、上のレベルのカードを置ける場所（まわりに同じレベルが2こ）を、じぶんで作っていく（レベル4をめざす）。
//   それ以外のときは、ランダム。大きくするほどAIが強くなる（シミュレーションでは、いつも賢いとあなたの勝率が下がる）
const AI_SMART_RATE = 0.75

// ■黒いマス（未開発地）の「かんきょうチャレンジ」（ABゲーム2問）に成功したときの、ゲーム内の点数（仮の数）
const AB_CHALLENGE_POINTS = 2

// ■地形の名前（チャレンジ成功でなおる地形の案内に使う）
const AREA_NAMES = { town: '町', forest: '森', dirt: '土', river: '川', sea: '海' }

// ■地形のうっすらした模様（草・水など）。ゲームの見やすさをじゃましない、うすい線だけ。
//   SVGを、そのままマスの背景にする（マスの大きさに合わせて拡大・縮小される）
const svgPattern = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>${body}</svg>`)}")`
// ■地形のすみの絵文字（置いたマスに出す）
const AREA_ICONS = { forest: '🌲', town: '🏠', dirt: '🟫', river: '💧', sea: '🌊' }
const AREA_PATTERNS = {
    // 森：草の葉
    forest: svgPattern("<g stroke='#e8f5d8' stroke-width='1.2' stroke-linecap='round' fill='none' opacity='.4'><path d='M4 16V11M6.5 16V9.5M9 16V11.5'/><path d='M13 12V8M15.5 12V6.5M18 12V8.5'/></g>"),
    // 町：小さな家
    town: svgPattern("<g stroke='#fff3e0' stroke-width='1.1' fill='none' opacity='.4' stroke-linejoin='round'><path d='M3 17V11H9V17Z M2.5 11L6 7.5L9.5 11'/><path d='M12 15V11.5H17V15Z M11.5 11.5L14.5 9L17.5 11.5'/></g>"),
    // 土：つぶつぶ
    dirt: svgPattern("<g fill='#5b4636' opacity='.28'><circle cx='4' cy='5' r='1'/><circle cx='11' cy='3.5' r='.8'/><circle cx='16' cy='9' r='1'/><circle cx='7' cy='12' r='.9'/><circle cx='13' cy='16' r='1'/><circle cx='3' cy='17' r='.7'/></g>"),
    // 川：ゆるい波
    river: svgPattern("<g stroke='#ffffff' stroke-width='1.2' fill='none' opacity='.55' stroke-linecap='round'><path d='M1 7Q5 4 10 7T19 7'/><path d='M1 14Q5 11 10 14T19 14'/></g>"),
    // 海：大きめの波
    sea: svgPattern("<g stroke='#ffffff' stroke-width='1.2' fill='none' opacity='.4' stroke-linecap='round'><path d='M1 6Q5 3 10 6T19 6'/><path d='M1 12Q5 9 10 12T19 12'/><path d='M1 18Q5 15 10 18T19 18'/></g>"),
    // 未開発地：ななめの線（まだ なおせていない）
    undeveloped: svgPattern("<g stroke='#ffffff' stroke-width='1' opacity='.22'><path d='M-2 22L22 -2M-2 14L14 -2M6 22L22 6M-2 6L6 -2M14 22L22 14'/></g>")
}

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
// テストモードで「AIにぜんぶまかせる」ときの、1手あたりの待ち時間（ミリ秒）
const AI_ONLY_TURN_MS = 400;
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
        moveLog: [], // 置いた手の記録（ふりかえり用）：{ t:マスID, p:チームID, tier, l:カード名, e:食べたマスID[] }
        resultView: false, // 「けっか くらべ」から開いた、結果のゲームそのもの（見るだけ）
        replay: null, // ふりかえり中の状態
        replayIntervals: [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5], // 1手ごとの間（秒）の えらびかた
        spectator: false, // 観戦モード（ほかの人の・おわったゲームを、見るだけ）
        spectateUnsub: null,
        savedAiWon: false, // 読み込んだ保存が、AIが勝って終わったものか（昔のデータ）
        slotReleased: false, // AIが勝ったので、ゲーム枠をあけた（もう保存しない）
        showResignConfirm: false,
        showSkipConfirm: false,
        showChallenge: false, // 黒いマスの「かんきょうチャレンジ」（ABゲーム）を開いている
        challengeTile: null,
        challengeStarted: false,
        rewardTera: 0, // 1位でもらったテラ（もらえたときだけ）
        rewardState: '', // '' | 'pending' | 'error'
        showTerritory: false, // ゲームのおわりに、じんち（チームごとのマス）を盤面で見る
        testMode: isTestMode(), // テストモード（カードを自由にえらべる）
        showTestCards: false,
        usedTestCards: false, // テストのカードをつかったゲームは、テラをもらえない
        testMessage: '',
        sfxMuted: sfx.isMuted(), // 効果音のミュート
        recentMoves: [], // 自分の番が終わってから、AIが置いた手（{ tileId, teamId, label, eatenIds }）。自分が動くまで、地図でわかるようにする
        toastMessage: '',
        lordBanner: null, // レベル4（★）が おかれたときの おしらせ
        lordTimer: null,
        savedPlace: null, // ルームに保存されていた場所（地図から入り直さなかったときに引き継ぐ）

        players: [
            { id: 1, name: '水チーム', color: '#00BFA6', score: 0, isAI: humanPlayerId !== 1 }, // teal (water but not blue)
            { id: 2, name: '風チーム', color: '#22C55E', score: 0, isAI: humanPlayerId !== 2 }, // green (air)
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
            { key: 'town', label: '町', hint: 'りくの いきもの' },
            { key: 'forest', label: '森', hint: 'りくの いきもの' },
            { key: 'dirt', label: '土', hint: 'りくの いきもの' },
            { key: 'river', label: '川', hint: 'みずの いきもの' },
            { key: 'sea', label: '海', hint: 'みずの いきもの' },
            { key: 'undeveloped', label: '未開発地（くろい）', hint: 'タップで クイズ→なおす' },
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

        isAiThinking: false,
        // テストモード：入ったときの「じぶんで あそぶ／AIに まかせる」の選択
        showModeChoice: false,
        aiOnlyMode: false,
        fixedTileId: null, // 黒いマスをなおしたばかりのマス（ピコンと光らせる。番がうつったら消す）
      }
    },
    methods: {
        // ■地図の場所から始めたゲームは、「ホーム」ではなく、その街（平塚市など）の六角形の画面にもどる
        backFromGame() {
            if (this.resultView) {
                this.$router.push({ name: 'ResultCompare' })
                return
            }
            const place = this.loadPlace()
            if (place && place.city) {
                this.$router.push({ name: 'DominationMap', query: { city: place.city } })
                return
            }
            this.backToMonitorRoom()
        },

        backLabelText() {
            if (this.resultView) return '📊 けっか くらべに もどる'
            const place = this.loadPlace()
            return place && place.cityName ? `📍 ${place.cityName}にもどる` : '🏠 ホームにもどる'
        },

        backToMonitorRoom() {
            this.$router.push({ name: 'Home' });
        },
        async onTileClick(tile) {
          if (this.replay) return // ふりかえり中は、さわれない
          // ■観戦モード：置かれたカードを見ることだけできる
          if (this.spectator) {
            if (tile.placedCard) {
              this.tilePreviewTeam = tile.ownerTeam
              this.tilePreviewCard = tile.placedCard
            }
            return
          }
          if (this.gameState !== 'playing') return // ゲームが終わったあとは、タイルを押しても何も起きない
          if (this.currentPlayer?.isAI) return // AIの手番中は操作不可
          if (this.isPlacingCard) return // カードの保存中は操作不可

          if(tile.placedCard) {
            this.tilePreviewTeam = tile.ownerTeam
            this.tilePreviewCard = tile.placedCard
            return
          }
          // ■黒いマス（未開発地）：「かんきょうチャレンジ」（ABゲーム2問）に挑戦できる
          if(tile.area === 'undeveloped') {
              this.startChallenge(tile)
              return
          }
          if(!this.selectedCard) {
              this.showToast("カードを選択してからタイルを選んでね")
              return
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
          sfx.place(tile.area)
          if (ate.length) setTimeout(() => sfx.eat(), 160)
          this.recentMoves = [] // 自分が置いたら、AIの動きの表示は消す

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
            const eatenIds = []

            neighbors.forEach(n => {
                // if the neibghot is lower than the placed tile, then it gets eaten
                if(!n.placedCard || !placedTile.placedCard) return
                if(n.placedCard.tier >= placedTile.placedCard.tier) return
                // mark as eaten
                n.eatenByTileId = placedTile.id
                n.eatenByPlayerId = this.currentPlayerId
                eatenIds.push(n.id)

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

            // ■レベル4（★）が おかれたら、「頭の生きもの」のおしらせ
            if (placedTile.placedCard && placedTile.placedCard.tier === 4) this.announceLord(placedTile)

            // ■ふりかえり用に、置いた手を記録する（置いた人・レベル・食べたマス）
            if (placedTile.placedCard) {
                this.moveLog.push({
                    t: placedTile.id,
                    p: this.currentPlayerId,
                    tier: placedTile.placedCard.tier,
                    l: placedTile.placedCard.label || '',
                    e: eatenIds
                })
            }

            return eatenIds
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
            if (tier === 4) return 10

            return tier * 2
        },
        async resetTiles() {

            this.moveLog = []
            this.resigned = false
            this.rewardTera = 0
            this.rewardState = ''
            this.showTerritory = false
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
                this.savedAiWon = data.gameState === 'finished' && !!data.result && data.result.humanWon === false // 昔のデータ：AIが勝って終わった枠
                this.rewardTera = (data.result && data.result.rewardTera) || 0
                this.moveLog = Array.isArray(data.moves) ? data.moves : []
                this.tiles = data.tiles
                // 保存されていた「置ける場所の印」「選択中の印」は、読み込み直したときは消す（カードを選び直すまで出さない）
                this.tiles.forEach(tile => { tile.validForSelection = false; tile.selected = false })
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
            if (this.boardOverview) this.fitOverview(0)
        },

        // ■虫眼鏡の盤面の大きさを、画面に合わせる。extra＝盤面の下にかぶさるものの高さ（ふりかえりのバーなど）
        fitOverview(extra) {
            const area = this.$refs.mainArea
            const room = (area ? area.clientHeight : window.innerHeight - 300) - 34 - extra
            this.overviewWidth = Math.max(180, Math.min(window.innerWidth - 12, Math.floor(room * this.rows / this.cols)))
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
                humanRank: this.humanRank(),
                resigned: this.resigned,
                rewardTera: this.rewardTera || 0
            }
        },

        // ■現在の進行状況をまるごと保存する
        async saveGame() {
            if (this.slotReleased || this.spectator) return
            try {
                await db.collection(SAVE_COLLECTION).doc(this.roomCode).set({
                    tiles: this.tiles,
                    moves: this.moveLog,
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

        // ■結果のゲームそのものを開く（見るだけ）。記録した手（moves）と、場所・ゲーム番号から、盤面をつくって、ぜんぶの手を重ねる
        async startResultView(resultId) {
            let data = null
            try {
                const doc = await db.collection('gameResults').doc(resultId).get()
                data = doc.exists ? doc.data() : null
            } catch (e) {
                console.error('けっかの読み込みに失敗しました', e)
            }
            if (!data || !Array.isArray(data.moves) || !data.moves.length || !data.slot || !data.slot.habitat) {
                this.$router.replace({ name: 'ResultCompare' })
                return
            }
            this.resultView = true
            this.spectator = true
            this.savedPlace = { city: 'aitest', cityName: data.slot.cityName || 'AIテスト', spotId: data.slot.spotId, spotName: data.slot.spotName, habitat: data.slot.habitat, gameNo: data.slot.gameNo, test: true }
            try { localStorage.setItem('dominationPlace', JSON.stringify(this.savedPlace)) } catch (e) { /* 保存できなくても、このあいだは有効 */ }
            this.slotOwner = { uid: '', name: 'AIテスト', team: TEAM_NAME_BY_ID[data.humanPlayerId] || 'air' }

            const seed = this.spotSeed(data.slot.spotId, data.slot.gameNo || 1)
            const tiles = generateSpotBoard(data.slot.habitat, { rows: this.rows, cols: this.cols, seed })
                .map(tile => ({ ...tile, type: 'none', selected: false, ownerTeam: null }))
            const byId = new Map(tiles.map(tile => [tile.id, tile]))
            data.moves.forEach(move => {
                const tile = byId.get(move.t)
                if (!tile) return
                tile.ownerTeam = move.p
                tile.placedCard = { tier: move.tier, label: move.l }
                ;(move.e || []).forEach(id => {
                    const eaten = byId.get(id)
                    if (eaten) {
                        eaten.eatenByTileId = move.t
                        eaten.eatenByPlayerId = move.p
                    }
                })
            })
            this.tiles = tiles
            this.moveLog = data.moves
            this.humanPlayerId = data.humanPlayerId || this.humanPlayerId
            this.players.forEach(player => {
                const saved = (data.players || []).find(item => item.id === player.id)
                player.score = saved ? saved.score : 0
                player.isAI = player.id !== this.humanPlayerId
            })
            this.resigned = !!data.resigned
            this.currentPlayerId = null
            this.gameState = 'finished'
            this.hands = {}
        },

        // ■観戦モード：保存されているゲームを読んで、見るだけにする。進行中のゲームは、動きに合わせて更新する
        async startSpectating() {
            const [library, found] = await Promise.all([
                this.cardLibrary.length ? Promise.resolve(this.cardLibrary) : fetchCardLibrary().catch(() => []),
                this.loadSavedGame()
            ])
            this.cardLibrary = library
            if (!found) {
                const place = this.loadPlace()
                this.$router.replace({ name: 'DominationMap', query: { city: place ? place.city : undefined, notice: 'nogame' } })
                return
            }
            this.spectator = true
            // 画面の「あなた」は、そのゲームを遊んでいる人のチームにする（ほかの2チームがAI）
            if (this.slotOwner && TEAM_ID_BY_NAME[this.slotOwner.team]) this.humanPlayerId = TEAM_ID_BY_NAME[this.slotOwner.team]
            this.players.forEach(player => { player.isAI = player.id !== this.humanPlayerId })

            this.spectateUnsub = db.collection(SAVE_COLLECTION).doc(this.roomCode).onSnapshot(doc => {
                if (!doc.exists) {
                    // 遊んでいた人が まけて、枠があいた（AIが勝った）とき
                    this.showToast('このゲームは おわって、ばしょが あいたよ')
                    setTimeout(() => this.backFromGame(), 1800)
                    return
                }
                const data = doc.data()
                if (!data || !Array.isArray(data.tiles)) return
                data.tiles.forEach(tile => { tile.validForSelection = false; tile.selected = false })
                this.moveLog = Array.isArray(data.moves) ? data.moves : []
                this.tiles = data.tiles
                this.hands = data.hands || this.hands
                this.skipCount = data.skipCount || 0
                this.gameState = data.gameState || 'playing'
                this.currentPlayerId = data.currentPlayerId ?? this.currentPlayerId
                this.resigned = !!(data.result && data.result.resigned)
                if (Array.isArray(data.players)) {
                    data.players.forEach(saved => {
                        const player = this.players.find(p => p.id === saved.id)
                        if (player) player.score = saved.score || 0
                    })
                }
            }, error => console.error('観戦の読み込みに失敗しました', error))
        },

        // ■ふりかえり：終わったゲームを、1手ずつ、はじめから見なおす
        startReplay() {
            if (!this.moveLog.length || this.replay) return
            const base = this.tiles.map(tile => ({ ...tile, ownerTeam: null, placedCard: null, eatenByTileId: null, eatenByPlayerId: null, selected: false, validForSelection: false }))
            let interval = 1
            try { interval = Number(localStorage.getItem('replayInterval')) || 1 } catch (e) { interval = 1 }
            this.replay = { index: 0, playing: false, interval, final: this.tiles, base, scores: this.players.map(player => player.score), timer: null, prevOverview: this.boardOverview }
            // ■ふりかえりは、いつも「虫眼鏡」（盤面ぜんたいを1画面に収める）で見る
            if (!this.boardOverview) this.toggleOverview()
            this.showTerritory = false
            this.goReplay(0)
            // バーが出てから、バーにかくれる分を引いて、盤面ぜんたいが見えるようにする
            this.$nextTick(() => {
                const bar = document.querySelector('.replay-bar')
                const dock = document.querySelector('.game-dock')
                const hidden = bar ? bar.offsetHeight - (dock && dock.offsetParent ? dock.offsetHeight : 0) : 0
                this.fitOverview(Math.max(0, hidden))
            })
        },

        goReplay(index) {
            const replay = this.replay
            if (!replay) return
            const n = Math.max(0, Math.min(index, this.moveLog.length))
            const previous = replay.index
            const tiles = replay.base.map(tile => ({ ...tile }))
            const byId = new Map(tiles.map(tile => [tile.id, tile]))
            const scores = {}
            this.players.forEach(player => { scores[player.id] = 0 })
            for (let i = 0; i < n; i++) {
                const move = this.moveLog[i]
                const tile = byId.get(move.t)
                if (!tile) continue
                tile.ownerTeam = move.p
                tile.placedCard = { tier: move.tier, label: move.l }
                scores[move.p] = (scores[move.p] || 0) + this.getScoreForTile(move.tier)
                ;(move.e || []).forEach(id => {
                    const eaten = byId.get(id)
                    if (eaten) {
                        eaten.eatenByTileId = move.t
                        eaten.eatenByPlayerId = move.p
                    }
                })
            }
            this.tiles = tiles
            this.players.forEach(player => { player.score = scores[player.id] || 0 })
            const last = n > 0 ? this.moveLog[n - 1] : null
            this.recentMoves = last ? [{ tileId: last.t, teamId: last.p, eatenIds: last.e || [] }] : []
            const stepped = n === previous + 1
            replay.index = n
            if (last && last.tier === 4 && stepped) {
                const lord = byId.get(last.t)
                if (lord) this.announceLord(lord)
            }
            if (last && !this.boardOverview) this.scrollToTile(last.t)
        },

        toggleReplayPlay() {
            const replay = this.replay
            if (!replay) return
            if (replay.playing) {
                this.stopReplayTimer()
                return
            }
            if (replay.index >= this.moveLog.length) this.goReplay(0)
            replay.playing = true
            const tick = () => {
                if (!this.replay || !this.replay.playing) return
                if (this.replay.index >= this.moveLog.length) {
                    this.stopReplayTimer()
                    return
                }
                this.goReplay(this.replay.index + 1)
                this.replay.timer = setTimeout(tick, this.replay.interval * 1000)
            }
            replay.timer = setTimeout(tick, 300)
        },

        stopReplayTimer() {
            if (!this.replay) return
            clearTimeout(this.replay.timer)
            this.replay.timer = null
            this.replay.playing = false
        },

        // ■1手ごとの間（秒）。再生中でも、すぐ変えられる
        setReplayInterval(seconds) {
            if (!this.replay) return
            this.replay.interval = seconds
            try { localStorage.setItem('replayInterval', String(seconds)) } catch (e) { /* 保存できなくても、このあいだは有効 */ }
        },

        stepReplay(delta) {
            if (!this.replay) return
            this.stopReplayTimer()
            this.goReplay(this.replay.index + delta)
        },

        closeReplay() {
            const replay = this.replay
            if (!replay) return
            this.stopReplayTimer()
            this.tiles = replay.final
            this.players.forEach((player, index) => { player.score = replay.scores[index] })
            this.recentMoves = []
            // 虫眼鏡は、ふりかえりを始める前の状態にもどす
            if (!replay.prevOverview && this.boardOverview) this.toggleOverview()
            this.replay = null
        },

        // ■終わったゲームの記録（盤面そのものではなく、チームごとの点・レベル別の数だけ）。けっか くらべの画面で見る
        async saveResultSample(result) {
            try {
                await db.collection('gameResults').add({
                    createdAt: new Date().toISOString(),
                    roomCode: this.roomCode,
                    humanPlayerId: this.humanPlayerId,
                    humanRank: result.humanRank,
                    resigned: !!result.resigned,
                    players: this.players.map(p => ({ id: p.id, name: p.name, color: p.color, score: p.score, isAI: p.isAI })),
                    tierTeam: JSON.parse(JSON.stringify(this.tierTeam)),
                    // ■そのゲームそのものを、あとから開けるように：置いた手と、盤面のもと（場所・ゲーム番号）
                    moves: this.moveLog,
                    slot: (() => {
                        const place = this.loadPlace()
                        return place && place.spotId ? { spotId: place.spotId, spotName: place.spotName || '', habitat: place.habitat || '', gameNo: place.gameNo || 1, cityName: place.cityName || '' } : null
                    })()
                })
            } catch (e) {
                console.error('ゲームの記録を保存できませんでした', e)
            }
        },

        // ■ゲーム枠をあける：この枠の保存（盤面）と、地図に出す枠のようすを消す。AIが勝った枠を、また遊べるようにする
        async releaseSlot() {
            this.slotReleased = true
            try {
                await Promise.all([
                    db.collection(SAVE_COLLECTION).doc(this.roomCode).delete(),
                    db.collection('mapSlots').doc(this.roomCode).delete()
                ])
            } catch (e) {
                console.error('ゲーム枠をあけられませんでした', e)
            }
        },

        // ■地図に出す「ゲーム枠のようす」（誰が遊び中か・勝ったチーム）を、軽いドキュメントにも書く
        async saveSlotStatus() {
            if (this.slotReleased || this.spectator) return
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
                    test: this.isTestPlace(),
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
                if (slot.state === 'finished' && slot.humanWon !== false) return goBack('done')
                if (slot.state !== 'finished' && isFresh(slot.updatedAt)) return goBack('busy')
            }

            // 自分が同じ街のほかの枠であそび中なら、始められない
            // 同時に遊べるのは、1つの街（エリア）につき1つ。ちがう街（平塚と釧路など）なら、1つずつ同時に遊べる
            const other = context.mineDocs.find(doc => doc.id !== this.roomCode && doc.data().city === place.city && isFresh(doc.data().updatedAt))
            if (other) return goBack('active')

            this.slotOwner = me
            return { blocked: false, loaded: false }
        },

        // ■地図の「場所」から始めたゲーム（ゲーム枠）かどうか
        // ■AIテストエリアの枠か（テラなし・いつも最初から・AIが勝っても色がつく）
        isTestPlace() {
            const place = this.loadPlace()
            return !!(place && place.test)
        },

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
            this.savedAiWon = false
            this.slotReleased = false
            this.resigned = false
            this.rewardTera = 0
            this.rewardState = ''
            this.showTerritory = false
            this.isAiThinking = false
            this.selectedCard = null
            this.tilePreviewCard = null

            // ■「けっか くらべ」から、その結果の ゲームそのものを 開く（記録した手から、盤面を作りなおす）
            const viewResult = localStorage.getItem('dominationViewResult')
            localStorage.removeItem('dominationViewResult')
            if (viewResult) {
                await this.startResultView(viewResult)
                return
            }

            const slot = this.isSlotGame()
            const team = TEAM_NAME_BY_ID[this.humanPlayerId]

            // ■ほかの人のゲーム・おわったゲームは、観戦モード（見るだけ）で入る
            const spectate = slot && localStorage.getItem('dominationSpectate') === '1'
            localStorage.removeItem('dominationSpectate')
            if (spectate) {
                await this.startSpectating()
                return
            }

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

            // ■AIテストの枠は、前のゲームが残っていても、だれが遊んでいても、いつも最初から始める（DBを手でリセットしなくていい）
            if (slot && this.isTestPlace()) {
                const user = slotContext && slotContext.user
                this.slotOwner = { uid: user ? user.uid : 'guest', name: user ? (user.name || '') : '', team }
                loaded = false
            }

            // ■AIが勝って終わった枠は、決着にしない。ほかの人（もちろん自分も）が、最初から再戦できる
            if (slot && loaded && this.savedAiWon) loaded = false

            // ■地図のゲーム枠：ほかの人が遊んでいる・遊び終えた枠には入れない。自分はどこか1つのゲームでしか遊べない
            if (slot && !this.isTestPlace()) {
                const access = this.checkSlotAccess(loaded, slotContext)
                if (access.blocked) return
                loaded = access.loaded
            }

            if (loaded) {
                // ■保存後にメンバーが新しくカードを集めたり、別のゲームで使ったりしているので、
                // 人間チームの手札はDBの所持カードから作り直す
                this.hands[this.humanPlayerId] = this.shuffleArray(this.handFromInstances(instances))
            } else {
                this.moveLog = []
                await this.initializeHands(instances)
                this.generateTiles()
                this.gameState = 'playing'
                this.currentPlayerId = this.players[0].id
                this.skipCount = 0
                this.players.forEach(p => (p.score = 0))
            }

            // ■保存の完了は待たない（画面を先に出す。保存の失敗は saveGame の中で記録する）
            this.saveGame()

            // ■テストモードは、選んでからAIを動かす（選ぶまでは何も打たない）
            if (this.testMode && this.isTestPlace() && !this.spectator && this.gameState === 'playing') {
                this.showModeChoice = true
                return
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
                backgroundImage: AREA_PATTERNS[tile.area] || 'none',
                backgroundSize: '100% 100%',
                width: '100%',
                aspectRatio: '1 / 1'
            }

            // ■ゲームのおわりに「じんちを みる」とき：おさえたマスを、そのチームの色でぬる（自分のチームは白いふちつき）。ほかはうすくする
            if (this.gameState === 'finished' && this.showTerritory) {
                if (tile.placedCard) {
                    const team = this.controllingTeam(tile)
                    base.background = this.teamColor(team)
                    base.backgroundImage = 'none'
                    if (team === this.humanPlayerId) base.boxShadow = 'inset 0 0 0 2px #fff'
                } else {
                    base.background = '#cbd5e1'
                    base.backgroundImage = 'none'
                    base.opacity = 0.45
                }
                return base
            }

           if (tile.eatenByTileId) {
                const eater = this.eaterTile(tile)
                if (eater) {
                    // ■食べられたマス：まっ黒な地に、もとのカード（うすく）と、赤い「とまれ」（赤い丸＋斜線）。ふちは、食べたチームの色。
                    //   生きているカード（明るい色・太いふち）と、ひと目で見分けがつく
                    base.background = '#07090f'
                    base.backgroundImage = 'none'
                    base.boxShadow = `inset 0 0 0 2px ${this.teamColor(eater.ownerTeam)}`
                }
            } else if (tile.ownerTeam !== null) {
                // ■使われた（カードが置かれた）マス：そのチームの色を、こく暗くした色にして、チームの色の太いふちをつける。
                //   したの地形の模様は残す（何の上に置いたか、うっすら見える。すみには絵文字の札も出る）。
                //   形がくっきり見えて、食べられたマス・チームの色のマスと見分けがつく
                const teamColor = this.teamColor(tile.ownerTeam)
                base.background = `color-mix(in srgb, ${teamColor} 42%, #0a0f1c)`
                base.boxShadow = `inset 0 0 0 3px ${teamColor}`
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
            this.fixedTileId = null

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

        // ■説明の「ちけい」の見本：盤面と同じ色・もよう
        terrainSwatchStyle(key) {
            return {
                background: this.areaColors[key],
                backgroundImage: AREA_PATTERNS[key] || 'none',
                backgroundSize: '100% 100%'
            }
        },

        // ■このカードは、いま置ける場所があるか
        isPlaceable(card) {
            return this.placeableKeys.has(`${card.area}-${card.tier}`)
        },

        // ■そのマスをおさえているチーム：カードが置かれたチーム。食べられたマスは、食べたチーム（食べた先をたどる）
        controllingTeam(tile) {
            let current = tile
            for (let i = 0; i < 50 && current && current.eatenByTileId; i++) {
                const next = this.tiles.find(t => t.id === current.eatenByTileId)
                if (!next) break
                current = next
            }
            return current ? current.ownerTeam : tile.ownerTeam
        },

        // ■順位（同点は同じ順位。自分より点が高いチームの数＋1）
        rankOf(player) {
            return 1 + this.players.filter(other => other.score > player.score).length
        },

        // ■順位のテラ（1位+10／2位+5／3位+2）。もらえない順位は0
        rankBonusFor(rank) {
            return RANK_REWARD_TERA[rank] || 0
        },

        humanRank() {
            const me = this.players.find(player => player.id === this.humanPlayerId)
            return me ? this.rankOf(me) : 0
        },

        // ■順位のごほうび：テラを加算する（ce-n.org の updatePoints。地図のゲームで1位になったときだけ、1ゲームにつき1回）
        async awardTera() {
            if (this.spectator || this.rewardState === 'pending' || this.rewardTera) return
            // ■ゲームの てんすう（カードを おくたびに ふえた点）を、おわったときに テラに かえる。順位のボーナスも、いっしょに
            const me = this.players.find(player => player.id === this.humanPlayerId)
            const amount = (RANK_REWARD_TERA[this.humanRank()] || 0) + (me ? me.score : 0)
            const cenId = getSession('loginCenId')
            if (!cenId || !amount) return
            this.rewardState = 'pending'
            try {
                await addPoints(cenId, amount)
                this.rewardTera = amount
                this.rewardState = ''
            } catch (e) {
                console.error('テラの加算に失敗しました', e)
                this.rewardState = 'error'
            }
            this.saveGame() // もらった記録を保存（読み込み直しても、もう一度もらわないように）
        },

        // ■置いたカードの形の色：自分のチームの色。食べられたカードは、うすい灰色
        // ■食べられたマスを食べたタイル（食べたタイルがさらに食べられていたら、その上をたどる）
        eaterTile(tile) {
            let current = this.tiles.find(t => t.id === tile.eatenByTileId)
            while (current && current.eatenByTileId) {
                const next = this.tiles.find(t => t.id === current.eatenByTileId)
                if (!next) break
                current = next
            }
            return current
        },

        domainColor(tile) {
            return this.domainByTile[tile.id] || ''
        },

        isLord(tile) {
            return !!(tile.placedCard && tile.placedCard.tier === 4 && !tile.eatenByTileId)
        },

        // ■レベル4（★）が おかれたとき：「頭の生きものが あらわれた」の おしらせと、音
        announceLord(tile) {
            const player = this.players.find(p => p.id === tile.ownerTeam)
            this.lordBanner = {
                name: (tile.placedCard && tile.placedCard.label) || 'いきもの',
                team: player ? player.name.replace('チーム', '') : '',
                color: this.teamColor(tile.ownerTeam)
            }
            sfx.lord()
            clearTimeout(this.lordTimer)
            this.lordTimer = setTimeout(() => { this.lordBanner = null }, 4200)
        },

        areaIcon(area) {
            return AREA_ICONS[area] || ''
        },
        shapeFill(tile) {
            // 食べられたカードも、もとのチームの色のまま（うすくして、ひびを入れる）
            return this.teamColor(tile.ownerTeam)
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
            this.recentMoves = []
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

        // ■テストモード：えらんだカードを、じぶんのカードに足す（DBには入れない仮のカード）
        addTestCard(card) {
            const hand = this.hands[this.humanPlayerId]
            if (!hand) return
            hand.push(toDominationCard(card, `test-${Date.now()}-${hand.length}`, true))
            this.usedTestCards = true
            this.testMessage = `「${card.name}」を ふやしたよ`
            clearTimeout(this.testMessageTimer)
            this.testMessageTimer = setTimeout(() => { this.testMessage = '' }, 1500)
        },

        // ■効果音のオン・オフ
        toggleSfx() {
            sfx.setMuted(!this.sfxMuted)
            this.sfxMuted = sfx.isMuted()
            if (!this.sfxMuted) sfx.select()
        },

        // ■タイルが画面の外にあるときは、見える場所（まん中）までスクロールする
        scrollToTile(tileId) {
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

        // ■AIが置いた／食べたタイルのふちの色（置いたチームの色）
        moveRing(tile) {
            const move = this.recentMoves.find(item => item.tileId === tile.id)
                || this.recentMoves.find(item => item.eatenIds.includes(tile.id))
            return move ? this.teamColor(move.teamId) : undefined
        },

        // ■黒いマスをなおしたあとの地形：となりあうマス（8マス）のうち、適当な1つと同じ地形（黒いマスは数えない）。まわりに無ければ「土」
        developedAreaFor(tile) {
            const areas = this.getNeighbors(tile).map(n => n.area).filter(area => area && area !== 'undeveloped')
            return areas.length ? areas[Math.floor(Math.random() * areas.length)] : 'dirt'
        },

        // ■黒いマスをタップ：「かんきょうチャレンジ」（ABゲーム2問）。カードを持っていなくても、ちょうせんできる
        startChallenge(tile) {
            if (this.gameState !== 'playing' || this.currentPlayer?.isAI) return
            this.challengeTile = tile
            this.challengeStarted = false
            this.showChallenge = true
            sfx.select()
        },

        // ■チャレンジのとちゅうで閉じたら、しっぱい（はじめる前なら、なにも起きない）
        cancelChallenge() {
            if (!this.challengeStarted) {
                this.showChallenge = false
                this.challengeTile = null
                return
            }
            this.onChallengeFinish({ success: false })
        },

        // ■チャレンジのおわり
        //   せいこう：黒いマスが、まわりの地形になおる＋ゲーム内の点数がふえる。自分の番はつづく（Lv1を、そこに おける）
        //   しっぱい：自分の番が、つぎのチームにうつる（何回でもためせてしまわないように）
        onChallengeFinish(result) {
            const tile = this.challengeTile
            this.showChallenge = false
            this.challengeTile = null
            this.challengeStarted = false

            if (result && result.success && tile && tile.area === 'undeveloped') {
                const area = this.developedAreaFor(tile) // となりあうマスの、適当な1つと同じ地形
                tile.area = area
                this.currentPlayer.score += AB_CHALLENGE_POINTS
                this.fixedTileId = tile.id
                this.selectedCard = null
                this.updateValidTiles()
                sfx.win()
                this.showToast(`かんきょうを なおせた！ +${AB_CHALLENGE_POINTS}てん。「${AREA_NAMES[area]}」に なったよ。このマスに、すぐ おけるよ`, true)
                this.saveGame()
                return
            }

            sfx.skip()
            this.showToast('ざんねん…。つぎの チームの ばんに なるよ')
            this.recentMoves = []
            this.goToNextPlayer()
            this.saveGame()
            this.maybeTriggerAI()
        },

        // ■画面の中のメッセージ（数秒で消える）
        showToast(message, good = false) {
            if (!good) sfx.error()
            this.toastMessage = message
            clearTimeout(this.toastTimer)
            this.toastTimer = setTimeout(() => { this.toastMessage = '' }, 4500)
        },

        finishGame(){
          this.gameState = 'finished'
          this.currentPlayerId = null
          this.isAiThinking = false
          this.recentMoves = []
          const result = this.computeResult()
          if (result) setTimeout(() => (result.humanWon ? sfx.win() : sfx.lose()), 300)
          if (result && !result.resigned && this.isSlotGame() && !this.isTestPlace() && !this.usedTestCards && !this.rewardTera && RANK_REWARD_TERA[result.humanRank]) this.awardTera()
          // ■AIが勝ったら、この枠は決着にしない（色もつけない）。保存を消して、ほかの人が再戦できるようにする
          if (result && !result.humanWon && this.isSlotGame() && !this.isTestPlace()) {
              this.releaseSlot()
              return
          }
          // ■テストモードで、地図の枠ではないゲーム（AIテストエリア）を最後まで遊んだら、終わったときの記録を残す（けっか くらべ用）
          if (result && this.testMode && !this.spectator && (!this.isSlotGame() || this.isTestPlace())) this.saveResultSample(result)
          this.saveGame()
        },

        // ------------------------
        // AIプレイヤー関連
        // ------------------------

        // ■テストモード：入ったあと、じぶんで あそぶか、AIに ぜんぶまかせるかを決める
        chooseMode(allAI) {
            this.showModeChoice = false
            this.aiOnlyMode = allAI
            if (allAI) {
                // AIにまかせるときは、人間チームもAIにする（実際のカードは使わず、仮のカードで打つ）
                this.players.forEach(p => { p.isAI = true })
                this.hands[this.humanPlayerId] = this.buildAIHand(this.humanPlayerId, (this.hands[this.humanPlayerId] || []).length)
            }
            this.maybeTriggerAI()
        },

        // ■手番がAIなら自動で打たせる。人間の手番なら何もしない
        maybeTriggerAI() {
            if (this.gameState !== 'playing') return
            if (this.currentPlayer && this.currentPlayer.isAI) {
                this.playAITurn()
            }
        },

        // ■シンプルなAI: 手札からランダムに1枚選び、置けるマスがあればランダムな有効マスに置く。
        // どのカードも置ける場所が無ければスキップする
        // ■AIの手の選び方：AI_SMART_RATE の割合で「かしこく」、それ以外は「ランダム」
        findAIMove(hand) {
            const cards = hand || []

            if (Math.random() < AI_SMART_RATE) {
                const smart = this.findSmartAIMove(cards)
                if (smart) return smart
            }

            const candidates = this.shuffleArray(cards)

            for (const card of candidates) {
                const validTiles = this.tiles.filter(t => this.isTileValidForCard(t, card))

                if (validTiles.length > 0) {
                    const tile = validTiles[Math.floor(Math.random() * validTiles.length)]
                    return { card, tile }
                }
            }

            return null
        },

        // ■かしこい手：置けるカードのうち、点がいちばん高いカードを選び、置ける場所のうち、
        //   相手のカードをたくさん食べられて、自分のカードを食べない場所を選ぶ
        findSmartAIMove(cards) {
            // 手札の（レベル・陸/水）ごとに、いちばんよい場所を探して、その中で いちばん よい手を えらぶ
            const handKinds = new Set(cards.map(card => `${card.tier}-${card.area}`))
            const seen = new Set()
            const kinds = this.shuffleArray(cards).filter(card => {
                const key = `${card.tier}-${card.area}`
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })

            let best = null
            let bestScore = -Infinity

            for (const card of kinds) {
                const validTiles = this.tiles.filter(t => this.isTileValidForCard(t, card))
                if (!validTiles.length) continue

                // Lv1は場所が多いので、ランダムに選んだ一部だけ調べる。Lv2以上は、ぜんぶの場所を調べる
                //   （「上のレベルを置ける場所」を作る手を、見のがさないように）
                const candidates = card.tier >= 2 ? validTiles : this.shuffleArray(validTiles).slice(0, 60)
                candidates.forEach(tile => {
                    const lower = this.getNeighbors(tile).filter(n => n.placedCard && n.placedCard.tier < card.tier && !n.eatenByTileId)
                    const eat = lower.filter(n => n.ownerTeam !== this.currentPlayerId).length - 2 * lower.filter(n => n.ownerTeam === this.currentPlayerId).length
                    const score = this.getScoreForTile(card.tier) + eat * 1.5 + this.unlockBonus(tile, card, handKinds) + this.clusterBonus(tile, card)
                    if (score > bestScore) {
                        bestScore = score
                        best = { card, tile }
                    }
                })
            }

            return best
        },

        // ■すでにある「上のレベル」の近くに置くと、点数がつく（上のレベルが、あつまった「やま」ができて、レベル4に届きやすい）。
        //   まわり3マスいないの、このカードより上のレベル（食べられていないもの）の数
        clusterBonus(tile, card) {
            if (card.tier >= 4) return 0
            let near = 0
            this.tiles.forEach(other => {
                if (!other.placedCard || other.eatenByTileId || other.placedCard.tier <= card.tier) return
                if (Math.abs(other.row - tile.row) <= 3 && Math.abs(other.col - tile.col) <= 3) near += other.placedCard.tier - card.tier
            })
            return Math.min(near, 8) * 0.6
        },

        // ■「上のレベルを置ける場所」を作れるかの点数：このカードを置くと、となりの空きマスのまわりに、同じレベルが2こそろう（＝ひとつ上のレベルが置けるようになる）。
        //   上のレベルほど大きい点（レベル4へ向かう手を、よく選ぶ）。上のレベルのカードを持っていて、そのマスに置けるときだけ
        unlockBonus(tile, card, handKinds) {
            if (card.tier >= 4) return 0
            const weight = { 1: 1.5, 2: 3, 3: 7 }[card.tier]
            const next = card.tier + 1
            let bonus = 0
            this.getNeighbors(tile).forEach(site => {
                if (site.ownerTeam !== null || site.area === 'undeveloped') return
                const kind = site.area === 'river' || site.area === 'sea' ? 'water' : 'land'
                if (!handKinds.has(`${next}-${kind}`)) return
                const count = this.getNeighbors(site).filter(n => n.placedCard?.tier === card.tier && !n.eatenByTileId).length
                if (count === 1) bonus += weight // これで 2こ そろう
                else if (count === 0) bonus += weight * 0.25 // まず 1こ目
            })
            return bonus
        },

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms))
        },

        async playAITurn() {
            if (this.gameState !== 'playing') return

            const player = this.currentPlayer
            if (!player || !player.isAI) return

            this.isAiThinking = true

            // 「考えている」感を出すための、少しだけのウェイト（AIにまかせるときは、AI_ONLY_TURN_MS）
            await this.delay(this.aiOnlyMode ? AI_ONLY_TURN_MS : 900 + Math.random() * 500)

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

            const eatenIds = this.handleEating(tile)
            sfx.aiPlace(tile.area)
            if (eatenIds.length) setTimeout(() => sfx.eat(), 160)
            // 人間がいない（AIどうし）ときは、最新の1手だけを強調する（積み上げると、ぜんぶのマスが「前の手」みたいに光ってしまう）
            if (!this.players.some(p => !p.isAI)) this.recentMoves = []
            this.recentMoves.push({ tileId: tile.id, teamId: player.id, eatenIds })

            this.removeFromHand(hand, card)

            this.skipCount = 0
            this.isAiThinking = false
            this.goToNextPlayer()
            // 自分の番にもどったときだけ、最後のAIの手が画面の外なら、そこまでスクロールする
            if (this.gameState === 'playing' && this.currentPlayer && !this.currentPlayer.isAI) {
                this.scrollToTile(tile.id)
            }
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
    beforeUnmount() {
        if (this.spectateUnsub) this.spectateUnsub()
        if (this.replay) clearTimeout(this.replay.timer)
    },
    components: {
        GameCardFocus,
        GameResultSummary,
        ABGameProposalB
    },
    computed: {
      currentPlayer() {
          return this.players.find(p => p.id === this.currentPlayerId)
      },
      // ■AIが置いたタイル（自分の番が終わってから）
      aiMoveTileIds() {
          return new Set(this.recentMoves.map(move => move.tileId))
      },

      // ■置けるカード：（陸/水 × レベル）ごとに、置ける場所が1つでもあるか。置けないカードを薄く出したり、スキップを光らせたりするのに使う
      placeableKeys() {
          const keys = new Set()
          for (const area of ['land', 'water']) {
              for (const tier of [1, 2, 3, 4]) {
                  const sample = { tier, area }
                  if (this.tiles.some(tile => this.isTileValidForCard(tile, sample))) keys.add(`${area}-${tier}`)
              }
          }
          return keys
      },

      // ■自分の番で、置けるカードが1枚もないとき（スキップを光らせる）
      mustSkip() {
          if (this.gameState !== 'playing' || !this.currentPlayer || this.currentPlayer.isAI) return false
          const hand = this.hands[this.currentPlayerId] || []
          return hand.every(card => !this.placeableKeys.has(`${card.area}-${card.tier}`))
      },

      // ■じんち：チームごとの、おさえているマスの数（カードが置かれたマス＋食べて自分の色にしたマス）
      territory() {
          const counts = {}
          this.tiles.forEach(tile => {
              if (!tile.placedCard) return
              const team = this.controllingTeam(tile)
              counts[team] = (counts[team] || 0) + 1
          })
          const max = Math.max(1, ...Object.values(counts))
          return this.players
              .map(player => ({
                  id: player.id,
                  name: player.name,
                  color: player.color,
                  isAI: player.isAI,
                  count: counts[player.id] || 0,
                  percent: Math.round(((counts[player.id] || 0) / max) * 100)
              }))
              .sort((a, b) => b.count - a.count)
      },

      // ■レベル4（★）の支配エリア：食べられていない ★ の、まわり8マス → ★の もちぬしの色（ほかの ★ と かさなるときは、さきの ★）
      domainByTile() {
          const map = {}
          this.tiles.forEach(tile => {
              if (!tile.placedCard || tile.placedCard.tier !== 4 || tile.eatenByTileId) return
              const color = this.teamColor(tile.ownerTeam)
              this.getNeighbors(tile).forEach(neighbor => {
                  if (!map[neighbor.id]) map[neighbor.id] = color
              })
          })
          return map
      },

      // ■ふりかえり中の、いまの手の説明
      replayLabel() {
          const replay = this.replay
          if (!replay) return ''
          if (!replay.index) return 'はじまり'
          const move = this.moveLog[replay.index - 1]
          const player = this.players.find(item => item.id === move.p)
          const eaten = move.e && move.e.length ? `（${move.e.length}こ 食べた）` : ''
          return `${replay.index}手め：${player ? player.name : ''} が Lv${move.tier}${move.l ? `「${move.l}」` : ''}を おいた${eaten}`
      },

      // ■観戦モードの結果の画面に出す、勝ったチーム
      winnerPlayer() {
          const result = this.finishedResult
          return result ? this.players.find(player => player.id === result.winnerId) : null
      },

      ownerLabel() {
          const owner = this.slotOwner
          return owner && owner.name ? `${owner.name}さん` : 'ほかの人'
      },

      testCardGroups() {
          const groups = {}
          this.cardLibrary.forEach(card => {
              const level = card.level || 1
              ;(groups[level] = groups[level] || []).push(card)
          })
          return Object.keys(groups).sort((a, b) => a - b).map(level => ({ level, cards: groups[level] }))
      },

      // ■レベルごと・チームごとの、盤面のカードの数（終了画面の生態系ピラミッド・じんちのもと）
      tierTeam() {
          const result = {}
          this.tiles.forEach(tile => {
              if (!tile.placedCard) return
              const tier = tile.placedCard.tier || 1
              const team = this.controllingTeam(tile)
              result[tier] = result[tier] || {}
              result[tier][team] = (result[tier][team] || 0) + 1
          })
          return result
      },

      // ■もらったテラの内わけ（てんすう ぶん ＋ 順位ボーナス）
      rewardParts() {
          const bonus = RANK_REWARD_TERA[this.humanRank()] || 0
          if (!this.rewardTera || this.rewardTera < bonus) return null
          return { bonus, score: this.rewardTera - bonus }
      },

      rankRewardText() {
          return `1位 +${RANK_REWARD_TERA[1]}・2位 +${RANK_REWARD_TERA[2]}・3位 +${RANK_REWARD_TERA[3]}テラ`
      },

      // ■AIに食べられたタイル
      aiEatenIds() {
          return new Set(this.recentMoves.flatMap(move => move.eatenIds))
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
/* ■黒いマスをなおしたばかりのマス：ピコンと光らせる（番がうつったら消える） */
.fixed-tile-pulse{ animation: fixed-tile-pulse 1.2s ease-in-out infinite; }
@keyframes fixed-tile-pulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(250, 204, 21, 0.25); }
  50% { box-shadow: inset 0 0 0 5px rgba(250, 204, 21, 1); }
}
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

  /* ■自分の番が終わってからのAIの動き（自分が動くまで）。うるさすぎないように：
     ・AIが置いたタイル：ゆっくり「ぷくぷく」ふくらむ ＋ 角が「キラキラ」光る。ふちは、そのAIチームの色
     ・AIに食べられたタイル：そのAIチームの色の点線のふち */
  .board-tile.ai-last{
      position: relative;
      z-index: 5;
      outline: 2px solid var(--ring, #facc15);
      outline-offset: 0;
      animation: ai-pump 1.1s ease-in-out infinite;
  }
  .board-tile.ai-last::before,
  .board-tile.ai-last::after{
      content: '✦';
      position: absolute;
      z-index: 7;
      font-size: 12px;
      line-height: 1;
      color: #fff;
      text-shadow: 0 0 3px var(--ring, #facc15), 0 0 8px var(--ring, #facc15);
      pointer-events: none;
      opacity: 0;
  }
  .board-tile.ai-last::after{
      top: -7px;
      right: -5px;
      animation: ai-sparkle 1.1s ease-in-out infinite;
  }
  .board-tile.ai-last::before{
      bottom: -7px;
      left: -5px;
      font-size: 9px;
      animation: ai-sparkle 1.1s ease-in-out 0.55s infinite;
  }
  .board-tile.ai-eaten{
      position: relative;
      z-index: 4;
      outline: 2px dashed var(--ring, #facc15);
      outline-offset: -1px;
  }
  @keyframes ai-pump{
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.18); }
  }
  @keyframes ai-sparkle{
      0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
      50% { opacity: 1; transform: scale(1.2) rotate(45deg); }
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

  /* ■置いたカードの形（SVG）。マスの大きさの約78%。黒縁は、拡大・縮小しても同じ太さ（2px）にする */
  /* ■ふりかえりのバー（画面の下に出す。ほかの画面より前） */
  .replay-bar{
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 60;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
      background: rgba(15, 23, 42, .96);
      border-top: 2px solid #a78bfa;
      color: #e2e8f0;
  }
  .replay-label{ margin: 0 0 6px; font-size: 12px; font-weight: 800; line-height: 1.4; }
  .replay-slider{ width: 100%; accent-color: #a78bfa; }
  .replay-buttons{ display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; }
  .replay-buttons button{
      min-width: 38px;
      padding: 6px 8px;
      border: 1.5px solid rgba(255,255,255,.3);
      border-radius: 10px;
      background: rgba(255,255,255,.08);
      font-size: 14px;
      font-weight: 900;
      color: #f1f5f9;
  }
  .replay-buttons .replay-play{ min-width: 52px; border-color: #a78bfa; background: #6d28d9; }
  .replay-buttons .replay-speed{
      min-width: 0;
      padding: 6px 4px;
      border: 1.5px solid rgba(255,255,255,.3);
      border-radius: 10px;
      background: #1e293b;
      font-size: 12px;
      font-weight: 900;
      color: #f1f5f9;
  }
  .replay-buttons .replay-close{ margin-left: auto; font-size: 12px; border-color: rgba(248,113,113,.7); }

  /* ■観戦モード：見るだけ。バナーと、ゲーム全体のむらさきのふちで、観戦中だと分かるようにする */
  .spectator-banner{
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #6d28d9;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
  }
  .spectator-badge{
      flex: none;
      padding: 2px 10px;
      border-radius: 9999px;
      background: #fff;
      color: #6d28d9;
      font-weight: 900;
      white-space: nowrap;
  }
  .spectator-text{ flex: 1; min-width: 0; }
  .spectator-back{
      flex: none;
      padding: 3px 12px;
      border: 1px solid rgba(255,255,255,.7);
      border-radius: 9999px;
      font-weight: 900;
  }
  .domination-app.spectating{
      box-shadow: inset 0 0 0 4px #7c3aed;
  }
  .spectating .board-tile{
      cursor: default;
  }

  /* ■テストモードの「カードを えらぶ」ボタン（「あなたのカード」の すぐとなり） */
  .test-card-button{
      flex: none;
      margin-right: auto;
      padding: 1px 8px;
      border: 1.5px dashed #a78bfa;
      border-radius: 9999px;
      background: #f5f3ff;
      color: #6d28d9;
      font-size: 11px;
      font-weight: 900;
      line-height: 1.5;
      white-space: nowrap;
  }
  .test-card-button:active{ transform: scale(0.95); }

  /* ■レベル4（★）の支配エリア：まわり8マスが、そのチームの色で、ゆっくり光る。★は、ゆっくり脈うつ */
  .tile-domain{
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      border-radius: 2px;
      background: radial-gradient(circle at center, color-mix(in srgb, var(--c) 62%, transparent), color-mix(in srgb, var(--c) 34%, transparent));
      box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c) 90%, transparent), 0 0 8px color-mix(in srgb, var(--c) 70%, transparent);
      animation: domain-glow 2.6s ease-in-out infinite;
  }
  @keyframes domain-glow{
      0%, 100% { opacity: .7; }
      50% { opacity: 1; }
  }
  .board-tile.tile-lord{
      position: relative;
      z-index: 6;
  }
  .board-tile.tile-lord .tile-shape{
      animation: lord-pulse 2.2s ease-in-out infinite;
      filter: drop-shadow(0 0 3px #fff) drop-shadow(0 0 6px rgba(250, 204, 21, .9));
  }
  @keyframes lord-pulse{
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.22); }
  }
  .lord-banner{
      position: fixed;
      top: 30vh;
      left: 50%;
      z-index: 58;
      display: flex;
      align-items: center;
      gap: 10px;
      width: max-content;
      max-width: 92vw;
      transform: translateX(-50%);
      padding: 10px 18px 10px 14px;
      border: 2px solid var(--c);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(15, 23, 42, .96), rgba(8, 12, 24, .96));
      box-shadow: 0 0 22px color-mix(in srgb, var(--c) 70%, transparent), 0 6px 20px rgba(0, 0, 0, .5);
      color: #f8fafc;
      pointer-events: none;
  }
  .lord-crown{ font-size: 28px; filter: drop-shadow(0 0 6px rgba(250, 204, 21, .9)); }
  .lord-text{ display: flex; flex-direction: column; font-size: 13px; font-weight: 700; line-height: 1.5; }
  .lord-text b{ font-size: 15px; font-weight: 900; color: var(--c); }
  .lord-text small{ font-size: 10px; font-weight: 700; color: #cbd5e1; }
  .lord-fade-enter-active, .lord-fade-leave-active{ transition: opacity .5s ease, transform .5s ease; }
  .lord-fade-enter-from, .lord-fade-leave-to{ opacity: 0; transform: translate(-50%, -12px); }

  .tile-eaten{
      position: absolute;
      inset: 11%;
      width: 78%;
      height: 78%;
      fill: none;
      stroke-linejoin: round;
      stroke-linecap: round;
      pointer-events: none;
      overflow: visible;
  }
  .tile-eaten .tile-stop-under{ stroke: #000; stroke-width: 3.6; vector-effect: non-scaling-stroke; }
  .tile-eaten .tile-stop{ stroke: #ef4444; stroke-width: 2; vector-effect: non-scaling-stroke; }

  .tile-terrain{
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 2;
      font-size: 8px;
      line-height: 1;
      pointer-events: none;
      filter: drop-shadow(0 0 1px rgba(0,0,0,.8));
  }
  .tile-shape{
      width: 78%;
      height: 78%;
      overflow: visible;
  }
  .tile-shape *{
      stroke: #000;
      stroke-width: 2px;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
  }

  /* ■以前のCSS整理で消えてしまっていた、もとのアニメーションの指定（AIが考え中の帯のフェードなど）を復元 */
  @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.7; }
  }

  .fade-enter-active,
  .fade-leave-active{
      transition: opacity .2s ease;
  }

  .fade-enter-from,
  .fade-leave-to{
      opacity: 0;
  }
  /* ■あそびかたの番号 */
  .rule-no{
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0e7490;
      font-size: 12px;
      font-weight: 900;
      color: #fff;
  }
  /* ■いま置けないカードは、うすく表示する（タップして見ることはできる） */
  .chip-dim{
      opacity: 0.38;
      filter: grayscale(0.7);
  }

  /* ■置けるカードがないとき、スキップのボタンを光らせる */
  .skip-glow{
      animation: skip-glow 1.1s ease-in-out infinite;
      border-color: #38bdf8 !important;
  }
  @keyframes skip-glow{
      0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.0); }
      50% { box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.9), 0 0 14px 4px rgba(56, 189, 248, 0.8); }
  }
  .dock-note-skip{
      color: #7dd3fc;
  }

  /* ■置けるカードがないとき：スキップと「もどる」ボタンを、キラキラ光らせる（✦がまたたく） */
  .skip-glow,
  .back-glow{
      position: relative;
  }
  .back-glow{
      animation: back-glow 1.1s ease-in-out infinite;
      border-color: #4ade80 !important;
  }
  @keyframes back-glow{
      0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
      50% { box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.9), 0 0 14px 4px rgba(74, 222, 128, 0.8); }
  }
  .skip-glow::after,
  .back-glow::after{
      content: '✦';
      position: absolute;
      top: -7px;
      right: -3px;
      z-index: 2;
      font-size: 13px;
      line-height: 1;
      color: #fff;
      text-shadow: 0 0 4px #fff, 0 0 9px #7dd3fc;
      pointer-events: none;
      animation: ai-sparkle 1.1s ease-in-out infinite;
  }
  .back-glow::after{
      text-shadow: 0 0 4px #fff, 0 0 9px #4ade80;
      animation-delay: 0.4s;
  }

  /* ■ゲーム終了の順位バッジ・じんちを見るときの帯 */
  .rank-badge{
      display: inline-block;
      min-width: 30px;
      border-radius: 6px;
      background: #0e7490;
      padding: 0 6px;
      font-size: 11px;
      font-weight: 900;
      text-align: center;
      color: #fff;
  }
  .territory-panel{
      position: fixed;
      left: 8px;
      right: 8px;
      bottom: calc(10px + env(safe-area-inset-bottom));
      z-index: 50;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.95);
      padding: 10px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  }
  .territory-chip{
      border-radius: 999px;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
      white-space: nowrap;
  }
  .territory-back{
      border: 1px solid #94a3b8;
      border-radius: 999px;
      padding: 3px 14px;
      font-size: 12px;
      font-weight: 800;
      color: #e2e8f0;
      white-space: nowrap;
  }
  /* ■説明の画面：ちけい・レベルと ポイント */
  .legend-title{
      margin: 0 0 8px;
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      color: #475569;
  }
  .legend-terrain{
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 10px;
      background: #f1f5f9;
      padding: 6px 8px;
  }
  .legend-swatch{
      flex: none;
      width: 38px;
      height: 38px;
      border-radius: 6px;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  }
  .legend-level{
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      border-radius: 10px;
      background: #f1f5f9;
      padding: 8px 2px 6px;
      text-align: center;
  }
  .legend-shape{
      width: 30px;
      height: 30px;
      overflow: visible;
  }
  .legend-shape *{
      stroke: #000;
      stroke-width: 2px;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
  }
  .legend-points{
      border-radius: 999px;
      background: #0e7490;
      padding: 0 8px;
      font-size: 11px;
      font-weight: 900;
      color: #fff;
  }
</style>
