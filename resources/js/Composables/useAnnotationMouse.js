import { ref } from 'vue'
import { useAnnotationStore } from '@/Stores/annotationStore'

/**
 * Composable for handling mouse events for annotations
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getAnnotationColor - Function to get the current annotation color
 * @param {Function} options.isAnnotationKeyActive - Function to check if annotation key is active
 * @returns {Object} Mouse event handlers for annotations
 */
export function useAnnotationMouse({ getAnnotationColor, isAnnotationKeyActive }) {
    const annotationStore = useAnnotationStore()

    // State for tracking mouse position
    const isMouseDown = ref(false)
    const startSquare = ref(null)
    const currentSquare = ref(null)

    /**
     * Handle mouse down event for annotations
     *
     * @param {string} square - Chess square (e.g., 'e4')
     * @param {MouseEvent} event - Mouse event
     * @returns {boolean} True if the event was handled by annotation logic
     */
    const handleAnnotationMouseDown = (square, event) => {
        // Only handle if annotation key is active
        if (!isAnnotationKeyActive()) {
            return false
        }

        // Prevent default to avoid text selection
        event.preventDefault()

        // Start drawing
        isMouseDown.value = true
        startSquare.value = square
        currentSquare.value = square

        // Start annotation in store
        annotationStore.startDrawing(square)

        return true
    }

    /**
     * Handle mouse move event for annotations
     *
     * @param {string} square - Chess square (e.g., 'e4')
     * @param {MouseEvent} event - Mouse event
     * @returns {boolean} True if the event was handled by annotation logic
     */
    const handleAnnotationMouseMove = (square, event) => {
        // Only handle if mouse is down and annotation key is active
        if (!isMouseDown.value || !isAnnotationKeyActive()) {
            return false
        }

        // Update current square
        currentSquare.value = square

        // Update drawing in store
        annotationStore.updateDrawing(square)

        return true
    }

    /**
     * Handle mouse up event for annotations
     *
     * @param {string} square - Chess square (e.g., 'e4')
     * @param {MouseEvent} event - Mouse event
     * @returns {boolean} True if the event was handled by annotation logic
     */
    const handleAnnotationMouseUp = (square, event) => {
        // Only handle if mouse is down and annotation key is active
        if (!isMouseDown.value || !isAnnotationKeyActive()) {
            return false
        }

        // Get the color based on key combination
        const color = getAnnotationColor()

        // Finish drawing in store
        annotationStore.finishDrawing(square, color)

        // Reset state
        isMouseDown.value = false
        startSquare.value = null
        currentSquare.value = null

        return true
    }

    /**
     * Handle mouse leave event for annotations
     */
    const handleAnnotationMouseLeave = () => {
        if (isMouseDown.value) {
            // Cancel drawing in store
            annotationStore.cancelDrawing()

            // Reset state
            isMouseDown.value = false
            startSquare.value = null
            currentSquare.value = null
        }
    }

    return {
        handleAnnotationMouseDown,
        handleAnnotationMouseMove,
        handleAnnotationMouseUp,
        handleAnnotationMouseLeave
    }
}
