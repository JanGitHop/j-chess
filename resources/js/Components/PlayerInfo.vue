<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

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

/**
 * Material-Vorteil berechnen
 */
const calculateMaterialAdvantage = (color) => {
    if (!props.gameState.capturedPieces) return 0

    const pieceValues = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    }

    const oppColor = color === 'white' ? 'black' : 'white'
    const myCaptured = props.gameState.capturedPieces[oppColor] || []
    const oppCaptured = props.gameState.capturedPieces[color] || []

    const myValue = myCaptured.reduce((sum, piece) => {
        return sum + (pieceValues[piece.type.toLowerCase()] || 0)
    }, 0)

    const oppValue = oppCaptured.reduce((sum, piece) => {
        return sum + (pieceValues[piece.type.toLowerCase()] || 0)
    }, 0)

    return myValue - oppValue
}

/**
 * Figuren-Symbol für UI
 */
const getPieceSymbol = (piece) => {
    const symbols = {
        'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'
    }
    return symbols[piece.type.toLowerCase()] || piece.type
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
    <div class="player-info">
        <h3 class="section-title">Spieler</h3>

        <!-- Schwarz (oben, gespiegelt zur Board-Orientierung) -->
        <div
            class="player-card player-card--black"
            :style="getPlayerStyle('black')"
        >
            <div class="player-header">
                <div class="player-avatar">
                    <img
                        v-if="players.black.avatar"
                        :src="players.black.avatar"
                        :alt="players.black.name"
                        class="avatar-image"
                    />
                    <div v-else class="avatar-placeholder avatar-placeholder--black">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>

                <div class="player-info-text">
                    <div class="player-name">{{ players.black.name }}</div>
                    <div v-if="showPlayerRatings && players.black.rating" class="player-rating">
                        {{ players.black.rating }}
                    </div>
                </div>

                <div class="player-status">
                    <div
                        v-if="players.black.isActive && gameState.isGameActive"
                        class="turn-indicator turn-indicator--active"
                        title="Am Zug"
                    >
                        <div class="turn-dot"></div>
                    </div>
                    <div
                        v-if="gameState.isInCheck && players.black.isActive"
                        class="check-indicator"
                        title="Schach!"
                    >
                        ⚠️
                    </div>
                </div>
            </div>

            <!-- Timer -->
            <div v-if="timeControl.type !== 'unlimited'" class="player-timer">
                <div
                    class="time-display"
                    :style="getTimeStyle(players.black.time)"
                >
                    {{ formatTime(players.black.time) }}
                </div>
                <div v-if="timeControl.increment" class="increment-info">
                    +{{ timeControl.increment }}s
                </div>
            </div>

            <!-- Geschlagene Figuren -->
            <div v-if="showCapturedPieces && players.black.capturedPieces.length > 0" class="captured-pieces">
                <div class="captured-label">Geschlagen:</div>
                <div class="captured-list">
                    <span
                        v-for="(piece, index) in players.black.capturedPieces"
                        :key="index"
                        class="captured-piece"
                        :title="`${piece.color} ${piece.type}`"
                    >
                        {{ getPieceSymbol(piece) }}
                    </span>
                </div>
                <div v-if="players.black.materialAdvantage > 0" class="material-advantage">
                    +{{ players.black.materialAdvantage }}
                </div>
            </div>
        </div>

        <!-- Spielstand/Status -->
        <div class="game-status-info">
            <div class="status-item">
                <span class="status-label">Zug:</span>
                <span class="status-value">{{ Math.ceil(gameState.moveCount / 2) || 1 }}</span>
            </div>
            <div class="status-item">
                <span class="status-label">Status:</span>
                <span class="status-value" :class="{
                    'text-green-600': gameState.isGameActive,
                    'text-red-600': !gameState.isGameActive && gameState.status === 'CHECKMATE',
                    'text-yellow-600': !gameState.isGameActive && gameState.status === 'STALEMATE',
                    'text-gray-600': !gameState.isGameActive && gameState.status === 'DRAW'
                }">
                    <template v-if="gameState.isGameActive">
                        {{ gameState.isInCheck ? 'Schach' : 'Aktiv' }}
                    </template>
                    <template v-else-if="gameState.status === 'CHECKMATE'">
                        Schachmatt
                    </template>
                    <template v-else-if="gameState.status === 'STALEMATE'">
                        Patt
                    </template>
                    <template v-else-if="gameState.status === 'DRAW'">
                        Remis
                    </template>
                    <template v-else>
                        Beendet
                    </template>
                </span>
            </div>
        </div>

        <!-- Weiß (unten, normale Orientierung) -->
        <div
            class="player-card player-card--white"
            :style="getPlayerStyle('white')"
        >
            <div class="player-header">
                <div class="player-avatar">
                    <img
                        v-if="players.white.avatar"
                        :src="players.white.avatar"
                        :alt="players.white.name"
                        class="avatar-image"
                    />
                    <div v-else class="avatar-placeholder avatar-placeholder--white">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </div>

                <div class="player-info-text">
                    <div class="player-name">{{ players.white.name }}</div>
                    <div v-if="showPlayerRatings && players.white.rating" class="player-rating">
                        {{ players.white.rating }}
                    </div>
                </div>

                <div class="player-status">
                    <div
                        v-if="players.white.isActive && gameState.isGameActive"
                        class="turn-indicator turn-indicator--active"
                        title="Am Zug"
                    >
                        <div class="turn-dot"></div>
                    </div>
                    <div
                        v-if="gameState.isInCheck && players.white.isActive"
                        class="check-indicator"
                        title="Schach!"
                    >
                        ⚠️
                    </div>
                </div>
            </div>

            <!-- Timer -->
            <div v-if="timeControl.type !== 'unlimited'" class="player-timer">
                <div
                    class="time-display"
                    :style="getTimeStyle(players.white.time)"
                >
                    {{ formatTime(players.white.time) }}
                </div>
                <div v-if="timeControl.increment" class="increment-info">
                    +{{ timeControl.increment }}s
                </div>
            </div>

            <!-- Geschlagene Figuren -->
            <div v-if="showCapturedPieces && players.white.capturedPieces.length > 0" class="captured-pieces">
                <div class="captured-label">Geschlagen:</div>
                <div class="captured-list">
                    <span
                        v-for="(piece, index) in players.white.capturedPieces"
                        :key="index"
                        class="captured-piece"
                        :title="`${piece.color} ${piece.type}`"
                    >
                        {{ getPieceSymbol(piece) }}
                    </span>
                </div>
                <div v-if="players.white.materialAdvantage > 0" class="material-advantage">
                    +{{ players.white.materialAdvantage }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.player-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #2d3748;
    margin: 0 0 1rem 0;
}

.player-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0.75rem;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 300ms ease;
}

.player-card--black {
    order: 1; /* Schwarz oben */
}

.player-card--white {
    order: 3; /* Weiß unten */
}

.game-status-info {
    order: 2; /* Status in der Mitte */
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 0.5rem;
    padding: 0.75rem;
    font-size: 0.875rem;
}

.status-item {
    display: flex;
    gap: 0.5rem;
}

.status-label {
    color: #718096;
    font-weight: 500;
}

.status-value {
    color: #2d3748;
    font-weight: 600;
}

.player-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.avatar-placeholder--white {
    background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
    color: #4a5568;
}

.avatar-placeholder--black {
    background: linear-gradient(135deg, #4a5568, #2d3748);
    color: #e2e8f0;
}

.player-info-text {
    flex: 1;
}

.player-name {
    font-weight: 600;
    color: #2d3748;
    font-size: 1rem;
}

.player-rating {
    font-size: 0.875rem;
    color: #718096;
    font-weight: 500;
}

.player-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.turn-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.turn-indicator--active {
    background: #48bb78;
    animation: turn-pulse 2s ease-in-out infinite;
}

.turn-dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
}

.check-indicator {
    font-size: 1.25rem;
    animation: check-shake 0.5s ease-in-out infinite;
}

.player-timer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
}

.time-display {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 1.25rem;
    font-weight: bold;
    transition: all 300ms ease;
}

.increment-info {
    font-size: 0.75rem;
    color: #718096;
    font-weight: 500;
}

.captured-pieces {
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    padding-top: 0.75rem;
}

.captured-label {
    font-size: 0.75rem;
    color: #718096;
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.captured-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
}

.captured-piece {
    font-size: 1.25rem;
    opacity: 0.8;
    transition: opacity 200ms ease;
}

.captured-piece:hover {
    opacity: 1;
}

.material-advantage {
    font-size: 0.875rem;
    font-weight: 600;
    color: #38a169;
    text-align: right;
}

/* Animationen */
@keyframes turn-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

@keyframes check-pulse {
    0%, 100% {
        border-color: #e53e3e;
        background-color: rgba(229, 62, 62, 0.1);
    }
    50% {
        border-color: #fc8181;
        background-color: rgba(229, 62, 62, 0.2);
    }
}

@keyframes check-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
}

@keyframes time-critical {
    0%, 100% {
        color: #e53e3e;
        transform: scale(1);
    }
    50% {
        color: #fc8181;
        transform: scale(1.05);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .player-card {
        padding: 0.75rem;
    }

    .player-header {
        gap: 0.5rem;
    }

    .player-avatar {
        width: 32px;
        height: 32px;
    }

    .player-name {
        font-size: 0.875rem;
    }

    .time-display {
        font-size: 1rem;
    }

    .captured-piece {
        font-size: 1rem;
    }
}

/* Print Styles */
@media print {
    .player-timer,
    .turn-indicator,
    .check-indicator {
        display: none;
    }

    .player-card {
        box-shadow: none;
        border: 1px solid #e2e8f0;
    }
}
</style>
