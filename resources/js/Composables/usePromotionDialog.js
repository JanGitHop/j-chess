import { ref } from 'vue'

/**
 * Composable for managing pawn promotion dialogue and logic
 *
 * @param {Object} gameStore - The game store instance
 * @param {Object} pieceStore - The piece store instance
 * @param {Function} addNotification - Function to add notifications
 * @param {Function} playGameSound - Function to play game sounds
 * @returns {Object} Promotion dialogue methods and state
 */
export function usePromotionDialog(
    gameStore,
    pieceStore,
    addNotification,
    playGameSound
) {
    const showPromotionModal = ref(false)
    const promotionData = ref({
        fromSquare: null,
        toSquare: null,
        playerColor: null
    })

    /**
     * Show the promotion dialogue for a move
     *
     * @param {Object} moveData - Data about the move requiring promotion
     */
    const showPromotionDialog = (moveData) => {
        promotionData.value = {
            fromSquare: moveData.from,
            toSquare: moveData.to,
            playerColor: gameStore.currentPlayer
        }
        showPromotionModal.value = true
    }

    /**
     * Handle promotion choice confirmation
     *
     * @param {Object} promotionChoice - The chosen promotion piece
     * @returns {Object} The move result
     */
    const handlePromotionConfirm = (promotionChoice) => {
        const { from, to, promotionPiece } = promotionChoice

        const moveResult = gameStore.attemptMove(from, to, {
            promotion: promotionPiece
        })

        if (moveResult.success) {
            addNotification({
                type: 'success',
                message: `Bauernumwandlung: ${promotionPiece === promotionPiece.toUpperCase() ? 'Weiß' : 'Schwarz'} → ${pieceStore.getPieceName(promotionPiece)}`,
                duration: 3000
            })

            playGameSound('promotion')
        } else {
            addNotification({
                type: 'error',
                message: 'Ungültiger Promotion-Zug',
                duration: 2000
            })
        }

        hidePromotionDialog()
        return moveResult
    }

    /**
     * Handle promotion cancellation
     */
    const handlePromotionCancel = () => {
        addNotification({
            type: 'info',
            message: 'Bauernumwandlung abgebrochen',
            duration: 2000
        })

        hidePromotionDialog()
    }

    /**
     * Hide the promotion dialogue and reset its data
     */
    const hidePromotionDialog = () => {
        showPromotionModal.value = false
        promotionData.value = {
            fromSquare: null,
            toSquare: null,
            playerColor: null
        }

        gameStore.clearSelection()
    }

    return {
        showPromotionModal,
        promotionData,
        showPromotionDialog,
        handlePromotionConfirm,
        handlePromotionCancel,
        hidePromotionDialog
    }
}
