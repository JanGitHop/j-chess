<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { usePieceStore } from '@/Stores/pieceStore.js'
import { useGameStore } from '@/Stores/gameStore.js'
import { isDrawStatus } from '@/Utils/chessConstants.js'

const props = defineProps({
    gameState: {
        type: Object,
        required: true
    },
    timeControl: {
        type: Object,
        default: () => ({ type: 'unlimited' })
    },
    playerColor: {
        type: String,
        default: 'white',
        validator: value => ['white', 'black', 'both'].includes(value)
    },
    showCapturedPieces: {
        type: Boolean,
        default: true
    },
    showPlayerRatings: {
        type: Boolean,
        default: false
    },
    whitePlayer: {
        type: Object,
        default: () => ({ name: 'Weiß', rating: null, avatar: null })
    },
    blackPlayer: {
        type: Object,
        default: () => ({ name: 'Schwarz', rating: null, avatar: null })
    }
})

// stores
const pieceStore = usePieceStore()
const gameStore = useGameStore()

// Timer State
const whiteTime = ref(props.timeControl.initialTime || 0)
const blackTime = ref(props.timeControl.initialTime || 0)
const timerInterval = ref(null)
const lastUpdateTime = ref(null)

// ===== COMPUTED PROPERTIES =====

/**
 * Ist Timer aktiv?
 */
const isTimerActive = computed(() => {
    return props.timeControl.type !== 'unlimited' &&
        props.gameState.isGameActive &&
        !props.gameState.isPaused
})

/**
 * Wer ist am Zug?
 */
const currentPlayerTurn = computed(() => props.gameState.currentPlayer)

/**
 * Spieler-Daten formatiert
 */
const players = computed(() => ({
    white: {
        ...props.whitePlayer,
        isActive: currentPlayerTurn.value === 'white',
        time: whiteTime.value,
        capturedPieces: props.gameState.capturedPieces?.black || [],
        materialAdvantage: calculateMaterialAdvantage('white')
    },
    black: {
        ...props.blackPlayer,
        isActive: currentPlayerTurn.value === 'black',
        time: blackTime.value,
        capturedPieces: props.gameState.capturedPieces?.white || [],
        materialAdvantage: calculateMaterialAdvantage('black')
    }
}))

const fiftyMoveInfo = computed(() => {
    const halfmoves = gameStore.halfmoveClock
    const movesUntil50 = gameStore.getMovesUntilFiftyMoveRule()
    const shouldWarn = gameStore.shouldWarnFiftyMoveRule()

    return {
        halfmoves,
        movesUntil50,
        shouldWarn,
        isNear: movesUntil50 <= 10,
        isCritical: movesUntil50 <= 5
    }
})

const threefoldInfo = computed(() => {
    const warning = gameStore.shouldWarnThreefoldRepetition()
    const currentCount = gameStore.getCurrentPositionRepetitionCount()

    return {
        warning,
        currentCount,
        shouldShow: warning !== null || currentCount >= 2,
        repetitionsLeft: warning ? warning.repetitionsUntilDraw : (3 - currentCount),
        isWarning: currentCount === 2,
        isCritical: currentCount >= 3,
        isNear: currentCount >= 2
    }
})

/**
 * Zeit formatiert anzeigen
 */
const formatTime = (timeInSeconds) => {
    if (timeInSeconds === null || timeInSeconds === undefined) return '--:--'

    const hours = Math.floor(timeInSeconds / 3600)
    const minutes = Math.floor((timeInSeconds % 3600) / 60)
    const seconds = timeInSeconds % 60

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
}

/**
 * Zeit-Stil basierend auf verbleibendem Timer
 */
const getTimeStyle = (timeInSeconds) => {
    if (!isTimerActive.value || timeInSeconds === null) {
        return { color: '#4a5568' }
    }

    if (timeInSeconds < 30) {
        return {
            color: '#e53e3e',
            fontWeight: 'bold',
            animation: 'time-critical 1s ease-in-out infinite'
        }
    } else if (timeInSeconds < 60) {
        return {
            color: '#dd6b20',
            fontWeight: 'bold'
        }
    } else if (timeInSeconds < 300) {
        return { color: '#d69e2e' }
    } else {
        return { color: '#38a169' }
    }
}

const calculateMaterialAdvantage = (color) => {
    if (!props.gameState.capturedPieces) return 0

    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    }

    const oppColor = color === 'white' ? 'black' : 'white'
    const myCaptured = props.gameState.capturedPieces[oppColor] || []
    const oppCaptured = props.gameState.capturedPieces[color] || []

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

/**
 * FEN-NOTATION FÜR FIGUR BESTIMMEN
 */
const getPieceFenNotation = (piece) => {
    // Falls es schon ein String ist (FEN-Notation)
    if (typeof piece === 'string') {
        return piece
    }

    // Falls es ein Objekt ist { type: 'p', color: 'black' }
    if (piece && piece.type && piece.color) {
        const type = piece.type.toLowerCase()
        return piece.color === 'white' ? type.toUpperCase() : type
    }

    // NEU: Falls es ein Objekt mit 'notation' Property ist
    if (piece && piece.notation) {
        return piece.notation
    }

    console.warn('Unbekannte Figur-Struktur:', piece)
    return null
}

/**
 * SVG-URL FÜR FIGUR ABRUFEN
 */
const getPieceImageUrl = (piece) => {
    const fenNotation = getPieceFenNotation(piece)
    return fenNotation ? pieceStore.getPieceImageUrl(fenNotation) : null
}

/**
 * FIGUREN-NAME FÜR TOOLTIP
 */
const getPieceName = (piece) => {
    const fenNotation = getPieceFenNotation(piece)
    return fenNotation ? pieceStore.getPieceName(fenNotation) : 'Unbekannt'
}

/**
 * Check-Indikator Style
 */
const getPlayerStyle = (color) => {
    const player = players.value[color]
    let style = {
        transition: 'all 300ms ease',
        border: '2px solid transparent'
    }

    if (player.isActive && props.gameState.isGameActive) {
        style.borderColor = '#4299e1'
        style.backgroundColor = 'rgba(66, 153, 225, 0.05)'
    }

    if (props.gameState.isInCheck && player.isActive) {
        style.borderColor = '#e53e3e'
        style.backgroundColor = 'rgba(229, 62, 62, 0.1)'
        style.animation = 'check-pulse 1.5s ease-in-out infinite'
    }

    return style
}

// ===== TIMER LOGIC =====

/**
 * Timer starten/stoppen
 */
const startTimer = () => {
    if (timerInterval.value) return

    lastUpdateTime.value = Date.now()

    timerInterval.value = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - lastUpdateTime.value) / 1000)
        lastUpdateTime.value = now

        if (currentPlayerTurn.value === 'white' && whiteTime.value > 0) {
            whiteTime.value = Math.max(0, whiteTime.value - elapsed)
            if (whiteTime.value === 0) {
                handleTimeUp('white')
            }
        } else if (currentPlayerTurn.value === 'black' && blackTime.value > 0) {
            blackTime.value = Math.max(0, blackTime.value - elapsed)
            if (blackTime.value === 0) {
                handleTimeUp('black')
            }
        }
    }, 1000)
}

const stopTimer = () => {
    if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
    }
}

/**
 * Zeit abgelaufen
 */
const handleTimeUp = (color) => {
    stopTimer()
    // Event für Zeitablauf emittieren
    console.log(`Zeit abgelaufen für ${color}`)
    // TODO: Game Store Event
}

/**
 * Inkrement bei Zug hinzufügen
 */
const addIncrement = (color) => {
    if (!props.timeControl.increment) return

    if (color === 'white') {
        whiteTime.value += props.timeControl.increment
    } else {
        blackTime.value += props.timeControl.increment
    }
}

// ===== WATCHERS & LIFECYCLE =====

// Timer bei Spielerzug-Wechsel handhaben
const watchCurrentPlayer = computed(() => props.gameState.currentPlayer)
const watchGameActive = computed(() => props.gameState.isGameActive)

// Timer-Management
onMounted(() => {
    if (isTimerActive.value) {
        startTimer()
    }
})

onUnmounted(() => {
    stopTimer()
})

// Timer bei Spielzustand-Änderungen reagieren
const updateTimerState = () => {
    if (isTimerActive.value && props.gameState.isGameActive) {
        startTimer()
    } else {
        stopTimer()
    }
}

// Watcher für Spielerwechsel (Inkrement hinzufügen)
let previousPlayer = ref(currentPlayerTurn.value)
const handlePlayerChange = () => {
    if (previousPlayer.value !== currentPlayerTurn.value) {
        // Inkrement für vorherigen Spieler hinzufügen
        if (props.timeControl.increment && previousPlayer.value) {
            addIncrement(previousPlayer.value)
        }
        previousPlayer.value = currentPlayerTurn.value
    }
}

// Bei Prop-Änderungen Timer aktualisieren
$: watchCurrentPlayer && handlePlayerChange()
$: watchGameActive && updateTimerState()
</script>

<template>
    <div class="modern-player-info">
        <!-- Schwarz (oben) -->
        <div class="player-card player-card--black" :class="{
            'player-card--active': players.black.isActive && gameState.isGameActive,
            'player-card--check': gameState.isInCheck && players.black.isActive
        }">
            <!-- Player Header -->
            <div class="player-header">
                <div class="player-avatar player-avatar--black">
                    <img v-if="players.black.avatar" :src="players.black.avatar" :alt="players.black.name" />
                    <div v-else class="avatar-fallback">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 10.66 13.66 12 12 12S9 10.66 9 9V7L3 7V9C3 11.76 5.24 14 8 14V16C8 17.1 8.9 18 10 18H14C15.1 18 16 17.1 16 16V14C18.76 14 21 11.76 21 9Z"/>
                        </svg>
                    </div>
                </div>

                <div class="player-details">
                    <div class="player-name">{{ players.black.name }}</div>
                    <div v-if="showPlayerRatings && players.black.rating" class="player-rating">
                        {{ players.black.rating }}
                    </div>
                </div>

                <div class="player-status">
                    <div v-if="players.black.isActive && gameState.isGameActive" class="turn-indicator">
                        <div class="turn-pulse"></div>
                    </div>
                    <div v-if="gameState.isInCheck && players.black.isActive" class="check-warning">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M1 21L12 2L23 21H1ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Timer (falls aktiv) -->
            <div v-if="timeControl.type !== 'unlimited'" class="timer-section">
                <div class="time-display" :style="getTimeStyle(players.black.time)">
                    {{ formatTime(players.black.time) }}
                </div>
                <div v-if="timeControl.increment" class="increment-badge">
                    +{{ timeControl.increment }}s
                </div>
            </div>

        </div>

        <!-- Game Status Center -->
        <div class="status-center">
            <div class="game-meta">
                <div class="move-counter">
                    <span class="move-label">Zug</span>
                    <span class="move-number">{{ Math.ceil(gameState.moveCount / 2) || 1 }}</span>
                </div>

                <div class="game-status" :class="{
                    'status-active': gameState.isGameActive,
                    'status-check': gameState.isInCheck,
                    'status-finished': !gameState.isGameActive
                }">
                    <div class="status-indicator"></div>
                    <span class="status-text">
                        <template v-if="gameState.isGameActive">
                            {{ gameState.isInCheck ? 'Schach' : 'Aktiv' }}
                        </template>
                        <template v-else-if="gameState.status === 'CHECKMATE'">
                            Schachmatt
                        </template>
                        <template v-else-if="gameState.status === 'STALEMATE'">
                            Patt
                        </template>
                        <template v-else-if="isDrawStatus(gameState.status)">
                            Remis
                        </template>
                        <template v-else>
                            Beendet
                        </template>
                    </span>
                </div>
            </div>

            <!-- Special Warnings -->
            <div v-if="threefoldInfo.shouldShow || fiftyMoveInfo.shouldWarn" class="warnings-section">
                <div v-if="threefoldInfo.shouldShow" class="warning-item warning-repetition" :class="{
                    'warning-critical': threefoldInfo.isCritical,
                    'warning-near': threefoldInfo.isWarning
                }">
                    <svg class="warning-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
                    </svg>
                    <span>{{ threefoldInfo.currentCount }}/3</span>
                </div>

                <div v-if="fiftyMoveInfo.shouldWarn" class="warning-item warning-fifty" :class="{
                    'warning-critical': fiftyMoveInfo.isCritical,
                    'warning-near': fiftyMoveInfo.isNear
                }">
                    <svg class="warning-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                    </svg>
                    <span>{{ fiftyMoveInfo.movesUntil50 }}</span>
                </div>
            </div>
        </div>

        <!-- Weiß (unten) -->
        <div class="player-card player-card--white" :class="{
            'player-card--active': players.white.isActive && gameState.isGameActive,
            'player-card--check': gameState.isInCheck && players.white.isActive
        }">
            <!-- Timer (falls aktiv) -->
            <div v-if="timeControl.type !== 'unlimited'" class="timer-section">
                <div class="time-display" :style="getTimeStyle(players.white.time)">
                    {{ formatTime(players.white.time) }}
                </div>
                <div v-if="timeControl.increment" class="increment-badge">
                    +{{ timeControl.increment }}s
                </div>
            </div>

            <!-- Player Header -->
            <div class="player-header">
                <div class="player-avatar player-avatar--white">
                    <img v-if="players.white.avatar" :src="players.white.avatar" :alt="players.white.name" />
                    <div v-else class="avatar-fallback">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 10.66 13.66 12 12 12S9 10.66 9 9V7L3 7V9C3 11.76 5.24 14 8 14V16C8 17.1 8.9 18 10 18H14C15.1 18 16 17.1 16 16V14C18.76 14 21 11.76 21 9Z"/>
                        </svg>
                    </div>
                </div>

                <div class="player-details">
                    <div class="player-name">{{ players.white.name }}</div>
                    <div v-if="showPlayerRatings && players.white.rating" class="player-rating">
                        {{ players.white.rating }}
                    </div>
                </div>

                <div class="player-status">
                    <div v-if="players.white.isActive && gameState.isGameActive" class="turn-indicator">
                        <div class="turn-pulse"></div>
                    </div>
                    <div v-if="gameState.isInCheck && players.white.isActive" class="check-warning">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M1 21L12 2L23 21H1ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modern-player-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
    width: 100%;
}

/* Player Cards */
.player-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid transparent;
    border-radius: 16px;
    padding: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
}

.player-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
    transition: all 0.3s ease;
}

.player-card--active {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15), 0 2px 4px rgba(59, 130, 246, 0.08);
}

.player-card--active::before {
    background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #3b82f6 100%);
}

.player-card--check {
    border-color: #ef4444;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2), 0 2px 4px rgba(239, 68, 68, 0.1);
    animation: check-pulse 1.5s ease-in-out infinite;
}

.player-card--check::before {
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%);
}

.player-card--black {
    background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
    color: #f9fafb;
}

.player-card--white {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    color: #1f2937;
}

/* Player Header */
.player-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.player-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.player-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6b7280, #4b5563);
    color: white;
}

.player-avatar--white .avatar-fallback {
    background: linear-gradient(135deg, #e5e7eb, #d1d5db);
    color: #374151;
}

.avatar-fallback svg {
    width: 24px;
    height: 24px;
}

.player-details {
    flex: 1;
    min-width: 0;
}

.player-name {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 0.25rem;
    color: inherit;
}

.player-rating {
    font-size: 0.875rem;
    opacity: 0.7;
    font-weight: 500;
}

.player-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.turn-indicator {
    width: 16px;
    height: 16px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.turn-pulse {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: turn-pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
}

.check-warning {
    width: 20px;
    height: 20px;
    color: #ef4444;
    animation: check-shake 0.6s ease-in-out infinite;
}

.check-warning svg {
    width: 100%;
    height: 100%;
}

/* Timer Section */
.timer-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    margin: 0.75rem 0;
}

.player-card--black .timer-section {
    background: rgba(255, 255, 255, 0.1);
}

.time-display {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    transition: all 0.3s ease;
}

.increment-badge {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}

.player-card--black .increment-badge {
    background: rgba(255, 255, 255, 0.15);
    color: #f9fafb;
}

/* Captured Pieces */
.captured-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.75rem 0;
}

.captured-pieces {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem;
    flex: 1;
}

.captured-piece {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: transform 0.2s ease;
    cursor: default;
}

.captured-piece:hover {
    transform: scale(1.15);
    z-index: 10;
    position: relative;
}

.captured-piece img {
    width: 24px;
    height: 24px;
    object-fit: contain;
}

.material-advantage {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
}

/* Status Center */
.status-center {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border: 1px solid rgba(226, 232, 240, 0.5);
}

.game-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.move-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.move-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
}

.move-number {
    background: #3b82f6;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 2rem;
    text-align: center;
}

.game-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94a3b8;
    transition: all 0.3s ease;
}

.status-active .status-indicator {
    background: #10b981;
    animation: status-pulse 2s ease-in-out infinite;
}

.status-check .status-indicator {
    background: #ef4444;
    animation: check-pulse 1s ease-in-out infinite;
}

.status-finished .status-indicator {
    background: #6b7280;
}

.status-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
}

/* Warnings Section */
.warnings-section {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
}

.warning-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.3s ease;
}

.warning-repetition {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.warning-fifty {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.2);
}

.warning-near {
    background: rgba(245, 158, 11, 0.2);
    animation: warning-pulse 2s ease-in-out infinite;
}

.warning-critical {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
    border-color: rgba(239, 68, 68, 0.3);
    animation: critical-pulse 1s ease-in-out infinite;
}

.warning-icon {
    width: 12px;
    height: 12px;
}

/* Animations */
@keyframes turn-pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    50% {
        transform: scale(1.1);
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
    }
}

@keyframes check-pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.05);
    }
}

@keyframes check-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    75% { transform: translateX(1px); }
}

@keyframes status-pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(1.2);
    }
}

@keyframes warning-pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.02);
    }
}

@keyframes critical-pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
        background: rgba(239, 68, 68, 0.15);
    }
    50% {
        opacity: 0.9;
        transform: scale(1.05);
        background: rgba(239, 68, 68, 0.25);
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    .modern-player-info {
        max-width: none;
        gap: 0.5rem;
    }

    .player-card {
        padding: 0.75rem;
        border-radius: 12px;
    }

    .player-header {
        gap: 0.5rem;
    }

    .player-avatar {
        width: 36px;
        height: 36px;
    }

    .player-name {
        font-size: 0.875rem;
    }

    .time-display {
        font-size: 1rem;
    }

    .captured-piece {
        width: 24px;
        height: 24px;
    }

    .captured-piece img {
        width: 20px;
        height: 20px;
    }

    .status-center {
        padding: 0.75rem;
        border-radius: 8px;
    }

    .warnings-section {
        flex-wrap: wrap;
    }
}

@media (max-width: 480px) {
    .game-meta {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
    }

    .move-counter, .game-status {
        justify-content: center;
    }
}
</style>
