<script setup>
import { computed } from 'vue'
import { useAnnotationStore } from '@/Stores/annotationStore'
import { ANNOTATION_TYPES, ANNOTATION_OPACITY, ARROW_STYLE } from '@/Utils/annotationConstants'
import { squareToCoordinates, squareToIndices } from '@/Utils/chessUtils'

const props = defineProps({
    boardSize: {
        type: Number,
        required: true
    },
    squareSize: {
        type: Number,
        required: true
    },
    orientation: {
        type: String,
        default: 'white',
        validator: value => ['white', 'black'].includes(value)
    }
})

const annotationStore = useAnnotationStore()

// Calculate SVG viewBox
const viewBox = computed(() => `0 0 ${props.boardSize} ${props.boardSize}`)

// Convert chess square to SVG coordinates
const getSquareCenter = (square) => {
    const coords = squareToCoordinates(square, props.orientation)
    if (!coords) return { x: 0, y: 0 }

    const x = (coords.file + 0.5) * props.squareSize
    const y = (coords.rank + 0.5) * props.squareSize

    return { x, y }
}

// Check if move is a knight move
const isKnightMove = (fromSquare, toSquare) => {
    const fromIndices = squareToIndices(fromSquare)
    const toIndices = squareToIndices(toSquare)

    if (!fromIndices || !toIndices) return false

    const fileDistance = Math.abs(toIndices.fileIndex - fromIndices.fileIndex)
    const rankDistance = Math.abs(toIndices.rankIndex - fromIndices.rankIndex)

    // Knight moves are either 2-1 or 1-2 (file-rank)
    return (fileDistance === 2 && rankDistance === 1) ||
           (fileDistance === 1 && rankDistance === 2)
}

// Generate SVG path for an arrow
const getArrowPath = (fromSquare, toSquare) => {
    const from = getSquareCenter(fromSquare)
    const to = getSquareCenter(toSquare)

    // Calculate direction vector
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.sqrt(dx * dx + dy * dy)

    // Normalize direction vector
    const nx = dx / length
    const ny = dy / length

    // Use center points for the arrow
    const adjustedFrom = {
        x: from.x,
        y: from.y
    }

    // For the endpoint, we want to ensure we're targeting the exact center of the square
    // but we need to adjust for the arrow head size
    const adjustedTo = {
        x: to.x - nx * ARROW_STYLE.HEAD_SIZE,
        y: to.y - ny * ARROW_STYLE.HEAD_SIZE
    }

    // Calculate arrowhead points
    const headSize = ARROW_STYLE.HEAD_SIZE
    const arrowHead = [
        { x: adjustedTo.x - nx * headSize + ny * headSize, y: adjustedTo.y - ny * headSize - nx * headSize },
        { x: adjustedTo.x, y: adjustedTo.y },
        { x: adjustedTo.x - nx * headSize - ny * headSize, y: adjustedTo.y - ny * headSize + nx * headSize }
    ]

    // Check if it's a knight move
    if (isKnightMove(fromSquare, toSquare)) {
        // Create an L-shaped path for knight moves with exact 90-degree angle
        // Determine which direction to go first (horizontal or vertical)
        const isHorizontalFirst = Math.abs(dx) > Math.abs(dy)

        // Calculate the exact midpoint for a perfect 90-degree angle
        let midPoint;

        // Get the square indices directly from the squares
        const fromIndices = squareToIndices(fromSquare);
        const toIndices = squareToIndices(toSquare);

        // Calculate exact grid positions for perfect 90-degree angles
        if (isHorizontalFirst) {
            // Go horizontal first, then vertical
            // Create a point that's directly horizontal from start and vertical from end
            midPoint = {
                x: to.x, // Use exact target x-coordinate
                y: from.y // Use exact start y-coordinate
            }
        } else {
            // Go vertical first, then horizontal
            // Create a point that's directly vertical from start and horizontal from end
            midPoint = {
                x: from.x, // Use exact start x-coordinate
                y: to.y // Use exact target y-coordinate
            }
        }

        // For knight moves, we need to ensure we're targeting the exact center of the square
        // We'll create a new endpoint that's exactly at the center of the target square
        const exactTo = {
            x: to.x,
            y: to.y
        };

        // Calculate the direction vector for the last segment of the L-shape
        // This is important for the arrowhead to point in the right direction
        const lastSegmentDx = exactTo.x - midPoint.x;
        const lastSegmentDy = exactTo.y - midPoint.y;
        const lastSegmentLength = Math.sqrt(lastSegmentDx * lastSegmentDx + lastSegmentDy * lastSegmentDy);
        const lastSegmentNx = lastSegmentDx / lastSegmentLength;
        const lastSegmentNy = lastSegmentDy / lastSegmentLength;

        // Adjust the endpoint to account for the arrow head
        const knightAdjustedTo = {
            x: exactTo.x - lastSegmentNx * ARROW_STYLE.HEAD_SIZE,
            y: exactTo.y - lastSegmentNy * ARROW_STYLE.HEAD_SIZE
        };

        // Calculate arrowhead points based on the last segment direction
        const knightArrowHead = [
            {
                x: knightAdjustedTo.x - lastSegmentNx * headSize + lastSegmentNy * headSize,
                y: knightAdjustedTo.y - lastSegmentNy * headSize - lastSegmentNx * headSize
            },
            {
                x: knightAdjustedTo.x + lastSegmentNx * ARROW_STYLE.HEAD_SIZE,
                y: knightAdjustedTo.y + lastSegmentNy * ARROW_STYLE.HEAD_SIZE
            },
            {
                x: knightAdjustedTo.x - lastSegmentNx * headSize - lastSegmentNy * headSize,
                y: knightAdjustedTo.y - lastSegmentNy * headSize + lastSegmentNx * headSize
            }
        ];

        // Generate L-shaped path with correctly oriented arrowhead
        return `M ${adjustedFrom.x} ${adjustedFrom.y} L ${midPoint.x} ${midPoint.y} L ${knightAdjustedTo.x} ${knightAdjustedTo.y} M ${knightArrowHead[0].x} ${knightArrowHead[0].y} L ${knightArrowHead[1].x} ${knightArrowHead[1].y} L ${knightArrowHead[2].x} ${knightArrowHead[2].y}`
    }

    // Generate straight path for normal moves
    return `M ${adjustedFrom.x} ${adjustedFrom.y} L ${adjustedTo.x} ${adjustedTo.y} M ${arrowHead[0].x} ${arrowHead[0].y} L ${arrowHead[1].x} ${arrowHead[1].y} L ${arrowHead[2].x} ${arrowHead[2].y}`
}

// Generate rectangle for field annotation
const getFieldRect = (square) => {
    const coords = squareToCoordinates(square, props.orientation)
    if (!coords) return { x: 0, y: 0, width: 0, height: 0 }

    return {
        x: coords.file * props.squareSize,
        y: coords.rank * props.squareSize,
        width: props.squareSize,
        height: props.squareSize
    }
}

// Preview arrow while drawing
const previewArrow = computed(() => {
    if (!annotationStore.isDrawing || !annotationStore.drawStart || !annotationStore.drawEnd) {
        return null
    }

    if (annotationStore.drawStart === annotationStore.drawEnd) {
        return null
    }

    return {
        fromSquare: annotationStore.drawStart,
        toSquare: annotationStore.drawEnd
    }
})
</script>

<template>
    <svg
        class="annotation-overlay"
        :viewBox="viewBox"
        :width="boardSize"
        :height="boardSize"
        pointer-events="none"
    >
        <!-- Field annotations -->
        <rect
            v-for="annotation in annotationStore.fieldAnnotations"
            :key="annotation.id"
            :x="getFieldRect(annotation.square).x"
            :y="getFieldRect(annotation.square).y"
            :width="getFieldRect(annotation.square).width"
            :height="getFieldRect(annotation.square).height"
            :fill="annotation.color"
            :fill-opacity="ANNOTATION_OPACITY.FIELD"
            rx="2"
            ry="2"
        />

        <!-- Arrow annotations -->
        <path
            v-for="annotation in annotationStore.arrowAnnotations"
            :key="annotation.id"
            :d="getArrowPath(annotation.fromSquare, annotation.toSquare)"
            :stroke="annotation.color"
            :stroke-width="ARROW_STYLE.STROKE_WIDTH"
            :stroke-opacity="ANNOTATION_OPACITY.ARROW"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        />

        <!-- Preview arrow while drawing -->
        <path
            v-if="previewArrow"
            :d="getArrowPath(previewArrow.fromSquare, previewArrow.toSquare)"
            stroke="gray"
            :stroke-width="ARROW_STYLE.STROKE_WIDTH"
            :stroke-opacity="ANNOTATION_OPACITY.ARROW * 0.7"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="5,5"
        />
    </svg>
</template>

<style scoped>
.annotation-overlay {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    pointer-events: none;
}
</style>
