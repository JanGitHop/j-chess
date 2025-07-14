/**
 * Chess Timer Store - Vollständige Zeitkontrolle für Schachspiele
 * Verwaltet Timer für beide Spieler, verschiedene Zeitkontroll-Modi und Increment-Funktionen
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// Zeit-Konstanten
export const TIME_CONTROL_TYPES = {
    UNLIMITED: 'unlimited',
    BLITZ: 'blitz',
    RAPID: 'rapid',
    CLASSICAL: 'classical',
    BULLET: 'bullet',
    CUSTOM: 'custom'
}

export const TIME_CONTROL_PRESETS = {
    [TIME_CONTROL_TYPES.UNLIMITED]: {
        name: 'Unbegrenzt',
        description: 'Keine Zeitbegrenzung',
        initialTime: null,
        increment: 0,
        delay: 0,
        icon: '∞'
    },
    [TIME_CONTROL_TYPES.BULLET]: {
        name: 'Bullet',
        description: '1 Minute pro Spieler',
        initialTime: 60, // 1 Minute
        increment: 0,
        delay: 0,
        icon: '⚡'
    },
    [TIME_CONTROL_TYPES.BLITZ]: {
        name: 'Blitz',
        description: '3 Minuten + 2 Sekunden pro Zug',
        initialTime: 180, // 3 Minuten
        increment: 2,
        delay: 0,
        icon: '⚡'
    },
    [TIME_CONTROL_TYPES.RAPID]: {
        name: 'Rapid',
        description: '10 Minuten pro Spieler',
        initialTime: 600, // 10 Minuten
        increment: 0,
        delay: 0,
        icon: '⏱️'
    },
    [TIME_CONTROL_TYPES.CLASSICAL]: {
        name: 'Classical',
        description: '30 Minuten + 30 Sekunden pro Zug',
        initialTime: 1800, // 30 Minuten
        increment: 30,
        delay: 0,
        icon: '⏰'
    }
}

export const TIMER_STATES = {
    STOPPED: 'stopped',
    RUNNING: 'running',
    PAUSED: 'paused',
    EXPIRED: 'expired'
}

export const TIMER_EVENTS = {
    TICK: 'tick',
    START: 'start',
    STOP: 'stop',
    PAUSE: 'pause',
    RESUME: 'resume',
    SWITCH: 'switch',
    EXPIRED: 'expired',
    LOW_TIME: 'low_time',
    CRITICAL_TIME: 'critical_time'
}

// Warnschwellen (in Sekunden)
export const WARNING_THRESHOLDS = {
    LOW_TIME: 60,      // 1 Minute
    CRITICAL_TIME: 10   // 10 Sekunden
}

export const useChessTimerStore = defineStore('chessTimer', () => {
    // ===== STATE =====

    // Timer-Konfiguration
    const currentTimeControl = ref(TIME_CONTROL_TYPES.UNLIMITED)
    const customTimeControl = ref({
        name: 'Custom',
        description: 'Benutzerdefinierte Zeit',
        initialTime: 300, // 5 Minuten Standard
        increment: 0,
        delay: 0
    })

    // Timer-Zustand
    const timerState = ref(TIMER_STATES.STOPPED)
    const activePlayer = ref('white') // 'white' oder 'black'

    // Zeit-Werte (in Sekunden)
    const whiteTime = ref(0)
    const blackTime = ref(0)

    // Original-Zeit für Reset
    const originalWhiteTime = ref(0)
    const originalBlackTime = ref(0)

    // Timer-Einstellungen
    const isIncludePreMove = ref(false)
    const showTenths = ref(false) // Zehntel-Sekunden anzeigen unter 10 Sekunden

    // Timer-Verlauf
    const moveTimings = ref([]) // Zeit pro Zug für beide Spieler
    const gameStartTime = ref(null)
    const totalGameTime = ref(0)

    // Internal Timer
    const intervalId = ref(null)
    const lastTickTime = ref(null)

    // Events & Callbacks
    const eventCallbacks = ref({})

    // ===== COMPUTED =====

    /**
     * Aktueller Zeitkontroll-Preset
     */
    const currentPreset = computed(() => {
        return TIME_CONTROL_PRESETS[currentTimeControl.value] || TIME_CONTROL_PRESETS[TIME_CONTROL_TYPES.UNLIMITED]
    })

    /**
     * Effektive Zeitkontroll-Einstellungen (berücksichtigt Custom-Modus)
     */
    const effectiveTimeControl = computed(() => {
        if (currentTimeControl.value === TIME_CONTROL_TYPES.CUSTOM) {
            return customTimeControl.value
        }
        return currentPreset.value
    })

    /**
     * Ist der Timer aktiv?
     */
    const isTimerActive = computed(() => {
        return timerState.value === TIMER_STATES.RUNNING
    })

    /**
     * Ist der Timer pausiert?
     */
    const isTimerPaused = computed(() => {
        return timerState.value === TIMER_STATES.PAUSED
    })

    /**
     * Ist Zeit unbegrenzt?
     */
    const isUnlimitedTime = computed(() => {
        return currentTimeControl.value === TIME_CONTROL_TYPES.UNLIMITED
    })

    /**
     * Formatierte Zeit für Weiß
     */
    const formattedWhiteTime = computed(() => {
        return formatTime(whiteTime.value)
    })

    /**
     * Formatierte Zeit für Schwarz
     */
    const formattedBlackTime = computed(() => {
        return formatTime(blackTime.value)
    })

    /**
     * Aktuelle Spieler-Zeit
     */
    const currentPlayerTime = computed(() => {
        return activePlayer.value === 'white' ? whiteTime.value : blackTime.value
    })

    /**
     * Formatierte aktuelle Spieler-Zeit
     */
    const formattedCurrentPlayerTime = computed(() => {
        return formatTime(currentPlayerTime.value)
    })

    /**
     * Warnstufe für aktuellen Spieler
     */
    const currentPlayerWarningLevel = computed(() => {
        const time = currentPlayerTime.value

        if (time <= WARNING_THRESHOLDS.CRITICAL_TIME) {
            return 'critical'
        } else if (time <= WARNING_THRESHOLDS.LOW_TIME) {
            return 'low'
        }
        return 'normal'
    })

    /**
     * Ist die Zeit des aktuellen Spielers kritisch?
     */
    const isCurrentPlayerTimeCritical = computed(() => {
        return currentPlayerWarningLevel.value === 'critical'
    })

    /**
     * Ist die Zeit des aktuellen Spielers niedrig?
     */
    const isCurrentPlayerTimeLow = computed(() => {
        return currentPlayerWarningLevel.value === 'low'
    })

    /**
     * Statistiken für den aktuellen Zug
     */
    const currentMoveStats = computed(() => {
        const lastMove = moveTimings.value[moveTimings.value.length - 1]
        return lastMove || null
    })

    /**
     * Durchschnittliche Zeit pro Zug
     */
    const averageMoveTime = computed(() => {
        if (moveTimings.value.length === 0) return 0

        const totalTime = moveTimings.value.reduce((sum, move) => sum + move.timeUsed, 0)
        return totalTime / moveTimings.value.length
    })

    /**
     * Gesamte verwendete Zeit
     */
    const totalUsedTime = computed(() => {
        const whiteUsed = originalWhiteTime.value - whiteTime.value
        const blackUsed = originalBlackTime.value - blackTime.value
        return whiteUsed + blackUsed
    })

    // ===== ACTIONS =====

    /**
     * Zeitkontrolle setzen
     * @param {string} timeControlType - TIME_CONTROL_TYPES
     * @param {object} customConfig - Für custom time control
     */
    const setTimeControl = (timeControlType, customConfig = null) => {
        if (!Object.values(TIME_CONTROL_TYPES).includes(timeControlType)) {
            console.warn('Ungültiger Zeitkontroll-Typ:', timeControlType)
            return
        }

        currentTimeControl.value = timeControlType

        if (timeControlType === TIME_CONTROL_TYPES.CUSTOM && customConfig) {
            customTimeControl.value = {
                name: customConfig.name || 'Custom',
                description: customConfig.description || 'Benutzerdefinierte Zeit',
                initialTime: customConfig.initialTime || 300,
                increment: customConfig.increment || 0,
                delay: customConfig.delay || 0
            }
        }

        // Timer zurücksetzen mit neuer Konfiguration
        resetTimer()

        console.log('Zeitkontrolle gesetzt:', timeControlType, effectiveTimeControl.value)
    }

    /**
     * Timer initialisieren
     */
    const initializeTimer = () => {
        const config = effectiveTimeControl.value

        if (config.initialTime) {
            whiteTime.value = config.initialTime
            blackTime.value = config.initialTime
            originalWhiteTime.value = config.initialTime
            originalBlackTime.value = config.initialTime
        } else {
            // Unlimited time
            whiteTime.value = 0
            blackTime.value = 0
            originalWhiteTime.value = 0
            originalBlackTime.value = 0
        }

        timerState.value = TIMER_STATES.STOPPED
        activePlayer.value = 'white'
        moveTimings.value = []
        gameStartTime.value = null
        totalGameTime.value = 0

        console.log('Timer initialisiert:', config)
    }

    /**
     * Timer starten
     */
    const startTimer = () => {
        if (isUnlimitedTime.value) {
            console.log('Timer ist unbegrenzt - kein Start erforderlich')
            return
        }

        if (timerState.value === TIMER_STATES.RUNNING) {
            console.log('Timer läuft bereits')
            return
        }

        timerState.value = TIMER_STATES.RUNNING
        lastTickTime.value = performance.now()
        gameStartTime.value = gameStartTime.value || new Date()

        // Interval für Timer-Updates
        intervalId.value = setInterval(() => {
            tick()
        }, 100) // 10 FPS für flüssige Anzeige

        emitEvent(TIMER_EVENTS.START, {
            activePlayer: activePlayer.value,
            timeControl: effectiveTimeControl.value
        })

        console.log('Timer gestartet für:', activePlayer.value)
    }

    /**
     * Timer pausieren
     */
    const pauseTimer = () => {
        if (!isTimerActive.value) return

        timerState.value = TIMER_STATES.PAUSED

        if (intervalId.value) {
            clearInterval(intervalId.value)
            intervalId.value = null
        }

        emitEvent(TIMER_EVENTS.PAUSE, {
            activePlayer: activePlayer.value,
            remainingTime: currentPlayerTime.value
        })

        console.log('Timer pausiert')
    }

    /**
     * Timer fortsetzen
     */
    const resumeTimer = () => {
        if (timerState.value !== TIMER_STATES.PAUSED) return

        timerState.value = TIMER_STATES.RUNNING
        lastTickTime.value = performance.now()

        intervalId.value = setInterval(() => {
            tick()
        }, 100)

        emitEvent(TIMER_EVENTS.RESUME, {
            activePlayer: activePlayer.value,
            remainingTime: currentPlayerTime.value
        })

        console.log('Timer fortgesetzt')
    }

    /**
     * Timer stoppen
     */
    const stopTimer = () => {
        timerState.value = TIMER_STATES.STOPPED

        if (intervalId.value) {
            clearInterval(intervalId.value)
            intervalId.value = null
        }

        emitEvent(TIMER_EVENTS.STOP, {
            finalTimes: {
                white: whiteTime.value,
                black: blackTime.value
            },
            totalGameTime: totalGameTime.value
        })

        console.log('Timer gestoppt')
    }

    /**
     * Timer zurücksetzen
     */
    const resetTimer = () => {
        stopTimer()
        initializeTimer()

        console.log('Timer zurückgesetzt')
    }

    /**
     * Spieler wechseln (nach einem Zug)
     * @param {number} moveStartTime - Zeitpunkt des Zugbeginns
     */
    const switchPlayer = (moveStartTime = null) => {
        if (isUnlimitedTime.value) return

        const moveEndTime = performance.now()
        const previousPlayer = activePlayer.value

        // Zeit für den Zug berechnen
        let moveTime = 0
        if (moveStartTime) {
            moveTime = (moveEndTime - moveStartTime) / 1000 // in Sekunden
        }

        // Increment hinzufügen
        const increment = effectiveTimeControl.value.increment || 0
        if (increment > 0) {
            if (activePlayer.value === 'white') {
                whiteTime.value += increment
            } else {
                blackTime.value += increment
            }
        }

        // Move-Timing speichern
        moveTimings.value.push({
            player: previousPlayer,
            moveNumber: Math.ceil(moveTimings.value.length / 2) + 1,
            timeUsed: moveTime,
            timeRemaining: currentPlayerTime.value,
            increment: increment,
            timestamp: new Date()
        })

        // Spieler wechseln
        activePlayer.value = activePlayer.value === 'white' ? 'black' : 'white'
        lastTickTime.value = performance.now()

        emitEvent(TIMER_EVENTS.SWITCH, {
            fromPlayer: previousPlayer,
            toPlayer: activePlayer.value,
            moveTime: moveTime,
            increment: increment
        })

        console.log(`Spieler gewechselt: ${previousPlayer} -> ${activePlayer.value}`)
    }

    /**
     * Timer Tick - wird alle 100ms aufgerufen
     */
    const tick = () => {
        if (!isTimerActive.value || isUnlimitedTime.value) return

        const now = performance.now()
        const deltaTime = (now - lastTickTime.value) / 1000 // in Sekunden
        lastTickTime.value = now

        // Zeit vom aktuellen Spieler abziehen
        if (activePlayer.value === 'white') {
            whiteTime.value = Math.max(0, whiteTime.value - deltaTime)
        } else {
            blackTime.value = Math.max(0, blackTime.value - deltaTime)
        }

        totalGameTime.value += deltaTime

        // Überprüfung auf Zeitablauf
        if (currentPlayerTime.value <= 0) {
            handleTimeExpired()
            return
        }

        // Warnungen für niedrige Zeit
        const warningLevel = currentPlayerWarningLevel.value
        if (warningLevel === 'critical') {
            emitEvent(TIMER_EVENTS.CRITICAL_TIME, {
                player: activePlayer.value,
                remainingTime: currentPlayerTime.value
            })
        } else if (warningLevel === 'low') {
            emitEvent(TIMER_EVENTS.LOW_TIME, {
                player: activePlayer.value,
                remainingTime: currentPlayerTime.value
            })
        }

        emitEvent(TIMER_EVENTS.TICK, {
            activePlayer: activePlayer.value,
            whiteTime: whiteTime.value,
            blackTime: blackTime.value,
            totalGameTime: totalGameTime.value
        })
    }

    /**
     * Behandlung von Zeitablauf
     */
    const handleTimeExpired = () => {
        timerState.value = TIMER_STATES.EXPIRED

        if (intervalId.value) {
            clearInterval(intervalId.value)
            intervalId.value = null
        }

        emitEvent(TIMER_EVENTS.EXPIRED, {
            player: activePlayer.value,
            winner: activePlayer.value === 'white' ? 'black' : 'white'
        })

        console.log(`Zeit abgelaufen für ${activePlayer.value}`)
    }

    /**
     * Zeit manuell hinzufügen (z.B. für Zeitstrafen)
     * @param {string} player - 'white' oder 'black'
     * @param {number} seconds - Sekunden (positiv oder negativ)
     */
    const addTime = (player, seconds) => {
        if (player === 'white') {
            whiteTime.value = Math.max(0, whiteTime.value + seconds)
        } else {
            blackTime.value = Math.max(0, blackTime.value + seconds)
        }

        console.log(`Zeit hinzugefügt: ${seconds}s für ${player}`)
    }

    /**
     * Event-Callback registrieren
     * @param {string} event - TIMER_EVENTS
     * @param {function} callback - Callback-Funktion
     */
    const on = (event, callback) => {
        if (!eventCallbacks.value[event]) {
            eventCallbacks.value[event] = []
        }
        eventCallbacks.value[event].push(callback)
    }

    /**
     * Event-Callback entfernen
     * @param {string} event - TIMER_EVENTS
     * @param {function} callback - Callback-Funktion
     */
    const off = (event, callback) => {
        if (eventCallbacks.value[event]) {
            eventCallbacks.value[event] = eventCallbacks.value[event].filter(cb => cb !== callback)
        }
    }

    /**
     * Event auslösen
     * @param {string} event - TIMER_EVENTS
     * @param {object} data - Event-Daten
     */
    const emitEvent = (event, data) => {
        if (eventCallbacks.value[event]) {
            eventCallbacks.value[event].forEach(callback => {
                try {
                    callback(data)
                } catch (error) {
                    console.error('Fehler im Timer-Event-Callback:', error)
                }
            })
        }
    }

    // ===== HELPER FUNCTIONS =====

    /**
     * Zeit formatieren
     * @param {number} seconds - Sekunden
     * @returns {string} Formatierte Zeit
     */
    const formatTime = (seconds) => {
        if (isUnlimitedTime.value) return '∞'

        const totalSeconds = Math.floor(seconds)
        const minutes = Math.floor(totalSeconds / 60)
        const remainingSeconds = totalSeconds % 60

        // Stunden anzeigen wenn > 60 Minuten
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60)
            const remainingMinutes = minutes % 60
            return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
        }

        // Zehntel-Sekunden anzeigen bei kritischer Zeit
        if (seconds < 10 && showTenths.value) {
            const tenths = Math.floor((seconds % 1) * 10)
            return `${remainingSeconds}.${tenths}`
        }

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    /**
     * Spielstatistiken abrufen
     * @returns {object} Detaillierte Spielstatistiken
     */
    const getGameStats = () => {
        const whiteMoves = moveTimings.value.filter(move => move.player === 'white')
        const blackMoves = moveTimings.value.filter(move => move.player === 'black')

        const whiteAverage = whiteMoves.length > 0
            ? whiteMoves.reduce((sum, move) => sum + move.timeUsed, 0) / whiteMoves.length
            : 0

        const blackAverage = blackMoves.length > 0
            ? blackMoves.reduce((sum, move) => sum + move.timeUsed, 0) / blackMoves.length
            : 0

        return {
            totalMoves: moveTimings.value.length,
            gameTime: totalGameTime.value,
            timeControl: effectiveTimeControl.value,
            white: {
                timeUsed: originalWhiteTime.value - whiteTime.value,
                timeRemaining: whiteTime.value,
                averageMoveTime: whiteAverage,
                moveCount: whiteMoves.length,
                fastestMove: whiteMoves.length > 0 ? Math.min(...whiteMoves.map(m => m.timeUsed)) : 0,
                slowestMove: whiteMoves.length > 0 ? Math.max(...whiteMoves.map(m => m.timeUsed)) : 0
            },
            black: {
                timeUsed: originalBlackTime.value - blackTime.value,
                timeRemaining: blackTime.value,
                averageMoveTime: blackAverage,
                moveCount: blackMoves.length,
                fastestMove: blackMoves.length > 0 ? Math.min(...blackMoves.map(m => m.timeUsed)) : 0,
                slowestMove: blackMoves.length > 0 ? Math.max(...blackMoves.map(m => m.timeUsed)) : 0
            },
            moveTimings: moveTimings.value
        }
    }

    // ===== CLEANUP =====

    /**
     * Store cleanup beim Unmount
     */
    const cleanup = () => {
        if (intervalId.value) {
            clearInterval(intervalId.value)
            intervalId.value = null
        }
        eventCallbacks.value = {}
    }

    // ===== RETURN PUBLIC API =====
    return {
        // State
        currentTimeControl,
        customTimeControl,
        timerState,
        activePlayer,
        whiteTime,
        blackTime,
        originalWhiteTime,
        originalBlackTime,
        isIncludePreMove,
        showTenths,
        moveTimings,
        gameStartTime,
        totalGameTime,

        // Computed
        currentPreset,
        effectiveTimeControl,
        isTimerActive,
        isTimerPaused,
        isUnlimitedTime,
        formattedWhiteTime,
        formattedBlackTime,
        currentPlayerTime,
        formattedCurrentPlayerTime,
        currentPlayerWarningLevel,
        isCurrentPlayerTimeCritical,
        isCurrentPlayerTimeLow,
        currentMoveStats,
        averageMoveTime,
        totalUsedTime,

        // Actions
        setTimeControl,
        initializeTimer,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        switchPlayer,
        addTime,
        on,
        off,
        emitEvent,
        formatTime,
        getGameStats,
        cleanup,

        // Constants (for external use)
        TIME_CONTROL_TYPES,
        TIME_CONTROL_PRESETS,
        TIMER_STATES,
        TIMER_EVENTS,
        WARNING_THRESHOLDS
    }
})
