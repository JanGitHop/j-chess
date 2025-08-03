import { ref, onMounted, onUnmounted } from 'vue'
import { ANNOTATION_COLORS } from '@/Utils/annotationConstants'
import { useAnnotationStore } from '@/Stores/annotationStore'

/**
 * Composable for handling keyboard shortcuts for annotations
 *
 * @returns {Object} Keyboard state and handlers
 */
export function useAnnotationKeyboard() {
    const annotationStore = useAnnotationStore()

    // Keyboard state
    const altKey = ref(false)
    const ctrlKey = ref(false)
    const shiftKey = ref(false)

    /**
     * Get the annotation color based on current key combination
     *
     * @returns {string|null} Color from ANNOTATION_COLORS or null if no valid combination
     */
    const getAnnotationColor = () => {
        if (altKey.value && !shiftKey.value) {
            return ANNOTATION_COLORS.GREEN
        }

        if (altKey.value && shiftKey.value) {
            return ANNOTATION_COLORS.RED
        }

        return null
    }

    /**
     * Check if any annotation key combination is active
     *
     * @returns {boolean} True if any annotation key combination is active
     */
    const isAnnotationKeyActive = () => {
        return getAnnotationColor() !== null
    }

    /**
     * Handle keydown event
     *
     * @param {KeyboardEvent} event - Keyboard event
     */
    const handleKeyDown = (event) => {
        // Update key state
        if (event.key === 'Alt') {
            altKey.value = true
        }

        if (event.key === 'Control') {
            ctrlKey.value = true
        }

        if (event.key === 'Shift') {
            shiftKey.value = true
        }

        // Clear all annotations with Alt+X
        if (event.key.toLowerCase() === 'x') {
            console.log('X pressed, clearing annotations')
            annotationStore.clearAnnotations()
            event.preventDefault()
        }
    }

    /**
     * Handle keyup event
     *
     * @param {KeyboardEvent} event - Keyboard event
     */
    const handleKeyUp = (event) => {
        // Update key state
        if (event.key === 'Alt') {
            altKey.value = false
        }

        if (event.key === 'Control') {
            ctrlKey.value = false
        }

        if (event.key === 'Shift') {
            shiftKey.value = false
        }
    }

    /**
     * Handle window blur event to reset key state
     */
    const handleWindowBlur = () => {
        altKey.value = false
        ctrlKey.value = false
        shiftKey.value = false
    }

    // Setup and cleanup event listeners
    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('blur', handleWindowBlur)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        window.removeEventListener('blur', handleWindowBlur)
    })

    return {
        altKey,
        ctrlKey,
        shiftKey,
        getAnnotationColor,
        isAnnotationKeyActive
    }
}
