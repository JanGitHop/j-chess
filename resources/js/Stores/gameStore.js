/**
 * Game Store - Hauptstore für Spiellogik und Zustand
 * Verwaltet die komplette Spielsituation, Züge und Validierung
 */

import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {useFenParser} from '@/Composables/useFenParser.js'
import {useChessLogic} from '@/Composables/useChessLogic.js'
import {GAME_STATUS, isEmpty, isPieceOwnedByPlayer, isWhitePiece, PLAYER_COLORS} from '@/Utils/chessConstants.js'
import {cloneBoard, getPieceColor, indicesToSquare, squareToIndices} from '@/Utils/chessUtils.js'

export const useGameStore = defineStore('game', () => {
    const chessLogic = useChessLogic()

    // ===== STATE =====
    const gameId = ref(null)
    const gameStatus = ref(GAME_STATUS.WAITING)
    const gameMode = ref('standard')
    const whitePlayer = ref(null)
    const blackPlayer = ref(null)

    // FEN Parser Integration
    const {
        currentFen,
        parsedPosition,
        activePlayer,
        castlingRights,
        enPassantTarget,
        halfmoveClock,
        fullmoveNumber,
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
    const redoStack = ref([])
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

    const currentPlayer = computed(() => {
        return activePlayer.value
    })

    const isGameActive = computed(() => {
        return [GAME_STATUS.ACTIVE, GAME_STATUS.CHECK].includes(gameStatus.value)
    })

    const canCurrentPlayerMove = computed(() => {
        return isGameActive.value && legalMoves.value.length > 0
    })

    const hasSelection = computed(() => {
        return selectedSquare.value !== null
    })

    const selectedPiece = computed(() => {
        if (!hasSelection.value || !currentBoard.value.length) return null

        const indices = squareToIndices(selectedSquare.value)
        if (!indices) return null

        return currentBoard.value[indices.rankIndex][indices.fileIndex]
    })

    const isSelectedPieceOwnedByCurrentPlayer = computed(() => {
        return selectedPiece.value && isPieceOwnedByPlayer(selectedPiece.value, currentPlayer.value)
    })

    const gameState = computed(() => ({
        // Core game data
        currentPlayer: activePlayer.value,
        enPassantSquare: enPassantTarget.value,
        castlingRights: castlingRights.value,
        board: currentBoard.value,
        halfmoveClock: halfmoveClock.value,
        fullmoveNumber: fullmoveNumber.value,

        // Additional derived properties
        isGameActive: isGameActive.value,
        isInCheck: isInCheck.value,
        checkingPieces: checkingPieces.value,
        selectedSquare: selectedSquare.value,
        legalMoves: legalMoves.value,

        // Game metadata
        gameId: gameId.value,
        gameStatus: gameStatus.value,
        gameMode: gameMode.value,
        whitePlayer: whitePlayer.value,
        blackPlayer: blackPlayer.value,

        // Move data
        moveHistory: moveHistory.value,
        lastMove: lastMove.value,
        capturedPieces: capturedPieces.value
    }))

    const getCurrentGameState = () => {
        return { ...gameState.value }
    }

    const createGameStateSnapshot = (overrides = {}) => {
        return {
            ...getCurrentGameState(),
            ...overrides
        }
    }

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
                    legalMoves.value = chessLogic.generateLegalMovesForSquare(
                        square,
                        currentBoard.value,
                        currentPlayer.value,
                        gameState.value
                    )
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
                legalMoves.value = chessLogic.generateLegalMovesForSquare(
                    square,
                    currentBoard.value,
                    currentPlayer.value,
                    gameState.value
                )
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

    // Neue Funktion für Schach-Erkennung:
    const checkForCheck = () => {
        const kingSquare = chessLogic.findKing(currentBoard.value, currentPlayer.value)
        if (!kingSquare) return false

        const gameState = getCurrentGameState()

        const isUnderAttack = chessLogic.isInCheck(currentBoard.value, currentPlayer.value === 'white' ? 'black' : 'white', gameState)

        if (isUnderAttack !== isInCheck.value) {
            isInCheck.value = isUnderAttack

            if (isUnderAttack) {
                checkingPieces.value = chessLogic.getAttackingPieces(
                    kingSquare,
                    currentPlayer.value === 'white' ? 'black' : 'white',
                    currentBoard.value,
                    gameState.value
                )
                gameStatus.value = GAME_STATUS.CHECK
            } else {
                checkingPieces.value = []
                gameStatus.value = GAME_STATUS.ACTIVE
            }
        }

        return isUnderAttack
    }

    const checkForCheckmate = () => {
        if (!isInCheck.value) {
            return false
        }

        const legalMoves = chessLogic.getAllLegalMoves(
            currentBoard.value,
            currentPlayer.value,
            gameState.value
        )

        const isCheckmate = legalMoves.length === 0

        if (isCheckmate) {
            gameStatus.value = GAME_STATUS.CHECKMATE
            console.log('🏁 SCHACHMATT! Spieler', currentPlayer.value, 'hat verloren')
        }

        return isCheckmate
    }

    const checkForStalemate = () => {
        if (isInCheck.value) {
            return false
        }

        const legalMoves = chessLogic.getAllLegalMoves(
            currentBoard.value,
            currentPlayer.value,
            gameState.value
        )

        const isStalemate = legalMoves.length === 0

        if (isStalemate) {
            gameStatus.value = GAME_STATUS.STALEMATE
            console.log('🔄 PATT! Das Spiel endet unentschieden')
        }

        return isStalemate
    }

    /**
     * Zug versuchen auszuführen
     * @param {string} fromSquare
     * @param {string} toSquare
     * @param {object} options - Zusätzliche Optionen (z.B. promotion: 'Q')
     * @returns {object} { success: boolean, error?: string, needsPromotion?: boolean }
     */
    const attemptMove = (fromSquare, toSquare, options = {}) => {
        try {
            console.log(`🎯 attemptMove: ${fromSquare} -> ${toSquare}`, options)

            // Validierung
            if (!isGameActive.value) {
                return { success: false, error: 'Spiel nicht aktiv' }
            }

            // Brett-Indizes abrufen
            const fromIndices = squareToIndices(fromSquare)
            const toIndices = squareToIndices(toSquare)

            if (!fromIndices || !toIndices) {
                return { success: false, error: 'Ungültige Feldkoordinaten' }
            }

            const piece = currentBoard.value[fromIndices.rankIndex][fromIndices.fileIndex]

            if (isEmpty(piece)) {
                return { success: false, error: 'Kein Stein auf dem Ausgangsfeld' }
            }

            if (!isPieceOwnedByPlayer(piece, currentPlayer.value)) {
                return { success: false, error: 'Nicht Ihre Figur' }
            }

            // ✅ PROMOTION-CHECK HIER HINZUGEFÜGT
            if (!options.promotion && chessLogic.requiresPromotion(fromSquare, toSquare, piece)) {
                console.log('🎯 attemptMove: Promotion erkannt!', { fromSquare, toSquare, piece })

                return {
                    success: false,
                    needsPromotion: true,
                    from: fromSquare,
                    to: toSquare,
                    piece: piece
                }
            }

            // Prüfe ob Zug legal ist
            const allLegalMoves = chessLogic.generateLegalMovesForSquare(
                fromSquare,
                currentBoard.value,
                currentPlayer.value,
                gameState.value
            )

            const isLegal = allLegalMoves.includes(toSquare)

            if (!isLegal) {
                return { success: false, error: 'Unerlaubter Zug' }
            }

            if (options.promotion) {
                return executePromotionMove(fromSquare, toSquare, options.promotion)
            } else {
                return executeMove(fromSquare, toSquare)
            }

        } catch (error) {
            console.error('Fehler bei attemptMove:', error)
            return { success: false, error: error.message }
        }
    }

    const attemptMoveWithPromotion = (fromSquare, toSquare, promotionPiece) => {
        return attemptMove(fromSquare, toSquare, { promotion: promotionPiece })
    }

    const executeMove = (fromSquare, toSquare) => {
        const fromIndices = squareToIndices(fromSquare)
        const toIndices = squareToIndices(toSquare)

        if (!fromIndices || !toIndices) {
            return { success: false, error: 'Ungültige Koordinaten' }
        }

        if (!capturedPieces.value) {
            capturedPieces.value = {
                white: [],
                black: []
            }
        }

        const piece = currentBoard.value[fromIndices.rankIndex][fromIndices.fileIndex]
        if (isEmpty(piece)) {
            throw new Error('Kein Piece auf Startfeld')
        }
        const targetPiece = currentBoard.value[toIndices.rankIndex][toIndices.fileIndex]

        const gameState = getCurrentGameState()

        const possibleMoves = chessLogic.generatePossibleMoves(piece, fromSquare, currentBoard.value, gameState)
        const targetMove = possibleMoves.find(move => move.to === toSquare)

        if (!targetMove) {
            throw new Error('Illegaler Zug')
        }

        console.log('🎯 executeMove - gefundener Move:', targetMove)

        const tempBoard = cloneBoard(currentBoard.value)

        switch (targetMove.type) {
            case 'enpassant':
                const capturedSquareIndices = squareToIndices(targetMove.capturedSquare)
                if (capturedSquareIndices) {
                    const capturedPiece = tempBoard[capturedSquareIndices.rankIndex][capturedSquareIndices.fileIndex]
                    if (capturedPiece) {
                        addCapturedPiece(capturedPiece)
                        tempBoard[capturedSquareIndices.rankIndex][capturedSquareIndices.fileIndex] = null
                        console.log('🎯 En-Passant: Entferne', capturedPiece, 'von', targetMove.capturedSquare)
                    }
                }
                break

            case 'capture':
                addCapturedPiece(targetPiece)
                break

            case 'castle':
                const rookMove = chessLogic.getCastlingRookMove(fromSquare, toSquare)
                if (rookMove) {
                    const rookFromIndices = squareToIndices(rookMove.from)
                    const rookToIndices = squareToIndices(rookMove.to)

                    if (rookFromIndices && rookToIndices) {
                        const rook = tempBoard[rookFromIndices.rankIndex][rookFromIndices.fileIndex]

                        tempBoard[rookToIndices.rankIndex][rookToIndices.fileIndex] = rook
                        tempBoard[rookFromIndices.rankIndex][rookFromIndices.fileIndex] = null
                    }
                }
                break
        }

        // move piece
        tempBoard[toIndices.rankIndex][toIndices.fileIndex] = piece
        tempBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null

        if (!chessLogic.isMoveLegal(currentBoard.value, fromSquare, toSquare, currentPlayer.value, gameState.value)) {
            return { success: false, error: 'Zug würde König ins Schach setzen' }
        }

        const nextPlayer = currentPlayer.value === 'white' ? 'black' : 'white'

        let newEnPassantSquare = null

        // check if a pawn made a double move
        const pieceType = piece?.toLowerCase()
        if (pieceType === 'p') {
            const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)

            if (rankDistance === 2) {
                const isWhitePawnMove = isWhitePiece(piece)
                const startRank = isWhitePawnMove ? 6 : 1

                if (fromIndices.rankIndex === startRank) {
                    const enPassantRank = isWhitePawnMove ? 5 : 2
                    newEnPassantSquare = indicesToSquare(toIndices.fileIndex, enPassantRank)
                }
            }
        }

        const currentCastlingRights = castlingRights.value
        const currentHalfmoveClock = halfmoveClock.value
        const currentFullmoveNumber = fullmoveNumber.value

        const newFullmoveNumber = currentPlayer.value === 'black'
            ? currentFullmoveNumber + 1
            : currentFullmoveNumber

        const newFen = generateFen(
            tempBoard,
            nextPlayer,
            currentCastlingRights,
            newEnPassantSquare,
            currentHalfmoveClock,
            newFullmoveNumber
        )

        console.log('🎯 Neue FEN:', newFen)
        setFen(newFen)

        // Move History updaten
        const moveRecord = {
            from: fromSquare,
            to: toSquare,
            piece,
            // san: TODO: generateMoveNotation(fromSquare, toSquare, currentBoard.value, ),
            fenBefore: currentFen.value,
            fenAfter: newFen,
            timestamp: new Date(),
            moveType: targetMove.type,
            capturedPieces
        }

        moveHistory.value.push(moveRecord)
        lastMove.value = moveRecord

        console.log('✅ Zug erfolgreich ausgeführt:', moveRecord)
        return { success: true, move: moveRecord }
    }

    /**
     * Promotion-Zug ausführen
     * @param {string} fromSquare
     * @param {string} toSquare
     * @param {string} promotionPiece - z.B. 'Q', 'R', 'B', 'N'
     * @returns {object}
     */
    const executePromotionMove = (fromSquare, toSquare, promotionPiece) => {
        try {
            const fromIndices = squareToIndices(fromSquare)
            const toIndices = squareToIndices(toSquare)

            if (!fromIndices || !toIndices) {
                return { success: false, error: 'Ungültige Koordinaten' }
            }

            if (!capturedPieces.value) {
                capturedPieces.value = { white: [], black: [] }
            }

            const piece = currentBoard.value[fromIndices.rankIndex][fromIndices.fileIndex]
            if (isEmpty(piece)) {
                throw new Error('Kein Piece auf Startfeld')
            }

            const targetPiece = currentBoard.value[toIndices.rankIndex][toIndices.fileIndex]
            const gameState = getCurrentGameState()

            // Board kopieren
            const tempBoard = cloneBoard(currentBoard.value)

            // Geschlagene Figur behandeln
            if (!isEmpty(targetPiece)) {
                addCapturedPiece(targetPiece)
                console.log('🎯 Promotion mit Eroberung:', targetPiece, 'geschlagen')
            }

            // **PROMOTION:**
            tempBoard[toIndices.rankIndex][toIndices.fileIndex] = promotionPiece
            tempBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null

            console.log('🎯 Promotion ausgeführt:', piece, '->', promotionPiece, 'auf', toSquare)

            if (!chessLogic.isMoveLegal(currentBoard.value, fromSquare, toSquare, currentPlayer.value, gameState)) {
                return { success: false, error: 'Zug würde König ins Schach setzen' }
            }

            const nextPlayer = currentPlayer.value === 'white' ? 'black' : 'white'

            const currentCastlingRights = castlingRights.value
            const currentHalfmoveClock = halfmoveClock.value
            const currentFullmoveNumber = fullmoveNumber.value

            const newFullmoveNumber = currentPlayer.value === 'black'
                ? currentFullmoveNumber + 1
                : currentFullmoveNumber

            const newHalfmoveClock = (!isEmpty(targetPiece)) ? 0 : currentHalfmoveClock + 1

            const newFen = generateFen(
                tempBoard,
                nextPlayer,
                currentCastlingRights,
                null,
                newHalfmoveClock,
                newFullmoveNumber
            )

            console.log('🎯 Neue FEN nach Promotion:', newFen)
            setFen(newFen)

            const moveRecord = {
                from: fromSquare,
                to: toSquare,
                piece,
                promotionPiece,
                // san: TODO: generateMoveNotation mit Promotion
                fenBefore: currentFen.value,
                fenAfter: newFen,
                timestamp: new Date(),
                moveType: 'promotion',
                capturedPiece: targetPiece,
                isCapture: !isEmpty(targetPiece)
            }

            moveHistory.value.push(moveRecord)
            lastMove.value = moveRecord

            console.log('✅ Promotion-Zug erfolgreich ausgeführt:', moveRecord)
            return { success: true, move: moveRecord }

        } catch (error) {
            console.error('Fehler beim Promotion-Zug:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Geschlagene Figur hinzufügen (verwendet globale capturedPieces)
     */
    const addCapturedPiece = (piece) => {
        if (!capturedPieces.value) {
            capturedPieces.value = { white: [], black: [] }
        }

        const pieceColor = getPieceColor(piece)
        const pieceInfo = {
            type: piece.toLowerCase(),
            notation: piece,
            timestamp: new Date().toISOString()
        }

        if (pieceColor === PLAYER_COLORS.WHITE) {
            if (!capturedPieces.value.white) {
                capturedPieces.value.white = []
            }
            capturedPieces.value.white.push(pieceInfo)
        } else {
            if (!capturedPieces.value.black) {
                capturedPieces.value.black = []
            }
            capturedPieces.value.black.push(pieceInfo)
        }

        console.log('Geschlagene Figur hinzugefügt:', piece, 'zu', pieceColor, 'Liste')
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

    return {
        // State
        gameId,
        gameStatus,
        gameMode,
        gameState,
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
        currentFEN: currentFen,
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
        attemptMove,
        attemptMoveWithPromotion,
        executeMove,
        executePromotionMove,
        checkGameStatus,
        undoLastMove,
        resignGame,
        gotoMove,
        redoStack,

        checkForCheck,
        checkForCheckmate,
        checkForStalemate,
    }
})
