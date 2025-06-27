/**
 * Game Store - Hauptstore für Spiellogik und Zustand
 * Verwaltet die komplette Spielsituation, Züge und Validierung
 */

import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {useFenParser} from '@/Composables/useFenParser.js'
import {useChessLogic} from '@/Composables/useChessLogic.js'
import {
    INITIAL_FEN,
    PLAYER_COLORS,
    GAME_STATUS,
    FIFTY_MOVE_RULE,
    THREEFOLD_REPETITION,
    isPieceOwnedByPlayer,
    isEmpty,
    isWhitePiece
} from '@/Utils/chessConstants.js'
import {cloneBoard, getPieceColor, indicesToSquare, squareToIndices} from '@/Utils/chessUtils.js'
import { useSanGenerator } from "@/Composables/useSANGenerator.js";

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

    const { generateSAN, generateSimpleSAN, movesToPGN } = useSanGenerator()

    // Move-related state
    const selectedSquare = ref(null)
    const legalMoves = ref([])
    const moveHistory = ref([])
    const lastMove = ref(null)
    const positionHistory = ref([]) // for repetition

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
        capturedPieces: capturedPieces.value,
        positionHistory: positionHistory.value
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
            positionHistory.value = []
            addPositionToHistory(INITIAL_FEN)

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

            positionHistory.value = []
            addPositionToHistory(fenString)

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

    const addPositionToHistory = (fen) => {
        try {
            const positionKey = chessLogic.createPositionKey(fen)
            if (!positionKey) {
                console.warn('Kein gültiger Position-Key erstellt für FEN:', fen)
                return
            }

            positionHistory.value.push(positionKey)

            // Speicher begrenzen - alte Positionen entfernen
            if (positionHistory.value.length > THREEFOLD_REPETITION.POSITIONS_TO_TRACK) {
                positionHistory.value.shift() // Entferne älteste Position
            }

            console.log('📍 Position zur History hinzugefügt:', {
                positionKey,
                historyLength: positionHistory.value.length
            })
        } catch (error) {
            console.error('Fehler beim Hinzufügen zur Position-History:', error)
        }
    }

    /**
     * ✅ NEU: 3-fache Stellungswiederholung prüfen
     * @returns {boolean} - True wenn Remis durch Wiederholung
     */
    const checkForThreefoldRepetition = () => {
        try {
            const isThreefold = chessLogic.checkThreefoldRepetition(positionHistory.value)

            if (isThreefold) {
                gameStatus.value = GAME_STATUS.DRAW_REPETITION
                console.log('🔄 3-FACHE STELLUNGSWIEDERHOLUNG: Das Spiel endet unentschieden')
                return true
            }

            return false
        } catch (error) {
            console.error('Fehler bei Stellungswiederholung-Check:', error)
            return false
        }
    }

    /**
     * ✅ NEU: Warnung für nahende Stellungswiederholung
     * @returns {object|null} - Warninginformationen
     */
    const shouldWarnThreefoldRepetition = () => {
        try {
            return chessLogic.shouldWarnThreefoldRepetition(positionHistory.value)
        } catch (error) {
            console.error('Fehler bei Stellungswiederholung-Warnung:', error)
            return null
        }
    }

    /**
     * ✅ NEU: Anzahl Wiederholungen der aktuellen Position
     * @returns {number}
     */
    const getCurrentPositionRepetitionCount = () => {
        try {
            const currentKey = chessLogic.createPositionKey(currentFen.value)
            if (!currentKey) return 0

            return chessLogic.getPositionRepetitionCount(currentKey, positionHistory.value)
        } catch (error) {
            console.error('Fehler bei Position-Wiederholung-Count:', error)
            return 0
        }
    }

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

    const checkForFiftyMoveRule = () => {
        const currentHalfmoves = halfmoveClock.value

        if (chessLogic.checkFiftyMoveRule(currentHalfmoves)) {
            gameStatus.value = GAME_STATUS.DRAW_FIFTY_MOVE
            console.log('🔄 50-ZÜGE-REGEL: Das Spiel endet unentschieden (Halfmoves:', currentHalfmoves, ')')
            return true
        }

        return false
    }

    /**
     * Warnung für nahende 50-Züge-Regel
     * @returns {boolean} True wenn Warnung ausgegeben werden sollte
     */
    const shouldWarnFiftyMoveRule = () => {
        return chessLogic.shouldWarnAboutFiftyMoveRule(halfmoveClock.value)
    }

    /**
     * Züge bis 50-Züge-Regel berechnen
     * @returns {number} Anzahl verbleibender Vollzüge bis zur Regel
     */
    const getMovesUntilFiftyMoveRule = () => {
        const remainingHalfmoves = FIFTY_MOVE_RULE.MAX_HALFMOVES - halfmoveClock.value
        return Math.ceil(remainingHalfmoves / 2) // Halbzüge zu Vollzügen
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
                const moveResult = executePromotionMove(fromSquare, toSquare, options.promotion)

                if (moveResult.success) {
                    performPostMoveChecks()
                }

                return moveResult
            } else {
                const moveResult = executeMove(fromSquare, toSquare)

                if (moveResult.success) {
                    performPostMoveChecks()
                }

                return moveResult
            }

        } catch (error) {
            console.error('Fehler bei attemptMove:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * checks:
     * check
     * checkmate
     * stalemate
     * threefold-repetition
     * fifty-moves-rule
     */
    const performPostMoveChecks = () => {
        addPositionToHistory(currentFen.value)

        // Check > Mate > Stalemate > Fifty-Move
        checkForCheck()

        if (!isGameActive.value) return

        const checkmateResult = checkForCheckmate()
        if (checkmateResult) {
            console.log('🎯 Schachmatt erkannt, Spiel beendet')
            return
        }

        const stalemateResult = checkForStalemate()
        if (stalemateResult) {
            console.log('🎯 Patt erkannt, Spiel beendet')
            return
        }

        const repetitionResult = checkForThreefoldRepetition()
        if (repetitionResult) {
            console.log('🎯 3-fache Stellungswiederholung erkannt, Spiel beendet')
            return
        }

        const fiftyMoveResult = checkForFiftyMoveRule()
        if (fiftyMoveResult) {
            console.log('🎯 50-Züge-Regel erfüllt, Spiel beendet')
            return
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

        console.log('🎯 executeMove - Move:', targetMove)

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
        const newCastlingRights = chessLogic.updateCastlingRights(
            currentCastlingRights,
            fromSquare,
            toSquare,
            piece,
            targetPiece
        )

        console.log('🏰 Rochade-Rechte Update:', {
            vorher: currentCastlingRights,
            nachher: newCastlingRights,
            zug: `${piece} ${fromSquare}->${toSquare}`,
            geschlagen: targetPiece || 'keine'
        })

        const moveCounters = chessLogic.calculateMoveCounters(
            piece,
            targetPiece,
            halfmoveClock.value,
            fullmoveNumber.value,
            currentPlayer.value
        )

        console.log('🕐 Move Counters:', {
            halfmove: `${halfmoveClock.value} -> ${moveCounters.halfmoveClock}`,
            fullmove: `${fullmoveNumber.value} -> ${moveCounters.fullmoveNumber}`
        })

        const newFen = generateFen(
            tempBoard,
            nextPlayer,
            newCastlingRights,
            newEnPassantSquare,
            moveCounters.halfmoveClock,
            moveCounters.fullmoveNumber
        )

        console.log('🎯 Neue FEN:', newFen)
        setFen(newFen)

        // Move History updaten
        const moveRecord = {
            from: fromSquare,
            to: toSquare,
            piece,
            capturedPiece: targetPiece,
            promotion: null,
            isCheck: false,
            isCheckmate: false,
            moveType: targetMove.type,
            san: generateSAN(
                {
                    from: fromSquare,
                    to: toSquare,
                    piece,
                    capturedPiece: targetPiece,
                    promotion: null,
                    isCheck: false,
                    isCheckmate: false,
                    moveType: targetMove.type
                },
                currentBoard.value,
                chessLogic.getAllLegalMoves(
                    currentBoard.value,
                    currentPlayer.value,
                    gameState.value
                )
            ),
            fenBefore: currentFen.value,
            fenAfter: newFen,
            timestamp: new Date(),
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
            const isCapture = !isEmpty(targetPiece)

            // Board kopieren
            const tempBoard = cloneBoard(currentBoard.value)

            // Geschlagene Figur behandeln
            if (isCapture) {
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
            const newCastlingRights = chessLogic.updateCastlingRights(
                currentCastlingRights,
                fromSquare,
                toSquare,
                piece,
                targetPiece
            )
            const currentHalfmoveClock = halfmoveClock.value
            const currentFullmoveNumber = fullmoveNumber.value

            const moveCounters = chessLogic.calculateMoveCounters(
                piece,
                targetPiece,
                halfmoveClock.value,
                fullmoveNumber.value,
                currentPlayer.value
            )

            const newFen = generateFen(
                tempBoard,
                nextPlayer,
                newCastlingRights,
                null,
                moveCounters.halfmoveClock,
                moveCounters.fullmoveNumber
            )

            console.log('🎯 Neue FEN nach Promotion:', newFen)
            setFen(newFen)

            const moveRecord = {
                from: fromSquare,
                to: toSquare,
                piece,
                promotionPiece,
                san: generateSAN(
                    {
                        from: fromSquare,
                        to: toSquare,
                        piece: piece,
                        capturedPiece: targetPiece,
                        promotion: promotionPiece,
                        isCheck: false,
                        isCheckmate: false,
                        moveType: 'promotion'
                    },
                    currentBoard.value,
                    chessLogic.getAllLegalMoves(
                        currentBoard.value,
                        currentPlayer.value,
                        gameState.value
                    )
                ),
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
        checkForFiftyMoveRule,
        shouldWarnFiftyMoveRule,
        getMovesUntilFiftyMoveRule,
        halfmoveClock,
        performPostMoveChecks,
        checkForThreefoldRepetition,
        shouldWarnThreefoldRepetition,
        getCurrentPositionRepetitionCount,
        positionHistory
    }
})
