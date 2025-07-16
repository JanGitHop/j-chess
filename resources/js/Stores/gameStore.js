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
    GAME_MODES,
    GAME_MODE_SETTINGS,
    FIFTY_MOVE_RULE,
    THREEFOLD_REPETITION,
    isPieceOwnedByPlayer,
    isEmpty,
    isWhitePiece, PLAYER_COLORS as PLAYER_COLOR
} from '@/Utils/chessConstants.js'
import {cloneBoard, getPieceColor, indicesToSquare, squareToIndices} from '@/Utils/chessUtils.js'
import { useSanGenerator } from "@/Composables/useSANGenerator.js"
import { useGameConfigStore } from '@/Stores/gameConfigStore.js'
import { useChessTimerStore } from "@/Stores/chessTimerStore.js"

export const useGameStore = defineStore('game', () => {
    const chessLogic = useChessLogic()
    const configStore = useGameConfigStore()
    const timerStore = useChessTimerStore()

    // ===== STATE =====
    const gameId = ref(null)
    const gameStatus = ref(GAME_STATUS.WAITING)
    const gameMode = ref(GAME_MODES.LOCAL_PVP)
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
    const currentMoveIndex = ref(-1)
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

    const activeBoard = ref(null)

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

    const getCurrentMoveIndex = computed(() => {
        return currentMoveIndex.value ?? -1
    })

    const createGameStateSnapshot = (overrides = {}) => {
        return {
            ...getCurrentGameState(),
            ...overrides
        }
    }

    // ===== ACTIONS =====

    /**
     * Game Mode setzen
     * @param {string} mode - GAME_MODES
     */
    const setGameMode = (mode) => {
        gameMode.value = mode
        console.log('Game Mode gesetzt auf:', mode)
    }

    const initializeGameWithTimer = async (options = {}) => {
        try {
            await initializeGame(options)

            if (options.timeControl) {
                timerStore.setTimeControl(options.timeControl, options.customTimeControl)
            }

            console.log('Spiel mit Timer initialisiert:', options)
            return Promise.resolve()
        } catch (error) {
            console.error('Fehler beim Initialisieren des Spiels mit Timer:', error)
            return Promise.reject(error)
        }
    }

    /**
     * Spiel initialisieren
     * @param {object} options - Spieloptionen
     */
    const initializeGame = async (options = {}) => {
        try {
            if (options.mode) {
                setGameMode(options.mode)
            }

            await startNewGame({
                gameId: options.gameId || `game_${Date.now()}`,
                whitePlayer: options.whitePlayer || 'Weiß',
                blackPlayer: options.blackPlayer || 'Schwarz'
            })

            if (options.initialPosition) {
                loadGameFromFen(options.initialPosition)
            }

            console.log('Spiel initialisiert:', options)
            return Promise.resolve() // Expliziter Return
        } catch (error) {
            console.error('Fehler beim Initialisieren des Spiels:', error)
            return Promise.reject(error) // Expliziter Error-Return
        }
    }

    /**
     * Neues Spiel starten
     * @param {object} options - Spieloptionen
     */
    const startNewGame = async (options = {}) => {
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
            if (typeof window !== 'undefined') {
                // Nur im Browser ausführen, nicht auf Server-Seite
                configStore.setBoardOrientation('white')
            }
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

            if (positionHistory.value.length > THREEFOLD_REPETITION.POSITIONS_TO_TRACK) {
                positionHistory.value.shift()
            }
        } catch (error) {
            console.error('Fehler beim Hinzufügen zur Position-History:', error)
        }
    }

    /**
     * 3-fache Stellungswiederholung prüfen
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
     * Warnung für nahende Stellungswiederholung
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
     * Anzahl Wiederholungen der aktuellen Position
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

        const isUnderAttack = chessLogic.isInCheck(
            currentBoard.value,
            currentPlayer.value,
            gameState
        )

        isInCheck.value = isUnderAttack

        if (isUnderAttack) {
            checkingPieces.value = chessLogic.getAttackingPieces(
                kingSquare,
                currentPlayer.value === 'white' ? 'black' : 'white',
                currentBoard.value,
                gameState
            )
            gameStatus.value = GAME_STATUS.CHECK
        } else {
            checkingPieces.value = []
            if (gameStatus.value === GAME_STATUS.CHECK) {
                gameStatus.value = GAME_STATUS.ACTIVE
            }
        }

        return isUnderAttack
    }

    const checkForCheckmate = () => {
        if (gameStatus.value === GAME_STATUS.CHECKMATE) {
            return true
        }

        if (!checkForCheck()) {
            return false
        }

        const legalMoves = chessLogic.getAllLegalMoves(
            currentBoard.value,
            currentPlayer.value,
            gameState.value
        )
        console.log('LEGAL MOVES NUMBER: ', legalMoves.length)
        const isCheckmate = legalMoves.length === 0

        if (isCheckmate) {
            gameStatus.value = GAME_STATUS.CHECKMATE
            console.log('🏁 SCHACHMATT! Spieler', currentPlayer.value, 'hat verloren')
        }

        return isCheckmate
    }

    const checkForStalemate = () => {
        if (checkForCheck()) {
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

        // Timer-Ablauf prüfen
        if (timerStore.timerState === 'expired') {
            const expiredPlayer = timerStore.activePlayer
            gameStatus.value = expiredPlayer === 'white' ? GAME_STATUS.BLACK_WINS_TIME : GAME_STATUS.WHITE_WINS_TIME
            console.log(`🕐 Zeit abgelaufen! ${expiredPlayer === 'white' ? 'Schwarz' : 'Weiß'} gewinnt`)
            return
        }

        const checkmateResult = checkForCheckmate()
        if (checkmateResult) {
            timerStore.stopTimer()
            console.log('🎯 Schachmatt erkannt, Spiel beendet')
            return
        }

        const stalemateResult = checkForStalemate()
        if (stalemateResult) {
            timerStore.stopTimer()
            console.log('🎯 Patt erkannt, Spiel beendet')
            return
        }

        const repetitionResult = checkForThreefoldRepetition()
        if (repetitionResult) {
            console.log('🎯 3-fache Stellungswiederholung erkannt, Spiel beendet')
            timerStore.stopTimer()
            return
        }

        const fiftyMoveResult = checkForFiftyMoveRule()
        if (fiftyMoveResult) {
            timerStore.stopTimer()
            console.log('🎯 50-Züge-Regel erfüllt, Spiel beendet')
            return
        }
    }

    const attemptMoveWithPromotion = (fromSquare, toSquare, promotionPiece) => {
        return attemptMove(fromSquare, toSquare, { promotion: promotionPiece })
    }

    const executeMove = (fromSquare, toSquare, promotionPiece = null) => {
        try {
            const validationResult = validateMoveCoordinates(fromSquare, toSquare)
            if (!validationResult.success) {
                return validationResult
            }

            const { fromIndices, toIndices } = validationResult.data
            const piece = currentBoard.value[fromIndices.rankIndex][fromIndices.fileIndex]

            if (isEmpty(piece)) {
                throw new Error('Kein Piece auf Startfeld')
            }

            const targetPiece = currentBoard.value[toIndices.rankIndex][toIndices.fileIndex]
            const gameState = getCurrentGameState()
            const tempBoard = cloneBoard(currentBoard.value)

            let targetMove = null

            // Promotion-Logik
            if (promotionPiece) {
                const isCapture = !isEmpty(targetPiece)

                if (isCapture) {
                    addCapturedPiece(targetPiece)
                    console.log('🎯 Promotion mit Eroberung:', targetPiece, 'geschlagen')
                }

                tempBoard[toIndices.rankIndex][toIndices.fileIndex] = promotionPiece
                tempBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null

                console.log('🎯 Promotion ausgeführt:', piece, '->', promotionPiece, 'auf', toSquare)

                targetMove = {
                    from: fromSquare,
                    to: toSquare,
                    type: 'promotion',
                    piece,
                    promotionPiece,
                    capturedPiece: targetPiece
                }
            } else {
                const possibleMoves = chessLogic.generatePossibleMoves(piece, fromSquare, currentBoard.value, gameState)
                targetMove = possibleMoves.find(move => move.to === toSquare)

                if (!targetMove) {
                    throw new Error('Illegaler Zug')
                }

                handleSpecialMoves(targetMove, tempBoard, targetPiece)

                tempBoard[toIndices.rankIndex][toIndices.fileIndex] = piece
                tempBoard[fromIndices.rankIndex][fromIndices.fileIndex] = null
            }

            if (!chessLogic.isMoveLegal(currentBoard.value, fromSquare, toSquare, currentPlayer.value, gameState)) {
                return { success: false, error: 'Zug würde König ins Schach setzen' }
            }

            const nextPlayer = currentPlayer.value === 'white' ? 'black' : 'white'
            const newEnPassantSquare = promotionPiece ? null : calculateEnPassantSquare(piece, fromIndices, toIndices)
            const newCastlingRights = chessLogic.updateCastlingRights(castlingRights.value, fromSquare, toSquare, piece, targetPiece)
            const moveCounters = chessLogic.calculateMoveCounters(piece, targetPiece, halfmoveClock.value, fullmoveNumber.value, currentPlayer.value)

            const newFen = generateFen(tempBoard, nextPlayer, newCastlingRights, newEnPassantSquare, moveCounters.halfmoveClock, moveCounters.fullmoveNumber)
            console.log('🎯 Neue FEN:', newFen)
            setFen(newFen)

            // Timer-Update (für Promotion-Züge)
            if (promotionPiece) {
                timerStore.switchPlayer(nextPlayer)
            }

            const moveType = targetMove.type
            const moveRecord = createMoveRecord(fromSquare, toSquare, piece, targetPiece, promotionPiece, moveType, moveCounters, newEnPassantSquare, newFen)
            finalizeMove(moveRecord)

            if (promotionPiece) {
                console.log('✅ Promotion-Zug erfolgreich ausgeführt:', moveRecord)
            }

            return { success: true, move: moveRecord }
        } catch (error) {
            console.error('Fehler beim Zug:', error)
            return { success: false, error: error.message }
        }
    }

    const executePromotionMove = (fromSquare, toSquare, promotionPiece) => {
        return executeMove(fromSquare, toSquare, promotionPiece)
    }

    const validateMoveCoordinates = (fromSquare, toSquare) => {
        const fromIndices = squareToIndices(fromSquare)
        const toIndices = squareToIndices(toSquare)

        if (!fromIndices || !toIndices) {
            return { success: false, error: 'Ungültige Koordinaten' }
        }

        if (!capturedPieces.value) {
            capturedPieces.value = { white: [], black: [] }
        }

        return { success: true, data: { fromIndices, toIndices } }
    }

    const handleSpecialMoves = (targetMove, tempBoard, targetPiece) => {
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
                const rookMove = targetMove.rookMove
                if (rookMove) {
                    const rookFromIndices = squareToIndices(rookMove.from)
                    const rookToIndices = squareToIndices(rookMove.to)
                    if (rookFromIndices && rookToIndices) {
                        const rook = tempBoard[rookFromIndices.rankIndex][rookFromIndices.fileIndex]
                        tempBoard[rookToIndices.rankIndex][rookToIndices.fileIndex] = rook
                        tempBoard[rookFromIndices.rankIndex][rookFromIndices.fileIndex] = null
                        console.log('🎯 Rochade: Bewege Turm von', rookMove.from, 'nach', rookMove.to)
                    }
                }
                break
        }
    }

    const calculateEnPassantSquare = (piece, fromIndices, toIndices) => {
        const pieceType = piece?.toLowerCase()
        if (pieceType === 'p') {
            const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)
            if (rankDistance === 2) {
                const isWhitePawnMove = isWhitePiece(piece)
                const startRank = isWhitePawnMove ? 6 : 1
                if (fromIndices.rankIndex === startRank) {
                    const enPassantRank = isWhitePawnMove ? 5 : 2
                    return indicesToSquare(toIndices.fileIndex, enPassantRank)
                }
            }
        }
        return null
    }

    const createMoveRecord = (fromSquare, toSquare, piece, targetPiece, promotionPiece, moveType, moveCounters, enPassantSquare, newFen) => {
        const moveRecord = {
            moveIndex: lastMove.value ? lastMove.value.moveIndex + 1 : 0,
            fullmoveNumber: moveCounters.fullmoveNumber,
            halfmoveClock: moveCounters.halfmoveClock,
            parentMoveIndex: null,
            isMainLine: true,
            variantDepth: 0,
            from: fromSquare,
            to: toSquare,
            piece,
            currentBoard: currentBoard.value,
            capturedPiece: targetPiece,
            promotion: promotionPiece,
            isCheck: false,
            isCheckmate: false,
            enPassantSquare,
            moveType,
            san: generateSAN(
                {
                    from: fromSquare,
                    to: toSquare,
                    piece,
                    capturedPiece: targetPiece,
                    promotion: promotionPiece,
                    isCheck: false,
                    isCheckmate: false,
                    moveType
                },
                currentBoard.value,
                chessLogic.getAllLegalMoves(currentBoard.value, currentPlayer.value, getCurrentGameState())
            ),
            fenBefore: moveHistory.value.length > 0 ? moveHistory.value[moveHistory.value.length - 1].fenAfter : INITIAL_FEN,
            fenAfter: newFen,
            timestamp: new Date(),
            capturedPieces
        }

        if (promotionPiece) {
            moveRecord.promotionPiece = promotionPiece
            moveRecord.isCapture = !isEmpty(targetPiece)
        }

        return moveRecord
    }

    const finalizeMove = (moveRecord) => {
        moveHistory.value.push(moveRecord)

        if (moveHistory.value.length === 1) {
            if (!timerStore.isUnlimitedTime) {
                timerStore.switchPlayer(currentPlayer.value)
                timerStore.startTimer()
            }
        } else if (timerStore.isTimerActive) {
            timerStore.switchPlayer(currentPlayer.value)
        }

        lastMove.value = moveRecord
        currentMoveIndex.value = lastMove.value.moveIndex
    }

    const handleTimerExpired = (data) => {
        try {
            const expiredPlayer = data.player

            if (expiredPlayer === 'white') {
                gameStatus.value = GAME_STATUS.BLACK_WINS_TIME
            } else {
                gameStatus.value = GAME_STATUS.WHITE_WINS_TIME
            }

            console.log(`⏰ ZEIT ABGELAUFEN! ${expiredPlayer === 'white' ? 'Schwarz' : 'Weiß'} gewinnt durch Zeitüberschreitung`)

            timerStore.stopTimer()

        } catch (error) {
            console.error('Fehler beim Timer-Ablauf:', error)
        }
    }

    const pauseGame = () => {
        if (timerStore.isTimerActive) {
            timerStore.pauseTimer()
        }
    }

    const resumeGame = () => {
        if (timerStore.timerState === 'paused') {
            timerStore.resumeTimer()
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
     * @returns {boolean} Success status
     */
    const undoLastMove = () => {
        console.log('🔄 undoLastMove aufgerufen')

        if (!isGameActive.value || moveHistory.value.length === 0) {
            console.warn('⚠️ Undo nicht möglich: Spiel nicht aktiv oder keine Züge')
            return false
        }

        try {
            console.log('📊 History vor Undo:', moveHistory.value.length)
            console.log('📊 REDO STACK vor Undo:', redoStack.value.length)

            const lastMoveRecord = moveHistory.value.pop()
            if (!lastMoveRecord?.fenBefore) {
                console.warn('⚠️ Undo nicht möglich: Kein fenBefore')
                moveHistory.value.push(lastMoveRecord) // Rollback
                return false
            }

            console.log('🔍 LastMoveRecord:', lastMoveRecord)

            // Redo-Stack speichern
            redoStack.value.push({
                moveRecord: lastMoveRecord,
                gameStatus: gameStatus.value
            })

            // Position vor dem Zug wiederherstellen
            console.log('FEN BEFORE: ', lastMoveRecord.fenBefore)
            console.log('FEN AFTER: ', lastMoveRecord.fenAfter)
            const fenBefore = lastMoveRecord.fenBefore ?? INITIAL_FEN
            console.log('🔄 Wiederherstellen von FEN:', fenBefore)

            // FEN setzen
            setFen(fenBefore)

            // Aus vorherigem moveRecord rekonstruieren
            if (moveHistory.value.length > 0) {
                const previousMove = moveHistory.value[moveHistory.value.length - 1]
                console.log('✅ Verwende previousMove:', previousMove)

                if (previousMove.boardAfter) {
                    currentBoard.value = previousMove.boardAfter
                    currentPlayer.value = previousMove.playerAfter
                    castlingRights.value = previousMove.castlingRightsAfter
                    // enPassantSquare.value = previousMove.enPassantSquareAfter
                    halfmoveClock.value = previousMove.halfmoveClockAfter
                    fullmoveNumber.value = previousMove.fullmoveNumberAfter
                }
            }
            // Aus FEN parsen (Fallback)
            else {
                console.log('⚠️ Fallback: Parse FEN direkt')
                const parsed = parseFen(fenBefore)
                if (parsed) {
                    currentBoard.value = parsed.position
                    currentPlayer.value = parsed.activeColor
                    castlingRights.value = parsed.castlingRights
                    // enPassantSquare.value = parsed.enPassantSquare
                    halfmoveClock.value = parsed.halfmoveClock
                    fullmoveNumber.value = parsed.fullmoveNumber
                }
            }

            // Geschlagene Figur zurückgeben
            if (lastMoveRecord.capturedPiece) {
                const capturedColor = getPieceColor(lastMoveRecord.capturedPiece)
                const opponentColor = capturedColor === PLAYER_COLORS.WHITE ? 'white' : 'black'

                if (capturedPieces.value[opponentColor]?.length > 0) {
                    capturedPieces.value[opponentColor].pop()
                }
            }

            lastMove.value = moveHistory.value.length > 0
                ? moveHistory.value[moveHistory.value.length - 1]
                : null

            // Position History bereinigen
            if (positionHistory.value.length > 0) {
                positionHistory.value.pop()
            }

            clearSelection()

            // Check-Status aus vorherigem Zug rekonstruieren
            if (lastMove.value?.isCheck) {
                isInCheck.value = true
                checkForCheck() // Sicherheitshalber neu berechnen
            } else {
                isInCheck.value = false
                checkingPieces.value = []
            }

            if ([GAME_STATUS.CHECKMATE, GAME_STATUS.STALEMATE, GAME_STATUS.DRAW_FIFTY_MOVE, GAME_STATUS.DRAW_REPETITION].includes(gameStatus.value)) {
                gameStatus.value = isInCheck.value ? GAME_STATUS.CHECK : GAME_STATUS.ACTIVE
            }

            return true

        } catch (error) {
            console.error('❌ Fehler beim Undo:', error)
            return false
        }
    }

    /**
     * Zug wiederholen (Redo)
     * @returns {boolean} Success status
     */
    const redoMove = () => {
        try {
            if (!isGameActive.value) {
                console.warn('Redo nicht möglich: Spiel nicht aktiv')
                return false
            }

            if (redoStack.value.length === 0) {
                console.warn('Redo nicht möglich: Kein Zug im Redo-Stack')
                return false
            }

            const redoState = redoStack.value.pop()
            if (!redoState || !redoState.moveRecord) {
                console.warn('Redo nicht möglich: Ungültiger Redo-Zustand')
                return false
            }

            const redoMoveRecord = redoState.moveRecord
            console.log('🔄 Redo moveRecord:', redoMoveRecord)

            setFen(redoMoveRecord.fenAfter)

            moveHistory.value.push(redoMoveRecord)
            lastMove.value = redoMoveRecord

            if (redoMoveRecord.capturedPieces) {
                capturedPieces.value = { ...redoMoveRecord.capturedPieces }
            }

            if (redoMoveRecord.capturedPiece) {
                addCapturedPiece(redoMoveRecord.capturedPiece)
            }

            gameStatus.value = redoState.gameStatus

            isInCheck.value = redoMoveRecord.isCheck || false
            checkingPieces.value = redoMoveRecord.checkingPieces || []

            const positionKey = chessLogic.createPositionKey(redoMoveRecord.fenAfter)
            if (positionKey) {
                positionHistory.value.push(positionKey)
            }

            clearSelection()

            return true

        } catch (error) {
            console.error('❌ Fehler beim Redo:', error)
            return false
        }
    }

    /**
     * Zu bestimmtem Zug springen (Navigation)
     * @param {number} targetMoveIndex - Ziel-moveIndex (-1 für Startposition)
     * @returns {boolean} Success status
     */
    const goToMove = (targetMoveIndex) => {
        try {
            console.log('🎯 goToMove aufgerufen:', targetMoveIndex)

            // Startposition
            if (targetMoveIndex < 0) {
                setFen(INITIAL_FEN)
                lastMove.value = null
                clearSelection()

                // Game State zurücksetzen
                gameStatus.value = GAME_STATUS.ACTIVE
                isInCheck.value = false
                checkingPieces.value = []

                console.log('✅ Zur Startposition gesprungen')
                return true
            }

            // Validierung
            if (targetMoveIndex >= moveHistory.value.length) {
                console.warn('goToMove: Ungültiger moveIndex:', targetMoveIndex)
                return false
            }

            // Ziel-Zug finden
            const targetMove = moveHistory.value.find(moveRecord => moveRecord.moveIndex === targetMoveIndex)
            if (!targetMove) {
                console.warn('goToMove: Zug mit moveIndex nicht gefunden:', targetMoveIndex)
                return false
            }

            // Position setzen
            setFen(targetMove.fenAfter)
            lastMove.value = targetMove
            clearSelection()

            // Spielzustand neu bewerten (ohne Post-Move-Checks)
            checkForCheck()

            console.log('✅ Zu Zug gesprungen:', {
                targetIndex: targetMoveIndex,
                move: targetMove.san,
                fullmove: targetMove.fullmoveNumber,
                position: targetMove.fenAfter
            })

            return true

        } catch (error) {
            console.error('❌ Fehler bei goToMove:', error)
            return false
        }
    }

    /**
     * Einen Zug vor
     * @returns {boolean}
     */
    const stepForward = () => {
        const currentIndex = lastMove.value?.moveIndex ?? -1
        return goToMove(currentIndex + 1)
    }

    /**
     * Einen Zug zurück
     * @returns {boolean}
     */
    const stepBackward = () => {
        const currentIndex = lastMove.value?.moveIndex ?? 0
        return goToMove(currentIndex - 1)
    }

    /**
     * Zum Spielende springen
     * @returns {boolean}
     */
    const goToEnd = () => {
        if (moveHistory.value.length === 0) return false
        const lastMoveIndex = moveHistory.value[moveHistory.value.length - 1].moveIndex
        return goToMove(lastMoveIndex)
    }

    /**
     * Zum Spielanfang springen
     * @returns {boolean}
     */
    const goToStart = () => {
        return goToMove(-1)
    }

    /**
     * Hilfsfunktion: Geschlagene Figur wiederherstellen
     * @param {string} capturedPiece
     */
    const restoreCapturedPiece = (capturedPiece) => {
        if (!capturedPieces.value) {
            capturedPieces.value = { white: [], black: [] }
        }

        const capturedColor = getPieceColor(capturedPiece)

        if (capturedPieces.value[capturedColor]) {
            // Suche die Figur und entferne sie aus der captured-Liste
            const capturedList = capturedPieces.value[capturedColor]

            // Finde den letzten Eintrag dieser Figur
            for (let i = capturedList.length - 1; i >= 0; i--) {
                const captured = capturedList[i]
                const capturedType = typeof captured === 'string' ? captured : captured.notation

                if (capturedType === capturedPiece) {
                    capturedList.splice(i, 1)
                    console.log('Geschlagene Figur wiederhergestellt:', capturedPiece)
                    break
                }
            }
        }
    }

    const canUndo = computed(() => {
        return configStore.gameModeSettings.allowUndo &&
            moveHistory.value.length > 0 &&
            isGameActive.value
    })

    /**
     * Navigation - computed properties
     */
    const canStepForward = computed(() => {
        return isGameActive.value && redoStack.value.length > 0
    })

    const canStepBackward = computed(() => {
        return isGameActive && currentMoveIndex.value >= 0
    })

    const canGoToStart = computed(() => {
        return currentMoveIndex.value !== -1
    })

    const canGoToEnd = computed(() => {
        const currentIndex = currentMoveIndex.value
        const lastIndex = moveHistory.value.length > 0
            ? moveHistory.value[moveHistory.value.length - 1].moveIndex
            : -1
        return currentIndex !== lastIndex
    })

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
        currentMoveIndex,
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
        resignGame,
        gotoMove,
        undoLastMove,
        redoMove,
        redoStack: computed(() => redoStack.value),
        canStepForward,
        canStepBackward,
        canGoToStart,
        canGoToEnd,

        initializeGameWithTimer,
        handleTimerExpired,
        pauseGame,
        resumeGame,

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
