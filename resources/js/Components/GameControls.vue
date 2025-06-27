<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '@/Stores/gameStore.js'
import { useBoardStore } from '@/Stores/boardStore.js'

const emit = defineEmits([
    'newGame',
    'resign',
    'offerDraw',
    'undoMove',
    'redoMove',
    'flipBoard',
    'showAnalysis'
])

// Stores
const gameStore = useGameStore()
const boardStore = useBoardStore()

// Local state
const showConfirmResign = ref(false)
const showDrawOffer = ref(false)

// ===== COMPUTED =====

const gameStatus = computed(() => {
    if (!gameStore.isGameActive) {
        if (gameStore.gameResult) {
            return `Spiel beendet: ${gameStore.gameResult.reason}`
        }
        return 'Kein aktives Spiel'
    }

    if (gameStore.isInCheck) {
        return `${gameStore.currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} steht im Schach`
    }

    return `${gameStore.currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} ist am Zug`
})

const currentPlayerName = computed(() => {
    return gameStore.currentPlayer === 'white' ? 'Weiß' : 'Schwarz'
})

const canUndo = computed(() => {
    return gameStore.moveHistory.length > 0 && gameStore.isGameActive
})

const canRedo = computed(() => {
    // Grundlegende Validierung des GameStore
    if (!gameStore ||
        typeof gameStore.isGameActive !== 'boolean') {
        return false
    }

    // Prüfen ob redoStack existiert und ein Array ist
    if (!gameStore.redoStack ||
        !Array.isArray(gameStore.redoStack)) {
        return false
    }

    // Redo nur möglich wenn:
    // 1. Das Spiel aktiv ist
    // 2. Es Züge im Redo-Stack gibt
    // 3. Das Spiel nicht beendet ist
    return gameStore.isGameActive &&
        gameStore.redoStack.length > 0 &&
        gameStore.gameStatus !== 'FINISHED' &&
        gameStore.gameStatus !== 'CHECKMATE' &&
        gameStore.gameStatus !== 'STALEMATE'
})

const moveCount = computed(() => {
    return Math.ceil(gameStore.moveHistory.length / 2)
})

// ===== ACTIONS =====

const handleNewGame = () => {
    gameStore.startNewGame()
    emit('newGame')
}

const handleResign = () => {
    if (showConfirmResign.value) {
        gameStore.resignGame()
        showConfirmResign.value = false
        emit('resign')
    } else {
        showConfirmResign.value = true
        // Auto-hide nach 3 Sekunden
        setTimeout(() => {
            showConfirmResign.value = false
        }, 3000)
    }
}

const handleOfferDraw = () => {
    // TODO: Implement draw offer logic
    showDrawOffer.value = true
    emit('offerDraw')

    // Auto-hide nach 3 Sekunden
    setTimeout(() => {
        showDrawOffer.value = false
    }, 3000)
}

const handleUndo = () => {
    if (canUndo.value) {
        gameStore.undoLastMove()
        emit('undoMove')
    }
}

const handleRedo = () => {
    if (canRedo.value) {
        gameStore.redoMove()
        emit('redoMove')
    }
}

const handleFlipBoard = () => {
    // TODO: Implement board flip
    emit('flipBoard')
}

const handleShowAnalysis = () => {
    emit('showAnalysis')
}

const copyFEN = () => {
    if (gameStore.currentFEN) {
        navigator.clipboard.writeText(gameStore.currentFEN)
        // TODO: Show toast notification
    }
}

const copyPGN = () => {
    if (gameStore.currentPGN) {
        navigator.clipboard.writeText(gameStore.currentPGN)
        // TODO: Show toast notification
    }
}
</script>

<template>
    <div class="bg-white rounded-lg shadow-md p-6 space-y-6 max-w-sm">
        <!-- Game Status -->
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-800">Spielstatus</h3>
                <div class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    Zug {{ moveCount }}
                </div>
            </div>

            <!-- Current Player -->
            <div v-if="gameStore.isGameActive" class="mt-2">
                <div class="flex items-center gap-2 p-2 rounded" :class="{
                    'bg-gray-50': gameStore.currentPlayer === 'white',
                    'bg-gray-100': gameStore.currentPlayer === 'black'
                }">
                    <div class="w-4 h-4 rounded-full border-2" :class="{
                        'bg-white border-gray-400': gameStore.currentPlayer === 'white',
                        'bg-gray-800 border-gray-600': gameStore.currentPlayer === 'black'
                    }"></div>
                    <span>{{ currentPlayerName }} am Zug</span>
                </div>
            </div>
        </div>

        <!-- Game Actions -->
        <div class="border-b border-gray-100 pb-4">
            <h4 class="text-md font-medium text-gray-700 mb-3">Aktionen</h4>

            <div class="flex flex-col gap-2">
                <!-- New Game -->
                <button
                    @click="handleNewGame"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Neues Spiel
                </button>

                <!-- Resign -->
                <button
                    v-if="gameStore.isGameActive"
                    @click="handleResign"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    :class="{ 'bg-red-700 animate-pulse': showConfirmResign }"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
                    </svg>
                    {{ showConfirmResign ? 'Bestätigen?' : 'Aufgeben' }}
                </button>

                <!-- Draw Offer -->
                <button
                    v-if="gameStore.isGameActive"
                    @click="handleOfferDraw"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    :disabled="showDrawOffer"
                    :class="{ 'opacity-50 cursor-not-allowed': showDrawOffer }"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                    </svg>
                    {{ showDrawOffer ? 'Remis angeboten' : 'Remis anbieten' }}
                </button>
            </div>
        </div>

        <!-- Move Navigation -->
        <div class="border-b border-gray-100 pb-4">
            <h4 class="text-md font-medium text-gray-700 mb-3">Züge</h4>

            <div class="flex gap-2">
                <button
                    @click="handleUndo"
                    :disabled="!canUndo"
                    class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 cursor-pointer bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zug zurücknehmen"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                    </svg>
                    Zurück
                </button>

                <button
                    @click="handleRedo"
                    :disabled="!canRedo"
                    class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 cursor-pointer bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zug wiederholen"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                    Vor
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Responsive */
@media (max-width: 768px) {
    .max-w-sm {
        max-width: none;
    }
}
</style>
