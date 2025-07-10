<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useBoardStore} from '@/Stores/boardStore.js'
import {useGameStore} from '@/Stores/gameStore.js'
import {usePieceStore} from '@/Stores/pieceStore.js'
import {useChessLogic} from '@/Composables/useChessLogic.js';
import {useDragAndDrop} from '@/Composables/useDragAndDrop.js'
import {squareToIndices, isLightSquare, getCSSPattern } from '@/Utils/chessUtils.js'
import ChessPiece from '@/Components/ChessPiece.vue'
import {GAME_MODES} from "@/Utils/chessConstants.js";

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
        default: GAME_MODES.LOCAL_PVP,
        validator: value => {
            const validModes = Object.values(GAME_MODES)
            return validModes.includes(value)
        }
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

const chessLogic = useChessLogic()

// Drag & Drop
const { isDragActive, dragData, findSquareFromElement } = useDragAndDrop()

// Container-Ref für Größenberechnung
const containerRef = ref(null)
const windowSize = ref({ width: 0, height: 0 })

// Chess board setup (Board orientation dependent)
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
const coordinateSpace = computed(() => 0)
const totalSize = computed(() => boardSize.value)

// helper functions for coordinate display
const shouldShowFileCoordinate = (file, rank) => {
    if (!currentShowCoordinates.value) return false

    const bottomRank = props.orientation === 'white' ? 1 : 8
    return rank === bottomRank
}

const shouldShowRankCoordinate = (file, rank) => {
    if (!currentShowCoordinates.value) return false

    const rightFile = props.orientation === 'white' ? 'h' : 'a'
    return file === rightFile
}

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

/**
 * Call up the piece on a field with a correct piece store integration
 */
const getPieceOnSquare = (file, rank) => {
    const square = `${file}${rank}`
    const indices = squareToIndices(square)

    if (!indices || !gameStore.currentBoard.length) {
        return null
    }

    const fenPiece = gameStore.currentBoard[indices.rankIndex][indices.fileIndex]

    if (!fenPiece || fenPiece === ' ') {
        return null
    }

    return pieceStore.getPieceInfo(fenPiece)
}

/**
 * Square style with a fixed size for all fields
 */
const getSquareStyle = (file, rank) => {
    const square = `${file}${rank}`
    const isLight = isLightSquare(file, rank)
    const theme = boardStore.currentTheme

    const baseColor = isLight
        ? squareColors.value.light
        : squareColors.value.dark

    // Important: Festival size for all fields, regardless of the content
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
        boxSizing: 'border-box', // Important for consistent size
        overflow: 'hidden' // Prevents content to influence the field size
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

const handlePieceClick = (event, pieceInfo, square) => {
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
    gameStore.draggedPiece = pieceInfo
    gameStore.draggedFrom = square
    gameStore.isDragging = true

    gameStore.legalMoves = chessLogic.generateLegalMovesForSquare(
        square,
        gameStore.currentBoard,
        gameStore.currentPlayer,
        gameStore.gameState
    )

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

    if (!gameStore.isDragging || !gameStore.draggedFrom) {
        console.log('❌ Kein aktiver Drag-Vorgang')
        return
    }

    const moveResult = gameStore.attemptMove(gameStore.draggedFrom, dropSquare)

    if (moveResult.success) {
        emit('move', {
            from: gameStore.draggedFrom,
            to: dropSquare,
            piece: gameStore.draggedPiece,
            success: true
        })
    } else if (moveResult.needsPromotion) {
        emit('move', {
            from: moveResult.from,
            to: moveResult.to,
            piece: moveResult.piece,
            success: false,
            needsPromotion: true
        })
    } else {
        console.log('❌ Zug fehlgeschlagen:', moveResult.error)
        emit('invalidMove', {
            from: gameStore.draggedFrom,
            to: dropSquare,
            error: moveResult.error
        })
    }

    gameStore.legalMoves = []
    gameStore.isDragging = false
    gameStore.draggedPiece = null
    gameStore.draggedFrom = null
}

const handleDragOver = (event) => {
    event.preventDefault()
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

    // for better performance
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

                        <!-- File-Koordinate (untere Reihe) -->
                        <div
                            v-if="shouldShowFileCoordinate(file, rank)"
                            class="coordinate coordinate--file"
                            :style="coordinateStyle"
                        >
                            {{ file }}
                        </div>

                        <!-- Rank-Koordinate (rechte Spalte) -->
                        <div
                            v-if="shouldShowRankCoordinate(file, rank)"
                            class="coordinate coordinate--rank"
                            :style="coordinateStyle"
                        >
                            {{ rank }}
                        </div>
                    </div>
                </div>
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

.board-square:hover {
    filter: brightness(1.1);
}

.coordinate {
    position: absolute;
    font-size: 12px;
    font-weight: bold;
    user-select: none;
    pointer-events: none;
    z-index: 10;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.coordinate--file {
    bottom: 2px;
    left: 4px;
}

.coordinate--rank {
    top: 2px;
    right: 4px;
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
