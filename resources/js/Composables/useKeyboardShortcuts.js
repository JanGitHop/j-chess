/**
 * Composable for managing keyboard shortcuts in the chess game
 *
 * @param {Object} handlers - Object containing handler functions
 * @param {Function} handlers.handlePromotionCancel - Function to cancel promotion
 * @param {Function} handlers.handleUndoMove - Function to undo a move
 * @param {Function} handlers.handleRedoMove - Function to redo a move
 * @param {Function} handlers.clearSelection - Function to clear the current selection
 * @param {Function} handlers.toggleFullscreen - Function to toggle fullscreen mode
 * @param {Function} handlers.toggleSidebar - Function to toggle sidebar visibility
 * @param {Object} handlers.showPromotionModal - Ref to check if promotion modal is visible
 * @returns {Object} Keyboard shortcut setup and clean-up functions
 */
export function useKeyboardShortcuts({
    handlePromotionCancel,
    handleUndoMove,
    handleRedoMove,
    clearSelection,
    toggleFullscreen,
    toggleSidebar,
    showPromotionModal
}) {
    /**
     * Handle keyboard events
     *
     * @param {KeyboardEvent} event - The keyboard event
     */
    const handleKeydown = (event) => {
        // Esc: close promotion modal
        if (event.key === 'Escape' && showPromotionModal.value) {
            handlePromotionCancel()
            return
        }

        // Ctrl/Cmd + Z: Undo move
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault()
            handleUndoMove()
        }

        // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo move
        if ((event.ctrlKey || event.metaKey) &&
            ((event.key === 'z' && event.shiftKey) || event.key === 'y')) {
            event.preventDefault()
            handleRedoMove()
        }

        // Escape: Cancel selection
        if (event.key === 'Escape') {
            clearSelection()
        }

        // F11: Fullscreen Toggle
        if (event.key === 'F11') {
            event.preventDefault()
            toggleFullscreen()
        }

        // Space: Sidebar Toggle (only when not typing in an input)
        if (event.key === ' ' && event.target === document.body) {
            event.preventDefault()
            toggleSidebar()
        }
    }

    /**
     * Set up keyboard shortcuts
     */
    const setupKeyboardShortcuts = () => {
        document.addEventListener('keydown', handleKeydown)
    }

    /**
     * Clean up keyboard shortcuts
     */
    const cleanupKeyboardShortcuts = () => {
        document.removeEventListener('keydown', handleKeydown)
    }

    return {
        setupKeyboardShortcuts,
        cleanupKeyboardShortcuts
    }
}
