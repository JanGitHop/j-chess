<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useBoardStore } from '@/Stores/boardStore.js'
import { useGameStore } from '@/Stores/gameStore.js'
import { usePieceStore } from '@/Stores/pieceStore.js'
import { useDragAndDrop } from '@/Composables/useDragAndDrop.js'
import { squareToIndices } from '@/Utils/chessUtils.js'
import ChessPiece from '@/Components/ChessPiece.vue'

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
        default: 'standard',
        validator: value => ['standard', 'analysis', 'puzzle'].includes(value)
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
    'stalemate'
])

// Stores
const boardStore = useBoardStore()
const gameStore = useGameStore()
const pieceStore = usePieceStore()

// Drag & Drop
const { isDragActive, dragData, findSquareFromElement } = useDragAndDrop()

// Container-Ref für Größenberechnung
const containerRef = ref(null)
const windowSize = ref({ width: 0, height: 0 })

// Schachbrett-Setup (Board-Orientierung berücksichtigen)
const files = computed(() =>
    props.orientation === 'white'
        ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
)

const ranks = computed(() =>
    props.orientation === 'white'
        ? [8, 7, 6, 5, 4, 3, 2, 1]
        : [1, 2, 3, 4, 5, 6, 7, 8]
)

// ===== COMPUTED PROPERTIES =====

const currentSizeMode = computed(() =>
    props.sizeMode || boardStore.settings.boardSizeMode
)

const currentShowCoordinates = computed(() =>
    props.showCoordinates !== null ? props.showCoordinates : boardStore.settings.showCoordinates
)

const boardSize = computed(() => {
    const sizeConfig = boardStore.boardSizes[currentSizeMode.value]

    if (!sizeConfig) {
        return props.customSize || 480
    }

    if (sizeConfig.mode === 'fixed') {
        return sizeConfig.size
    }

    if (sizeConfig.mode === 'responsive') {
        const coordinateSpace = currentShowCoordinates.value ? 40 : 0
        const padding = 100

        const availableWidth = windowSize.value.width - padding
        const availableHeight = windowSize.value.height - padding - coordinateSpace

        const maxSize = Math.min(availableWidth, availableHeight)

        return Math.max(
            sizeConfig.minSize,
            Math.min(sizeConfig.maxSize, maxSize)
        )
    }

    return 480
})

const squareSize = computed(() => Math.floor(boardSize.value / 8))
const coordinateSpace = computed(() => currentShowCoordinates.value ? 20 : 0)
const totalSize = computed(() => boardSize.value + (coordinateSpace.value * 2))

const squareColors = computed(() => {
    const theme = boardStore.currentTheme
    return {
        light: theme?.lightSquare || '#F0D9B5',
        dark: theme?.darkSquare || '#B58863',
        border: theme?.border || '#8B4513',
        coordinates: theme?.coordinates || '#654321'
    }
})

const boardStyle = computed(() => ({
    width: `${totalSize.value}px`,
    height: `${totalSize.value}px`,
    background: squareColors.value.border,
    ...boardStore.animationCssVars
}))

const coordinateStyle = computed(() => ({
    color: squareColors.value.coordinates,
    fontSize: `${Math.max(10, squareSize.value * 0.15)}px`,
    fontWeight: 'bold',
    textShadow: '1px 1px 1px rgba(255,255,255,0.5)'
}))

// ===== SQUARE & PIECE LOGIC =====

const isLightSquare = (file, rank) => {
    const fileIndex = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexOf(file)
    const rankIndex = [8, 7, 6, 5, 4, 3, 2, 1].indexOf(rank)
    return (fileIndex + rankIndex) % 2 === 0
}

/**
 * Figur auf einem Feld abrufen mit korrekter pieceStore Integration
 */
const getPieceOnSquare = (file, rank) => {
    const square = `${file}${rank}`
    const indices = squareToIndices(square)

    if (!indices || !gameStore.currentBoard.length) {
        return null
    }

    const fenPiece = gameStore.currentBoard[indices.rankIndex][indices.fileIndex]

    // Leere Felder zurückgeben
    if (!fenPiece || fenPiece === ' ') {
        return null
    }

    // Vollständige Figureninformation vom pieceStore abrufen
    return pieceStore.getPieceInfo(fenPiece)
}

/**
 * Square-Stil mit fester Größe für alle Felder
 */
const getSquareStyle = (file, rank) => {
    const square = `${file}${rank}`
    const isLight = isLightSquare(file, rank)
    const theme = boardStore.currentTheme

    const baseColor = isLight
        ? squareColors.value.light
        : squareColors.value.dark

    // WICHTIG: Feste Größe für alle Felder, unabhängig vom Inhalt
    let style = {
        width: `${squareSize.value}px`,
        height: `${squareSize.value}px`,
        minWidth: `${squareSize.value}px`,
        minHeight: `${squareSize.value}px`,
        maxWidth: `${squareSize.value}px`,
        maxHeight: `${squareSize.value}px`,
        backgroundColor: baseColor,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box', // Wichtig für konsistente Größe
        overflow: 'hidden' // Verhindert, dass Inhalte die Feldgröße beeinflussen
    }

    // Theme-Texturen anwenden
    if (theme?.pattern === 'image') {
        const pattern = isLight ? theme.lightPattern : theme.darkPattern
        style.backgroundImage = `url(${pattern})`
        style.backgroundSize = 'cover'
        style.backgroundPosition = 'center'
        style.backgroundRepeat = 'no-repeat'
    } else if (theme?.pattern === 'css') {
        const patternClass = isLight ? theme.lightPattern : theme.darkPattern
        const cssPattern = getCSSPattern(patternClass)
        if (cssPattern) {
            style.backgroundImage = cssPattern
            style.backgroundSize = `${Math.floor(squareSize.value / 4)}px ${Math.floor(squareSize.value / 4)}px`
            style.backgroundRepeat = 'repeat'
        }
    }

    // Game Store Highlights
    if (gameStore.selectedSquare === square) {
        style.boxShadow = `inset 0 0 0 3px rgba(255, 235, 59, 0.8)`
        style.backgroundColor = isLight
            ? 'rgba(255, 235, 59, 0.3)'
            : 'rgba(255, 235, 59, 0.4)'
    }

    // Last Move Highlight
    if (props.highlightLastMove && gameStore.lastMove) {
        if (gameStore.lastMove.from === square || gameStore.lastMove.to === square) {
            style.boxShadow = `inset 0 0 0 2px rgba(255, 165, 0, 0.8)`
            style.backgroundColor = isLight
                ? 'rgba(255, 165, 0, 0.2)'
                : 'rgba(255, 165, 0, 0.3)'
        }
    }

    // Check Highlight
    if (gameStore.isInCheck && gameStore.checkingPieces.includes(square)) {
        style.boxShadow = `inset 0 0 0 3px rgba(220, 53, 69, 0.8)`
        style.backgroundColor = 'rgba(220, 53, 69, 0.2)'
    }

    // Legal Move Highlights
    if (props.showLegalMoves && gameStore.legalMoves.includes(square)) {
        style.boxShadow = `inset 0 0 0 2px rgba(76, 175, 80, 0.6)`
    }

    // Board Store Highlights
    const highlight = boardStore.highlightedSquares.get(square)
    if (highlight) {
        style.boxShadow = `inset 0 0 0 3px ${highlight.color}`
        if (highlight.type === 'selected') {
            style.backgroundColor = highlight.color
        }
    }

    return style
}

/**
 * Prüft ob eine Figur dragbar ist
 */
const isDraggable = (pieceInfo, square) => {
    if (!pieceInfo || !props.interactive || !gameStore.isGameActive) return false

    return pieceInfo.color === gameStore.currentPlayer
}

// ===== EVENT HANDLERS =====

const handleSquareClick = (file, rank) => {
    const square = `${file}${rank}`
    console.log('Square clicked:', square)

    const success = gameStore.selectSquare(square)

    emit('squareClick', {
        square,
        file,
        rank,
        success,
        piece: getPieceOnSquare(file, rank)
    })
}

// Angepasste Handler für konsistente Event-Datenstruktur
const handlePieceClick = (event, pieceInfo, square) => {
    console.log('🎯 ChessBoard: Piece clicked:', pieceInfo, square)

    emit('pieceClick', {
        piece: pieceInfo,
        square,
        success: true
    })

    // Weiterleitung an Square Click für Spiellogik
    const indices = squareToIndices(square)
    if (indices) {
        const file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][indices.fileIndex]
        const rank = [8, 7, 6, 5, 4, 3, 2, 1][indices.rankIndex]
        handleSquareClick(file, rank)
    }
}

const handleDragStart = (event, pieceInfo, square) => {
    console.log('🎯 ChessBoard: Drag start:', pieceInfo, square)

    gameStore.draggedPiece = pieceInfo
    gameStore.draggedFrom = square
    gameStore.isDragging = true

    gameStore.generateLegalMoves(square)

    emit('dragStart', event, pieceInfo, square)
}

const handleDragEnd = (event) => {
    console.log('Drag end')
    gameStore.draggedPiece = null
    gameStore.draggedFrom = null
    gameStore.isDragging = false

    emit('dragEnd', event)
}

const handleDrop = (event, file, rank) => {
    const dropSquare = `${file}${rank}`
    console.log('🎯 ChessBoard: Drop auf Feld:', dropSquare)

    // Prüfen ob wir aktuell draggen
    if (!gameStore.isDragging || !gameStore.draggedFrom) {
        console.log('❌ Kein aktiver Drag-Vorgang')
        return
    }

    // Zug versuchen
    const moveResult = gameStore.attemptMove(gameStore.draggedFrom, dropSquare)

    if (moveResult.success) {
        console.log('✅ Zug erfolgreich:', moveResult)
        emit('move', {
            from: gameStore.draggedFrom,
            to: dropSquare,
            piece: gameStore.draggedPiece,
            success: true
        })
    } else {
        console.log('❌ Zug fehlgeschlagen:', moveResult.error)
        emit('invalidMove', {
            from: gameStore.draggedFrom,
            to: dropSquare,
            error: moveResult.error
        })
    }

    // Drag-State zurücksetzen (immer!)
    gameStore.isDragging = false
    gameStore.draggedPiece = null
    gameStore.draggedFrom = null
}

const handleDragOver = (event) => {
    event.preventDefault()
}

// ===== HELPER FUNCTIONS =====

const getCSSPattern = (patternClass) => {
    const patterns = {
        'wood-light': 'linear-gradient(45deg, #DEB887 25%, transparent 25%), linear-gradient(-45deg, #DEB887 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #D2B48C 75%), linear-gradient(-45deg, transparent 75%, #D2B48C 75%)',
        'wood-dark': 'linear-gradient(45deg, #8B4513 25%, transparent 25%), linear-gradient(-45deg, #8B4513 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #A0522D 75%), linear-gradient(-45deg, transparent 75%, #A0522D 75%)',
        'marble-light': 'radial-gradient(circle at 25% 25%, #FFFACD 0%, #F5F5DC 50%, #FFFACD 100%)',
        'marble-dark': 'radial-gradient(circle at 25% 25%, #778899 0%, #696969 50%, #778899 100%)',
        'leather-light': 'radial-gradient(circle at 50% 50%, #DEB887 0%, #D2B48C 100%)',
        'leather-dark': 'radial-gradient(circle at 50% 50%, #A0522D 0%, #8B4513 100%)',
        'stone-light': 'linear-gradient(135deg, #F0F0F0 0%, #E0E0E0 100%)',
        'stone-dark': 'linear-gradient(135deg, #808080 0%, #696969 100%)'
    }
    return patterns[patternClass] || null
}

// ===== LIFECYCLE =====

const updateWindowSize = () => {
    windowSize.value = {
        width: window.innerWidth,
        height: window.innerHeight
    }
}

onMounted(() => {
    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)

    // Figuren-Bilder vorladen für bessere Performance
    if (pieceStore.preloadPieceImages) {
        pieceStore.preloadPieceImages()
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', updateWindowSize)
})
</script>

<template>
    <div
        ref="containerRef"
        class="chess-board-container"
        :style="boardStyle"
    >
        <!-- Koordinaten oben (falls aktiviert) -->
        <div
            v-if="currentShowCoordinates"
            class="coordinates coordinates--top"
            :style="{ height: `${coordinateSpace}px`, ...coordinateStyle }"
        >
            <div
                v-for="file in files"
                :key="`top-${file}`"
                class="coordinate-label"
                :style="{ width: `${squareSize}px` }"
            >
                {{ file }}
            </div>
        </div>

        <!-- Hauptbrett-Bereich -->
        <div class="board-content" :style="{ width: `${boardSize}px`, height: `${boardSize}px` }">
            <!-- Koordinaten links (falls aktiviert) -->
            <div
                v-if="currentShowCoordinates"
                class="coordinates coordinates--left"
                :style="{ width: `${coordinateSpace}px`, ...coordinateStyle }"
            >
                <div
                    v-for="rank in ranks"
                    :key="`left-${rank}`"
                    class="coordinate-label"
                    :style="{ height: `${squareSize}px` }"
                >
                    {{ rank }}
                </div>
            </div>

            <!-- Das eigentliche Schachbrett -->
            <div
                class="chess-board"
                :style="{ width: `${boardSize}px`, height: `${boardSize}px` }"
            >
                <div
                    v-for="rank in ranks"
                    :key="`rank-${rank}`"
                    class="board-rank"
                    :style="{ display: 'flex', height: `${squareSize}px` }"
                >
                    <div
                        v-for="file in files"
                        :key="`${file}${rank}`"
                        class="board-square"
                        :class="{
                            'square--light': isLightSquare(file, rank),
                            'square--dark': !isLightSquare(file, rank),
                            'square--selected': gameStore.selectedSquare === `${file}${rank}`,
                            'square--legal-move': props.showLegalMoves && gameStore.legalMoves.includes(`${file}${rank}`),
                            'square--last-move': props.highlightLastMove && gameStore.lastMove &&
                                (gameStore.lastMove.from === `${file}${rank}` || gameStore.lastMove.to === `${file}${rank}`),
                            'square--check': gameStore.isInCheck && gameStore.checkingPieces.includes(`${file}${rank}`)
                        }"
                        :style="getSquareStyle(file, rank)"
                        @click="handleSquareClick(file, rank)"
                        @drop="handleDrop($event, file, rank)"
                        @dragover="handleDragOver"
                    >
                        <!-- Schachfigur (falls vorhanden) -->
                        <ChessPiece
                            v-if="getPieceOnSquare(file, rank)"
                            :key="`piece-${file}${rank}`"
                            :piece="getPieceOnSquare(file, rank)"
                            :square="`${file}${rank}`"
                            :size="squareSize * 0.8"
                            :interactive="props.interactive && gameStore.isGameActive"
                            :is-selected="gameStore.selectedSquare === `${file}${rank}`"
                            :is-draggable="isDraggable(getPieceOnSquare(file, rank), `${file}${rank}`)"
                            @click="handlePieceClick(getPieceOnSquare(file, rank), `${file}${rank}`)"
                            @dragstart="handleDragStart($event, getPieceOnSquare(file, rank), `${file}${rank}`)"
                            @dragend="handleDragEnd"
                        />

                        <!-- Legal Move Indicator -->
                        <div
                            v-if="props.showLegalMoves && gameStore.legalMoves.includes(`${file}${rank}`) && !getPieceOnSquare(file, rank)"
                            class="legal-move-indicator"
                            :style="{
                                width: `${squareSize * 0.3}px`,
                                height: `${squareSize * 0.3}px`,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                                position: 'absolute'
                            }"
                        />
                    </div>
                </div>
            </div>

            <!-- Koordinaten rechts (falls aktiviert) -->
            <div
                v-if="currentShowCoordinates"
                class="coordinates coordinates--right"
                :style="{ width: `${coordinateSpace}px`, ...coordinateStyle }"
            >
                <div
                    v-for="rank in ranks"
                    :key="`right-${rank}`"
                    class="coordinate-label"
                    :style="{ height: `${squareSize}px` }"
                >
                    {{ rank }}
                </div>
            </div>
        </div>

        <!-- Koordinaten unten (falls aktiviert) -->
        <div
            v-if="currentShowCoordinates"
            class="coordinates coordinates--bottom"
            :style="{ height: `${coordinateSpace}px`, ...coordinateStyle }"
        >
            <div
                v-for="file in files"
                :key="`bottom-${file}`"
                class="coordinate-label"
                :style="{ width: `${squareSize}px` }"
            >
                {{ file }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.chess-board-container {
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.board-content {
    display: flex;
    flex-direction: row;
}

.chess-board {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.board-rank {
    display: flex;
    flex-shrink: 0;
}

.board-square {
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
}

.board-square--draggable {
    cursor: grab;
}

.board-square--dragging {
    cursor: grabbing;
}

.board-square--drag-over {
    background-color: rgba(76, 175, 80, 0.3) !important;
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
}

.board-square:hover {
    filter: brightness(1.1);
}

.coordinates {
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
}

.coordinates--top,
.coordinates--bottom {
    flex-direction: row;
}

.coordinates--left,
.coordinates--right {
    flex-direction: column;
}

.coordinate-label {
    display: flex;
    align-items: center;
    justify-content: center;
}

.legal-move-indicator {
    pointer-events: none;
    z-index: 1;
}

/* Square-spezifische Klassen für bessere Performance */
.square--selected {
    z-index: 2;
}

.square--legal-move {
    cursor: pointer;
}

.square--last-move {
    animation: lastMoveGlow 1s ease-in-out;
}

.square--check {
    animation: checkPulse 0.5s ease-in-out infinite alternate;
}

@keyframes lastMoveGlow {
    0% { filter: brightness(1.3); }
    100% { filter: brightness(1); }
}

@keyframes checkPulse {
    0% { filter: brightness(1); }
    100% { filter: brightness(1.2); }
}
</style>
