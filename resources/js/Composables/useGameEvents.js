import { GAME_MODES, GAME_STATUS as GAME_STATUSES } from '@/Utils/chessConstants.js'

/**
 * Composable for managing chess game events
 *
 * @param {Object} gameStore - The game store instance
 * @param {Object} configStore - The config store instance
 * @param {Function} addNotification - Function to add notifications
 * @param {Function} playMoveSound - Function to play move sounds
 * @param {Function} playGameSound - Function to play game sounds
 * @param {Function} showPromotionDialog - Function to show promotion dialog
 * @param {Function} performAutoReverse - Function to auto-reverse the board
 * @param handleGameStatusNotification
 * @returns {Object} Game event handlers
 */
export function useGameEvents(
    gameStore,
    configStore,
    addNotification,
    playMoveSound,
    playGameSound,
    showPromotionDialog,
    performAutoReverse,
    handleGameStatusNotification
) {
    /**
     * Handle square click events
     *
     * @param {Object} squareData - Data about the clicked square
     */
    const handleSquareClick = (squareData) => {
        if (squareData.needsPromotion) {
            showPromotionDialog(squareData)
            return
        }

        if (squareData.success && gameStore.lastMove) {
            addNotification({
                type: 'move',
                message: `Zug: ${gameStore.lastMove.san}`,
                duration: 2000
            })
        }

        if (squareData.success) {
            playMoveSound(squareData)
        }
    }

    /**
     * Handle piece click events
     *
     * @param {Object} pieceData - Data about the clicked piece
     */
    const handlePieceClick = (pieceData) => {
        // Currently just logging, could be extended
        console.log('Piece clicked:', pieceData)
    }

    /**
     * Handle move events
     *
     * @param {Object} moveData - Data about the move
     */
    const handleMove = (moveData) => {
        if (moveData.needsPromotion) {
            showPromotionDialog(moveData)
            return
        }

        handleMoveCompleted(moveData)
    }

    /**
     * Handle move completion
     *
     * @param {Object} moveData - Data about the completed move
     */
    const handleMoveCompleted = (moveData) => {
        const lastMoveRecord = gameStore.lastMove

        const enhancedMoveData = {
            ...moveData,
            isCapture: lastMoveRecord?.moveType === 'capture' ||
                lastMoveRecord?.moveType === 'enpassant' ||
                moveData.capture ||
                (lastMoveRecord?.capturedPiece && true),
            isCastling: lastMoveRecord?.moveType === 'castle',
            isPromotion: lastMoveRecord?.moveType === 'promotion',
            isCheck: gameStore.isInCheck,
            isCheckmate: gameStore.gameStatus === GAME_STATUSES.CHECKMATE,
            moveType: lastMoveRecord?.moveType
        }

        playMoveSound(enhancedMoveData)

        // Auto-reverse after successful move
        if (gameStore.isGameActive) {
            performAutoReverse()
        }

        // Trigger engine response (if AI game)
        if (shouldTriggerEngineMove()) {
            setTimeout(() => {
                // engineStore.makeMove() - Commented out as in original
            }, 500)
        }
    }

    /**
     * Check if engine move should be triggered
     *
     * @returns {boolean} True if engine move should be triggered
     */
    const shouldTriggerEngineMove = () => {
        return gameStore.gameMode === GAME_MODES.VS_AI &&
            gameStore.playerColor !== 'both' &&
            gameStore.currentPlayer !== gameStore.playerColor &&
            gameStore.isGameActive
    }

    /**
     * Handle game state changes
     *
     * @param {Object} stateData - Data about the state change
     */
    const handleGameStateChange = (stateData) => {
        if (stateData.newStatus !== stateData.oldStatus) {
            handleGameStatusNotification(stateData.newStatus)
        }
    }

    /**
     * Handle check events
     *
     * @param {Object} checkData - Data about the check
     */
    const handleCheck = (checkData) => {
        addNotification({
            type: 'warning',
            message: `Schach! ${checkData.player === 'white' ? 'Weiß' : 'Schwarz'} steht im Schach`,
            duration: 3000
        })

        playGameSound('check')
    }

    /**
     * Handle checkmate events
     *
     * @param {Object} checkmateData - Data about the checkmate
     */
    const handleCheckmate = (checkmateData) => {
        addNotification({
            type: 'success',
            message: `Schachmatt! ${checkmateData.winner === 'white' ? 'Weiß' : 'Schwarz'} gewinnt`,
            duration: 5000,
            persistent: true
        })

        playGameSound('checkmate')
    }

    /**
     * Handle stalemate events
     *
     * @param {Object} stalemateData - Data about the stalemate
     */
    const handleStalemate = (stalemateData) => {
        addNotification({
            type: 'info',
            message: 'Patt! Das Spiel endet unentschieden',
            duration: 5000,
            persistent: true
        })

        playGameSound('stalemate')
    }

    /**
     * Handle timer expiration
     *
     * @param {Object} data - Data about the expired timer
     */
    const handleTimerExpired = (data) => {
        gameStore.handleTimerExpired(data)
    }

    return {
        handleSquareClick,
        handlePieceClick,
        handleMove,
        handleMoveCompleted,
        handleGameStateChange,
        handleCheck,
        handleCheckmate,
        handleStalemate,
        handleTimerExpired
    }
}
