import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ANNOTATION_TYPES, ANNOTATION_COLORS } from '@/Utils/annotationConstants'

/**
 * Store for managing board annotations (fields and arrows)
 */
export const useAnnotationStore = defineStore('annotation', () => {
    // State
    const annotations = ref([])
    const isDrawing = ref(false)
    const drawStart = ref(null)
    const drawEnd = ref(null)

    // Getters
    const fieldAnnotations = computed(() =>
        annotations.value.filter(a => a.type === ANNOTATION_TYPES.FIELD)
    )

    const arrowAnnotations = computed(() =>
        annotations.value.filter(a => a.type === ANNOTATION_TYPES.ARROW)
    )

    // Actions

    /**
     * Add a field annotation
     * @param {string} square - Chess square (e.g., 'e4')
     * @param {string} color - Color from ANNOTATION_COLORS
     */
    function addFieldAnnotation(square, color) {
        // Check if annotation already exists
        const existingIndex = annotations.value.findIndex(
            a => a.type === ANNOTATION_TYPES.FIELD && a.square === square && a.color === color
        )

        // If it exists, remove it (toggle behavior)
        if (existingIndex !== -1) {
            annotations.value.splice(existingIndex, 1)
            return
        }

        // Otherwise add new annotation
        annotations.value.push({
            id: Date.now().toString(),
            type: ANNOTATION_TYPES.FIELD,
            square,
            color
        })
    }

    /**
     * Add an arrow annotation
     * @param {string} fromSquare - Starting square
     * @param {string} toSquare - Ending square
     * @param {string} color - Color from ANNOTATION_COLORS
     */
    function addArrowAnnotation(fromSquare, toSquare, color) {
        // Don't add arrow if start and end are the same
        if (fromSquare === toSquare) return

        // Check if annotation already exists
        const existingIndex = annotations.value.findIndex(
            a => a.type === ANNOTATION_TYPES.ARROW &&
                 a.fromSquare === fromSquare &&
                 a.toSquare === toSquare &&
                 a.color === color
        )

        // If it exists, remove it (toggle behavior)
        if (existingIndex !== -1) {
            annotations.value.splice(existingIndex, 1)
            return
        }

        // Otherwise add new annotation
        annotations.value.push({
            id: Date.now().toString(),
            type: ANNOTATION_TYPES.ARROW,
            fromSquare,
            toSquare,
            color
        })
    }

    /**
     * Remove all annotations
     */
    function clearAnnotations() {
        annotations.value = []
    }

    /**
     * Start drawing an annotation
     * @param {string} square - Starting square
     */
    function startDrawing(square) {
        isDrawing.value = true
        drawStart.value = square
        drawEnd.value = square
    }

    /**
     * Update the end point while drawing
     * @param {string} square - Current square
     */
    function updateDrawing(square) {
        if (isDrawing.value) {
            drawEnd.value = square
        }
    }

    /**
     * Finish drawing and create the annotation
     * @param {string} square - Ending square
     * @param {string} color - Color from ANNOTATION_COLORS
     */
    function finishDrawing(square, color) {
        if (!isDrawing.value) return

        drawEnd.value = square

        // If start and end are the same, it's a field annotation
        if (drawStart.value === drawEnd.value) {
            addFieldAnnotation(drawStart.value, color)
        } else {
            // Otherwise it's an arrow
            addArrowAnnotation(drawStart.value, drawEnd.value, color)
        }

        // Reset drawing state
        isDrawing.value = false
        drawStart.value = null
        drawEnd.value = null
    }

    /**
     * Cancel the current drawing operation
     */
    function cancelDrawing() {
        isDrawing.value = false
        drawStart.value = null
        drawEnd.value = null
    }

    return {
        // State
        annotations,
        isDrawing,
        drawStart,
        drawEnd,

        // Getters
        fieldAnnotations,
        arrowAnnotations,

        // Actions
        addFieldAnnotation,
        addArrowAnnotation,
        clearAnnotations,
        startDrawing,
        updateDrawing,
        finishDrawing,
        cancelDrawing
    }
})
