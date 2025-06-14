<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import { useGameStore } from '@/Stores/gameStore.js'

const props = defineProps({
    maxHeight: {
        type: String,
        default: '400px'
    },
    showMoveNumbers: {
        type: Boolean,
        default: true
    },
    showAnnotations: {
        type: Boolean,
        default: false
    },
    interactive: {
        type: Boolean,
        default: true
    },
    highlightCurrentMove: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits([
    'moveClick',
    'positionJump'
])

// Stores
const gameStore = useGameStore()

// Refs
const historyContainer = ref(null)
const selectedMoveIndex = ref(-1)

// ===== COMPUTED PROPERTIES =====

/**
 * Formatierte Zughistorie für Anzeige
 */
const formattedMoveHistory = computed(() => {
    if (!gameStore.moveHistory || gameStore.moveHistory.length === 0) {
        return []
    }

    const moves = []
    const history = gameStore.moveHistory

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1
        const whiteMove = history[i]
        const blackMove = history[i + 1] || null

        moves.push({
            number: moveNumber,
            white: whiteMove ? {
                ...whiteMove,
                index: i,
                notation: whiteMove.san || whiteMove.notation || whiteMove.move
            } : null,
            black: blackMove ? {
                ...blackMove,
                index: i + 1,
                notation: blackMove.san || blackMove.notation || blackMove.move
            } : null
        })
    }

    return moves
})

/**
 * Hat das Spiel eine Zughistorie?
 */
const hasHistory = computed(() => {
    return gameStore.moveHistory && gameStore.moveHistory.length > 0
})

/**
 * Aktueller Zug-Index (letzter gespielter Zug)
 */
const currentMoveIndex = computed(() => {
    return gameStore.moveHistory ? gameStore.moveHistory.length - 1 : -1
})

/**
 * Statistiken über das Spiel
 */
const gameStats = computed(() => {
    const totalMoves = gameStore.moveHistory?.length || 0
    const totalPairs = Math.ceil(totalMoves / 2)

    return {
        totalMoves,
        totalPairs,
        capturedPieces: {
            white: gameStore.capturedPieces?.white?.length || 0,
            black: gameStore.capturedPieces?.black?.length || 0
        }
    }
})

// ===== METHODS =====

/**
 * Zug in der Historie anklicken
 */
const handleMoveClick = (move, moveIndex) => {
    if (!props.interactive) return

    selectedMoveIndex.value = moveIndex

    emit('moveClick', {
        move,
        index: moveIndex,
        position: move.fenAfter || move.fen
    })

    // Optional: Position im Spiel zur gewählten Stellung springen
    if (move.fenAfter) {
        emit('positionJump', {
            fen: move.fenAfter,
            moveIndex
        })
    }
}

/**
 * Zur aktuellen Position springen
 */
const jumpToCurrentPosition = () => {
    selectedMoveIndex.value = currentMoveIndex.value
    scrollToMove(currentMoveIndex.value)
}

/**
 * Zu einem bestimmten Zug scrollen
 */
const scrollToMove = async (moveIndex) => {
    await nextTick()

    if (!historyContainer.value) return

    const moveElement = historyContainer.value.querySelector(`[data-move-index="${moveIndex}"]`)
    if (moveElement) {
        moveElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        })
    }
}

/**
 * Zug-Notation mit Symbolen anreichern
 */
const formatMoveNotation = (move) => {
    let notation = move.notation || move.san || move.move || '?'

    // Schach/Matt-Symbole
    if (move.isCheck && !notation.includes('+')) {
        notation += '+'
    }
    if (move.isCheckmate && !notation.includes('#')) {
        notation = notation.replace('+', '') + '#'
    }

    // Spezielle Züge
    if (move.isCastling) {
        return move.isKingside ? 'O-O' : 'O-O-O'
    }

    return notation
}

/**
 * CSS-Klassen für Zug-Element
 */
const getMoveClasses = (moveIndex) => {
    return {
        'move-item': true,
        'move-item--selected': selectedMoveIndex.value === moveIndex,
        'move-item--current': props.highlightCurrentMove && moveIndex === currentMoveIndex.value,
        'move-item--interactive': props.interactive
    }
}

/**
 * Zughistorie exportieren
 */
const exportHistory = () => {
    const pgn = gameStore.currentPGN || generatePGN()

    // PGN in Zwischenablage kopieren
    if (navigator.clipboard) {
        navigator.clipboard.writeText(pgn)
    }

    return pgn
}

/**
 * Einfache PGN-Generierung
 */
const generatePGN = () => {
    if (!hasHistory.value) return ''

    let pgn = ''
    const moves = formattedMoveHistory.value

    for (const movePair of moves) {
        pgn += `${movePair.number}. `

        if (movePair.white) {
            pgn += `${formatMoveNotation(movePair.white)} `
        }

        if (movePair.black) {
            pgn += `${formatMoveNotation(movePair.black)} `
        }
    }

    return pgn.trim()
}

// ===== WATCHERS =====

// Auto-scroll zu neuem Zug
watch(currentMoveIndex, (newIndex) => {
    if (newIndex >= 0 && props.highlightCurrentMove) {
        scrollToMove(newIndex)
    }
})
</script>

<template>
    <div class="move-history">
        <!-- Header -->
        <div class="move-history__header">
            <h3 class="move-history__title">Zughistorie</h3>

            <div class="move-history__controls">
                <button
                    v-if="hasHistory"
                    @click="jumpToCurrentPosition"
                    class="btn btn--small btn--ghost"
                    title="Zur aktuellen Position"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                </button>

                <button
                    v-if="hasHistory"
                    @click="exportHistory"
                    class="btn btn--small btn--ghost"
                    title="PGN exportieren"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Statistiken -->
        <div v-if="hasHistory" class="move-history__stats">
            <div class="stats-item">
                <span class="stats-label">Züge:</span>
                <span class="stats-value">{{ gameStats.totalPairs }}</span>
            </div>

            <div v-if="gameStats.capturedPieces.white > 0 || gameStats.capturedPieces.black > 0" class="stats-item">
                <span class="stats-label">Geschlagen:</span>
                <span class="stats-value">
                    {{ gameStats.capturedPieces.white + gameStats.capturedPieces.black }}
                </span>
            </div>
        </div>

        <!-- Zughistorie -->
        <div
            ref="historyContainer"
            class="move-history__container"
            :style="{ maxHeight: maxHeight }"
        >
            <div v-if="!hasHistory" class="move-history__empty">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p class="text-gray-500 text-sm mt-2">Noch keine Züge gespielt</p>
            </div>

            <div v-else class="move-history__list">
                <div
                    v-for="movePair in formattedMoveHistory"
                    :key="movePair.number"
                    class="move-pair"
                >
                    <!-- Zugnummer -->
                    <div v-if="showMoveNumbers" class="move-number">
                        {{ movePair.number }}.
                    </div>

                    <!-- Weißer Zug -->
                    <div
                        v-if="movePair.white"
                        :class="getMoveClasses(movePair.white.index)"
                        :data-move-index="movePair.white.index"
                        @click="handleMoveClick(movePair.white, movePair.white.index)"
                    >
                        <span class="move-notation">
                            {{ formatMoveNotation(movePair.white) }}
                        </span>

                        <span v-if="showAnnotations && movePair.white.annotation" class="move-annotation">
                            {{ movePair.white.annotation }}
                        </span>
                    </div>

                    <!-- Schwarzer Zug -->
                    <div
                        v-if="movePair.black"
                        :class="getMoveClasses(movePair.black.index)"
                        :data-move-index="movePair.black.index"
                        @click="handleMoveClick(movePair.black, movePair.black.index)"
                    >
                        <span class="move-notation">
                            {{ formatMoveNotation(movePair.black) }}
                        </span>

                        <span v-if="showAnnotations && movePair.black.annotation" class="move-annotation">
                            {{ movePair.black.annotation }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer mit Spielergebnis -->
        <div v-if="gameStore.gameResult" class="move-history__footer">
            <div class="game-result">
                <span class="result-text">
                    {{ gameStore.gameResult.result || '1/2-1/2' }}
                </span>
                <span class="result-reason">
                    {{ gameStore.gameResult.reason }}
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.move-history {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col;
    min-height: 200px;
}

/* Header */
.move-history__header {
    @apply flex justify-between items-center p-4 border-b border-gray-100;
}

.move-history__title {
    @apply text-lg font-semibold text-gray-800;
}

.move-history__controls {
    @apply flex gap-2;
}

/* Stats */
.move-history__stats {
    @apply px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4;
}

.stats-item {
    @apply flex items-center gap-1;
}

.stats-label {
    @apply text-xs text-gray-600;
}

.stats-value {
    @apply text-xs font-medium text-gray-900;
}

/* Container */
.move-history__container {
    @apply flex-1 overflow-y-auto p-2;
}

.move-history__empty {
    @apply flex flex-col items-center justify-center h-32 text-center;
}

/* Move List */
.move-history__list {
    @apply space-y-1;
}

.move-pair {
    @apply grid grid-cols-[auto_1fr_1fr] gap-2 items-center py-1;
}

.move-number {
    @apply text-sm font-medium text-gray-600 text-right pr-2;
    min-width: 30px;
}

/* Move Items */
.move-item {
    @apply px-2 py-1 rounded text-sm transition-colors duration-150;
}

.move-item--interactive {
    @apply cursor-pointer hover:bg-gray-100;
}

.move-item--selected {
    @apply bg-blue-100 text-blue-800 font-medium;
}

.move-item--current {
    @apply bg-green-100 text-green-800 font-medium;
}

.move-item--interactive:hover {
    @apply bg-gray-100;
}

.move-item--selected:hover {
    @apply bg-blue-200;
}

.move-item--current:hover {
    @apply bg-green-200;
}

.move-notation {
    @apply font-mono;
}

.move-annotation {
    @apply text-xs text-gray-500 ml-1;
}

/* Footer */
.move-history__footer {
    @apply p-3 border-t border-gray-100 bg-gray-50;
}

.game-result {
    @apply flex items-center justify-between;
}

.result-text {
    @apply font-bold text-gray-900;
}

.result-reason {
    @apply text-sm text-gray-600;
}

/* Buttons */
.btn {
    @apply inline-flex items-center gap-1 px-2 py-1 rounded transition-colors duration-150;
}

.btn--small {
    @apply text-xs;
}

.btn--ghost {
    @apply text-gray-600 hover:text-gray-800 hover:bg-gray-100;
}

/* Responsive */
@media (max-width: 640px) {
    .move-pair {
        @apply grid-cols-[auto_1fr];
    }

    .move-pair .move-item:nth-child(3) {
        @apply col-start-2;
    }
}

/* Scrollbar Styling */
.move-history__container::-webkit-scrollbar {
    width: 6px;
}

.move-history__container::-webkit-scrollbar-track {
    @apply bg-gray-100 rounded;
}

.move-history__container::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded;
}

.move-history__container::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
}
</style>
