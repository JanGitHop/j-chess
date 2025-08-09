<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChessTimerStore, TIME_CONTROL_TYPES } from '@/Stores/chessTimerStore.js'
import { useGameStore } from '@/Stores/gameStore.js'
import { GAME_MODES } from '@/Utils/chessConstants.js'

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['close', 'gameStarted'])

// Stores
const timerStore = useChessTimerStore()
const gameStore = useGameStore()

// Local Form State (basierend auf Store-Werten)
const gameMode = ref(gameStore.gameMode)
const timeControl = ref(timerStore.currentTimeControl)
const whitePlayerName = ref(gameStore.whitePlayer || 'Weiß')
const blackPlayerName = ref(gameStore.blackPlayer || 'Schwarz')

// Custom Time Control (basierend auf Store)
const customTimeControl = ref({
    initialTime: timerStore.customTimeControl.initialTime / 60, // Minuten für UI
    increment: timerStore.customTimeControl.increment,
    delay: timerStore.customTimeControl.delay
})

const showCustomTimeSettings = computed(() => {
    return timeControl.value === 'custom'
})

// Verfügbare Spielmodi
const availableGameModes = computed(() => [
    { id: GAME_MODES.LOCAL_PVP, name: 'Local PvP', icon: '👥', description: 'Zwei Spieler am selben Gerät' },
    { id: GAME_MODES.VS_AI, name: 'vs KI', icon: '🤖', description: 'Gegen Computer', disabled: true },
    { id: GAME_MODES.ANALYSIS, name: 'Analyse', icon: '📊', description: 'Stellungsanalyse' }
])

// Zeitkontroll-Presets vom Store
const timeControlPresets = computed(() => {
    return Object.entries(timerStore.TIME_CONTROL_PRESETS).map(([key, preset]) => ({
        id: key,
        ...preset
    }))
})

// Spiel starten
const startGame = async () => {
    try {
        // 1. Timer Store konfigurieren
        if (timeControl.value === 'custom') {
            timerStore.setTimeControl('custom', {
                name: 'Custom',
                description: 'Benutzerdefinierte Zeit',
                initialTime: customTimeControl.value.initialTime * 60, // Zurück zu Sekunden
                increment: customTimeControl.value.increment,
                delay: customTimeControl.value.delay
            })
        } else {
            timerStore.setTimeControl(timeControl.value)
        }

        // 2. Game Store konfigurieren
        await gameStore.initializeGame({
            mode: gameMode.value,
            whitePlayer: whitePlayerName.value.trim() || 'Weiß',
            blackPlayer: blackPlayerName.value.trim() || 'Schwarz',
            gameId: `game_${Date.now()}`
        })

        // 3. Timer initialisieren
        timerStore.initializeTimer()

        // 4. Modal schließen und Event emittieren
        emit('gameStarted', {
            gameId: gameStore.gameId,
            gameMode: gameMode.value,
            timeControl: timeControl.value,
            players: {
                white: whitePlayerName.value.trim() || 'Weiß',
                black: blackPlayerName.value.trim() || 'Schwarz'
            }
        })

        closeModal()

        console.log('Neues Spiel gestartet:', {
            gameMode: gameMode.value,
            timeControl: timeControl.value,
            timer: timerStore.effectiveTimeControl
        })

    } catch (error) {
        console.error('Fehler beim Starten des Spiels:', error)
    }
}

// Form-Werte bei Store-Änderungen aktualisieren
const resetFormToStoreValues = () => {
    gameMode.value = gameStore.gameMode
    timeControl.value = timerStore.currentTimeControl
    whitePlayerName.value = gameStore.whitePlayer || 'Weiß'
    blackPlayerName.value = gameStore.blackPlayer || 'Schwarz'

    customTimeControl.value = {
        initialTime: timerStore.customTimeControl.initialTime / 60,
        increment: timerStore.customTimeControl.increment,
        delay: timerStore.customTimeControl.delay
    }
}

// Modal schließen
const closeModal = () => {
    emit('close')
}

// Keyboard Handler
const handleKeydown = (event) => {
    if (event.key === 'Escape') {
        closeModal()
    }
}

const handleStartGame = () => {
    const gameData = {
        gameMode: selectedGameMode.value,
        whitePlayer: whitePlayerName.value,
        blackPlayer: blackPlayerName.value,
        timeControl: selectedTimeControl.value,
        customTimeControl: customTimeControl.value,
        startTimer: true
    }

    console.log('Spiel-Daten mit Timer:', gameData)
    emit('game-started', gameData)
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    // Form mit aktuellen Store-Werten initialisieren
    resetFormToStoreValues()
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
    <div v-if="show" class="modal-overlay" @click="closeModal">
        <div class="modal-container" @click.stop>
            <!-- Header -->
            <div class="modal-header">
                <h2 class="modal-title">Neues Spiel</h2>
                <button class="close-button" @click="closeModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="modal-content">
                <!-- Spielmodus Section -->
                <div class="form-section">
                    <h3 class="section-title">Spielmodus</h3>
                    <div class="option-grid">
                        <button
                            v-for="mode in availableGameModes"
                            :key="mode.id"
                            class="option-button"
                            :class="{
                                'option-button--active': gameMode === mode.id,
                                'option-button--disabled': mode.disabled
                            }"
                            @click="!mode.disabled && (gameMode = mode.id)"
                            :disabled="mode.disabled"
                        >
                            <span class="option-icon">{{ mode.icon }}</span>
                            <div class="option-info">
                                <span class="option-name">{{ mode.name }}</span>
                                <span class="option-description">{{ mode.description }}</span>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Zeitkontrolle Section -->
                <div class="form-section">
                    <h3 class="section-title">Zeitkontrolle</h3>
                    <div class="time-control-grid">
                        <button
                            v-for="preset in timeControlPresets"
                            :key="preset.id"
                            class="time-control-button"
                            :class="{ 'time-control-button--active': timeControl === preset.id }"
                            @click="timeControl = preset.id"
                        >
                            <span class="time-control-icon">{{ preset.icon }}</span>
                            <div class="time-control-info">
                                <span class="time-control-name">{{ preset.name }}</span>
                                <span class="time-control-description">{{ preset.description }}</span>
                            </div>
                        </button>
                    </div>

                    <!-- Custom Time Settings -->
                    <div v-if="showCustomTimeSettings" class="custom-time-settings">
                        <div class="custom-time-row">
                            <div class="input-group">
                                <label class="input-label">Zeit (Minuten)</label>
                                <input
                                    v-model.number="customTimeControl.initialTime"
                                    type="number"
                                    min="1"
                                    max="180"
                                    class="time-input"
                                />
                            </div>
                            <div class="input-group">
                                <label class="input-label">Increment (Sekunden)</label>
                                <input
                                    v-model.number="customTimeControl.increment"
                                    type="number"
                                    min="0"
                                    max="60"
                                    class="time-input"
                                />
                            </div>
                            <div class="input-group">
                                <label class="input-label">Delay (Sekunden)</label>
                                <input
                                    v-model.number="customTimeControl.delay"
                                    type="number"
                                    min="0"
                                    max="60"
                                    class="time-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Spielernamen Section -->
                <div class="form-section">
                    <h3 class="section-title">Spielernamen</h3>
                    <div class="player-names">
                        <div class="input-group">
                            <label class="input-label">Weiß</label>
                            <input
                                v-model="whitePlayerName"
                                type="text"
                                placeholder="Spielername..."
                                class="player-input"
                                maxlength="20"
                            />
                        </div>
                        <div class="input-group">
                            <label class="input-label">Schwarz</label>
                            <input
                                v-model="blackPlayerName"
                                type="text"
                                placeholder="Spielername..."
                                class="player-input"
                                maxlength="20"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
                <button class="button button--secondary" @click="closeModal">
                    Abbrechen
                </button>
                <button class="button button--primary" @click="startGame">
                    Spiel starten
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 200ms ease;
}

/* Modal Container */
.modal-container {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    animation: slideIn 250ms ease;
}

/* Modal Header */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #333;
}

.modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
}

.close-button {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 200ms ease;
}

.close-button:hover {
    color: #fff;
    background: #333;
}

.close-button svg {
    width: 20px;
    height: 20px;
}

/* Modal Content */
.modal-content {
    padding: 24px;
}

/* Form Sections */
.form-section {
    margin-bottom: 32px;
}

.form-section:last-child {
    margin-bottom: 0;
}

.section-title {
    font-size: 1.1rem;
    font-weight: 500;
    color: #ffffff;
    margin: 0 0 16px 0;
}

/* Option Grid (Spielmodus) */
.option-grid {
    display: grid;
    gap: 12px;
}

.option-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 200ms ease;
    text-align: left;
}

.option-button:hover:not(.option-button--disabled) {
    background: #333;
    border-color: #555;
}

.option-button--active {
    background: #333;
    border-color: #666;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.option-button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.option-icon {
    font-size: 1.5rem;
    width: 32px;
    text-align: center;
}

.option-info {
    display: flex;
    flex-direction: column;
}

.option-name {
    font-weight: 500;
    color: #ffffff;
    margin-bottom: 2px;
}

.option-description {
    font-size: 0.875rem;
    color: #999;
}

/* Time Control Grid */
.time-control-grid {
    display: grid;
    gap: 8px;
}

.time-control-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 6px;
    cursor: pointer;
    transition: all 200ms ease;
    text-align: left;
}

.time-control-button:hover {
    background: #333;
    border-color: #555;
}

.time-control-button--active {
    background: #333;
    border-color: #666;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.time-control-icon {
    font-size: 1.25rem;
    width: 24px;
    text-align: center;
}

.time-control-info {
    display: flex;
    flex-direction: column;
}

.time-control-name {
    font-weight: 500;
    color: #ffffff;
    margin-bottom: 2px;
}

.time-control-description {
    font-size: 0.875rem;
    color: #999;
}

/* Custom Time Settings */
.custom-time-settings {
    margin-top: 16px;
    padding: 16px;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 6px;
}

.custom-time-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}

/* Input Groups */
.input-group {
    display: flex;
    flex-direction: column;
}

.input-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #ccc;
    margin-bottom: 6px;
}

.time-input,
.player-input {
    padding: 8px 12px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 4px;
    color: #ffffff;
    font-size: 0.875rem;
    transition: all 200ms ease;
}

.time-input:focus,
.player-input:focus {
    outline: none;
    border-color: #666;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.time-input {
    width: 100%;
}

/* Player Names */
.player-names {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

/* Modal Footer */
.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #333;
}

/* Buttons */
.button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 200ms ease;
    min-width: 100px;
}

.button--secondary {
    background: #2a2a2a;
    color: #ccc;
    border: 1px solid #333;
}

.button--secondary:hover {
    background: #333;
    color: #fff;
}

.button--primary {
    background: #333;
    color: #ffffff;
    border: 1px solid #555;
}

.button--primary:hover {
    background: #444;
    border-color: #666;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Responsive Design */
@media (max-width: 640px) {
    .modal-container {
        width: 95%;
        margin: 20px;
    }

    .custom-time-row {
        grid-template-columns: 1fr;
    }

    .player-names {
        grid-template-columns: 1fr;
    }

    .modal-header,
    .modal-content,
    .modal-footer {
        padding: 16px;
    }
}

/* Scrollbar Styling */
.modal-container::-webkit-scrollbar {
    width: 6px;
}

.modal-container::-webkit-scrollbar-track {
    background: #1a1a1a;
}

.modal-container::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
}

.modal-container::-webkit-scrollbar-thumb:hover {
    background: #444;
}
</style>
