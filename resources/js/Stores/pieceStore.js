/**
 * Piece Store - Spezieller Store für Figuren-Management
 * Verwaltet Figuren-Assets, Themes und visuelle Eigenschaften
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    PIECE_IMAGES,
    PIECE_NAMES,
    PIECE_VALUES,
    isWhitePiece,
    isBlackPiece,
    getPieceColor,
    isEmpty
} from '@/Utils/chessConstants.js'

export const usePieceStore = defineStore('piece', () => {
    // ===== STATE =====

    const currentPieceSet = ref('default')

    const availablePieceSets = ref({
        default: {
            name: 'Standard',
            path: '/images/pieces/default/',
            pieces: PIECE_IMAGES
        }
        // example
        // medieval: { name: 'Medieval', path: '/images/pieces/medieval/', ... }
    })

    const animationsEnabled = ref(true)

    const animationDuration = ref(300)

    /**
     * Drag & Drop visuals
     */
    const dragSettings = ref({
        showGhost: true,          // Zeige Ghost-Image beim Dragging
        ghostOpacity: 0.5,        // Transparenz des Ghost-Images
        highlightLegalMoves: true, // Highlighte legale Züge
        snapToSquare: true        // Figur springt zum Feld-Zentrum
    })

    /**
     * piece size
     */
    const sizeSettings = ref({
        scaleOnHover: 1.05,       // Enlargement at Hover
        scaleOnDrag: 1.1,         // Enlargement on dragging
        scaleOnSelect: 1.02
    })

    // ===== COMPUTED =====

    /**
     * Aktuelles Figuren-Set Objekt
     */
    const currentSet = computed(() => {
        return availablePieceSets.value[currentPieceSet.value] || availablePieceSets.value.default
    })

    /**
     * Alle Figuren-Pfade des aktuellen Sets
     */
    const currentPieceImages = computed(() => {
        return currentSet.value.pieces
    })

    /**
     * CSS-Variablen für Animationen
     */
    const animationCssVars = computed(() => ({
        '--piece-animation-duration': `${animationDuration.value}ms`,
        '--piece-hover-scale': sizeSettings.value.scaleOnHover,
        '--piece-drag-scale': sizeSettings.value.scaleOnDrag,
        '--piece-select-scale': sizeSettings.value.scaleOnSelect,
        '--piece-ghost-opacity': dragSettings.value.ghostOpacity
    }))

    // ===== ACTIONS =====

    /**
     * Figuren-Bild-URL für eine Figur abrufen
     * @param {string} piece - FEN-Notation (z.B. 'K', 'p')
     * @returns {string|null} URL zum SVG
     */
    const getPieceImageUrl = (piece) => {
        if (isEmpty(piece)) return null

        const imageUrl = currentPieceImages.value[piece]
        return imageUrl || null
    }

    /**
     * Figuren-Name für UI-Anzeige
     * @param {string} piece - FEN-Notation
     * @returns {string} Figuren-Name
     */
    const getPieceName = (piece) => {
        if (isEmpty(piece)) return ''
        return PIECE_NAMES[piece] || 'Unbekannt'
    }

    /**
     * Figuren-Wert abrufen
     * @param {string} piece - FEN-Notation
     * @returns {number} Figuren-Wert
     */
    const getPieceValue = (piece) => {
        if (isEmpty(piece)) return 0
        return PIECE_VALUES[piece] || 0
    }

    /**
     * Vollständige Figuren-Info abrufen
     * @param {string} piece - FEN-Notation
     * @returns {object} Komplette Figuren-Info
     */
    const getPieceInfo = (piece) => {
        if (isEmpty(piece)) {
            return {
                piece: null,
                name: '',
                color: null,
                imageUrl: null,
                value: 0,
                isWhite: false,
                isBlack: false
            }
        }

        return {
            piece,
            name: getPieceName(piece),
            color: getPieceColor(piece),
            imageUrl: getPieceImageUrl(piece),
            value: getPieceValue(piece),
            isWhite: isWhitePiece(piece),
            isBlack: isBlackPiece(piece)
        }
    }

    /**
     * Figuren-Set wechseln
     * @param {string} setName - Name des Sets
     */
    const changePieceSet = (setName) => {
        if (availablePieceSets.value[setName]) {
            currentPieceSet.value = setName
            console.log(`Figuren-Set geändert zu: ${setName}`)
        } else {
            console.warn(`Figuren-Set '${setName}' nicht gefunden`)
        }
    }

    /**
     * Neues Figuren-Set registrieren
     * @param {string} setName
     * @param {object} setConfig
     */
    const registerPieceSet = (setName, setConfig) => {
        if (!setConfig.name || !setConfig.pieces) {
            console.error('Ungültige Figuren-Set Konfiguration')
            return
        }

        availablePieceSets.value[setName] = {
            name: setConfig.name,
            path: setConfig.path || `/images/pieces/${setName}/`,
            pieces: setConfig.pieces
        }

        console.log(`Neues Figuren-Set registriert: ${setName}`)
    }

    /**
     * Animation-Einstellungen updaten
     * @param {object} settings
     */
    const updateAnimationSettings = (settings) => {
        if (settings.enabled !== undefined) {
            animationsEnabled.value = settings.enabled
        }
        if (settings.duration !== undefined) {
            animationDuration.value = Math.max(0, settings.duration)
        }
        if (settings.sizeSettings) {
            sizeSettings.value = { ...sizeSettings.value, ...settings.sizeSettings }
        }
    }

    /**
     * Drag-Einstellungen updaten
     * @param {object} settings
     */
    const updateDragSettings = (settings) => {
        dragSettings.value = { ...dragSettings.value, ...settings }
    }

    /**
     * Alle Einstellungen zurücksetzen
     */
    const resetToDefaults = () => {
        currentPieceSet.value = 'default'
        animationsEnabled.value = true
        animationDuration.value = 300

        dragSettings.value = {
            showGhost: true,
            ghostOpacity: 0.5,
            highlightLegalMoves: true,
            snapToSquare: true
        }

        sizeSettings.value = {
            scaleOnHover: 1.05,
            scaleOnDrag: 1.1,
            scaleOnSelect: 1.02
        }
    }

    /**
     * Figuren-Set validieren
     * @param {object} pieces - Pieces mapping
     * @returns {boolean} Ist das Set vollständig?
     */
    const validatePieceSet = (pieces) => {
        const requiredPieces = ['r', 'n', 'b', 'q', 'k', 'p', 'R', 'N', 'B', 'Q', 'K', 'P']

        return requiredPieces.every(piece => {
            const hasImage = pieces[piece] && typeof pieces[piece] === 'string'
            if (!hasImage) {
                console.warn(`Figur '${piece}' fehlt im Figuren-Set`)
            }
            return hasImage
        })
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * Lade alle Figuren-Bilder vor (für bessere Performance)
     */
    const preloadPieceImages = async () => {
        const imagePromises = Object.values(currentPieceImages.value).map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image()
                img.onload = resolve
                img.onerror = reject
                img.src = url
            })
        })

        try {
            await Promise.all(imagePromises)
        } catch (error) {
            console.warn('Fehler beim Vorladen der Figuren-Bilder:', error)
        }
    }

    // ===== RETURN PUBLIC API =====
    return {
        // State
        currentPieceSet,
        availablePieceSets,
        animationsEnabled,
        animationDuration,
        dragSettings,
        sizeSettings,

        // Computed
        currentSet,
        currentPieceImages,
        animationCssVars,

        // Actions
        getPieceImageUrl,
        getPieceName,
        getPieceValue,
        getPieceInfo,
        changePieceSet,
        registerPieceSet,
        updateAnimationSettings,
        updateDragSettings,
        resetToDefaults,
        validatePieceSet,
        preloadPieceImages
    }
})
