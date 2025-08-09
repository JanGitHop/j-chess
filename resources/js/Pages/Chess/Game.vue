<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import AnnotatedChessBoard from '@/Components/Chess/AnnotatedChessBoard.vue'
import BoardSettings from '@/Components/Chess/BoardSettings.vue'
import GameSidebar from '@/Components/Chess/GameSidebar.vue'
import CapturedPieces from '@/Components/Chess/CapturedPieces.vue'
import PromotionModal from '@/Components/Chess/PromotionModal.vue'
import GameHeader from '@/Components/Chess/GameHeader.vue'
import ChessTimer from '@/Components/Chess/ChessTimer.vue'
import PlayerCard from '@/Components/Chess/PlayerCard.vue'

// Stores
import { useBoardStore } from '@/Stores/boardStore'
import { useChessTimerStore } from "@/Stores/chessTimerStore.js"
import { useGameStore } from '@/Stores/gameStore'
import { useGameConfigStore } from '@/Stores/gameConfigStore.js'
import { usePieceStore } from '@/Stores/pieceStore'

// Composables
import { useSounds } from '@/Composables/useSounds.js'
import { useNotifications } from '@/Composables/useNotifications.js'
import { useGameEvents } from '@/Composables/useGameEvents.js'
import { usePromotionDialog } from '@/Composables/usePromotionDialog.js'
import { useKeyboardShortcuts } from '@/Composables/useKeyboardShortcuts.js'

// Constants
import {
    GAME_MODES,
    PLAYER_COLORS
} from '@/Utils/chessConstants.js'

// Props
const props = defineProps({
    gameId: {
        type: String,
        default: null
    },
    gameMode: {
        type: String,
        default: GAME_MODES.LOCAL_PVP
    },
    playerColor: {
        type: String,
        default: PLAYER_COLORS.WHITE
    },
    timeControl: {
        type: Object,
        default: () => ({ type: 'unlimited' })
    },
    initialPosition: {
        type: String,
        default: null // FEN-String for custom position
    }
})

// Stores
const boardStore = useBoardStore()
const gameStore = useGameStore()
const pieceStore = usePieceStore()
const configStore = useGameConfigStore()
const timerStore = useChessTimerStore()

// UI State
const showSettings = ref(false)
const showMoveHistory = ref(true)
const showBoardInfo = ref(false)
const showPlayerInfo = ref(true)
const showGameControls = ref(true)
const isFullscreen = ref(false)
const sidebarCollapsed = ref(false)
const chessBoardRef = ref(null)

// Game State
const gameStartTime = ref(null)
const lastMoveTime = ref(null)

// Sound system
const {
    preloadAllSounds,
    playMoveSound,
    playGameSound,
    playUISound
} = useSounds()

// Notifications system
const {
    notifications,
    activeNotifications,
    addNotification,
    dismissNotification,
    clearNotifications,
    handleGameStatusNotification
} = useNotifications()

// Promotion dialog
const {
    showPromotionModal,
    promotionData,
    showPromotionDialog,
    handlePromotionConfirm: baseHandlePromotionConfirm,
    handlePromotionCancel,
    hidePromotionDialog
} = usePromotionDialog(gameStore, pieceStore, addNotification, playGameSound)

/**
 * Undo/Redo move handlers
 */
const handleUndoMove = () => {
    // TODO: Implement undo move functionality
}

const handleRedoMove = () => {
    // TODO: Implement redo move functionality
}

/**
 * UI Controls
 */
const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
        isFullscreen.value = true
    } else {
        document.exitFullscreen()
        isFullscreen.value = false
    }
}

const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
}

/**
 * Auto-reverse after each move
 */
const performAutoReverse = () => {
    if (!configStore.shouldAutoReverse) return

    if (gameStore.currentPlayer !== configStore.boardOrientation) {
        configStore.flipBoard()
    }
}

// Keyboard shortcuts
const { setupKeyboardShortcuts, cleanupKeyboardShortcuts } = useKeyboardShortcuts({
    handlePromotionCancel,
    handleUndoMove,
    handleRedoMove,
    clearSelection: () => gameStore.clearSelection(),
    toggleFullscreen,
    toggleSidebar,
    showPromotionModal
})

// Game events
const {
    handleSquareClick,
    handlePieceClick,
    handleMove,
    handleMoveCompleted,
    handleGameStateChange,
    handleCheck,
    handleCheckmate,
    handleStalemate,
    handleTimerExpired
} = useGameEvents(
    gameStore,
    configStore,
    addNotification,
    playMoveSound,
    playGameSound,
    showPromotionDialog,
    performAutoReverse,
    handleGameStatusNotification
)

/**
 * Wrapper for promotion confirmation that handles the move completion
 */
const handlePromotionConfirm = (promotionChoice) => {
    const moveResult = baseHandlePromotionConfirm(promotionChoice)
    if (moveResult && moveResult.success) {
        handleMoveCompleted(moveResult)
    }
}

// ===== COMPUTED PROPERTIES =====

const gameState = computed(() => ({
    status: gameStore.gameStatus,
    currentPlayer: gameStore.currentPlayer,
    isGameActive: gameStore.isGameActive,
    moveCount: gameStore.moveHistory.length,
    isInCheck: gameStore.isInCheck,
    checkingPieces: gameStore.checkingPieces,
    lastMove: gameStore.lastMove,
    selectedSquare: gameStore.selectedSquare,
    legalMoves: gameStore.legalMoves,
    capturedPieces: gameStore.capturedPieces
}))

const boardOrientation = computed(() => configStore.boardOrientation)
const showCoordinates = computed(() => configStore.showCoordinates)
const currentMoveIndex = computed(() => gameStore.currentMoveIndex ?? -1)
const currentBoardSize = computed(() => chessBoardRef.value?.boardSize || 480)

// Calculate material advantage
const calculateMaterialAdvantage = (color) => {
    if (!gameState.value.capturedPieces) return 0

    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    }

    const oppColor = color === 'white' ? 'black' : 'white'
    const myCaptured = gameState.value.capturedPieces[oppColor] || []
    const oppCaptured = gameState.value.capturedPieces[color] || []

    const myValue = myCaptured.reduce((sum, piece) => {
        const pieceType = typeof piece === 'string' ? piece : piece.type
        return sum + (pieceValues[pieceType?.toLowerCase()] || 0)
    }, 0)

    const oppValue = oppCaptured.reduce((sum, piece) => {
        const pieceType = typeof piece === 'string' ? piece : piece.type
        return sum + (pieceValues[pieceType?.toLowerCase()] || 0)
    }, 0)

    return myValue - oppValue
}

// Captured Pieces Data
const capturedPiecesData = computed(() => {
    const whiteCaptured = gameState.value.capturedPieces?.black || []
    const blackCaptured = gameState.value.capturedPieces?.white || []

    return {
        white: {
            pieces: whiteCaptured,
            advantage: calculateMaterialAdvantage('white')
        },
        black: {
            pieces: blackCaptured,
            advantage: calculateMaterialAdvantage('black')
        }
    }
})

const topCapturedPieces = computed(() =>
    boardOrientation.value === 'white'
        ? capturedPiecesData.value.black
        : capturedPiecesData.value.white
)

const bottomCapturedPieces = computed(() =>
    boardOrientation.value === 'white'
        ? capturedPiecesData.value.white
        : capturedPiecesData.value.black
)

// Player data
const whitePlayerData = computed(() => ({
    name: gameStore.whitePlayer || 'Weiß',
    color: 'white',
    rating: 1200,
    avatar: null,
    isActive: gameState.value.currentPlayer === 'white'
}))

const blackPlayerData = computed(() => ({
    name: gameStore.blackPlayer || 'Schwarz',
    color: 'black',
    rating: 1200,
    avatar: null,
    isActive: gameState.value.currentPlayer === 'black'
}))

const topPlayerInfo = computed(() =>
    boardOrientation.value === 'white' ? blackPlayerData.value : whitePlayerData.value
)

const bottomPlayerInfo = computed(() =>
    boardOrientation.value === 'white' ? whitePlayerData.value : blackPlayerData.value
)

const topPlayerColor = computed(() =>
    boardOrientation.value === 'white' ? 'white' : 'black'
)

const bottomPlayerColor = computed(() =>
    boardOrientation.value === 'white' ? 'black' : 'white'
)

// Layout classes for responsive design
const layoutClasses = computed(() => ({
    'game-layout': true,
    'game-layout--fullscreen': isFullscreen.value,
    'game-layout--sidebar-collapsed': sidebarCollapsed.value,
    'game-layout--mobile': window.innerWidth < 768
}))

// ===== EVENT HANDLERS =====

/**
 * Flip the board manually
 */
const handleFlipBoard = (newOrientation) => {
    console.log('🔄 Board manually flipped to:', newOrientation)
}

/**
 * Handle game mode changes
 */
const handleGameModeChanged = (newMode) => {
    console.log('🎮 Game mode changed to:', newMode)
    gameStore.setGameMode(newMode)

    addNotification({
        type: 'success',
        message: `Game mode changed to: ${configStore.gameModeSettings.name}`,
        duration: 2000
    })
}

/**
 * Start a new game from header
 */
const handleNewGameFromHeader = () => {
    console.log('🆕 New game started from header')
    handleNewGame()
}

/**
 * Toggle board info display
 */
const toggleBoardInfo = () => {
    showBoardInfo.value = !showBoardInfo.value

    addNotification({
        type: 'info',
        message: `Board info ${showBoardInfo.value ? 'shown' : 'hidden'}`,
        duration: 2000
    })
}

/**
 * Export game to PGN
 */
const handleExportGame = () => {
    try {
        const pgn = gameStore.toPGN()

        // Trigger download
        const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chess-game-${new Date().toISOString().split('T')[0]}.pgn`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        addNotification({
            type: 'success',
            message: 'Game exported successfully',
            duration: 3000
        })
    } catch (error) {
        console.error('Export error:', error)
        addNotification({
            type: 'error',
            message: 'Error exporting game',
            duration: 3000
        })
    }
}

/**
 * Start a new game
 */
const handleNewGame = async (gameData) => {
    try {
        await gameStore.initializeGameWithTimer(gameData)
    } catch (error) {
        console.error('Error starting game:', error)
    }
}

/**
 * Resign from the current game
 */
const handleResignGame = () => {
    if (confirm('Are you sure you want to resign?')) {
        gameStore.resignGame()
        addNotification({
            type: 'warning',
            message: `${gameState.value.currentPlayer === 'white' ? 'White' : 'Black'} resigns`,
            duration: 5000,
            persistent: true
        })
    }
}

/**
 * Offer a draw
 */
const handleOfferDraw = () => {
    // TODO: Implement draw offer functionality
    addNotification({
        type: 'info',
        message: 'Draw offer sent',
        duration: 3000
    })
}

/**
 * UI Controls
 */
const openSettings = () => {
    showSettings.value = true
}

const closeSettings = () => {
    showSettings.value = false
}

const handleToggleBoardInfo = () => {
    showBoardInfo.value = !showBoardInfo.value
}

// ===== WATCHERS =====

// Fullscreen status
watch(isFullscreen, (newValue) => {
    document.body.classList.toggle('fullscreen', newValue)
})

// Game Mode
watch(() => props.gameMode, (newMode) => {
    gameStore.setGameMode(newMode)
}, { immediate: true })

// Auto-reverse setting
watch(() => configStore.shouldAutoReverse, (newValue) => {
    if (newValue) {
        performAutoReverse() // Apply immediately when activated
    }
})

// ===== LIFECYCLE =====

onMounted(async () => {
    // Initialize game
    await gameStore.initializeGame({
        mode: props.gameMode,
        playerColor: props.playerColor,
        timeControl: props.timeControl,
        initialPosition: props.initialPosition
    })

    gameStartTime.value = new Date()

    // Set up event listeners
    timerStore.on('expired', handleTimerExpired)
    setupKeyboardShortcuts()

    // Fullscreen listener
    document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement
    })

    // Preload assets
    try {
        await pieceStore.preloadPieceImages()
        await preloadAllSounds()
    } catch (error) {
        console.warn('Failed to preload assets:', error)
    }
})

onUnmounted(() => {
    cleanupKeyboardShortcuts()
    document.body.classList.remove('fullscreen')
    timerStore.off('expired', handleTimerExpired)
})
</script>

<template>
    <div class="chess-page">
        <div class="chess-background">
            <div class="chess-pattern"></div>
        </div>

        <Head title="J-Chess" />

        <div :class="layoutClasses">
            <!-- Header -->
            <GameHeader
                game-title="Schach"
                :show-settings="true"
                :show-sidebar-toggle="true"
                :show-board-info="showBoardInfo"
                :game-state="gameState"
                @flip-board="handleFlipBoard"
                @game-mode-changed="handleGameModeChanged"
                @toggle-sidebar="toggleSidebar"
                @toggle-board-info="handleToggleBoardInfo"
                @open-settings="openSettings"
                @new-game="handleNewGameFromHeader"
                @export-game="handleExportGame"
                @resign="handleResignGame"
                @offer-draw="handleOfferDraw"
                @undo-move="handleUndoMove"
                @redo-move="handleRedoMove"
            />

            <!-- Notifications -->
            <div class="notifications-container">
                <TransitionGroup name="notification" tag="div">
                    <div
                        v-for="notification in activeNotifications"
                        :key="notification.id"
                        class="notification"
                        :class="`notification--${notification.type}`"
                        @click="dismissNotification(notification.id)"
                    >
                        <div class="notification-content">
                            <span class="notification-message">{{ notification.message }}</span>
                            <button class="notification-close">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </TransitionGroup>
            </div>

            <!-- Main Content -->
            <main class="game-main">
                <!-- Board Area -->
                <div class="board-area">
                    <!-- Top Captured Pieces -->
                    <div class="board-top-row">
                        <div class="left-element">
                            <CapturedPieces
                            :captured-pieces="topCapturedPieces.pieces"
                            :player-color="topPlayerColor"
                            :material-advantage="topCapturedPieces.advantage"
                            size="medium"
                            layout="horizontal"
                            />
                        </div>

                        <div class="middle-element">
                            <PlayerCard
                                :game-state="gameState"
                                :player="topPlayerInfo"
                            />
                        </div>

                        <div class="right-element">
                            <ChessTimer
                                :player="bottomPlayerColor"
                                :active="gameState.currentPlayer === topPlayerColor"
                                :game-active="gameState.isGameActive"
                                @timer-expired="handleTimerExpired"
                            />
                        </div>
                    </div>

                    <AnnotatedChessBoard
                        ref="chessBoardRef"
                        :game-mode="props.gameMode"
                        :orientation="boardOrientation"
                        :show-coordinates="showCoordinates"
                        :show-legal-moves="true"
                        :highlight-last-move="true"
                        :interactive="gameState.isGameActive"
                        @square-click="handleSquareClick"
                        @piece-click="handlePieceClick"
                        @move="handleMove"
                        @game-state-change="handleGameStateChange"
                        @check="handleCheck"
                        @checkmate="handleCheckmate"
                        @stalemate="handleStalemate"
                    />

                <!-- Bottom Captured Pieces -->
                    <div class="board-bottom-row">
                        <div class="left-element">
                    <CapturedPieces
                        :captured-pieces="bottomCapturedPieces.pieces"
                        :player-color="bottomPlayerColor"
                        :material-advantage="bottomCapturedPieces.advantage"
                        size="medium"
                        layout="horizontal"
                    />
                        </div>

                        <div class="middle-element">
                            <PlayerCard
                                :game-state="gameState"
                                :player="bottomPlayerInfo"
                            />
                        </div>

                        <div class="right-element">
                            <ChessTimer
                                :player="topPlayerColor"
                                :active="gameState.currentPlayer === bottomPlayerColor"
                                :game-active="gameState.isGameActive"
                                @timer-expired="handleTimerExpired"
                            />
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <GameSidebar
                    :collapsed="sidebarCollapsed"
                    :move-history="gameStore.moveHistory"
                    :current-move-index="gameStore.currentMoveIndex"
                    @goto-move="gameStore.gotoMove"
                />
            </main>
        </div>

        <!-- Modals -->
        <BoardSettings
            v-if="showSettings"
            @close="closeSettings"
        />

        <PromotionModal
            v-if="showPromotionModal"
            :player-color="promotionData.playerColor"
            :from-square="promotionData.fromSquare"
            :to-square="promotionData.toSquare"
            @promote="handlePromotionConfirm"
            @cancel="handlePromotionCancel"
        />
    </div>
</template>

<style scoped>
.game-layout {
    display: grid;
    grid-template-areas:
        "header header"
        "main sidebar";
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr 300px;
    min-height: 100vh;
}

.game-layout--fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
}

/* Header */
.game-header {
    grid-area: header;
}

/* Fullscreen Mode */
.game-layout--fullscreen {
    grid-template-areas:
        "main main";
    grid-template-columns: 1fr;
}

.game-layout--fullscreen .game-header,
.game-layout--fullscreen .game-sidebar {
    display: none;
}

/* Collapsed Sidebar */
.game-layout--sidebar-collapsed {
    grid-template-columns: 1fr 50px;
}

.game-sidebar--collapsed {
    width: 50px;
    padding: 0.5rem;
}

.game-sidebar--collapsed > * {
    display: none;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.game-title {
    font-size: 2rem;
    font-weight: bold;
    color: #2d3748;
    margin: 0;
}

.game-status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #cbd5e0;
    transition: all 200ms ease;
}

.status-dot--active {
    background: #48bb78;
    animation: pulse 2s infinite;
}

.status-dot--check {
    background: #f56565;
    animation: check-flash 1s infinite;
}

.status-dot--finished {
    background: #a0aec0;
}

.status-text {
    font-weight: 500;
    color: #4a5568;
}

.header-right {
    display: flex;
    align-items: center;
}

.quick-actions {
    display: flex;
    gap: 0.5rem;
}

.action-btn {
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #4a5568;
    cursor: pointer;
    transition: all 200ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-1px);
}

.action-btn--active {
    background: #4299e1;
    color: white;
    border-color: #3182ce;
}

/* Notifications */
.notifications-container {
    position: fixed;
    top: 80px;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
    pointer-events: none;
}

.notification {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    cursor: pointer;
    transition: all 300ms ease;
    pointer-events: auto;
}

.notification:hover {
    transform: translateX(-4px);
}

.notification--success {
    border-left: 4px solid #48bb78;
}

.notification--error {
    border-left: 4px solid #f56565;
}

.notification--warning {
    border-left: 4px solid #ed8936;
}

.notification--info {
    border-left: 4px solid #4299e1;
}

.notification--move {
    border-left: 4px solid #9f7aea;
}

.notification-content {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-message {
    font-weight: 500;
    color: #2d3748;
}

.notification-close {
    background: none;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 200ms ease;
}

.notification-close:hover {
    color: #4a5568;
}

/* Main Content */
.game-main {
    grid-area: main;
    display: flex;
    padding: 1rem;
    min-height: 0;
    align-items: flex-start;
    z-index: 10;
}

.board-area {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.board-top-row,
.board-bottom-row {
    display: grid;
    grid: auto-flow / repeat(3, 1fr);
    justify-content: space-between;
    width: 100%;
}

.left-element {
    display: flex;
}

.middle-element {
    display: flex;
    justify-content: center;
}

.right-element {
    display: flex;
}

.captured-pieces-top,
.captured-pieces-bottom {
    width: 100%;
    max-width: 600px; /* Limited to board width */
}

.board-container {
    flex-shrink: 0;
}

.game-sidebar {
    width: 350px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    transition: all 300ms ease;
    padding-top: 0;
}

.sidebar--collapsed {
    width: 0;
    overflow: hidden;
    opacity: 0;
}

.sidebar-section {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.sidebar-section--expandable {
    flex: 1;
    min-height: 300px;
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #2d3748;
    margin: 0 0 1rem 0;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.info-label {
    color: #718096;
    font-weight: 500;
}

.info-value {
    color: #2d3748;
    font-weight: 600;
}

/* Animations */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes check-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
    transition: all 300ms ease;
}

.notification-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.notification-leave-to {
    opacity: 0;
    transform: translateX(100%);
}

/* Responsive */
@media (max-width: 1300px) {
    .game-layout {
        grid-template-areas:
            "header header"
            "main main"
            "sidebar sidebar";
        grid-template-rows: auto 1fr auto;
        grid-template-columns: 1fr;
    }

    .game-main {
        flex-direction: column;
        align-items: flex-start;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
    }

    .game-sidebar {
        width: 100%;
        max-width: 600px;
        margin: 1rem 0 0 0;
        border-left: none;
        align-self: flex-start;
    }

    .board-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    }
}

@media (max-width: 1024px) {
    .game-main {
        flex-direction: column;
        align-items: center;
        padding: 1rem;
    }

    .board-area {
        max-width: 550px;
    }

    .game-sidebar {
        width: 100%;
        max-width: 550px;
    }

    .notifications-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
    }
}

@media (max-width: 768px) {
    .game-layout {
        grid-template-areas:
            "header"
            "main"
            "sidebar";
        grid-template-rows: auto 1fr auto;
        grid-template-columns: 1fr;
        margin: 0;
    }

    .game-main {
        padding: 0.5rem;
    }

    .board-area {
        max-width: 480px;
        padding: 0;
    }

    .left-element,
    .right-element {
        flex: 1;
        display: flex;
        justify-content: center;
    }

    .middle-element {
        width: 120px;
        min-width: 120px;
        justify-content: center;
    }

    .game-sidebar {
        border-left: none;
        max-height: none; /* Allow sidebar to expand to full viewport height */
    }
}

@media (max-width: 480px) {
    .game-main {
        padding: 0.25rem;
    }

    .board-area {
        width: 100%;
        max-width: 360px;
    }

    .board-top-row {
        display: flex;
        flex-direction: column;
    }

    .board-top-row .middle-element {
        order: -1;
        width: 100%;
        min-width: 100%;
        margin-bottom: 0.5rem;
    }

    .board-top-row .left-element,
    .board-top-row .right-element {
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .board-bottom-row {
        display: flex;
        flex-direction: column;
    }

    .board-bottom-row .middle-element {
        order: 1;
        width: 100%;
        min-width: 100%;
        margin-top: 0.5rem;
    }

    .board-bottom-row .left-element,
    .board-bottom-row .right-element {
        width: 50%;
        display: flex;
        justify-content: center;
    }

    .annotated-chess-board-container,
    .chess-board-container {
        width: 100% !important;
        max-width: 100% !important;
    }

    .game-sidebar {
        margin-top: 5rem;
    }
}

/* Print Styles */
@media print {
    .game-header,
    .game-sidebar,
    .notifications-container {
        display: none;
    }

    .game-main {
        padding: 0;
    }

    .board-area {
        width: 100%;
        height: 100vh;
    }
}

/* Fullscreen Styles */
:global(body.fullscreen) {
    overflow: hidden;
}

.game-layout--fullscreen .game-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1001;
    opacity: 0.9;
    transition: opacity 300ms ease;
}

.game-layout--fullscreen .game-header:hover {
    opacity: 1;
}

.game-layout--fullscreen .game-main {
    padding-top: 6rem;
    height: 100vh;
    box-sizing: border-box;
}

.fen-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.2;
}

.fen-segment {
    background: rgba(0, 0, 0, 0.05);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    word-break: break-all;
    max-width: 100%;
}
</style>
