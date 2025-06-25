<script setup>
import { computed } from 'vue'

const props = defineProps({
    piece: {
        type: Object,
        required: true,
        validator: (value) => {
            return value && typeof value === 'object' && value.piece && value.imageUrl
        }
    },
    square: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        default: 40
    },
    interactive: {
        type: Boolean,
        default: true
    },
    isSelected: {
        type: Boolean,
        default: false
    },
    isDraggable: {
        type: Boolean,
        default: false
    },
    isDragging: {
        type: Boolean,
        default: false
    }
})

// NUR diese 3 Events werden benötigt
const emit = defineEmits([
    'click',
    'dragstart',
    'dragend'
])

// ===== COMPUTED PROPERTIES =====

const pieceStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
    maxWidth: `${props.size}px`,
    maxHeight: `${props.size}px`,
    minWidth: `${props.size}px`,
    minHeight: `${props.size}px`,
    backgroundImage: `url(${props.piece.imageUrl})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    cursor: props.interactive ? (props.isDraggable ? 'grab' : 'pointer') : 'default',
    transition: 'transform 0.15s ease, filter 0.15s ease',
    transform: props.isSelected ? 'scale(1.05)' : 'scale(1)',
    filter: props.isSelected ? 'brightness(1.1)' : 'brightness(1)',
    zIndex: props.isSelected ? 10 : 1,
    position: 'relative',
    userSelect: 'none',
    pointerEvents: props.interactive ? 'auto' : 'none',
    objectFit: 'contain'
}))

const pieceClasses = computed(() => ({
    'chess-piece': true,
    'chess-piece--interactive': props.interactive,
    'chess-piece--selected': props.isSelected,
    'chess-piece--draggable': props.isDraggable,
    'chess-piece--dragging': props.isDragging,
    'chess-piece--white': props.piece.color === 'white',
    'chess-piece--black': props.piece.color === 'black'
}))

// ===== EVENT HANDLERS (vereinfacht) =====

const handleClick = (event) => {
    if (!props.interactive) return

    event.stopPropagation()

    emit('click', event, props.piece, props.square)
}

const handleDragStart = (event) => {

    if (!props.isDraggable || !props.interactive) {
        event.preventDefault()
        return
    }

    emit('dragstart', event, props.piece, props.square)
}

const handleDragEnd = (event) => {
    console.log('🎯 ChessPiece: Drag end')
    emit('dragend', event)
}
</script>

<template>
    <div
        :class="pieceClasses"
        :style="pieceStyle"
        :draggable="isDraggable && interactive"
        :title="`${piece.color === 'white' ? 'Weiß' : 'Schwarz'} ${piece.name} auf ${square}`"
        @click="handleClick"
        @dragstart="handleDragStart"
        @dragend="handleDragEnd"
    >
        <!-- Fallback für fehlende Bilder -->
        <div
            v-if="!piece.imageUrl"
            class="piece-fallback"
            :style="{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${size * 0.6}px`,
                color: piece.color === 'white' ? '#000' : '#fff',
                textShadow: piece.color === 'white' ? '1px 1px 1px #fff' : '1px 1px 1px #000'
            }"
        >
            {{ piece.unicode || '?' }}
        </div>
    </div>
</template>

<style scoped>
.chess-piece {
    display: block;
    box-sizing: border-box;
}

.chess-piece--interactive:hover {
    transform: scale(1.02) !important;
    filter: brightness(1.15) !important;
}

.chess-piece--draggable:active {
    cursor: grabbing;
    z-index: 100;
}

.chess-piece--selected {
    filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 235, 59, 0.8)) !important;
}

.piece-fallback {
    font-family: 'Segoe UI Symbol', 'Noto Color Emoji', serif;
    font-weight: bold;
}

/* Animationen */
@keyframes pieceMove {
    0% { transform: translateZ(0); }
    50% { transform: translateZ(10px) scale(1.1); }
    100% { transform: translateZ(0); }
}

.chess-piece.moving {
    animation: pieceMove 0.3s ease-in-out;
}
</style>
