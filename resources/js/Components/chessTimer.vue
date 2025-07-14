<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useChessTimerStore } from '@/Stores/chessTimerStore.js'
import { TIME_CONTROL_TYPES, TIMER_STATES, TIMER_EVENTS } from '@/Stores/chessTimerStore.js'

const props = defineProps({
    player: {
        type: String,
        required: true,
        validator: value => ['white', 'black'].includes(value)
    },
    position: {
        type: String,
        default: 'bottom',
        validator: value => ['top', 'bottom'].includes(value)
    },
    size: {
        type: String,
        default: 'medium',
        validator: value => ['small', 'medium', 'large'].includes(value)
    },
    showIcon: {
        type: Boolean,
        default: true
    },
    showWarnings: {
        type: Boolean,
        default: true
    },
    showIncrementInfo: {
        type: Boolean,
        default: false
    },
    clickable: {
        type: Boolean,
        default: false
    },
    rightAligned: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits([
    'timerClick',
    'timerWarning',
    'timerExpired',
    'timerStart',
    'timerStop'
])

// Store
const timerStore = useChessTimerStore()

// Local State
const isBlinking = ref(false)
const warningLevel = ref('normal')
const blinkInterval = ref(null)

// ===== COMPUTED =====

/**
 * Ist dieser Timer aktiv?
 */
const isActive = computed(() => {
    return timerStore.activePlayer === props.player && timerStore.isTimerActive
})

/**
 * Aktuelle Zeit für diesen Spieler
 */
const currentTime = computed(() => {
    return props.player === 'white' ? timerStore.whiteTime : timerStore.blackTime
})

/**
 * Formatierte Zeit
 */
const formattedTime = computed(() => {
    return props.player === 'white' ? timerStore.formattedWhiteTime : timerStore.formattedBlackTime
})

/**
 * Zeit-Warnstufe
 */
const timeWarningLevel = computed(() => {
    if (timerStore.isUnlimitedTime) return 'normal'

    if (props.player === timerStore.activePlayer) {
        return timerStore.currentPlayerWarningLevel
    }

    // Warnungen auch für inaktive Spieler
    if (currentTime.value <= 10) return 'critical'
    if (currentTime.value <= 60) return 'low'
    return 'normal'
})

/**
 * Timer-Status
 */
const timerStatus = computed(() => {
    if (timerStore.isUnlimitedTime) return 'unlimited'
    if (timerStore.timerState === TIMER_STATES.EXPIRED && isActive.value) return 'expired'
    if (timerStore.timerState === TIMER_STATES.PAUSED) return 'paused'
    if (isActive.value) return 'active'
    return 'inactive'
})

/**
 * Aktuelle Zeitkontrolle
 */
const timeControlInfo = computed(() => {
    return timerStore.effectiveTimeControl
})

/**
 * Increment-Info
 */
const incrementText = computed(() => {
    if (!props.showIncrementInfo) return ''

    const increment = timeControlInfo.value.increment
    if (increment > 0) {
        return `+${increment}s`
    }
    return ''
})

/**
 * Timer-Icon basierend auf Zustand
 */
const timerIcon = computed(() => {
    if (timerStore.isUnlimitedTime) return '∞'
    if (timerStatus.value === 'expired') return '⏰'
    if (timerStatus.value === 'paused') return '⏸️'
    if (timerStatus.value === 'active') return '▶️'
    return '⏱️'
})

/**
 * CSS-Klassen für Timer-Container
 */
const timerClasses = computed(() => {
    const classes = [
        'chess-timer',
        `chess-timer--${props.size}`,
        `chess-timer--${props.player}`,
        `chess-timer--${timerStatus.value}`,
        `chess-timer--${timeWarningLevel.value}`
    ]

    if (props.rightAligned) classes.push('chess-timer--right-aligned')
    if (isBlinking.value) classes.push('chess-timer--blinking')
    if (props.clickable) classes.push('chess-timer--clickable')

    return classes
})

/**
 * Inline-Styles für Timer
 */
const timerStyle = computed(() => {
    const style = {}

    // Farb-Themen basierend auf Warnstufe
    if (timeWarningLevel.value === 'critical') {
        style.backgroundColor = 'rgba(220, 53, 69, 0.9)'
        style.color = 'white'
        style.borderColor = '#dc3545'
    } else if (timeWarningLevel.value === 'low') {
        style.backgroundColor = 'rgba(255, 193, 7, 0.9)'
        style.color = '#333'
        style.borderColor = '#ffc107'
    } else if (timerStatus.value === 'active') {
        style.backgroundColor = 'rgba(40, 167, 69, 0.9)'
        style.color = 'white'
        style.borderColor = '#28a745'
    } else if (timerStatus.value === 'expired') {
        style.backgroundColor = 'rgba(220, 53, 69, 1)'
        style.color = 'white'
        style.borderColor = '#dc3545'
    } else {
        style.backgroundColor = 'rgba(108, 117, 125, 0.8)'
        style.color = '#fff'
        style.borderColor = '#6c757d'
    }

    return style
})

/**
 * Font-Größe basierend auf Timer-Größe
 */
const fontSize = computed(() => {
    const sizeMap = {
        small: '0.875rem',
        medium: '1.25rem',
        large: '1.5rem'
    }
    return sizeMap[props.size] || sizeMap.medium
})

// ===== METHODS =====

/**
 * Timer-Click Handler
 */
const handleTimerClick = () => {
    if (!props.clickable) return

    emit('timerClick', {
        player: props.player,
        time: currentTime.value,
        formattedTime: formattedTime.value,
        isActive: isActive.value
    })
}

/**
 * Blink-Animation für kritische Zeit
 */
const startBlinking = () => {
    if (blinkInterval.value) return

    isBlinking.value = true
    blinkInterval.value = setInterval(() => {
        isBlinking.value = !isBlinking.value
    }, 500)
}

/**
 * Blink-Animation stoppen
 */
const stopBlinking = () => {
    if (blinkInterval.value) {
        clearInterval(blinkInterval.value)
        blinkInterval.value = null
    }
    isBlinking.value = false
}

/**
 * Event-Handler für Timer-Events
 */
const handleTimerEvent = (event, data) => {
    switch (event) {
        case TIMER_EVENTS.START:
            emit('timerStart', data)
            break
        case TIMER_EVENTS.STOP:
            emit('timerStop', data)
            break
        case TIMER_EVENTS.EXPIRED:
            if (data.player === props.player) {
                emit('timerExpired', data)
            }
            break
        case TIMER_EVENTS.CRITICAL_TIME:
            if (data.player === props.player && props.showWarnings) {
                emit('timerWarning', { level: 'critical', ...data })
            }
            break
        case TIMER_EVENTS.LOW_TIME:
            if (data.player === props.player && props.showWarnings) {
                emit('timerWarning', { level: 'low', ...data })
            }
            break
    }
}

// ===== WATCHERS =====

/**
 * Überwachung der Warnstufe für Blink-Animation
 */
watch(timeWarningLevel, (newLevel, oldLevel) => {
    if (newLevel === 'critical' && isActive.value) {
        startBlinking()
    } else {
        stopBlinking()
    }

    if (newLevel !== oldLevel) {
        warningLevel.value = newLevel
    }
})

/**
 * Überwachung des Timer-Status
 */
watch(timerStatus, (newStatus) => {
    if (newStatus === 'expired') {
        stopBlinking()
    }
})

/**
 * Überwachung des aktiven Spielers
 */
watch(isActive, (newValue) => {
    if (newValue && timeWarningLevel.value === 'critical') {
        startBlinking()
    } else {
        stopBlinking()
    }
})

// ===== LIFECYCLE =====

onMounted(() => {
    // Timer-Events abonnieren
    timerStore.on(TIMER_EVENTS.START, (data) => handleTimerEvent(TIMER_EVENTS.START, data))
    timerStore.on(TIMER_EVENTS.STOP, (data) => handleTimerEvent(TIMER_EVENTS.STOP, data))
    timerStore.on(TIMER_EVENTS.EXPIRED, (data) => handleTimerEvent(TIMER_EVENTS.EXPIRED, data))
    timerStore.on(TIMER_EVENTS.CRITICAL_TIME, (data) => handleTimerEvent(TIMER_EVENTS.CRITICAL_TIME, data))
    timerStore.on(TIMER_EVENTS.LOW_TIME, (data) => handleTimerEvent(TIMER_EVENTS.LOW_TIME, data))
})

onUnmounted(() => {
    stopBlinking()

    // Event-Listener entfernen
    timerStore.off(TIMER_EVENTS.START, handleTimerEvent)
    timerStore.off(TIMER_EVENTS.STOP, handleTimerEvent)
    timerStore.off(TIMER_EVENTS.EXPIRED, handleTimerEvent)
    timerStore.off(TIMER_EVENTS.CRITICAL_TIME, handleTimerEvent)
    timerStore.off(TIMER_EVENTS.LOW_TIME, handleTimerEvent)
})
</script>

<template>
    <div
        :class="timerClasses"
        :style="timerStyle"
        @click="handleTimerClick"
    >
        <!-- Timer-Icon -->
        <div
            v-if="props.showIcon && !timerStore.isUnlimitedTime"
            class="timer-icon"
        >
            {{ timerIcon }}
        </div>

        <!-- Hauptzeit-Anzeige -->
        <div class="timer-display">
            <div
                class="timer-time"
                :style="{ fontSize: fontSize }"
            >
                {{ formattedTime }}
            </div>

            <!-- Increment-Info -->
            <div
                v-if="incrementText"
                class="timer-increment"
            >
                {{ incrementText }}
            </div>
        </div>

        <!-- Status-Indikator -->
        <div
            v-if="timerStatus === 'active'"
            class="timer-status-indicator"
        >
            <div class="status-dot"></div>
        </div>

        <!-- Warnung für abgelaufene Zeit -->
        <div
            v-if="timerStatus === 'expired'"
            class="timer-expired-indicator"
        >
            <span>⏰</span>
        </div>
    </div>
</template>

<style scoped>
.chess-timer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 2px solid transparent;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    transition: all 0.2s ease;
    min-width: 120px;
    position: relative;
    user-select: none;
}

.chess-timer--right-aligned {
    justify-content: flex-end;
    margin-left: auto;
}

.chess-timer--clickable {
    cursor: pointer;
}

.chess-timer--clickable:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Größen-Varianten */
.chess-timer--small {
    padding: 4px 8px;
    min-width: 80px;
    gap: 4px;
}

.chess-timer--medium {
    padding: 8px 12px;
    min-width: 120px;
    gap: 8px;
}

.chess-timer--large {
    padding: 12px 16px;
    min-width: 160px;
    gap: 12px;
}

/* Timer-Icon */
.timer-icon {
    font-size: 1.2em;
    opacity: 0.8;
}

.chess-timer--small .timer-icon {
    font-size: 1em;
}

.chess-timer--large .timer-icon {
    font-size: 1.4em;
}

/* Timer-Display */
.timer-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
}

.timer-time {
    line-height: 1;
    letter-spacing: 0.05em;
}

.timer-increment {
    font-size: 0.7em;
    opacity: 0.8;
    margin-top: 2px;
}

/* Status-Indikator */
.timer-status-indicator {
    position: absolute;
    top: -4px;
    right: -4px;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #28a745;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.7;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Expired-Indikator */
.timer-expired-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #dc3545;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8em;
    animation: shake 0.5s infinite;
}

@keyframes shake {
    0%, 100% { transform: translate(0); }
    25% { transform: translate(-2px, 0); }
    75% { transform: translate(2px, 0); }
}

/* Blink-Animation */
.chess-timer--blinking {
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
}

/* Warnstufen-Spezifische Styles */
.chess-timer--critical {
    box-shadow: 0 0 15px rgba(220, 53, 69, 0.6);
}

.chess-timer--low {
    box-shadow: 0 0 10px rgba(255, 193, 7, 0.6);
}

.chess-timer--active {
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.4);
}

.chess-timer--expired {
    box-shadow: 0 0 20px rgba(220, 53, 69, 0.8);
}

/* Unlimited-Timer */
.chess-timer--unlimited .timer-display {
    font-size: 1.2em;
    opacity: 0.7;
}

/* Responsive Design */
@media (max-width: 768px) {
    .chess-timer {
        min-width: 100px;
        padding: 6px 10px;
    }

    .chess-timer--small {
        min-width: 70px;
        padding: 4px 6px;
    }

    .chess-timer--large {
        min-width: 130px;
        padding: 8px 12px;
    }

    .timer-time {
        font-size: 0.9em !important;
    }
}

/* Darkmode-Support */
@media (prefers-color-scheme: dark) {
    .chess-timer {
        background-color: rgba(52, 58, 64, 0.9);
        color: #fff;
    }
}

/* Hover-Effekte für interaktive Timer */
.chess-timer--clickable:hover .timer-time {
    text-shadow: 0 0 4px currentColor;
}

.chess-timer--clickable:active {
    transform: scale(0.98);
}
</style>
