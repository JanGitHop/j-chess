/**
 * Board Store - Kompletter Store mit Game-Integration
 * Behält alle bestehenden Funktionen und erweitert um Game-Features
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useBoardStore = defineStore('board', () => {
    // ===== BESTEHENDE STATE (unverändert) =====

    /**
     * Mouse Position Tracking
     */
    const mousePosition = ref({
        file: null,
        rank: null,
        square: null,
        x: null,
        y: null,
        pixelX: null,
        pixelY: null,
        isOverBoard: false
    })

    /**
     * Verfügbare Board-Größen (unverändert)
     */
    const boardSizes = ref({
        fullscreen: {
            name: 'Vollbild',
            mode: 'responsive',
            minSize: 400,
            maxSize: 1000,
            description: 'Passt sich an Bildschirmgröße an'
        },
        large: {
            name: 'Groß',
            mode: 'fixed',
            size: 640,
            description: 'Feste Größe für Hauptspiel'
        },
        medium: {
            name: 'Mittel',
            mode: 'fixed',
            size: 480,
            description: 'Standard-Größe'
        },
        small: {
            name: 'Klein',
            mode: 'fixed',
            size: 320,
            description: 'Kompakt für mehrere Boards'
        }
    })

    /**
     * Verfügbare Themes (unverändert)
     */
    const themes = ref({
        classic: {
            name: 'Klassisch',
            lightSquare: '#F0D9B5',
            darkSquare: '#B58863',
            border: '#8B4513',
            coordinates: '#654321',
            pattern: false
        },
        modern: {
            name: 'Modern',
            lightSquare: '#EEEED2',
            darkSquare: '#769656',
            border: '#4A4A4A',
            coordinates: '#2C2C2C',
            pattern: false
        },
        blue: {
            name: 'Blau',
            lightSquare: '#E6F3FF',
            darkSquare: '#4A90E2',
            border: '#2C5282',
            coordinates: '#1A365D',
            pattern: false
        },
        minimal: {
            name: 'Minimal',
            lightSquare: '#FFFFFF',
            darkSquare: '#CCCCCC',
            border: '#999999',
            coordinates: '#666666',
            pattern: false
        },
        woodenSimple: {
            name: 'Holz (Einfach)',
            lightSquare: '#DEB887',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: false
        },
        marbleSimple: {
            name: 'Marmor (Einfach)',
            lightSquare: '#F5F5DC',
            darkSquare: '#696969',
            border: '#2F2F2F',
            coordinates: '#000000',
            pattern: false
        },
        leatherSimple: {
            name: 'Leder (Einfach)',
            lightSquare: '#D2B48C',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: false
        },
        stoneSimple: {
            name: 'Stein (Einfach)',
            lightSquare: '#F0F0F0',
            darkSquare: '#808080',
            border: '#404040',
            coordinates: '#202020',
            pattern: false
        },
        woodenPattern: {
            name: 'Holz (Textur)',
            lightSquare: '#DEB887',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: 'css',
            lightPattern: 'wood-light',
            darkPattern: 'wood-dark'
        },
        marblePattern: {
            name: 'Marmor (Textur)',
            lightSquare: '#F5F5DC',
            darkSquare: '#696969',
            border: '#2F2F2F',
            coordinates: '#000000',
            pattern: 'css',
            lightPattern: 'marble-light',
            darkPattern: 'marble-dark'
        },
        leatherPattern: {
            name: 'Leder (Textur)',
            lightSquare: '#D2B48C',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: 'css',
            lightPattern: 'leather-light',
            darkPattern: 'leather-dark'
        },
        stonePattern: {
            name: 'Stein (Textur)',
            lightSquare: '#F0F0F0',
            darkSquare: '#808080',
            border: '#404040',
            coordinates: '#202020',
            pattern: 'css',
            lightPattern: 'stone-light',
            darkPattern: 'stone-dark'
        },
        woodenImage: {
            name: 'Holz (Foto)',
            lightSquare: '#DEB887',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: 'image',
            lightPattern: '/images/board-textures/wood-light.jpg',
            darkPattern: '/images/board-textures/wood-dark.jpg'
        },
        marbleImage: {
            name: 'Marmor (Foto)',
            lightSquare: '#F5F5DC',
            darkSquare: '#696969',
            border: '#2F2F2F',
            coordinates: '#000000',
            pattern: 'image',
            lightPattern: '/images/board-textures/marble-light.jpg',
            darkPattern: '/images/board-textures/marble-dark.jpg'
        }
    })

    /**
     * Aktueller Theme-Key (unverändert)
     */
    const currentThemeKey = ref('classic')

    /**
     * Settings (erweitert um Game-Features)
     */
    const settings = ref({
        showCoordinates: true,
        boardSizeMode: 'fullscreen',
        customSize: 480,
        animationSpeed: 300,
        highlightLastMove: true,
        highlightPossibleMoves: true,
        // Neue Game-Settings
        soundEnabled: true,
        showLegalMoves: true,
        animateCaptures: true,
        showMoveArrows: false,
        vibrationEnabled: false // für mobile Geräte
    })

    // ===== NEUE GAME-INTEGRATION STATE =====

    /**
     * Move-Highlights für visuelle Rückmeldung
     */
    const moveHighlights = ref({
        selectedSquare: null,
        legalMoves: [],
        lastMoveFrom: null,
        lastMoveTo: null,
        checkSquare: null,
        captureSquares: [],
        dragTarget: null
    })

    /**
     * Drag & Drop State
     */
    const dragState = ref({
        isDragging: false,
        draggedPiece: null,
        draggedFrom: null,
        draggedOver: null,
        startCoords: { x: 0, y: 0 },
        currentCoords: { x: 0, y: 0 }
    })

    /**
     * Animation State
     */
    const animationState = ref({
        movingPieces: new Map(), // piece -> animation data
        captureAnimations: [],
        isAnimating: false
    })

    /**
     * Sound State
     */
    const soundState = ref({
        lastSoundPlayed: null,
        soundQueue: [],
        volume: 0.7
    })

    // ===== BESTEHENDE COMPUTED (unverändert) =====

    const mouseOver = computed(() => {
        return mousePosition.value.isOverBoard ? mousePosition.value.square : 'Außerhalb'
    })

    const currentTheme = computed(() => themes.value[currentThemeKey.value])

    const currentBoardSize = computed(() => boardSizes.value[settings.value.boardSizeMode])

    const themeList = computed(() =>
        Object.entries(themes.value).map(([key, theme]) => ({
            key,
            name: theme.name,
            preview: {
                light: theme.lightSquare,
                dark: theme.darkSquare
            },
            hasTexture: theme.pattern !== false,
            patternType: theme.pattern || 'none'
        }))
    )

    const boardSizeList = computed(() =>
        Object.entries(boardSizes.value).map(([key, size]) => ({
            key,
            name: size.name,
            mode: size.mode,
            description: size.description
        }))
    )

    // ===== NEUE COMPUTED (Game-Integration) =====

    /**
     * Alle hervorzuhebenden Felder
     */
    const highlightedSquares = computed(() => {
        const highlights = new Map()

        // Ausgewähltes Feld
        if (moveHighlights.value.selectedSquare && settings.value.highlightPossibleMoves) {
            highlights.set(moveHighlights.value.selectedSquare, {
                type: 'selected',
                color: 'rgba(255, 255, 0, 0.6)',
                priority: 3
            })
        }

        // Legale Züge
        if (settings.value.showLegalMoves && moveHighlights.value.legalMoves.length > 0) {
            moveHighlights.value.legalMoves.forEach(square => {
                highlights.set(square, {
                    type: 'legal',
                    color: 'rgba(0, 255, 0, 0.4)',
                    priority: 1
                })
            })
        }

        // Capture-Züge (höhere Priorität)
        moveHighlights.value.captureSquares.forEach(square => {
            highlights.set(square, {
                type: 'capture',
                color: 'rgba(255, 0, 0, 0.6)',
                priority: 2
            })
        })

        // Letzter Zug
        if (settings.value.highlightLastMove) {
            if (moveHighlights.value.lastMoveFrom) {
                highlights.set(moveHighlights.value.lastMoveFrom, {
                    type: 'lastMoveFrom',
                    color: 'rgba(255, 165, 0, 0.5)',
                    priority: 2
                })
            }
            if (moveHighlights.value.lastMoveTo) {
                highlights.set(moveHighlights.value.lastMoveTo, {
                    type: 'lastMoveTo',
                    color: 'rgba(255, 165, 0, 0.7)',
                    priority: 2
                })
            }
        }

        // Schach-Highlight
        if (moveHighlights.value.checkSquare) {
            highlights.set(moveHighlights.value.checkSquare, {
                type: 'check',
                color: 'rgba(255, 0, 0, 0.8)',
                priority: 4
            })
        }

        // Drag-Target
        if (dragState.value.isDragging && moveHighlights.value.dragTarget) {
            const existingHighlight = highlights.get(moveHighlights.value.dragTarget)
            if (existingHighlight) {
                highlights.set(moveHighlights.value.dragTarget, {
                    ...existingHighlight,
                    color: 'rgba(128, 255, 128, 0.8)',
                    priority: 5
                })
            }
        }

        return highlights
    })

    /**
     * CSS-Variablen für Animationen
     */
    const animationCssVars = computed(() => ({
        '--animation-speed': `${settings.value.animationSpeed}ms`,
        '--drag-scale': '1.1',
        '--hover-scale': '1.05',
        '--capture-scale': '1.2'
    }))

    // ===== BESTEHENDE ACTIONS (unverändert) =====

    function updateMousePosition(position) {
        mousePosition.value = { ...position }

        // Drag Over Event für Game-Integration
        if (dragState.value.isDragging && position.square) {
            handleDragOver(position.square)
        }
    }

    function setTheme(themeKey) {
        if (themes.value[themeKey]) {
            currentThemeKey.value = themeKey
            saveSettings()
        }
    }

    function setBoardSize(sizeKey) {
        if (boardSizes.value[sizeKey]) {
            settings.value.boardSizeMode = sizeKey
            saveSettings()
        }
    }

    function updateSetting(key, value) {
        if (key in settings.value) {
            settings.value[key] = value
            saveSettings()
        }
    }

    function saveSettings() {
        const settingsData = {
            theme: currentThemeKey.value,
            ...settings.value
        }
        localStorage.setItem('chess-board-settings', JSON.stringify(settingsData))
    }

    function loadSettings() {
        const saved = localStorage.getItem('chess-board-settings')
        if (saved) {
            try {
                const settingsData = JSON.parse(saved)
                if (settingsData.theme && themes.value[settingsData.theme]) {
                    currentThemeKey.value = settingsData.theme
                }
                Object.keys(settings.value).forEach(key => {
                    if (key in settingsData) {
                        settings.value[key] = settingsData[key]
                    }
                })
            } catch (error) {
                console.error('Fehler beim Laden der Board-Einstellungen:', error)
            }
        }
    }

    function resetToDefaults() {
        currentThemeKey.value = 'classic'
        settings.value = {
            showCoordinates: true,
            boardSizeMode: 'fullscreen',
            customSize: 480,
            animationSpeed: 300,
            highlightLastMove: true,
            highlightPossibleMoves: true,
            soundEnabled: true,
            showLegalMoves: true,
            animateCaptures: true,
            showMoveArrows: false,
            vibrationEnabled: false
        }
        saveSettings()
    }

    // ===== NEUE ACTIONS (Game-Integration) =====

    /**
     * Feld-Klick Handler - Integration mit Game Store
     * @param {object} squareData - { file, rank, square }
     * @param {Function} gameAction - Callback zum Game Store
     */
    function handleSquareClick(squareData, gameAction = null) {
        if (!squareData.square) return false

        // Visual Feedback vor Game-Action
        const wasSelected = moveHighlights.value.selectedSquare === squareData.square

        // Game-Action ausführen (falls bereitgestellt)
        let result = { success: false }
        if (typeof gameAction === 'function') {
            result = gameAction(squareData.square)
        }

        // Visual Feedback je nach Ergebnis
        if (result.success) {
            // Erfolgreich: Highlights aktualisieren
            updateMoveHighlights()

            // Sound abspielen
            if (settings.value.soundEnabled) {
                playMoveSound(result.capturedPiece)
            }

            // Vibration (mobile)
            if (settings.value.vibrationEnabled && navigator.vibrate) {
                navigator.vibrate(50)
            }
        }

        return result.success
    }

    /**
     * Drag Start Handler
     * @param {string} square
     * @param {string} piece
     * @param {object} coords - { x, y }
     */
    function handleDragStart(square, piece, coords = { x: 0, y: 0 }) {
        if (!square || !piece) return false

        dragState.value = {
            isDragging: true,
            draggedPiece: piece,
            draggedFrom: square,
            draggedOver: null,
            startCoords: coords,
            currentCoords: coords
        }

        // Move-Highlights für legale Züge anzeigen
        updateMoveHighlights()

        return true
    }

    /**
     * Drag Over Handler
     * @param {string} square
     */
    function handleDragOver(square) {
        if (!dragState.value.isDragging) return

        dragState.value.draggedOver = square
        moveHighlights.value.dragTarget = square
    }

    /**
     * Drag End / Drop Handler
     * @param {string|null} dropSquare
     * @param {Function} gameAction - Callback zum Game Store
     */
    function handleDrop(dropSquare = null, gameAction = null) {
        if (!dragState.value.isDragging) return { success: false }

        let result = { success: false }

        try {
            // Game-Action ausführen
            if (dropSquare && dragState.value.draggedFrom && typeof gameAction === 'function') {
                result = gameAction(dragState.value.draggedFrom, dropSquare)

                if (result.success) {
                    // Animation starten (falls aktiviert)
                    if (settings.value.animationSpeed > 0) {
                        startMoveAnimation(dragState.value.draggedFrom, dropSquare, dragState.value.draggedPiece)
                    }

                    // Sound abspielen
                    if (settings.value.soundEnabled) {
                        playMoveSound(result.capturedPiece)
                    }
                }
            }
        } finally {
            // Drag-State zurücksetzen
            dragState.value = {
                isDragging: false,
                draggedPiece: null,
                draggedFrom: null,
                draggedOver: null,
                startCoords: { x: 0, y: 0 },
                currentCoords: { x: 0, y: 0 }
            }

            moveHighlights.value.dragTarget = null
            updateMoveHighlights()
        }

        return result
    }

    /**
     * Move-Highlights aktualisieren
     * @param {object} gameData - Daten vom Game Store
     */
    function updateMoveHighlights(gameData = {}) {
        moveHighlights.value = {
            selectedSquare: gameData.selectedSquare || null,
            legalMoves: gameData.legalMoves || [],
            lastMoveFrom: gameData.lastMoveFrom || null,
            lastMoveTo: gameData.lastMoveTo || null,
            checkSquare: gameData.checkSquare || null,
            captureSquares: gameData.captureSquares || [],
            dragTarget: moveHighlights.value.dragTarget // Drag-Target beibehalten
        }
    }

    /**
     * Sound-Effekte abspielen
     * @param {string|null} capturedPiece
     */
    function playMoveSound(capturedPiece = null) {
        if (!settings.value.soundEnabled) return

        const soundType = capturedPiece ? 'capture' : 'move'
        soundState.value.lastSoundPlayed = soundType

        // TODO: Echte Sound-Implementierung
        console.log(`🎵 ${soundType.toUpperCase()} Sound`)
    }

    /**
     * Move-Animation starten
     * @param {string} from
     * @param {string} to
     * @param {string} piece
     */
    function startMoveAnimation(from, to, piece) {
        if (!settings.value.animateCaptures) return

        const animationId = `${from}-${to}-${Date.now()}`

        animationState.value.movingPieces.set(animationId, {
            piece,
            from,
            to,
            startTime: Date.now(),
            duration: settings.value.animationSpeed
        })

        animationState.value.isAnimating = true

        // Animation nach Duration beenden
        setTimeout(() => {
            animationState.value.movingPieces.delete(animationId)
            if (animationState.value.movingPieces.size === 0) {
                animationState.value.isAnimating = false
            }
        }, settings.value.animationSpeed)
    }

    /**
     * Alle Highlights zurücksetzen
     */
    function clearAllHighlights() {
        moveHighlights.value = {
            selectedSquare: null,
            legalMoves: [],
            lastMoveFrom: null,
            lastMoveTo: null,
            checkSquare: null,
            captureSquares: [],
            dragTarget: null
        }
    }

    /**
     * Game-Integration Settings updaten
     * @param {object} gameSettings
     */
    function updateGameSettings(gameSettings) {
        Object.keys(gameSettings).forEach(key => {
            if (key in settings.value) {
                settings.value[key] = gameSettings[key]
            }
        })
        saveSettings()
    }

    // ===== INITIALIZATION =====

    // Settings beim Store-Setup laden
    loadSettings()

    // ===== RETURN COMPLETE API =====
    return {
        // ===== BESTEHENDE STATE =====
        themes,
        boardSizes,
        currentThemeKey,
        settings,
        mousePosition,

        // ===== NEUE STATE =====
        moveHighlights,
        dragState,
        animationState,
        soundState,

        // ===== BESTEHENDE COMPUTED =====
        currentTheme,
        currentBoardSize,
        themeList,
        boardSizeList,
        mouseOver,

        // ===== NEUE COMPUTED =====
        highlightedSquares,
        animationCssVars,

        // ===== BESTEHENDE ACTIONS =====
        setTheme,
        setBoardSize,
        updateSetting,
        saveSettings,
        loadSettings,
        resetToDefaults,
        updateMousePosition,

        // ===== NEUE ACTIONS =====
        handleSquareClick,
        handleDragStart,
        handleDragOver,
        handleDrop,
        updateMoveHighlights,
        playMoveSound,
        startMoveAnimation,
        clearAllHighlights,
        updateGameSettings
    }
})
