import { ref, computed } from 'vue'

// Global state für Sound-System
const soundEnabled = ref(true)
const soundVolume = ref(0.7)
const audioCache = new Map()

/**
 * Sound-System für J-Chess
 */
export function useSounds() {
    // ===== SOUND-LADEN =====

    /**
     * Audio-Datei vorladen und cachen
     */
    const preloadSound = (soundName, path) => {
        if (audioCache.has(soundName)) {
            return audioCache.get(soundName)
        }

        const audio = new Audio(path)
        audio.preload = 'auto'
        audio.volume = soundVolume.value

        audioCache.set(soundName, audio)
        return audio
    }

    /**
     * Alle Sounds vorladen
     */
    const preloadAllSounds = () => {
        const sounds = {
            'move': '/sounds/default/move-self.mp3',
            'capture': '/sounds/default/capture.mp3',
            'castle': '/sounds/default/castle.mp3',
            'check': '/sounds/default/move-check.mp3',
            'promote': '/sounds/default/promote.mp3',
            'notify': '/sounds/default/notify.mp3',
            'checkmate': '/sounds/default/game-end.mp3',
            'stalemate': '/sounds/default/game-draw.mp3',
            'undo': '/sounds/default/premove.mp3',
            'gameStart': '/sounds/default/event-start.mp3',
            'gameEnd': '/sounds/default/event-end.mp3',
            'tenSeconds': '/sounds/default/tenseconds.mp3',
            'timeOut': '/sounds/default/game-lose.mp3',
            'gameWin': '/sounds/default/game-win.mp3',
            'gameLose': '/sounds/default/game-lose.mp3',
            'gameDraw': '/sounds/default/game-draw.mp3',
            'eventWarning': '/sounds/default/event-warning.mp3',
            'decline': '/sounds/default/decline.mp3',
            'illegal': '/sounds/default/illegal.mp3'
        }

        Object.entries(sounds).forEach(([name, path]) => {
            preloadSound(name, path)
        })
    }

    // ===== SOUND-ABSPIELEN =====

    /**
     * Sound abspielen
     */
    const playSound = async (soundName, options = {}) => {
        if (!soundEnabled.value) return

        try {
            const audio = audioCache.get(soundName)
            if (!audio) {
                console.warn(`🔇 Sound nicht gefunden: ${soundName}`)
                return
            }

            // Clone für gleichzeitige Wiedergabe
            const audioClone = audio.cloneNode()
            audioClone.volume = (options.volume ?? soundVolume.value) * (options.volumeMultiplier ?? 1)

            // Playback-Rate für Variation
            if (options.pitch) {
                audioClone.playbackRate = options.pitch
            }

            await audioClone.play()

        } catch (error) {
            console.warn(`🔇 Fehler beim Abspielen von ${soundName}:`, error)
        }
    }

    // ===== SPEZIFISCHE SOUND-FUNKTIONEN =====

    /**
     * Zug-Sound basierend auf Zug-Art
     */
    const playMoveSound = (moveData) => {
        if (!moveData) {
            playSound('move')
            return
        }

        // ⭐ PRIORITÄT: Schachmatt > Schach > Rochade > Schlagen > Bauernumwandlung > Normaler Zug
        if (moveData.isCheckmate) {
            console.log('🎵 Playing CHECKMATE sound')
            playSound('checkmate')
        } else if (moveData.isCheck) {
            console.log('🎵 Playing CHECK sound')
            playSound('check')
        } else if (moveData.isCastling || moveData.castling || moveData.moveType === 'castle') {
            console.log('🎵 Playing CASTLE sound')
            playSound('castle')
        } else if (moveData.isCapture || moveData.capture ||
            moveData.moveType === 'capture' || moveData.moveType === 'enpassant') {
            console.log('🎵 Playing CAPTURE sound')
            playSound('capture')
        } else if (moveData.isPromotion || moveData.promotion || moveData.moveType === 'promotion') {
            console.log('🎵 Playing PROMOTE sound')
            playSound('promote')
        } else {
            console.log('🎵 Playing MOVE sound')
            playSound('move')
        }
    }

    /**
     * Spiel-Event Sounds
     */
    const playGameSound = (eventType, data = {}) => {
        const soundMap = {
            'check': () => playSound('check'),
            'checkmate': () => playSound('checkmate'),
            'stalemate': () => playSound('stalemate'),
            'draw': () => playSound('stalemate'),
            'gameStart': () => playSound('gameStart'),
            'gameEnd': () => playSound('gameEnd'),
            'undo': () => playSound('undo'),
            'resign': () => playSound('gameEnd'),
            'timeout': () => playSound('gameEnd'),
            'notification': () => playSound('notify'),
            'tenSecondsWarning': () => playSound('tenSeconds'),
            'timeExpired': () => playSound('timeOut'),
            'gameWin': () => playSound('gameWin'),
            'gameLose': () => playSound('gameLose'),
            'illegalMove': () => playSound('illegal'),
            'gameDeclined': () => playSound('decline'),
            'eventWarning': () => playSound('eventWarning')
        }

        const soundFunction = soundMap[eventType]
        if (soundFunction) {
            soundFunction()
        } else {
            console.warn(`🔇 Unbekannter Game-Event Sound: ${eventType}`)
        }
    }

    /**
     * Timer-basierte Sounds
     */
    const playTimerSound = (timerEvent, timeRemaining = 0) => {
        switch (timerEvent) {
            case 'tenSeconds':
                console.log('🎵 Playing 10-SECONDS WARNING sound')
                playSound('tenSeconds')
                break
            case 'timeExpired':
                console.log('🎵 Playing TIME EXPIRED sound')
                playSound('timeOut')
                break
            case 'lowTime':
                // Warnung bei wenig Zeit (z.B. 30 Sekunden)
                playSound('eventWarning')
                break
        }
    }

    /**
     * Game-Over Sounds basierend auf Spielausgang
     */
    const playGameOverSound = (gameStatus, currentPlayer) => {
        switch (gameStatus) {
            case 'CHECKMATE':
                console.log('🎵 Playing CHECKMATE sound')
                playSound('checkmate')
                break
            case 'STALEMATE':
                console.log('🎵 Playing STALEMATE sound')
                playSound('stalemate')
                break
            case 'DRAW_REPETITION':
                console.log('🎵 Playing DRAW (repetition) sound')
                playSound('gameDraw')
                break
            case 'DRAW_FIFTY_MOVE':
                console.log('🎵 Playing DRAW (fifty move) sound')
                playSound('gameDraw')
                break
            case 'WHITE_WINS_TIME':
            case 'BLACK_WINS_TIME':
                console.log('🎵 Playing TIME OUT sound')
                playSound('timeOut')
                break
            case 'RESIGNATION':
                console.log('🎵 Playing RESIGNATION sound')
                playSound('gameEnd')
                break
            default:
                console.log('🎵 Playing generic GAME END sound')
                playSound('gameEnd')
        }
    }

    /**
     * UI-Feedback Sounds
     */
    const playUISound = (action) => {
        const soundMap = {
            'click': () => playSound('notify', { volume: 0.3, pitch: 1.2 }),
            'error': () => playSound('notify', { volume: 0.5, pitch: 0.8 }),
            'success': () => playSound('notify', { volume: 0.4, pitch: 1.1 }),
            'warning': () => playSound('notify', { volume: 0.4, pitch: 0.9 })
        }

        const soundFunction = soundMap[action]
        if (soundFunction) {
            soundFunction()
        }
    }

    // ===== SOUND-EINSTELLUNGEN =====

    /**
     * Sound an/aus schalten
     */
    const toggleSound = () => {
        soundEnabled.value = !soundEnabled.value

        if (soundEnabled.value) {
            playSound('notify', { volume: 0.3 })
        }

        return soundEnabled.value
    }

    /**
     * Lautstärke setzen
     */
    const setVolume = (volume) => {
        soundVolume.value = Math.max(0, Math.min(1, volume))

        // Volume für alle gecachten Sounds aktualisieren
        audioCache.forEach(audio => {
            audio.volume = soundVolume.value
        })
    }

    /**
     * Sound-Test
     */
    const testSound = (soundName = 'move') => {
        playSound(soundName)
    }

    // ===== COMPUTED =====

    const isSoundEnabled = computed(() => soundEnabled.value)
    const currentVolume = computed(() => soundVolume.value)
    const availableSounds = computed(() => Array.from(audioCache.keys()))

    return {
        // State
        isSoundEnabled,
        currentVolume,
        availableSounds,

        // Setup
        preloadAllSounds,

        // Abspielen
        playSound,
        playMoveSound,
        playGameSound,
        playUISound,
        playGameOverSound,
        playTimerSound,

        // Einstellungen
        toggleSound,
        setVolume,
        testSound
    }
}
