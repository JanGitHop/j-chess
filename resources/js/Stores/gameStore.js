/**
 * Game Store - Hauptstore für Spiellogik und Zustand
 * Verwaltet die komplette Spielsituation, Züge und Validierung
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useFenParser } from '@/Composables/useFenParser.js'
import {
    INITIAL_FEN,
    PLAYER_COLORS,
    GAME_STATUS,
    isPieceOwnedByPlayer,
    isEmpty,
    isWhitePiece
} from '@/Utils/chessConstants.js'
import {
    squareToIndices,
    indicesToSquare,
    cloneBoard
} from '@/Utils/chessUtils.js'

export const useGameStore = defineStore('game', () => {
    // ===== STATE =====
    const gameId = ref(null)
    const gameStatus = ref(GAME_STATUS.WAITING)
    const gameMode = ref('standard') // Neu hinzugefügt
    const whitePlayer = ref(null)
    const blackPlayer = ref(null)

    // FEN Parser Integration
    const {
        currentFen,
        parsedPosition,
        activePlayer,
        parseFen,
        generateFen,
        setFen,
        resetToInitial
    } = useFenParser()

    // Move-related state
    const selectedSquare = ref(null)
    const legalMoves = ref([])
    const moveHistory = ref([])
    const lastMove = ref(null)

    // Drag & Drop state
    const draggedPiece = ref(null)
    const draggedFrom = ref(null)
    const isDragging = ref(false)

    // Game mechanics
    const isInCheck = ref(false)
    const checkingPieces = ref([])
    const capturedPieces = ref({
        white: [],
        black: []
    })

    // ===== COMPUTED =====

    /**
     * Aktuelles Brett als 2D Array
     */
    const currentBoard = computed(() => {
        return parsedPosition.value || []
    })

    /**
     * Spieler am Zug
     */
    const currentPlayer = computed(() => {
        return activePlayer.value
    })

    /**
     * Ist das Spiel aktiv?
     */
    const isGameActive = computed(() => {
        return [GAME_STATUS.ACTIVE, GAME_STATUS.CHECK].includes(gameStatus.value)
    })

    /**
     * Kann der aktuelle Spieler ziehen?
     */
    const canCurrentPlayerMove = computed(() => {
        return isGameActive.value && legalMoves.value.length > 0
    })

    /**
     * Ist ein Feld ausgewählt?
     */
    const hasSelection = computed(() => {
        return selectedSquare.value !== null
    })

    /**
     * Figur auf dem ausgewählten Feld
     */
    const selectedPiece = computed(() => {
        if (!hasSelection.value || !currentBoard.value.length) return null

        const indices = squareToIndices(selectedSquare.value)
        if (!indices) return null

        return currentBoard.value[indices.rankIndex][indices.fileIndex]
    })

    /**
     * Gehört die ausgewählte Figur dem aktuellen Spieler?
     */
    const isSelectedPieceOwnedByCurrentPlayer = computed(() => {
        return selectedPiece.value && isPieceOwnedByPlayer(selectedPiece.value, currentPlayer.value)
    })

    // ===== ACTIONS =====

    /**
     * Game Mode setzen
     * @param {string} mode - 'standard', 'analysis', 'puzzle'
     */
    const setGameMode = (mode) => {
        gameMode.value = mode
        console.log('Game Mode gesetzt auf:', mode)
    }

    /**
     * Spiel initialisieren
     * @param {object} options - Spieloptionen
     */
    const initializeGame = (options = {}) => {
        try {
            // Game Mode setzen
            if (options.mode) {
                setGameMode(options.mode)
            }

            // Spiel starten
            startNewGame({
                gameId: options.gameId || `game_${Date.now()}`,
                whitePlayer: options.whitePlayer || 'Weiß',
                blackPlayer: options.blackPlayer || 'Schwarz'
            })

            // Custom Position laden falls vorhanden
            if (options.initialPosition) {
                loadGameFromFen(options.initialPosition)
            }

            console.log('Spiel initialisiert:', options)
        } catch (error) {
            console.error('Fehler beim Initialisieren des Spiels:', error)
        }
    }

    /**
     * Neues Spiel starten
     * @param {object} options - Spieloptionen
     */
    const startNewGame = (options = {}) => {
        try {
            // State zurücksetzen
            gameId.value = options.gameId || `game_${Date.now()}`
            gameStatus.value = GAME_STATUS.ACTIVE
            whitePlayer.value = options.whitePlayer || 'Weiß'
            blackPlayer.value = options.blackPlayer || 'Schwarz'

            // Brett-Position zurücksetzen
            resetToInitial()

            // Move-State zurücksetzen
            clearSelection()
            moveHistory.value = []
            lastMove.value = null

            // Game mechanics zurücksetzen
            isInCheck.value = false
            checkingPieces.value = []
            capturedPieces.value = { white: [], black: [] }

            console.log('Neues Spiel gestartet:', gameId.value)
        } catch (error) {
            console.error('Fehler beim Starten des Spiels:', error)
        }
    }

    /**
     * Spiel zurücksetzen
     */
    const resetGame = () => {
        startNewGame()
    }

    /**
     * Spiel aus FEN-String laden
     * @param {string} fenString
     * @param {object} gameInfo
     */
    const loadGameFromFen = (fenString, gameInfo = {}) => {
        try {
            setFen(fenString)

            gameId.value = gameInfo.gameId || gameId.value
            gameStatus.value = gameInfo.status || GAME_STATUS.ACTIVE

            clearSelection()

            console.log('Spiel aus FEN geladen:', fenString)
        } catch (error) {
            console.error('Fehler beim Laden des FEN-Strings:', error)
        }
    }

    /**
     * Auswahl aufheben
     */
    const clearSelection = () => {
        selectedSquare.value = null
        legalMoves.value = []
    }

    /**
     * Feld auswählen oder Zug ausführen
     * @param {string} square - z.B. "e4"
     */
    const selectSquare = (square) => {
        if (!isGameActive.value) return false

        try {
            const indices = squareToIndices(square)
            if (!indices) return false

            const piece = currentBoard.value[indices.rankIndex][indices.fileIndex]

            // Fall 1: Kein Feld ausgewählt
            if (!hasSelection.value) {
                if (isEmpty(piece)) return false

                // Nur eigene Figuren auswählen
                if (isPieceOwnedByPlayer(piece, currentPlayer.value)) {
                    selectedSquare.value = square
                    generateLegalMoves(square)
                    return true
                }
                return false
            }

            // Fall 2: Gleiches Feld nochmal angeklickt
            if (selectedSquare.value === square) {
                clearSelection()
                return true
            }

            // Fall 3: Andere eigene Figur angeklickt
            if (!isEmpty(piece) && isPieceOwnedByPlayer(piece, currentPlayer.value)) {
                selectedSquare.value = square
                generateLegalMoves(square)
                return true
            }

            // Fall 4: Zug versuchen
            const moveResult = attemptMove(selectedSquare.value, square)
            if (moveResult.success) {
                clearSelection()
            }

            return moveResult.success
        } catch (error) {
            console.error('Fehler bei Feldauswahl:', error)
            return false
        }
    }

    /**
     * Legale Züge für ein Feld generieren (Basis-Implementierung)
     * @param {string} square
     */
    const generateLegalMoves = (square) => {
        if (!isGameActive.value) {
            legalMoves.value = []
            return
        }

        const indices = squareToIndices(square)
        if (!indices || !currentBoard.value.length) {
            legalMoves.value = []
            return
        }

        const piece = currentBoard.value[indices.rankIndex][indices.fileIndex]
        if (isEmpty(piece) || !isPieceOwnedByPlayer(piece, currentPlayer.value)) {
            legalMoves.value = []
            return
        }

        // Basis-Zug-Generierung (sehr vereinfacht!)
        const moves = []
        const pieceType = piece.toLowerCase()

        switch (pieceType) {
            case 'p': // Bauer
                moves.push(...generatePawnMoves(square, piece))
                break
            case 'r': // Turm
                moves.push(...generateRookMoves(square))
                break
            case 'n': // Springer
                moves.push(...generateKnightMoves(square))
                break
            case 'b': // Läufer
                moves.push(...generateBishopMoves(square))
                break
            case 'q': // Dame
                moves.push(...generateQueenMoves(square))
                break
            case 'k': // König
                moves.push(...generateKingMoves(square))
                break
        }

        // Nur valide Felder behalten
        legalMoves.value = moves.filter(move => {
            const moveSquare = typeof move === 'string' ? move : move.to
            const targetIndices = squareToIndices(moveSquare)
            return targetIndices && isSquareValid(moveSquare)
        })

        console.log(`Legale Züge für ${piece} auf ${square}:`, legalMoves.value)
    }

    /**
     * Basis Bauer-Züge (vereinfacht)
     */
    const generatePawnMoves = (square, piece) => {
        const moves = []
        const isWhite = isWhitePiece(piece)
        const indices = squareToIndices(square)

        if (!indices) return moves

        const direction = isWhite ? -1 : 1 // Weiß geht "nach oben" (kleinere rank-Indizes)
        const startRank = isWhite ? 6 : 1 // Startpositionen für Doppelzug

        // Ein Feld vorwärts
        const oneForward = indicesToSquare(indices.fileIndex, indices.rankIndex + direction)
        if (oneForward && isEmpty(currentBoard.value[indices.rankIndex + direction]?.[indices.fileIndex])) {
            moves.push(oneForward)

            // Zwei Felder vorwärts vom Startfeld
            if (indices.rankIndex === startRank) {
                const twoForward = indicesToSquare(indices.fileIndex, indices.rankIndex + (direction * 2))
                if (twoForward && isEmpty(currentBoard.value[indices.rankIndex + (direction * 2)]?.[indices.fileIndex])) {
                    moves.push(twoForward)
                }
            }
        }

        // Schlagen diagonal
        for (const fileOffset of [-1, 1]) {
            const captureSquare = indicesToSquare(indices.fileIndex + fileOffset, indices.rankIndex + direction)
            if (captureSquare) {
                const targetPiece = currentBoard.value[indices.rankIndex + direction]?.[indices.fileIndex + fileOffset]
                if (targetPiece && !isEmpty(targetPiece) && !isPieceOwnedByPlayer(targetPiece, currentPlayer.value)) {
                    moves.push(captureSquare)
                }
            }
        }

        return moves
    }

    /**
     * Basis Springer-Züge
     */
    const generateKnightMoves = (square) => {
        const moves = []
        const indices = squareToIndices(square)

        if (!indices) return moves

        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ]

        for (const [fileOffset, rankOffset] of knightMoves) {
            const targetSquare = indicesToSquare(
                indices.fileIndex + fileOffset,
                indices.rankIndex + rankOffset
            )

            if (targetSquare && isValidTarget(targetSquare)) {
                moves.push(targetSquare)
            }
        }

        return moves
    }

    /**
     * Basis König-Züge
     */
    const generateKingMoves = (square) => {
        const moves = []
        const indices = squareToIndices(square)

        if (!indices) return moves

        for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
            for (let rankOffset = -1; rankOffset <= 1; rankOffset++) {
                if (fileOffset === 0 && rankOffset === 0) continue

                const targetSquare = indicesToSquare(
                    indices.fileIndex + fileOffset,
                    indices.rankIndex + rankOffset
                )

                if (targetSquare && isValidTarget(targetSquare)) {
                    moves.push(targetSquare)
                }
            }
        }

        return moves
    }

    /**
     * Basis Turm-Züge
     */
    const generateRookMoves = (square) => {
        const moves = []
        const indices = squareToIndices(square)
        if (!indices) return moves

        // Horizontal und vertikal
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]

        for (const [fileDir, rankDir] of directions) {
            for (let distance = 1; distance < 8; distance++) {
                const targetSquare = indicesToSquare(
                    indices.fileIndex + (fileDir * distance),
                    indices.rankIndex + (rankDir * distance)
                )

                if (!targetSquare || !isValidTarget(targetSquare)) break

                moves.push(targetSquare)

                // Stop bei Figur
                const targetIndices = squareToIndices(targetSquare)
                const targetPiece = currentBoard.value[targetIndices.rankIndex][targetIndices.fileIndex]
                if (!isEmpty(targetPiece)) break
            }
        }

        return moves
    }

    /**
     * Basis Läufer-Züge
     */
    const generateBishopMoves = (square) => {
        const moves = []
        const indices = squareToIndices(square)
        if (!indices) return moves

        // Diagonal
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]

        for (const [fileDir, rankDir] of directions) {
            for (let distance = 1; distance < 8; distance++) {
                const targetSquare = indicesToSquare(
                    indices.fileIndex + (fileDir * distance),
                    indices.rankIndex + (rankDir * distance)
                )

                if (!targetSquare || !isValidTarget(targetSquare)) break

                moves.push(targetSquare)

                // Stop bei Figur
                const targetIndices = squareToIndices(targetSquare)
                const targetPiece = currentBoard.value[targetIndices.rankIndex][targetIndices.fileIndex]
                if (!isEmpty(targetPiece)) break
            }
        }

        return moves
    }

    /**
     * Basis Dame-Züge (Turm + Läufer)
     */
    const generateQueenMoves = (square) => {
        return [
            ...generateRookMoves(square),
            ...generateBishopMoves(square)
        ]
    }

    /**
     * Hilfsfunktion: Prüft ob ein Zielfeld valide ist
     */
    const isValidTarget = (targetSquare) => {
        const indices = squareToIndices(targetSquare)
        if (!indices) return false

        const targetPiece = currentBoard.value[indices.rankIndex]?.[indices.fileIndex]

        // Leeres Feld oder gegnerische Figur
        return isEmpty(targetPiece) || !isPieceOwnedByPlayer(targetPiece, currentPlayer.value)
    }

    /**
     * Hilfsfunktion: Prüft ob ein Feld existiert
     */
    const isSquareValid = (square) => {
        const indices = squareToIndices(square)
        return indices &&
            indices.fileIndex >= 0 && indices.fileIndex < 8 &&
            indices.rankIndex >= 0 && indices.rankIndex < 8
    }

    /**
     * Zug versuchen auszuführen
     * @param {string} from
     * @param {string} to
     * @returns {object} { success: boolean, error?: string }
     */
    const attemptMove = (fromSquare, toSquare) => {
        try {
            console.log(`Attempting move: ${fromSquare} -> ${toSquare}`)

            // Validierung
            if (!isGameActive.value) {
                return { success: false, error: 'Spiel nicht aktiv' }
            }

            // Prüfe ob Zug legal ist
            const isLegal = legalMoves.value.some(move =>
                (typeof move === 'string' ? move : move.to) === toSquare
            )

            if (!isLegal) {
                return { success: false, error: 'Illegaler Zug' }
            }

            // Führe Zug aus
            const moveResult = executeMove(fromSquare, toSquare)

            if (moveResult.success) {
                clearSelection()
            }

            return moveResult
        } catch (error) {
            console.error('Fehler beim Zug:', error)
            return { success: false, error: error.message }
        }
    }

    const executeMove = (fromSquare, toSquare) => {
        const fromIndices = squareToIndices(fromSquare)
        const toIndices = squareToIndices(toSquare)

        if (!fromIndices || !toIndices) {
            return { success: false, error: 'Ungültige Koordinaten' }
        }

        // Board kopieren
        const newBoard = cloneBoard(currentBoard.value)

        // Figur bewegen
        const piece = newBoard[fromIndices.rankIndex][fromIndices.fileIndex]
        newBoard[toIndices.rankIndex][toIndices.fileIndex] = piece
        newBoard[fromIndices.rankIndex][fromIndices.fileIndex] = ' '

        // Nächster Spieler ermitteln (WICHTIG!)
        const nextPlayer = currentPlayer.value === 'white' ? 'black' : 'white'

        // Neue Position als FEN generieren (mit Spielerwechsel!)
        const newFen = generateFen(newBoard, nextPlayer)
        setFen(newFen)

        // Move History updaten
        lastMove.value = { from: fromSquare, to: toSquare, piece }
        moveHistory.value.push(lastMove.value)

        console.log(`Move executed: ${fromSquare} -> ${toSquare}, next player: ${nextPlayer}`)

        return { success: true, move: lastMove.value }
    }

    /**
     * Spielstatus prüfen
     */
    const checkGameStatus = () => {
        // TODO: Schach, Matt, Patt prüfen
        console.log('Spielstatus geprüft')
    }

    /**
     * Letzten Zug rückgängig machen
     */
    const undoLastMove = () => {
        if (moveHistory.value.length === 0) return false

        // TODO: Implementierung
        console.log('Zug rückgängig gemacht')
        return true
    }

    /**
     * Spiel aufgeben
     */
    const resignGame = () => {
        gameStatus.value = GAME_STATUS.FINISHED
        console.log('Spiel aufgegeben')
    }

    /**
     * Zum bestimmten Zug springen
     * @param {number} moveIndex
     */
    const gotoMove = (moveIndex) => {
        // TODO: Implementierung
        console.log('Zu Zug gesprungen:', moveIndex)
    }

    // Alle Funktionen und Eigenschaften zurückgeben
    return {
        // State
        gameId,
        gameStatus,
        gameMode,
        whitePlayer,
        blackPlayer,
        selectedSquare,
        legalMoves,
        moveHistory,
        lastMove,
        draggedPiece,
        draggedFrom,
        isDragging,
        isInCheck,
        checkingPieces,
        capturedPieces,

        // Computed
        currentBoard,
        currentPlayer,
        isGameActive,
        canCurrentPlayerMove,
        hasSelection,
        selectedPiece,
        isSelectedPieceOwnedByCurrentPlayer,

        // Actions
        setGameMode,
        initializeGame,
        startNewGame,
        resetGame,
        loadGameFromFen,
        clearSelection,
        selectSquare,
        generateLegalMoves,
        attemptMove,
        executeMove,
        checkGameStatus,
        undoLastMove,
        resignGame,
        gotoMove
    }
})
