<script setup>
import { computed } from 'vue'
import { usePieceStore } from '@/Stores/pieceStore.js'

const props = defineProps({
    capturedPieces: {
        type: Array,
        default: () => []
    },
    playerColor: {
        type: String,
        required: true,
        validator: value => ['white', 'black'].includes(value)
    },
    playerName: {
        type: String,
        default: ''
    },
    materialAdvantage: {
        type: Number,
        default: 0
    },
    size: {
        type: String,
        default: 'medium',
        validator: value => ['small', 'medium', 'large'].includes(value)
    },
    layout: {
        type: String,
        default: 'horizontal',
        validator: value => ['horizontal', 'compact'].includes(value)
    }
})

const pieceStore = usePieceStore()

// ===== COMPUTED PROPERTIES =====

const pieceSize = computed(() => {
    const sizes = {
        small: 20,
        medium: 28,
        large: 36
    }
    return sizes[props.size]
})

const containerClasses = computed(() => [
    'captured-pieces',
    `captured-pieces--${props.playerColor}`,
    `captured-pieces--${props.size}`,
    `captured-pieces--${props.layout}`
])

/**
 * FEN-NOTATION FÜR FIGUR BESTIMMEN
 */
const getPieceFenNotation = (piece) => {
    if (typeof piece === 'string') {
        return piece
    }
    if (piece && piece.type && piece.color) {
        const type = piece.type.toLowerCase()
        return piece.color === 'white' ? type.toUpperCase() : type
    }
    if (piece && piece.notation) {
        return piece.notation
    }
    return null
}

/**
 * SVG-URL FÜR FIGUR ABRUFEN
 */
const getPieceImageUrl = (piece) => {
    const fenNotation = getPieceFenNotation(piece)
    return fenNotation ? pieceStore.getPieceImageUrl(fenNotation) : null
}

/**
 * FIGUREN-NAME FÜR TOOLTIP
 */
const getPieceName = (piece) => {
    const fenNotation = getPieceFenNotation(piece)
    return fenNotation ? pieceStore.getPieceName(fenNotation) : 'Unbekannt'
}

/**
 * Gruppierte Figuren für bessere Darstellung
 */
const groupedPieces = computed(() => {
    const groups = {}

    props.capturedPieces.forEach(piece => {
        const fenNotation = getPieceFenNotation(piece)
        if (fenNotation) {
            if (!groups[fenNotation]) {
                groups[fenNotation] = {
                    piece: fenNotation,
                    count: 0,
                    name: getPieceName(piece),
                    imageUrl: getPieceImageUrl(piece)
                }
            }
            groups[fenNotation].count++
        }
    })

    // Sortierung: Wertvollste Figuren zuerst
    const pieceOrder = ['q', 'r', 'b', 'n', 'p', 'Q', 'R', 'B', 'N', 'P']

    return Object.values(groups).sort((a, b) => {
        const aIndex = pieceOrder.indexOf(a.piece)
        const bIndex = pieceOrder.indexOf(b.piece)
        return aIndex - bIndex
    })
})

const hasCaptures = computed(() => props.capturedPieces.length > 0)
const showAdvantage = computed(() => props.materialAdvantage > 0)
</script>

<template>
    <div :class="containerClasses">
        <!-- Player Name (optional) -->
        <div v-if="playerName" class="captured-player-name">
            {{ playerName }}
        </div>

        <!-- Captured Pieces -->
        <div v-if="hasCaptures" class="captured-pieces-content">
            <div class="captured-pieces-list">
                <div
                    v-for="group in groupedPieces"
                    :key="group.piece"
                    class="captured-piece-group"
                    :title="`${group.count}x ${group.name}`"
                >
                    <img
                        :src="group.imageUrl"
                        :alt="group.name"
                        class="captured-piece-image"
                        :style="{
                            width: `${pieceSize}px`,
                            height: `${pieceSize}px`
                        }"
                    />
                    <span v-if="group.count > 1" class="captured-piece-count">
                        {{ group.count }}
                    </span>
                </div>
            </div>

            <!-- Material Advantage -->
            <div v-if="showAdvantage" class="material-advantage">
                +{{ materialAdvantage }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.captured-pieces {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: transparent;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.1);
    max-height: 45px;
    transition: all 200ms ease;
}

.captured-pieces--horizontal {
    flex-direction: row;
    gap: 0.75rem;
}

.captured-pieces--compact {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.25rem;
}

.captured-pieces--white {
    border-left: 3px solid #f7fafc;
}

.captured-pieces--black {
    border-left: 3px solid #2d3748;
}

.captured-player-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #4a5568;
    white-space: nowrap;
}

.captured-pieces-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
}

.captured-pieces-list {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
}

.captured-piece-group {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    transition: transform 200ms ease;
}

.captured-piece-group:hover {
    transform: scale(1.1);
}

.captured-piece-image {
    display: block;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    transition: filter 200ms ease;
}

.captured-piece-group:hover .captured-piece-image {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.captured-piece-count {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: #e53e3e;
    color: white;
    font-size: 0.625rem;
    font-weight: bold;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.material-advantage {
    background: #48bb78;
    color: white;
    font-size: 0.75rem;
    font-weight: bold;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.empty-text {
    color: #a0aec0;
    font-size: 0.75rem;
    font-style: italic;
}

/* Size Variations */
.captured-pieces--small {
    min-height: 32px;
    padding: 0.25rem;
}

.captured-pieces--small .captured-player-name {
    font-size: 0.75rem;
}

.captured-pieces--large {
    min-height: 48px;
    padding: 0.75rem;
}

.captured-pieces--large .captured-player-name {
    font-size: 1rem;
}

/* Compact Layout */
.captured-pieces--compact .captured-pieces-content {
    flex-direction: column;
    gap: 0.25rem;
}

.captured-pieces--compact .captured-player-name {
    font-size: 0.75rem;
}

.captured-pieces--compact .material-advantage {
    font-size: 0.625rem;
}

/* Responsive */
@media (max-width: 640px) {
    .captured-pieces {
        padding: 0.25rem;
        min-height: 32px;
    }

    .captured-pieces-list {
        gap: 0.125rem;
    }

    .captured-player-name {
        font-size: 0.75rem;
    }
}
</style>
