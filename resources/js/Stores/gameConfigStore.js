import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameConfigStore = defineStore('gameConfig', () => {
    // ===== STATE =====
    const gameMode = ref('local-pvp') // 'local-pvp', 'online-pvp', 'vs-ai', 'analysis'
    const autoReverse = ref(false)
    const boardOrientation = ref('white') // 'white', 'black'
    const reverseOnMove = ref(false)

    // Weitere Konfigurationen
    const allowUndo = ref(true)
    const showCoordinates = ref(true)
    const soundEnabled = ref(true)

    // ===== COMPUTED =====
    const gameModeSettings = computed(() => {
        const modes = {
            'local-pvp': {
                name: 'Lokales PvP',
                description: 'Zwei Spieler am gleichen Gerät',
                allowAutoReverse: true,
                allowUndo: true,
                icon: '👥'
            },
            'online-pvp': {
                name: 'Online PvP',
                description: 'Spiel gegen andere online',
                allowAutoReverse: false,
                allowUndo: false,
                icon: '🌐'
            },
            'vs-ai': {
                name: 'Gegen KI',
                description: 'Spiel gegen Computer',
                allowAutoReverse: false,
                allowUndo: true,
                icon: '🤖'
            },
            'analysis': {
                name: 'Analyse-Modus',
                description: 'Position analysieren',
                allowAutoReverse: true,
                allowUndo: true,
                icon: '🔍'
            }
        }
        return modes[gameMode.value] || modes['local-pvp']
    })

    const shouldAutoReverse = computed(() => {
        return autoReverse.value && gameModeSettings.value.allowAutoReverse
    })

    // ===== ACTIONS =====
    const setGameMode = (mode) => {
        if (!['local-pvp', 'online-pvp', 'vs-ai', 'analysis'].includes(mode)) {
            console.warn('Ungültiger Spielmodus:', mode)
            return
        }

        gameMode.value = mode

        // Auto-Reverse deaktivieren wenn nicht erlaubt
        if (!gameModeSettings.value.allowAutoReverse) {
            autoReverse.value = false
        }

        console.log('🎮 Spielmodus geändert zu:', mode)
    }

    const toggleAutoReverse = () => {
        if (!gameModeSettings.value.allowAutoReverse) {
            console.warn('Auto-Reverse nicht verfügbar im aktuellen Modus')
            return false
        }

        autoReverse.value = !autoReverse.value
        console.log('🔄 Auto-Reverse:', autoReverse.value ? 'aktiviert' : 'deaktiviert')
        return autoReverse.value
    }

    const setBoardOrientation = (orientation) => {
        if (!['white', 'black'].includes(orientation)) {
            console.warn('Ungültige Brett-Orientierung:', orientation)
            return
        }

        boardOrientation.value = orientation
        console.log('🔄 Brett-Orientierung geändert zu:', orientation)
    }

    const flipBoard = () => {
        const newOrientation = boardOrientation.value === 'white' ? 'black' : 'white'
        setBoardOrientation(newOrientation)
        return newOrientation
    }

    const resetConfig = () => {
        gameMode.value = 'local-pvp'
        autoReverse.value = false
        boardOrientation.value = 'white'
        reverseOnMove.value = false
        allowUndo.value = true
        showCoordinates.value = true
        soundEnabled.value = true
    }

    return {
        // State
        gameMode,
        autoReverse,
        boardOrientation,
        reverseOnMove,
        allowUndo,
        showCoordinates,
        soundEnabled,

        // Computed
        gameModeSettings,
        shouldAutoReverse,

        // Actions
        setGameMode,
        toggleAutoReverse,
        setBoardOrientation,
        flipBoard,
        resetConfig
    }
})
