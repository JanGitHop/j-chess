<script setup>
import { ref } from 'vue'
import ChessBoard from '@/Components/ChessBoard.vue'
import BoardSettings from '@/Components/BoardSettings.vue'
import { useBoardStore } from '@/Stores/boardStore'

const boardStore = useBoardStore()
const showSettings = ref(false)

// Board-Events
const handleSquareClick = (squareData) => {
    console.log('Square clicked:', squareData)
    // Hier kommt später die Spiellogik
}

const openSettings = () => {
    showSettings.value = true
}

const closeSettings = () => {
    showSettings.value = false
}
</script>

<template>
    <div class="min-h-screen bg-gray-100 flex flex-col">
        <!-- Header -->
        <div class="bg-white shadow-sm border-b border-gray-200">
            <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-3xl font-bold text-gray-800">J-Chess</h1>
                    <button
                        @click="openSettings"
                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        Einstellungen
                    </button>
                </div>
            </div>
        </div>

        <!-- Main Game Area -->
        <div class="flex-1 flex items-center justify-center p-4">
            <div class="flex flex-col lg:flex-row items-center gap-8 max-w-7xl w-full">

                <!-- Schachbrett -->
                <div class="flex-shrink-0">
                    <ChessBoard
                        @square-click="handleSquareClick"
                    />
                </div>

                <!-- Seitenbereich für Spielinfo/Controls -->
                <div class="w-full lg:w-80 space-y-4">
                    <!-- Spielinfo -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h3 class="text-lg font-semibold mb-4">Spielinformation</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Theme:</span>
                                <span class="font-medium">{{ boardStore.currentTheme.name }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Board-Größe:</span>
                                <span class="font-medium">{{ boardStore.currentBoardSize.name }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Koordinaten:</span>
                                <span class="font-medium">{{ boardStore.settings.showCoordinates ? 'An' : 'Aus' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Mouse:</span>
                                <span class="font-medium">{{ boardStore.mousePosition.square }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Spieler-Infos -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h3 class="text-lg font-semibold mb-4">Spieler</h3>
                        <div class="space-y-3">
                            <div class="flex items-center gap-3">
                                <div class="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
                                <span class="font-medium">Weiß</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-4 h-4 bg-gray-800 rounded"></div>
                                <span class="font-medium">Schwarz</span>
                            </div>
                        </div>
                    </div>

                    <!-- Züge-Historie (Placeholder) -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h3 class="text-lg font-semibold mb-4">Züge</h3>
                        <div class="text-sm text-gray-500">
                            Spiel beginnt...
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Settings Modal -->
        <BoardSettings
            v-if="showSettings"
            @close="closeSettings"
        />
    </div>
</template>

<style scoped>
/* Zusätzliche Styles für responsive Anpassung */
@media (max-width: 1024px) {
    .chess-board-container {
        margin-bottom: 2rem;
    }
}
</style>
