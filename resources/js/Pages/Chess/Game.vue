<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import ChessBoard from '@/Components/ChessBoard.vue'
import BoardSettings from '@/Components/BoardSettings.vue'
import MoveHistory from '@/Components/MoveHistory.vue'
import GameControls from '@/Components/GameControls.vue'
import PlayerInfo from '@/Components/PlayerInfo.vue'
import { useBoardStore } from '@/Stores/boardStore'
import { useGameStore } from '@/Stores/gameStore'
import { usePieceStore } from '@/Stores/pieceStore'
import { useSounds } from "../../Composables/useSounds.js";
// import { useGameEngineStore } from '@/Stores/gameEngineStore'

// Props (falls über Inertia.js übergeben)
const props = defineProps({
    gameId: {
        type: String,
        default: null
    },
    gameMode: {
        type: String,
        default: 'standard' // 'standard', 'analysis', 'puzzle'
    },
    playerColor: {
        type: String,
        default: 'white' // 'white', 'black', 'both'
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
// const engineStore = useGameEngineStore()

// UI State
const showSettings = ref(false)
const showMoveHistory = ref(true)
const showPlayerInfo = ref(true)
const showGameControls = ref(true)
const isFullscreen = ref(false)
const sidebarCollapsed = ref(false)

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

/**
 * Aktueller Spielzustand für UI
 */
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
 * Board-Orientierung basierend auf Spieler-Farbe
 */
const boardOrientation = computed(() => {
    if (props.playerColor === 'both') return 'white'
    return props.playerColor
})

/**
 * Layout-Klassen für responsive Design
 */
const layoutClasses = computed(() => ({
    'game-layout': true,
    'game-layout--fullscreen': isFullscreen.value,
    'game-layout--sidebar-collapsed': sidebarCollapsed.value,
    'game-layout--mobile': window.innerWidth < 768
}))

/**
 * Aktuelle Benachrichtigungen
 */
const activeNotifications = computed(() =>
    notifications.value.filter(n => !n.dismissed)
)

// ===== EVENT HANDLERS =====

/**
 * Board Events - Square Click
 */
const handleSquareClick = (squareData) => {
    console.log('Square clicked:', squareData)

    // Benachrichtigung bei erfolgreichem Zug
    if (squareData.success && gameState.value.lastMove) {
        addNotification({
            type: 'move',
            message: `Zug: ${gameState.value.lastMove.san}`,
            duration: 2000
        })
    }

    // Sound abspielen
    if (soundEnabled.value && squareData.success) {
        playMoveSound(squareData)
    }
}

/**
 * Board Events - Piece Click
 */
const handlePieceClick = (pieceData) => {
    console.log('Piece clicked:', pieceData)
}

/**
 * Board Events - Move
 */
const handleMove = (moveData) => {
    console.log('Move made:', moveData)
    console.log('FEN:', gameStore.currentFen)
    lastMoveTime.value = new Date()

    // ⭐ MOVE-DETAILS AUS GAMESTORE HOLEN
    const lastMoveRecord = gameStore.lastMove

    gameStore.checkForCheck(gameState)
    gameStore.checkForCheckmate(gameState)
    gameStore.checkForStalemate(gameState)

    const enhancedMoveData = {
        ...moveData,
        // ✅ KORREKTE CAPTURE-ERKENNUNG: Nur aktueller Zug, nicht alle geschlagenen Figuren
        isCapture: lastMoveRecord?.moveType === 'capture' ||
            lastMoveRecord?.moveType === 'enpassant' ||
            moveData.capture || // Fallback für direkte moveData
            (lastMoveRecord?.capturedPiece && true),
        isCastling: lastMoveRecord?.moveType === 'castle',
        isPromotion: lastMoveRecord?.moveType === 'promotion',
        isCheck: gameStore.isInCheck,
        isCheckmate: gameStore.gameStatus === 'CHECKMATE',
        moveType: lastMoveRecord?.moveType
    }

    console.log('🔍 Enhanced Move Data:', enhancedMoveData)

    // Sound abspielen mit erweiterten Daten
    playMoveSound(enhancedMoveData)

    // Engine-Antwort auslösen (falls KI-Spiel)
    if (props.gameMode === 'standard' && shouldTriggerEngineMove()) {
        setTimeout(() => {
            // engineStore.makeMove()
        }, 500)
    }
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
const handleNewGame = () => {
    if (confirm('Möchten Sie wirklich ein neues Spiel starten?')) {
        gameStore.resetGame()
        gameStartTime.value = new Date()
        clearNotifications()

        addNotification({
            type: 'success',
            message: 'Neues Spiel gestartet',
            duration: 2000
        })
    }
}

const handleUndoMove = () => {
    const success = gameStore.undoLastMove()
    if (success) {
        addNotification({
            type: 'info',
            message: 'Zug rückgängig gemacht',
            duration: 2000
        })

        if (soundEnabled.value) {
            playGameSound('undo')
        }
    }
}

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
        'STALEMATE': { type: 'info', message: 'Patt!' },
        'DRAW': { type: 'info', message: 'Unentschieden!' },
        'WAITING': { type: 'info', message: 'Warten auf Spieler...' }
    }

    const notification = messages[status]
    if (notification) {
        addNotification({
            ...notification,
            duration: 3000
        })
    }
}

/**
 * Keyboard-Shortcuts
 */
const handleKeydown = (event) => {
    // Ctrl/Cmd + Z: Zug rückgängig
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        handleUndoMove()
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

// Fullscreen-Status überwachen
watch(isFullscreen, (newValue) => {
    document.body.classList.toggle('fullscreen', newValue)
})

// Game Mode Änderungen
watch(() => props.gameMode, (newMode) => {
    gameStore.setGameMode(newMode)
}, { immediate: true })

// ===== LIFECYCLE =====

onMounted(async () => {
    // Spiel initialisieren
    gameStore.initializeGame({
        mode: props.gameMode,
        playerColor: props.playerColor,
        timeControl: props.timeControl,
        initialPosition: props.initialPosition
    })

    gameStartTime.value = new Date()

    // Event-Listener
    document.addEventListener('keydown', handleKeydown)

    // Fullscreen-Listener
    document.addEventListener('fullscreenchange', () => {
        isFullscreen.value = !!document.fullscreenElement
    })

    try {
        await pieceStore.preloadPieceImages()
        console.log('Figuren-Bilder erfolgreich vorgeladen')
    } catch (error) {
        console.warn('Preloading der Figuren-Bilder fehlgeschlagen:', error)
    }

    try {
        preloadAllSounds()
        console.log('🎵 Sound-System erfolgreich initialisiert')
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
})
</script>

<template>
    <div>
        <Head title="J-Chess - Spiel" />

        <div :class="layoutClasses">
            <!-- Header -->
            <header class="game-header">
                <div class="header-content">
                    <div class="header-left">
                        <h1 class="game-title">J-Chess</h1>
                        <div class="game-status-indicator">
                            <span
                                class="status-dot"
                                :class="{
                                    'status-dot--active': gameState.isGameActive,
                                    'status-dot--check': gameState.isInCheck,
                                    'status-dot--finished': !gameState.isGameActive
                                }"
                            ></span>
                            <span class="status-text">
                                {{ gameState.isGameActive
                                ? `${gameState.currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} am Zug`
                                : 'Spiel beendet'
                                }}
                            </span>
                        </div>
                    </div>

                    <div class="header-right">
                        <!-- Quick Actions -->
                        <div class="quick-actions">
                            <button
                                @click="toggleSound"
                                class="action-btn"
                                :class="{ 'action-btn--active': soundEnabled }"
                                title="Sound an/aus"
                            >
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path v-if="soundEnabled" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.05 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.05l4.333-3.82zm2.91 2.32a1 1 0 011.414 1.414L12.414 8l1.293 1.293a1 1 0 01-1.414 1.414L11 9.414l-1.293 1.293a1 1 0 01-1.414-1.414L9.586 8 8.293 6.707a1 1 0 011.414-1.414L11 6.586l1.293-1.29z"/>
                                    <path v-else d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.05 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.05l4.333-3.82zM16.025 5.61a1 1 0 111.95.34 6.967 6.967 0 010 8.1 1 1 0 01-1.95-.34 4.967 4.967 0 000-7.76z"/>
                                </svg>
                            </button>

                            <button
                                @click="toggleFullscreen"
                                class="action-btn"
                                :class="{ 'action-btn--active': isFullscreen }"
                                title="Vollbild (F11)"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                                </svg>
                            </button>

                            <button
                                @click="toggleSidebar"
                                class="action-btn lg:hidden"
                                title="Sidebar umschalten"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                                </svg>
                            </button>

                            <button
                                @click="openSettings"
                                class="action-btn"
                                title="Einstellungen"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

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
                    <ChessBoard
                        :game-mode="props.gameMode"
                        :orientation="boardOrientation"
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
                </div>

                <!-- Sidebar -->
                <aside class="game-sidebar" :class="{ 'sidebar--collapsed': sidebarCollapsed }">
                    <!-- Player Info -->
                    <PlayerInfo
                        v-if="showPlayerInfo"
                        :game-state="gameState"
                        :time-control="props.timeControl"
                        :player-color="props.playerColor"
                        class="sidebar-section"
                    />

                    <!-- Game Controls -->
                    <GameControls
                        v-if="showGameControls"
                        :game-state="gameState"
                        :game-mode="props.gameMode"
                        @new-game="handleNewGame"
                        @undo-move="handleUndoMove"
                        @resign="handleResignGame"
                        @offer-draw="handleOfferDraw"
                        class="sidebar-section"
                    />

                    <!-- Move History -->
                    <MoveHistory
                        v-if="showMoveHistory"
                        :moves="gameStore.moveHistory"
                        :current-move="gameStore.currentMoveIndex"
                        @goto-move="gameStore.gotoMove"
                        class="sidebar-section sidebar-section--expandable"
                    />

                    <!-- Board Settings Compact -->
                    <div class="sidebar-section">
                        <h3 class="section-title">Board-Info</h3>
                        <div class="board-info">
                            <div class="info-item">
                                <span class="info-label">Theme:</span>
                                <span class="info-value">{{ boardStore.currentTheme.name }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Größe:</span>
                                <span class="info-value">{{ boardStore.currentBoardSize.name }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Koordinaten:</span>
                                <span class="info-value">{{ boardStore.settings.showCoordinates ? 'An' : 'Aus' }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">FEN:</span>
                                <div class="info-value fen-display">
                                    <div
                                        v-for="(segment, index) in gameStore.currentFEN.split('/')"
                                        :key="index"
                                        class="fen-segment"
                                    >
                                        {{ segment }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>

        <!-- Modals -->
        <BoardSettings
            v-if="showSettings"
            @close="closeSettings"
        />
    </div>
</template>

<style scoped>
.game-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #9f9f9f 0%, #444444 100%);
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
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
    flex: 1;
    display: flex;
    gap: 2rem;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

.board-area {
    flex-shrink: 0;
    display: flex;
}

.game-sidebar {
    width: 350px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    transition: all 300ms ease;
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

.board-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
    .game-main {
        padding: 1rem;
        gap: 1rem;
    }

    .game-title {
        font-size: 1.5rem;
    }

    .header-left {
        gap: 1rem;
    }

    .sidebar-section {
        padding: 1rem;
    }

    .game-sidebar.sidebar--collapsed {
        display: none;
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
