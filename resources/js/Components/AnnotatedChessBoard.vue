<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ChessBoard from '@/Components/ChessBoard.vue'
import AnnotationOverlay from '@/Components/AnnotationOverlay.vue'
import { useAnnotationStore } from '@/Stores/annotationStore'
import { useAnnotationKeyboard } from '@/Composables/useAnnotationKeyboard'
import { ANNOTATION_COLORS } from '@/Utils/annotationConstants'

// Props (pass through to ChessBoard)
const props = defineProps({
    sizeMode: {
        type: String,
        default: null
    },
    customSize: {
        type: Number,
        default: null
    },
    showCoordinates: {
        type: Boolean,
        default: null
    },
    interactive: {
        type: Boolean,
        default: true
    },
    gameMode: {
        type: String,
        default: null
    },
    showLegalMoves: {
        type: Boolean,
        default: true
    },
    highlightLastMove: {
        type: Boolean,
        default: true
    },
    orientation: {
        type: String,
        default: 'white',
        validator: value => ['white', 'black'].includes(value)
    }
})

// Emit all events from ChessBoard
const emit = defineEmits([
    'move',
    'squareClick',
    'pieceClick',
    'gameStateChange',
    'legalMovesGenerated',
    'moveAttempt',
    'invalidMove',
    'check',
    'checkmate',
    'stalemate',
    'dragStart',
    'dragEnd'
])

// Stores
const annotationStore = useAnnotationStore()

// Keyboard state for annotations
const {
    altKey,
    ctrlKey,
    shiftKey,
    getAnnotationColor,
    isAnnotationKeyActive
} = useAnnotationKeyboard()

// Refs
const chessBoardRef = ref(null)
const containerRef = ref(null)
const isMouseDown = ref(false)
const startSquare = ref(null)

// Computed
const boardSize = computed(() => chessBoardRef.value?.boardSize || 480)
const squareSize = computed(() => boardSize.value / 8)

// Mouse event handlers for annotations
const handleMouseDown = (event) => {
    // Only handle if annotation key is active
    if (!isAnnotationKeyActive()) return

    // Find the square element
    const squareElement = findSquareElement(event.target)
    if (!squareElement) return

    // Get square coordinates
    const square = squareElement.dataset.square
    if (!square) return

    // Prevent default to avoid text selection
    event.preventDefault()

    // Start drawing
    isMouseDown.value = true
    startSquare.value = square

    // Start annotation in store
    annotationStore.startDrawing(square)
}

const handleMouseMove = (event) => {
    // Only handle if mouse is down and annotation key is active
    if (!isMouseDown.value || !isAnnotationKeyActive()) return

    // Find the square element
    const squareElement = findSquareElement(event.target)
    if (!squareElement) return

    // Get square coordinates
    const square = squareElement.dataset.square
    if (!square) return

    // Update drawing in store
    annotationStore.updateDrawing(square)
}

const handleMouseUp = (event) => {
    // Only handle if mouse is down and annotation key is active
    if (!isMouseDown.value || !isAnnotationKeyActive()) return

    // Find the square element
    const squareElement = findSquareElement(event.target)
    if (!squareElement) return

    // Get square coordinates
    const square = squareElement.dataset.square
    if (!square) return

    // Get the color based on key combination
    const color = getAnnotationColor()

    // Finish drawing in store
    annotationStore.finishDrawing(square, color)

    // Reset state
    isMouseDown.value = false
    startSquare.value = null
}

const handleMouseLeave = () => {
    if (isMouseDown.value) {
        // Cancel drawing in store
        annotationStore.cancelDrawing()

        // Reset state
        isMouseDown.value = false
        startSquare.value = null
    }
}

// Helper to find the square element
const findSquareElement = (element) => {
    // Check if the element is a square
    if (element.classList.contains('board-square')) {
        return element
    }

    // Check if the element is inside a square
    let current = element
    while (current && current !== containerRef.value) {
        if (current.classList.contains('board-square')) {
            return current
        }
        current = current.parentElement
    }

    return null
}

// Handle click on the board
const handleBoardClick = (event) => {
    // If Alt key is pressed, prevent normal chess moves
    if (isAnnotationKeyActive()) {
        event.stopPropagation()
        event.preventDefault()
    }
}

// Setup and cleanup event listeners
onMounted(() => {
    if (containerRef.value) {
        containerRef.value.addEventListener('mousedown', handleMouseDown)
        containerRef.value.addEventListener('mousemove', handleMouseMove)
        containerRef.value.addEventListener('mouseup', handleMouseUp)
        containerRef.value.addEventListener('mouseleave', handleMouseLeave)
        containerRef.value.addEventListener('click', handleBoardClick, true)
    }
})

onUnmounted(() => {
    if (containerRef.value) {
        containerRef.value.removeEventListener('mousedown', handleMouseDown)
        containerRef.value.removeEventListener('mousemove', handleMouseMove)
        containerRef.value.removeEventListener('mouseup', handleMouseUp)
        containerRef.value.removeEventListener('mouseleave', handleMouseLeave)
        containerRef.value.removeEventListener('click', handleBoardClick, true)
    }
})

// Add data-square attributes to all squares
const addSquareAttributes = () => {
    if (!containerRef.value) return

    const squares = containerRef.value.querySelectorAll('.board-square')

    // Get all files and ranks from the board
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const ranks = [8, 7, 6, 5, 4, 3, 2, 1]

    // Loop through all squares and add data-square attribute
    let index = 0
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
        for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
            if (index < squares.length) {
                const square = squares[index]
                const file = props.orientation === 'white' ? files[fileIndex] : files[7 - fileIndex]
                const rank = props.orientation === 'white' ? ranks[rankIndex] : ranks[7 - rankIndex]
                const squareCoord = `${file}${rank}`
                square.dataset.square = squareCoord
                index++
            }
        }
    }
}

// Call after the component is mounted
onMounted(() => {
    // Wait for the board to render
    setTimeout(addSquareAttributes, 100)
})
</script>

<template>
    <div ref="containerRef" class="annotated-chess-board-container" style="position: relative;">
        <!-- Pass through all props to ChessBoard -->
        <ChessBoard
            ref="chessBoardRef"
            v-bind="$props"
            @move="$emit('move', $event)"
            @square-click="$emit('squareClick', $event)"
            @piece-click="$emit('pieceClick', $event)"
            @game-state-change="$emit('gameStateChange', $event)"
            @legal-moves-generated="$emit('legalMovesGenerated', $event)"
            @move-attempt="$emit('moveAttempt', $event)"
            @invalid-move="$emit('invalidMove', $event)"
            @check="$emit('check', $event)"
            @checkmate="$emit('checkmate', $event)"
            @stalemate="$emit('stalemate', $event)"
            @drag-start="$emit('dragStart', $event)"
            @drag-end="$emit('dragEnd', $event)"
        />

        <!-- Annotation overlay -->
        <AnnotationOverlay
            :board-size="boardSize"
            :square-size="squareSize"
            :orientation="orientation"
        />
    </div>
</template>

<style scoped>
.annotated-chess-board-container {
    position: relative;
    display: inline-block;
}
</style>
