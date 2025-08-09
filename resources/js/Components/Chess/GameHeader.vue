<script setup>
import { ref, computed } from 'vue'
import { useGameConfigStore } from '@/Stores/gameConfigStore.js'
import { useBoardStore } from '@/Stores/boardStore.js'
import { useGameStore } from '@/Stores/gameStore.js'
import { useSounds } from '@/Composables/useSounds.js'
import NewGameModal from '@/Components/Shared/NewGameModal.vue'
import { PLAYER_COLORS } from '@/Utils/chessConstants.js'

const props = defineProps({
    gameTitle: {
        type: String,
        default: 'Schach'
    },
    showSettings: {
        type: Boolean,
        default: true
    },
    showSidebarToggle: {
        type: Boolean,
        default: true
    },
    showBoardInfo: {
        type: Boolean,
        default: false
    },
    gameState: {
        type: Object,
        default: () => ({})
    }
})

const emit = defineEmits([
    'flip-board',
    'game-mode-changed',
    'toggle-sidebar',
    'toggle-board-info',
    'open-settings',
    'new-game',
    'export-game',
    'resign',
    'offer-draw',
    'undo-move',
    'redo-move'
])

// Stores
const configStore = useGameConfigStore()
const boardStore = useBoardStore()
const gameStore = useGameStore()

// Game state computed properties
const currentPlayerName = computed(() => {
    return gameStore.currentPlayer === PLAYER_COLORS.WHITE ? 'Weiß' : 'Schwarz'
})

const gameStatus = computed(() => {
    if (!gameStore.isGameActive) {
        if (gameStore.gameResult) {
            return `Spiel beendet: ${gameStore.gameResult.reason}`
        }
        return 'Kein aktives Spiel'
    }

    if (gameStore.isInCheck) {
        return `${gameStore.currentPlayer === PLAYER_COLORS.WHITE ? 'Weiß' : 'Schwarz'} steht im Schach`
    }

    return `${gameStore.currentPlayer === PLAYER_COLORS.WHITE ? 'Weiß' : 'Schwarz'} ist am Zug`
})

const moveCount = computed(() => {
    return Math.ceil(gameStore.moveHistory?.length / 2) || 0
})

const canUndo = computed(() => {
    return gameStore.canStepBackward
})

const canRedo = computed(() => {
    return gameStore.canStepForward
})

// Game control state
const showConfirmResign = ref(false)
const showDrawOffer = ref(false)

// Sound Composable
const {
    isSoundEnabled,
    currentVolume,
    toggleSound,
    setVolume,
    testSound
} = useSounds()

// UI State
const showModeDropdown = ref(false)
const showGameMenu = ref(false)
const showThemeDropdown = ref(false)
const showAudioDropdown = ref(false)
const showSettingsDropdown = ref(false)
const showNewGameModal = ref(false)
const showMobileMenu = ref(false)

// ===== DROPDOWN MANAGEMENT =====
const closeModeDropdownDelayed = () => {
    setTimeout(() => showModeDropdown.value = false, 150)
}

const closeThemeDropdownDelayed = () => {
    setTimeout(() => showThemeDropdown.value = false, 150)
}

const closeAudioDropdownDelayed = () => {
    setTimeout(() => showAudioDropdown.value = false, 150)
}

const closeSettingsDropdownDelayed = () => {
    setTimeout(() => showSettingsDropdown.value = false, 150)
}

const closeGameMenuDelayed = () => {
    setTimeout(() => showGameMenu.value = false, 150)
}

const closeAllDropdowns = () => {
    showModeDropdown.value = false
    showGameMenu.value = false
    showThemeDropdown.value = false
    showAudioDropdown.value = false
    showSettingsDropdown.value = false
    showMobileMenu.value = false
}

// Theme-Liste aus Board Store
const availableThemes = computed(() => boardStore.themeList)
const currentTheme = computed(() => boardStore.currentTheme)

// Board-Größen aus Board Store
const availableBoardSizes = computed(() => boardStore.boardSizeList)
const currentBoardSize = computed(() => boardStore.currentBoardSize)

// ===== EVENT HANDLERS =====

// Brett-Steuerung
const handleFlipBoard = () => {
    const newOrientation = configStore.flipBoard()
    emit('flip-board', newOrientation)
}

// Theme-Änderung
const selectTheme = (themeKey) => {
    boardStore.setTheme(themeKey)
    showThemeDropdown.value = false
}

// Board-Größe ändern
const selectBoardSize = (sizeKey) => {
    boardStore.setBoardSize(sizeKey)
}

// Audio-Steuerung
const handleToggleSound = () => {
    toggleSound()
}

const handleVolumeChange = (event) => {
    const volume = parseFloat(event.target.value)
    setVolume(volume)
}

const handleTestSound = () => {
    testSound('move')
}

// Settings-Toggles
const toggleCoordinates = () => {
    const newValue = !configStore.showCoordinates
    configStore.setShowCoordinates(newValue)
}

const toggleLegalMoves = () => {
    const newValue = !boardStore.settings.showLegalMoves
    boardStore.updateSetting('showLegalMoves', newValue)
}

const toggleLastMoveHighlight = () => {
    const newValue = !boardStore.settings.highlightLastMove
    boardStore.updateSetting('highlightLastMove', newValue)
}

const toggleAnimations = () => {
    const newValue = !boardStore.settings.animateCaptures
    boardStore.updateSetting('animateCaptures', newValue)
}

// Board-Info Toggle
const toggleBoardInfo = () => {
    emit('toggle-board-info')
}

// ===== MODAL HANDLERS =====

// Neues Spiel Modal öffnen
const handleNewGame = () => {
    showGameMenu.value = false
    closeAllDropdowns()
    showNewGameModal.value = true
}

// Modal schließen
const closeNewGameModal = () => {
    showNewGameModal.value = false
}

const toggleGamePause = () => {
    if (timerStore.isTimerActive) {
        timerStore.pauseTimer()
    } else if (timerStore.timerState === 'paused') {
        timerStore.resumeTimer()
    }
}

// Spiel gestartet - Event weiterleiten
const handleGameStarted = (gameData) => {
    showNewGameModal.value = false
    emit('new-game', gameData)

    console.log('Neues Spiel gestartet vom Header:', gameData)
}

// Spiel exportieren
const handleExportGame = () => {
    showGameMenu.value = false
    emit('export-game')
}

// Game control functions
const handleResign = () => {
    if (showConfirmResign.value) {
        gameStore.resignGame()
        showConfirmResign.value = false
        emit('resign')
    } else {
        showConfirmResign.value = true
        // Auto-hide after 3 seconds
        setTimeout(() => {
            showConfirmResign.value = false
        }, 3000)
    }
}

const handleOfferDraw = () => {
    showDrawOffer.value = true
    emit('offer-draw')

    // Auto-hide after 3 seconds
    setTimeout(() => {
        showDrawOffer.value = false
    }, 3000)
}

const handleUndo = () => {
    if (canUndo.value) {
        const success = gameStore.undoLastMove()
        if (success) {
            emit('undo-move')
        }
    }
}

const handleRedo = () => {
    if (canRedo.value) {
        const success = gameStore.redoMove()
        if (success) {
            emit('redo-move')
        }
    }
}
</script>

<template>
    <header class="game-header bg-theme-surface border-b border-theme" tabindex="-1">
        <div class="header-content">
            <!-- Logo -->
            <div class="flex items-center">
                <a href="/" class="font-bold mr-5 flex items-center gap-2">
                    <img src="images/logo.png" alt="J-Chess Logo" class="w-20 h-20 logo-image" />
                </a>
            </div>

            <!-- Mobile Menu Button -->
            <button
                class="mobile-menu-button"
                @click="showMobileMenu = !showMobileMenu"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path v-if="!showMobileMenu" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <!-- Hauptmenü -->
            <nav class="header-nav" :class="{ 'header-nav--mobile-open': showMobileMenu }">
                <!-- Spiel-Menü -->
                <div class="nav-item dropdown" :class="{ 'dropdown--open': showGameMenu }">
                    <button
                        class="dropdown-btn nav-btn"
                        @click="showGameMenu = !showGameMenu"
                        @blur="closeGameMenuDelayed"
                    >
                        <span class="btn-icon">⚡</span>
                        <span class="btn-text text-theme-secondary">Spiel</span>
                        <svg class="dropdown-icon" viewBox="0 0 20 20">
                            <path fill="currentColor" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                        </svg>
                    </button>

                    <div v-if="showGameMenu" class="dropdown-menu bg-theme-surface border border-theme shadow-lg">
                        <button class="dropdown-item hover:bg-theme-surface-secondary" @click="handleNewGame">
                            <span class="dropdown-item-icon">🆕</span>
                            <span class="dropdown-item-name text-theme-primary">Neues Spiel</span>
                        </button>
                        <button class="dropdown-item hover:bg-theme-surface-secondary" @click="handleExportGame">
                            <span class="dropdown-item-icon">💾</span>
                            <span class="dropdown-item-name text-theme-primary">Spiel exportieren</span>
                        </button>
                    </div>
                </div>

                <!-- Theme Dropdown -->
                <div class="nav-item dropdown" :class="{ 'dropdown--open': showThemeDropdown }">
                    <button
                        class="dropdown-btn nav-btn"
                        @click="showThemeDropdown = !showThemeDropdown"
                        @blur="closeThemeDropdownDelayed"
                    >
                        <span class="btn-icon">🎨</span>
                        <span class="btn-text text-theme-secondary">{{ currentTheme.name }}</span>
                        <svg class="dropdown-icon" viewBox="0 0 20 20">
                            <path fill="currentColor" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                        </svg>
                    </button>

                    <div v-if="showThemeDropdown" class="dropdown-menu dropdown-menu--wide bg-theme-surface border border-theme shadow-lg">
                        <button
                            v-for="theme in availableThemes"
                            :key="theme.key"
                            class="dropdown-item theme-item hover:bg-theme-surface-secondary"
                            :class="{ 'dropdown-item--active': theme.key === boardStore.currentThemeKey }"
                            @click="selectTheme(theme.key)"
                        >
                            <div class="theme-preview">
                                <div class="theme-square theme-square--light" :style="{ backgroundColor: theme.preview.light }"></div>
                                <div class="theme-square theme-square--dark" :style="{ backgroundColor: theme.preview.dark }"></div>
                            </div>
                            <div class="dropdown-item-content">
                                <span class="dropdown-item-name text-theme-primary">{{ theme.name }}</span>
                                <span class="dropdown-item-desc text-theme-secondary">{{ theme.hasTexture ? 'Mit Textur' : 'Einfarbig' }}</span>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Audio Dropdown -->
                <div class="nav-item dropdown" :class="{ 'dropdown--open': showAudioDropdown }">
                    <button
                        class="dropdown-btn nav-btn"
                        :class="{ 'nav-btn--active': isSoundEnabled }"
                        @click="showAudioDropdown = !showAudioDropdown"
                        @blur="closeAudioDropdownDelayed"
                    >
                        <span class="btn-icon">{{ isSoundEnabled ? '🔊' : '🔇' }}</span>
                        <span class="btn-text text-theme-secondary">Audio</span>
                        <svg class="dropdown-icon" viewBox="0 0 20 20">
                            <path fill="currentColor" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                        </svg>
                    </button>

                    <div v-if="showAudioDropdown" class="dropdown-menu bg-theme-surface border border-theme shadow-lg">
                        <div class="audio-controls">
                            <div class="audio-control-item">
                                <label class="toggle-control">
                                    <input
                                        type="checkbox"
                                        :checked="isSoundEnabled"
                                        @change="handleToggleSound"
                                    />
                                    <span class="toggle-slider"></span>
                                    <span class="toggle-label text-theme-primary">Sound aktiviert</span>
                                </label>
                            </div>

                            <div class="audio-control-item" v-if="isSoundEnabled">
                                <label class="volume-control">
                                    <span class="volume-label text-theme-primary">Lautstärke</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        :value="currentVolume"
                                        @input="handleVolumeChange"
                                        class="volume-slider"
                                    />
                                    <span class="volume-value text-theme-secondary">{{ Math.round(currentVolume * 100) }}%</span>
                                </label>
                            </div>

                            <div class="audio-control-item" v-if="isSoundEnabled">
                                <button class="test-sound-btn bg-theme-surface-secondary hover:bg-theme-surface text-theme-primary border border-theme">
                                    🎵 Sound testen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Dropdown -->
                <div class="nav-item dropdown" :class="{ 'dropdown--open': showSettingsDropdown }">
                    <button
                        class="dropdown-btn nav-btn"
                        @click="showSettingsDropdown = !showSettingsDropdown"
                        @blur="closeSettingsDropdownDelayed"
                    >
                        <span class="btn-icon">⚙️</span>
                        <span class="btn-text text-theme-secondary">Einstellungen</span>
                        <svg class="dropdown-icon" viewBox="0 0 20 20">
                            <path fill="currentColor" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                        </svg>
                    </button>

                    <div v-if="showSettingsDropdown" class="dropdown-menu bg-theme-surface border border-theme shadow-lg">
                        <div class="settings-section">
                            <h4 class="settings-title text-theme-primary">Brett-Einstellungen</h4>

                            <label class="toggle-control">
                                <input
                                    type="checkbox"
                                    :checked="configStore.showCoordinates"
                                    @change="toggleCoordinates"
                                />
                                <span class="toggle-slider"></span>
                                <span class="toggle-label text-theme-primary">Koordinaten anzeigen</span>
                            </label>

                            <label class="toggle-control">
                                <input
                                    type="checkbox"
                                    :checked="boardStore.settings.showLegalMoves"
                                    @change="toggleLegalMoves"
                                />
                                <span class="toggle-slider"></span>
                                <span class="toggle-label text-theme-primary">Legale Züge anzeigen</span>
                            </label>

                            <label class="toggle-control">
                                <input
                                    type="checkbox"
                                    :checked="boardStore.settings.highlightLastMove"
                                    @change="toggleLastMoveHighlight"
                                />
                                <span class="toggle-slider"></span>
                                <span class="toggle-label text-theme-primary">Letzten Zug hervorheben</span>
                            </label>

                            <label class="toggle-control">
                                <input
                                    type="checkbox"
                                    :checked="boardStore.settings.animateCaptures"
                                    @change="toggleAnimations"
                                />
                                <span class="toggle-slider"></span>
                                <span class="toggle-label text-theme-primary">Animationen</span>
                            </label>
                        </div>

                        <div class="settings-section">
                            <h4 class="settings-title text-theme-primary">Sidebar-Einstellungen</h4>

                            <label class="toggle-control">
                                <input
                                    type="checkbox"
                                    :checked="props.showBoardInfo"
                                    @change="toggleBoardInfo"
                                />
                                <span class="toggle-slider"></span>
                                <span class="toggle-label text-theme-primary">Board-Info anzeigen</span>
                            </label>
                        </div>

                        <div class="settings-section">
                            <h4 class="settings-title text-theme-primary">Brett-Größe</h4>
                            <div class="size-options">
                                <button
                                    v-for="size in availableBoardSizes"
                                    :key="size.key"
                                    class="size-option bg-theme-surface-secondary hover:bg-theme-surface text-theme-primary border border-theme"
                                    :class="{ 'size-option--active': size.key === boardStore.settings.boardSizeMode }"
                                    @click="selectBoardSize(size.key)"
                                >
                                    {{ size.name }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Brett Steuerung -->
                <div class="nav-item">
                    <button class="nav-btn control-btn" @click="handleFlipBoard" title="Brett drehen">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text text-theme-secondary">Drehen</span>
                    </button>
                </div>

                <!-- Auto-Reverse Toggle -->
                <div class="nav-item">
                    <label class="toggle-control" title="Brett automatisch nach jedem Zug drehen">
                        <input
                            type="checkbox"
                            v-model="configStore.autoReverse"
                            :disabled="!configStore.gameModeSettings.allowAutoReverse"
                        />
                        <span class="toggle-slider"></span>
                        <span class="text-theme-secondary">Auto-Reverse</span>
                    </label>
                </div>

            </nav>

            <!-- Game Info and Controls -->
            <div class="game-info-controls">

                <!-- Game Controls -->
                <div class="game-controls">
                    <!-- Move Navigation -->
                    <div class="move-navigation">
                        <button
                            @click="handleUndo"
                            :disabled="!canUndo"
                            class="nav-control-btn"
                            :class="{ 'btn-disabled': !canUndo }"
                            title="Zug zurücknehmen"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                            </svg>
                        </button>

                        <button
                            @click="handleRedo"
                            :disabled="!canRedo"
                            class="nav-control-btn"
                            :class="{ 'btn-disabled': !canRedo }"
                            title="Zug wiederholen"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- Game Actions -->
                    <div class="game-actions">
                        <button
                            v-if="gameStore.isGameActive"
                            @click="handleOfferDraw"
                            class="action-control-btn draw-btn"
                            :disabled="showDrawOffer"
                            :class="{ 'btn-disabled': showDrawOffer }"
                            title="Remis anbieten"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                            </svg>
<!--
                            <span class="btn-text">{{ showDrawOffer ? 'Angeboten' : 'Remis' }}</span>
-->
                        </button>

                        <button
                            v-if="gameStore.isGameActive"
                            @click="handleResign"
                            class="action-control-btn resign-btn"
                            :class="{ 'confirm-btn': showConfirmResign }"
                            title="Aufgeben"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
                            </svg>
<!--
                            <span class="btn-text">{{ showConfirmResign ? 'Bestätigen?' : 'Aufgeben' }}</span>
-->
                        </button>
                    </div>
                </div>
            </div>

            <!-- Rechte Seite -->
            <div class="header-actions">
                <!-- Sidebar Toggle -->
                <button
                    v-if="showSidebarToggle"
                    class="action-btn hover:bg-theme-surface text-theme-secondary hover:text-theme-primary"
                    @click="emit('toggle-sidebar')"
                    title="Sidebar umschalten"
                >
                    <svg viewBox="0 0 24 24" class="btn-icon">
                        <path fill="currentColor" d="M3 3h18v18H3V3zm16 16V5H5v14h14zm-8-2H7v-2h4v2zm0-4H7V9h4v4z"/>
                    </svg>
                </button>

                <!-- Settings -->
                <button
                    v-if="showSettings"
                    class="action-btn hover:bg-theme-surface text-theme-secondary hover:text-theme-primary"
                    @click="emit('open-settings')"
                    title="Erweiterte Einstellungen"
                >
                    <svg viewBox="0 0 24 24" class="btn-icon">
                        <path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Click outside overlay -->
        <div
            v-if="showModeDropdown || showGameMenu || showThemeDropdown || showAudioDropdown || showSettingsDropdown"
            class="dropdown-overlay"
            @click="closeAllDropdowns"
        ></div>
    </header>

    <!-- New Game Modal -->
    <NewGameModal
        :show="showNewGameModal"
        @close="closeNewGameModal"
        @gameStarted="handleGameStarted"
    />
</template>

<style scoped>
.game-header {
    grid-area: header;
    backdrop-filter: blur(10px);
    padding: 0 0.1rem;
    position: relative;
    z-index: 30;
    justify-self: stretch;
    width: 100%;
    min-width: 1300px;
    max-width: 100vw;
    box-sizing: border-box;
    overflow: visible;
    margin: 0;
}

.header-content {
    display: flex;
    align-items: center;
    padding: 0;
    width: 100%;
    box-sizing: border-box;
    justify-content: space-between;
    min-width: 0;
}

/* Navigation */
.header-nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 0 0 auto;
}

/* Header Actions */
.header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: auto;
    padding-right: 0.5rem;
}

.nav-item {
    position: relative;
}

/* Buttons */
.nav-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    transition: all 200ms ease;
}

.nav-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.2);
    color: #2563eb;
}

.nav-btn--active {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: #2563eb;
}

.control-btn:hover {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
}

.btn-icon {
    font-size: 1rem;
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-text {
    white-space: nowrap;
}

/* Dropdown */
.dropdown {
    position: relative;
}

.dropdown-icon {
    width: 1rem;
    height: 1rem;
    transition: transform 200ms ease;
}

.dropdown--open .dropdown-icon {
    transform: rotate(180deg);
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 200;
    min-width: 200px;
    margin-top: 0.25rem;
    overflow: hidden;
    max-height: 400px;
    overflow-y: auto;
}

.dropdown-menu--wide {
    min-width: 280px;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.875rem;
    text-align: left;
    transition: background 150ms ease;
}

.dropdown-item:hover:not(.dropdown-item--disabled) {
    background: rgba(59, 130, 246, 0.05);
}

.dropdown-item--active {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
}

.dropdown-item-icon {
    font-size: 1rem;
    width: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dropdown-item-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.dropdown-item-name {
    font-weight: 500;
    color: #374151;
}

.dropdown-item-desc {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.2;
}

/* Theme-spezifische Styles */
.theme-item {
    padding: 0.5rem 1rem;
}

.theme-preview {
    display: flex;
    gap: 0.25rem;
    margin-right: 0.5rem;
}

.theme-square {
    width: 1rem;
    height: 1rem;
    border-radius: 0.125rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-square--light {
    /* Background wird durch :style gesetzt */
}

.theme-square--dark {
    /* Background wird durch :style gesetzt */
}

/* Audio Controls */
.audio-controls {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.audio-control-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.volume-control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.volume-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
}

.volume-slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #e5e7eb;
    outline: none;
    appearance: none;
}

.volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
}

.volume-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
}

.volume-value {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: center;
}

.test-sound-btn {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: #f9fafb;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 150ms ease;
}

.test-sound-btn:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
}

/* Settings Sections */
.settings-section {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
}

.settings-section:last-child {
    border-bottom: none;
}

.settings-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
}

.size-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.size-option {
    padding: 0.375rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 150ms ease;
}

.size-option:hover {
    background: #f9fafb;
    border-color: #d1d5db;
}

.size-option--active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
}

/* Toggle Control */
.toggle-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem 0;
}

.toggle-control input {
    display: none;
}

.toggle-slider {
    width: 2.25rem;
    height: 1.25rem;
    background: #d1d5db;
    border-radius: 0.625rem;
    position: relative;
    transition: all 200ms ease;
    flex-shrink: 0;
}

.toggle-control input:checked + .toggle-slider {
    background: #3b82f6;
}

.toggle-control input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
}

.toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 1rem;
    height: 1rem;
    background: white;
    border-radius: 50%;
    transition: transform 200ms ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-control input:checked + .toggle-slider::after {
    transform: translateX(1rem);
}

.toggle-label {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
    white-space: nowrap;
}

.status-indicator {
    padding: 0.375rem 0.75rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.375rem;
}

.status-text {
    font-size: 0.8125rem;
    color: #6b7280;
    font-weight: 500;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
    color: #6b7280;
    transition: all 200ms ease;
}

.action-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #374151;
}

.action-btn .btn-icon {
    width: 1.125rem;
    height: 1.125rem;
}

/* Game Info and Controls */
.game-info-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-left: 1rem;
    margin-right: 1rem;
    flex: 1;
}

.game-status-display {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.375rem;
    transition: all 0.2s ease;
}

.status-active {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.status-check {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    animation: pulse 1.5s infinite;
}

.status-finished {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
}

.status-indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
}

.status-active .status-indicator-dot {
    animation: pulse 2s infinite;
}

.move-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 0.375rem;
    color: #3b82f6;
}

.move-label {
    font-size: 0.75rem;
    font-weight: 500;
}

.move-number {
    font-weight: 600;
}

.game-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: auto;
}

.move-navigation {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.nav-control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    background: rgba(0, 0, 0, 0.05);
    color: #4b5563;
    transition: all 0.2s ease;
}

.nav-control-btn:hover:not(.btn-disabled) {
    background: rgba(0, 0, 0, 0.1);
    color: #1f2937;
}

.btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.game-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.action-control-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.draw-btn {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
}

.draw-btn:hover:not(.btn-disabled) {
    background: rgba(107, 114, 128, 0.2);
    color: #4b5563;
}

.resign-btn {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.resign-btn:hover {
    background: rgba(239, 68, 68, 0.2);
}

.confirm-btn {
    background: #ef4444;
    color: white;
    animation: pulse 1.5s infinite;
}

.confirm-btn:hover {
    background: #dc2626;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}

/* Responsive Game Info and Controls */
@media (max-width: 1024px) {
    .game-info-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 0.5rem 0;
    }

    .game-controls {
        width: 100%;
        justify-content: space-between;
    }

    .btn-text {
        display: none;
    }
}

@media (max-width: 768px) {
    .game-info-controls {
        display: none;
    }
}

/* Dropdown Overlay */
.dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 150;
}

/* Mobile Menu Button */
.mobile-menu-button {
    display: none;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: all 200ms ease;
}

.mobile-menu-button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #374151;
}

/* Responsive */
@media (max-width: 1300px) {
    .game-header {
        min-width: auto;
    }

    .logo-image {
        width: 4rem;
        height: 4rem;
    }
}

@media (max-width: 1024px) {
    .header-content {
        padding: 0.75rem 1rem;
    }

    .header-actions {
        margin-left: 0;
    }

    .header-nav {
        gap: 0.75rem;
    }

    .btn-text {
        display: none;
    }

    .toggle-label {
        display: none;
    }

    .dropdown-menu {
        right: 0;
        left: auto;
    }

    .logo-image {
        width: 3.5rem;
        height: 3.5rem;
    }
}

@media (max-width: 768px) {
    .mobile-menu-button {
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }

    .header-content {
        padding: 0.5rem 0.75rem;
    }

    .header-nav {
        display: none;
    }

    .header-nav--mobile-open {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 1rem;
        position: fixed;
        top: 70px; /* Höhe des Headers anpassen */
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-top: none;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        gap: 1rem;
    }

    .nav-item {
        width: 100%;
    }

    .dropdown-btn {
        width: 100%;
        justify-content: flex-start;
    }

    .btn-text {
        display: inline;
    }

    .dropdown-menu {
        position: static;
        width: 100%;
        box-shadow: none;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .logo-image {
        width: 3rem;
        height: 3rem;
    }
}

@media (max-width: 640px) {
    .header-content {
        padding: 0.5rem 0.75rem;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .header-actions {
        margin-left: 0;
    }

    .status-indicator {
        display: none;
    }

    .logo-image {
        width: 2.5rem;
        height: 2.5rem;
    }
}
</style>
