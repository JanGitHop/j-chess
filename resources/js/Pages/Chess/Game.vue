<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import ChessBoard from '@/Components/ChessBoard.vue'
import BoardSettings from '@/Components/BoardSettings.vue'
import GameSidebar from "@/Components/GameSidebar.vue";
import MoveHistory from '@/Components/MoveHistory.vue'
import GameControls from '@/Components/GameControls.vue'
import GameInfo from '@/Components/GameInfo.vue'
import CapturedPieces from '@/Components/CapturedPieces.vue'
import PromotionModal from '@/Components/PromotionModal.vue'
import BoardInfo from "@/Components/BoardInfo.vue";
import { useBoardStore } from '@/Stores/boardStore'
import { useChessTimerStore } from "@/Stores/chessTimerStore.js";
import { useGameStore } from '@/Stores/gameStore'
import { useGameConfigStore } from '@/Stores/gameConfigStore.js'
import { usePieceStore } from '@/Stores/pieceStore'
import { useSounds } from "@/Composables/useSounds.js";
import {
    GAME_STATUS,
    FIFTY_MOVE_RULE,
    GAME_MODES,
    GAME_STATUS as GAME_STATUSES,
    PLAYER_COLORS
} from '@/Utils/chessConstants.js'
import GameHeader from '@/Components/GameHeader.vue'
import ChessTimer from "@/Components/ChessTimer.vue";
import PlayerCard from "@/Components/PlayerCard.vue";
// import { useGameEngineStore } from '@/Stores/gameEngineStore'

// Props (falls über Inertia.js übergeben)
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
        default: null // FEN-String für Custom-Position
    }
})

// Stores
const boardStore = useBoardStore()
const gameStore = useGameStore()
const pieceStore = usePieceStore()
const configStore = useGameConfigStore()
const timerStore = useChessTimerStore()
// const engineStore = useGameEngineStore()

// UI State
const showSettings = ref(false)
const showMoveHistory = ref(true)
const showBoardInfo = ref(false)
const showPlayerInfo = ref(true)
const showGameControls = ref(true)
const isFullscreen = ref(false)
const sidebarCollapsed = ref(false)

const showPromotionModal = ref(false)
const promotionData = ref({
    fromSquare: null,
    toSquare: null,
    playerColor: null
})

const chessBoardRef = ref(null)
const currentBoardSize = computed(() => {
    return chessBoardRef.value?.boardSize || 480
})

// Game State
const gameStartTime = ref(null)
const lastMoveTime = ref(null)
const notifications = ref([])
const soundEnabled = ref(true)

const {
    isSoundEnabled,
    currentVolume,
    preloadAllSounds,
    playMoveSound,
    playGameSound,
    playUISound,
    toggleSound,
    setVolume,
    testSound
} = useSounds()

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

/**
 * Board orientation based on config
 */
const boardOrientation = computed(() => {
    return configStore.boardOrientation
})

const showCoordinates = computed(() => {
    return configStore.showCoordinates
})

const currentMoveIndex = computed(() => {
    return gameStore.currentMoveIndex ?? -1
})

// Material-Vorteil berechnen
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

const topCapturedPieces = computed(() => {
    return boardOrientation.value === 'white'
        ? capturedPiecesData.value.black  // Weiß oben wenn Board normal
        : capturedPiecesData.value.white  // Schwarz oben wenn Board gedreht
})

const bottomCapturedPieces = computed(() => {
    return boardOrientation.value === 'white'
        ? capturedPiecesData.value.white  // Schwarz unten wenn Board normal
        : capturedPiecesData.value.black  // Weiß unten wenn Board gedreht
})

const whitePlayerData = computed(() => ({
    name: gameStore.whitePlayer || 'Weiß',
    color: 'white',
    rating: 1200, // optional
    avatar: null, // optional
    isActive: gameState.value.currentPlayer === 'white'
}))

const blackPlayerData = computed(() => ({
    name: gameStore.blackPlayer || 'Schwarz',
    color: 'black',
    rating: 1200, // optional
    avatar: null, // optional
    isActive: gameState.value.currentPlayer === 'black'
}))

const topPlayerInfo = computed(() => {
    return boardOrientation.value === 'white' ? blackPlayerData.value : whitePlayerData.value
})

const bottomPlayerInfo = computed(() => {
    return boardOrientation.value === 'white' ? whitePlayerData.value : blackPlayerData.value
})


const topPlayerColor = computed(() => {
    return boardOrientation.value === 'white' ? 'white' : 'black'
})

const bottomPlayerColor = computed(() => {
    return boardOrientation.value === 'white' ? 'black' : 'white'
})

/**
 * for responsive Design
 */
const layoutClasses = computed(() => ({
    'game-layout': true,
    'game-layout--fullscreen': isFullscreen.value,
    'game-layout--sidebar-collapsed': sidebarCollapsed.value,
    'game-layout--mobile': window.innerWidth < 768
}))

const activeNotifications = computed(() =>
    notifications.value.filter(n => !n.dismissed)
)

// ===== EVENT HANDLERS =====

/**
 * Board Events - Square Click
 */
const handleSquareClick = (squareData) => {
    console.log('Square clicked:', squareData)

    if (squareData.needsPromotion) {
        showPromotionDialog(squareData)
        return
    }

    if (squareData.success && gameState.value.lastMove) {
        addNotification({
            type: 'move',
            message: `Zug: ${gameState.value.lastMove.san}`,
            duration: 2000
        })
    }

    if (soundEnabled.value && squareData.success) {
        playMoveSound(squareData)
    }
}

/**
 * MANUELLES BRETT DREHEN - mit korrekter Weiterleitung
 */
const handleFlipBoard = (newOrientation) => {
    console.log('🔄 Brett manuell gedreht zu:', newOrientation)
}

/**
 * AUTO-REVERSE nach jedem Zug
 */
const performAutoReverse = () => {
    if (!configStore.shouldAutoReverse) return

    if (gameStore.currentPlayer !== configStore.boardOrientation) {
        const newOrientation = configStore.flipBoard()
    }
}

/**
 * Board Events - Piece Click
 */
const handlePieceClick = (pieceData) => {
    console.log('Piece clicked:', pieceData)
}

const showPromotionDialog = (moveData) => {
    console.log('show promotion dialog?')
    promotionData.value = {
        fromSquare: moveData.from,
        toSquare: moveData.to,
        playerColor: gameStore.currentPlayer
    }
    showPromotionModal.value = true
}

const handlePromotionConfirm = (promotionChoice) => {
    const { from, to, promotionPiece } = promotionChoice

    console.log('🔄 Promotion bestätigt:', { from, to, promotionPiece })

    const moveResult = gameStore.attemptMove(from, to, {
        promotion: promotionPiece
    })

    if (moveResult.success) {
        addNotification({
            type: 'success',
            message: `Bauernumwandlung: ${promotionPiece === promotionPiece.toUpperCase() ? 'Weiß' : 'Schwarz'} → ${pieceStore.getPieceName(promotionPiece)}`,
            duration: 3000
        })

        if (soundEnabled.value) {
            playGameSound('promotion')
        }

        handleMoveCompleted(moveResult)
    } else {
        addNotification({
            type: 'error',
            message: 'Ungültiger Promotion-Zug',
            duration: 2000
        })
    }

    hidePromotionDialog()
}

const handlePromotionCancel = () => {
    console.log('🚫 Promotion abgebrochen')

    addNotification({
        type: 'info',
        message: 'Bauernumwandlung abgebrochen',
        duration: 2000
    })

    hidePromotionDialog()
}

const hidePromotionDialog = () => {
    showPromotionModal.value = false
    promotionData.value = {
        fromSquare: null,
        toSquare: null,
        playerColor: null
    }

    gameStore.clearSelection()
}

const handleGameModeChanged = (newMode) => {
    console.log('🎮 Spielmodus geändert zu:', newMode)

    // Game Store updaten
    gameStore.setGameMode(newMode)

    addNotification({
        type: 'success',
        message: `Spielmodus geändert zu: ${configStore.gameModeSettings.name}`,
        duration: 2000
    })
}
const handleNewGameFromHeader = () => {
    console.log('🆕 Neues Spiel aus Header gestartet')
    handleNewGame()
}

/**
 * Board Info Toggle
 */
const toggleBoardInfo = () => {
    showBoardInfo.value = !showBoardInfo.value
    console.log('📊 Board-Info umgeschaltet:', showBoardInfo.value)

    addNotification({
        type: 'info',
        message: `Board-Info ${showBoardInfo.value ? 'angezeigt' : 'ausgeblendet'}`,
        duration: 2000
    })
}

/**
 * SPIEL EXPORTIEREN
 */
const handleExportGame = () => {
    console.log('💾 Spiel wird exportiert')

    try {
        // PGN Export Logic hier
        const pgn = gameStore.toPGN()

        // Download auslösen
        const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `schach-spiel-${new Date().toISOString().split('T')[0]}.pgn`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        addNotification({
            type: 'success',
            message: 'Spiel erfolgreich exportiert',
            duration: 3000
        })
    } catch (error) {
        console.error('Export-Fehler:', error)
        addNotification({
            type: 'error',
            message: 'Fehler beim Exportieren des Spiels',
            duration: 3000
        })
    }
}

/**
 * Move Handler mit Auto-Reverse Integration
 */
const handleMoveCompleted = (moveData) => {
    lastMoveTime.value = new Date()

    const lastMoveRecord = gameStore.lastMove

    const enhancedMoveData = {
        ...moveData,
        isCapture: lastMoveRecord?.moveType === 'capture' ||
            lastMoveRecord?.moveType === 'enpassant' ||
            moveData.capture ||
            (lastMoveRecord?.capturedPiece && true),
        isCastling: lastMoveRecord?.moveType === 'castle',
        isPromotion: lastMoveRecord?.moveType === 'promotion',
        isCheck: gameStore.isInCheck,
        isCheckmate: gameStore.gameStatus === GAME_STATUSES.CHECKMATE,
        moveType: lastMoveRecord?.moveType
    }

    playMoveSound(enhancedMoveData)

    // AUTO-REVERSE nach erfolgreichem Zug
    if (gameStore.isGameActive) {
        performAutoReverse()
    }

    // Engine-Antwort auslösen (falls KI-Spiel)
    if (props.gameMode === GAME_MODES.VS_AI && shouldTriggerEngineMove()) {
        setTimeout(() => {
            // engineStore.makeMove()
        }, 500)
    }
}

/**
 * Board Events - Move
 */
const handleMove = (moveData) => {
    console.log('Move made:', moveData)

    if (moveData.needsPromotion) {
        showPromotionDialog(moveData)
        return
    }

    handleMoveCompleted(moveData)
}

/**
 * Game State Events
 */
const handleGameStateChange = (stateData) => {
    console.log('Game state changed:', stateData)

    // Benachrichtigung für Spielzustand-Änderungen
    if (stateData.newStatus !== stateData.oldStatus) {
        handleGameStatusNotification(stateData.newStatus)
    }
}

const handleCheck = (checkData) => {
    console.log('Check!', checkData)
    addNotification({
        type: 'warning',
        message: `Schach! ${checkData.player === 'white' ? 'Weiß' : 'Schwarz'} steht im Schach`,
        duration: 3000
    })

    if (soundEnabled.value) {
        playGameSound('check')
    }
}

const handleCheckmate = (checkmateData) => {
    console.log('Checkmate!', checkmateData)
    addNotification({
        type: 'success',
        message: `Schachmatt! ${checkmateData.winner === 'white' ? 'Weiß' : 'Schwarz'} gewinnt`,
        duration: 5000,
        persistent: true
    })

    if (soundEnabled.value) {
        playGameSound('checkmate')
    }
}

const handleStalemate = (stalemateData) => {
    console.log('Stalemate!', stalemateData)
    addNotification({
        type: 'info',
        message: 'Patt! Das Spiel endet unentschieden',
        duration: 5000,
        persistent: true
    })

    if (soundEnabled.value) {
        playGameSound('stalemate')
    }
}

/**
 * Game Controls Events
 */
const handleNewGame = async (gameData) => {
    try {
        await gameStore.initializeGameWithTimer(gameData)
        console.log('Spiel mit Timer gestartet')
    } catch (error) {
        console.error('Fehler beim Spielstart:', error)
    }
}

// Timer-Event-Handler
const handleTimerExpired = (data) => {
    gameStore.handleTimerExpired(data)
}

const handleUndoMove = () => {}

const handleRedoMove = () => {}

const handleResignGame = () => {
    if (confirm('Möchten Sie wirklich aufgeben?')) {
        gameStore.resignGame()
        addNotification({
            type: 'warning',
            message: `${gameState.value.currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} gibt auf`,
            duration: 5000,
            persistent: true
        })
    }
}

const handleOfferDraw = () => {
    // TODO: Implementierung für Draw-Angebot
    addNotification({
        type: 'info',
        message: 'Remis-Angebot gesendet',
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

const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleToggleBoardInfo = () => {
    showBoardInfo.value = !showBoardInfo.value
}

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
        isFullscreen.value = true
    } else {
        document.exitFullscreen()
        isFullscreen.value = false
    }
}

// ===== HELPER FUNCTIONS =====

/**
 * Prüft ob Engine-Zug ausgelöst werden soll
 */
const shouldTriggerEngineMove = () => {
    // Nur bei Standard-Spiel gegen KI
    return props.gameMode === 'standard' &&
        props.playerColor !== 'both' &&
        gameState.value.currentPlayer !== props.playerColor &&
        gameState.value.isGameActive
}

/**
 * Benachrichtigung hinzufügen
 */
const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    notifications.value.push({
        id,
        dismissed: false,
        timestamp: new Date(),
        ...notification
    })

    // Auto-dismiss nach Duration
    if (notification.duration && !notification.persistent) {
        setTimeout(() => {
            dismissNotification(id)
        }, notification.duration)
    }
}

/**
 * Benachrichtigung schließen
 */
const dismissNotification = (id) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
        notification.dismissed = true
    }
}

/**
 * Alle Benachrichtigungen löschen
 */
const clearNotifications = () => {
    notifications.value = []
}

/**
 * Spielzustand-Benachrichtigungen
 */
const handleGameStatusNotification = (status) => {
    const messages = {
        'CHECK': { type: 'warning', message: 'Schach!' },
        'CHECKMATE': { type: 'error', message: 'Schachmatt!' },
        'STALEMATE': { type: 'info', message: 'Patt - Unentschieden!' },
        'DRAW_FIFTY_MOVE': { type: 'info', message: '50-Züge-Regel - Unentschieden!' },
        'DRAW_REPETITION': { type: 'info', message: 'Stellungswiederholung - Unentschieden!' },
        'DRAW_AGREEMENT': { type: 'info', message: 'Remis vereinbart!' },
        'DRAW_INSUFFICIENT': { type: 'info', message: 'Ungenügend Material - Unentschieden!' },
        'WAITING': { type: 'info', message: 'Warten auf Spieler...' }
    }

    const notification = messages[status]
    if (notification) {
        addNotification({
            ...notification,
            duration: isDrawStatus(status) || status === 'STALEMATE' ? 5000 : 3000,
            persistent: ['CHECKMATE', 'STALEMATE'].includes(status) || isDrawStatus(status)
        })
    }
}

/**
 * Keyboard-Shortcuts
 */
const handleKeydown = (event) => {
    // Esc: close promotion modal
    if (event.key === 'Escape' && showPromotionModal.value) {
        handlePromotionCancel()
        return
    }

    // Ctrl/Cmd + Z: Zug rückgängig
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        handleUndoMove()
    }

    // Ctrl/Cmd + Shift + Z oder Ctrl/Cmd + Y: Zug wiederholen
    if ((event.ctrlKey || event.metaKey) &&
        ((event.key === 'z' && event.shiftKey) || event.key === 'y')) {
        event.preventDefault()
        handleRedoMove()
    }

    // Escape: Auswahl abbrechen
    if (event.key === 'Escape') {
        gameStore.clearSelection()
    }

    // F11: Fullscreen Toggle
    if (event.key === 'F11') {
        event.preventDefault()
        toggleFullscreen()
    }

    // Space: Sidebar Toggle
    if (event.key === ' ' && event.target === document.body) {
        event.preventDefault()
        toggleSidebar()
    }
}

// ===== WATCHERS =====

// Fullscreen-Status
watch(isFullscreen, (newValue) => {
    document.body.classList.toggle('fullscreen', newValue)
})

// Game Mode
watch(() => props.gameMode, (newMode) => {
    gameStore.setGameMode(newMode)
}, { immediate: true })

/**
 * 50-Züge-Regel
 */
watch(() => gameStore.halfmoveClock, (newHalfmoves, oldHalfmoves) => {
    // WARNING approaching 50-moves rule
    if (gameStore.shouldWarnFiftyMoveRule() && newHalfmoves >= FIFTY_MOVE_RULE.WARNING_THRESHOLD) {
        const movesLeft = gameStore.getMovesUntilFiftyMoveRule()

        addNotification({
            type: movesLeft <= 5 ? 'error' : 'warning',
            message: `⚠️ 50-Züge-Regel: Nur noch ${movesLeft} Züge bis Remis!`,
            duration: movesLeft <= 5 ? 5000 : 3000,
            persistent: movesLeft <= 2
        })

        if (soundEnabled.value) {
            playUISound('warning')
        }
    }
})

watch(() => configStore.shouldAutoReverse, (newValue) => {
    if (newValue) {
        performAutoReverse() // Sofort beim Aktivieren
    }
})

// ===== LIFECYCLE =====

onMounted(async () => {
    // Spiel initialisieren
    await gameStore.initializeGame({
        mode: props.gameMode,
        playerColor: props.playerColor,
        timeControl: props.timeControl,
        initialPosition: props.initialPosition
    })

    gameStartTime.value = new Date()

    timerStore.on('expired', handleTimerExpired)

    // Event-Listener
    document.addEventListener('keydown', handleKeydown)

    // Fullscreen-Listener
    document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement
    })

    try {
        await pieceStore.preloadPieceImages()
    } catch (error) {
        console.warn('Preloading der Figuren-Bilder fehlgeschlagen:', error)
    }

    try {
        preloadAllSounds()
    } catch (error) {
        console.warn('🔇 Sound-System Initialisierung fehlgeschlagen:', error)
    }

    // Willkommens-Benachrichtigung
    addNotification({
        type: 'success',
        message: 'Willkommen bei J-Chess!',
        duration: 3000
    })
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
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
                @flip-board="handleFlipBoard"
                @game-mode-changed="handleGameModeChanged"
                @toggle-sidebar="toggleSidebar"
                @toggle-board-info="handleToggleBoardInfo"
                @open-settings="openSettings"
                @new-game="handleNewGameFromHeader"
                @export-game="handleExportGame"
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

                    <ChessBoard
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
                    :game-state="gameState"
                    :time-control="props.timeControl"
                    :player-color="props.playerColor"
                    :game-mode="props.gameMode"
                    :move-history="gameStore.moveHistory"
                    :current-move-index="gameStore.currentMoveIndex"
                    :show-player-info="showPlayerInfo"
                    :show-game-controls="showGameControls"
                    :show-move-history="showMoveHistory"
                    :show-board-info="showBoardInfo"
                    @new-game="handleNewGame"
                    @undo-move="handleUndoMove"
                    @redo-move="handleRedoMove"
                    @resign="handleResignGame"
                    @offer-draw="handleOfferDraw"
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
    top: 100px;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
}

.notification {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    cursor: pointer;
    transition: all 300ms ease;
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

.right-element {
    display: flex;
}

.captured-pieces-top,
.captured-pieces-bottom {
    width: 100%;
    max-width: 600px; /* Begrenzt auf Board-Breite */
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
    margin-left: 1rem;
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

/* Benachrichtigungen unter Header */
.notifications-container {
    position: fixed;
    top: 80px;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
}

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
@media (max-width: 1024px) {
    .game-main {
        flex-direction: column;
        align-items: center;
    }

    .game-sidebar {
        width: 100%;
        max-width: 600px;
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
    }

    .game-sidebar {
        border-left: none;
        border-top: 1px solid #e2e8f0;
        max-height: 200px;
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
