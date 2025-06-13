<script setup>
import {computed, ref, onMounted, onUnmounted} from 'vue'
import {useBoardStore} from '@/Stores/boardStore'

const boardStore = useBoardStore()

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
    }
})

// Container-Ref für Größenberechnung
const containerRef = ref(null)
const windowSize = ref({width: 0, height: 0})

// Schachbrett-Setup
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const ranks = [8, 7, 6, 5, 4, 3, 2, 1]

// Aktuelle Einstellungen (Props überschreiben Store)
const currentSizeMode = computed(() =>
    props.sizeMode || boardStore.settings.boardSizeMode
)
const currentShowCoordinates = computed(() =>
    props.showCoordinates !== null ? props.showCoordinates : boardStore.settings.showCoordinates
)

// Board-Größe berechnen
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

// Theme-basierte Farben mit Fallback
const squareColors = computed(() => {
    const theme = boardStore.currentTheme

    if (!theme) {
        return {
            light: '#F0D9B5',
            dark: '#B58863',
            border: '#8B4513',
            coordinates: '#654321'
        }
    }

    return {
        light: theme.lightSquare || '#F0D9B5',
        dark: theme.darkSquare || '#B58863',
        border: theme.border || '#8B4513',
        coordinates: theme.coordinates || '#654321'
    }
})

// Window Resize Handler
const updateWindowSize = () => {
    windowSize.value = {
        width: window.innerWidth,
        height: window.innerHeight
    }
}

onMounted(() => {
    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
})

onUnmounted(() => {
    window.removeEventListener('resize', updateWindowSize)
})

// Funktion um zu bestimmen, ob ein Feld hell oder dunkel ist
const isLightSquare = (file, rank) => {
    const fileIndex = files.indexOf(file)
    const rankIndex = ranks.indexOf(rank)
    return (fileIndex + rankIndex) % 2 === 0
}

// Board-Stil für Theme
const boardStyle = computed(() => ({
    width: `${totalSize.value}px`,
    height: `${totalSize.value}px`,
    background: squareColors.value.border
}))

// Prüfung ob das aktuelle Theme wirklich Texturen hat
const hasWorkingTextures = computed(() => {
    const theme = boardStore.currentTheme
    if (!theme || !theme.pattern) return false

    // CSS und Image-Patterns unterstützen
    return theme.pattern === 'image' || theme.pattern === 'css'
})

// Square-Stil Generator mit funktionierenden CSS-Patterns
const getSquareStyle = (file, rank) => {
    const isLight = isLightSquare(file, rank)
    const theme = boardStore.currentTheme

    const baseColor = isLight
        ? squareColors.value.light
        : squareColors.value.dark

    let style = {
        width: `${squareSize.value}px`,
        height: `${squareSize.value}px`,
        backgroundColor: baseColor,
    }

    // Texturen anwenden
    if (theme && theme.pattern === 'image') {
        const pattern = isLight ? theme.lightPattern : theme.darkPattern
        style.backgroundImage = `url(${pattern})`
        style.backgroundSize = 'cover'
        style.backgroundPosition = 'center'
        style.backgroundRepeat = 'no-repeat'
    } else if (theme && theme.pattern === 'css') {
        const patternClass = isLight ? theme.lightPattern : theme.darkPattern
        const cssPattern = getCSSPattern(patternClass)
        if (cssPattern && cssPattern !== 'none') {
            style.backgroundImage = cssPattern
            style.backgroundSize = `${Math.floor(squareSize.value / 4)}px ${Math.floor(squareSize.value / 4)}px`
            style.backgroundRepeat = 'repeat'
        }
    }

    return style
}

// Verbesserte CSS-Pattern Generator
const getCSSPattern = (patternName) => {
    const patterns = {
        'wood-light': `
      linear-gradient(90deg,
        #DEB887 0%,
        #D2B48C 50%,
        #DEB887 100%
      ),
      repeating-linear-gradient(0deg,
        transparent 0px,
        rgba(139, 69, 19, 0.1) 1px,
        transparent 2px,
        rgba(139, 69, 19, 0.1) 3px,
        transparent 4px
      )
    `,
        'wood-dark': `
      linear-gradient(90deg,
        #8B4513 0%,
        #A0522D 50%,
        #8B4513 100%
      ),
      repeating-linear-gradient(0deg,
        transparent 0px,
        rgba(0, 0, 0, 0.2) 1px,
        transparent 2px,
        rgba(0, 0, 0, 0.2) 3px,
        transparent 4px
      )
    `,
        'marble-light': `
      radial-gradient(ellipse at center,
        #FFFACD 0%,
        #F5F5DC 40%,
        #FFFACD 100%
      ),
      linear-gradient(45deg,
        rgba(255, 255, 255, 0.1) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.1) 75%,
        transparent 75%
      )
    `,
        'marble-dark': `
      radial-gradient(ellipse at center,
        #778899 0%,
        #696969 40%,
        #778899 100%
      ),
      linear-gradient(45deg,
        rgba(255, 255, 255, 0.05) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(255, 255, 255, 0.05) 75%,
        transparent 75%
      )
    `,
        'leather-light': `
      radial-gradient(circle at 25% 25%,
        #DEB887 0%,
        #D2B48C 50%,
        #DEB887 100%
      ),
      radial-gradient(circle at 75% 75%,
        rgba(139, 69, 19, 0.1) 0%,
        transparent 50%
      )
    `,
        'leather-dark': `
      radial-gradient(circle at 25% 25%,
        #A0522D 0%,
        #8B4513 50%,
        #A0522D 100%
      ),
      radial-gradient(circle at 75% 75%,
        rgba(0, 0, 0, 0.2) 0%,
        transparent 50%
      )
    `,
        'stone-light': `
      linear-gradient(135deg,
        #F0F0F0 0%,
        #E0E0E0 50%,
        #F0F0F0 100%
      ),
      repeating-linear-gradient(45deg,
        transparent 0px,
        rgba(0, 0, 0, 0.02) 1px,
        transparent 2px
      )
    `,
        'stone-dark': `
      linear-gradient(135deg,
        #808080 0%,
        #696969 50%,
        #808080 100%
      ),
      repeating-linear-gradient(45deg,
        transparent 0px,
        rgba(0, 0, 0, 0.1) 1px,
        transparent 2px
      )
    `
    }

    return patterns[patternName] || null
}

// Koordinaten-Stil
const coordinateStyle = computed(() => ({
    color: squareColors.value.coordinates,
    fontSize: `${Math.max(10, squareSize.value * 0.15)}px`,
    fontWeight: 'bold',
    textShadow: '1px 1px 1px rgba(255,255,255,0.5)'
}))

// Mouse-Tracking Funktionalität
const handleMouseMove = (event) => {
    const rect = containerRef.value.getBoundingClientRect()

    // Mausposition relativ zum Board-Container
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Koordinaten-Offset berücksichtigen
    const boardStartX = coordinateSpace.value
    const boardStartY = coordinateSpace.value
    const boardEndX = boardStartX + boardSize.value
    const boardEndY = boardStartY + boardSize.value

    // Prüfen ob Maus über dem eigentlichen Spielfeld ist
    if (x >= boardStartX && x <= boardEndX && y >= boardStartY && y <= boardEndY) {
        // Position im Spielfeld berechnen
        const boardX = x - boardStartX
        const boardY = y - boardStartY

        // In Schach-Koordinaten umrechnen
        const fileIndex = Math.floor(boardX / squareSize.value)
        const rankIndex = Math.floor(boardY / squareSize.value)

        // Gültige Indizes prüfen
        if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
            const file = files[fileIndex]
            const rank = ranks[rankIndex]
            const square = `${file}${rank}`

            // Position im Store aktualisieren
            boardStore.updateMousePosition({
                file,
                rank,
                square,
                x: boardX,
                y: boardY,
                pixelX: x,
                pixelY: y,
                isOverBoard: true
            })
        }
    } else {
        // Maus ist außerhalb des Spielfelds
        boardStore.updateMousePosition({
            file: null,
            rank: null,
            square: null,
            x: null,
            y: null,
            pixelX: x,
            pixelY: y,
            isOverBoard: false
        })
    }
}

const handleMouseLeave = () => {
    // Maus hat das Board komplett verlassen
    boardStore.updateMousePosition({
        file: null,
        rank: null,
        square: null,
        x: null,
        y: null,
        pixelX: null,
        pixelY: null,
        isOverBoard: false
    })
}

</script>

<template>
    <div
        ref="containerRef"
        class="chess-board-container"
        :style="boardStyle"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
    >
        <!-- Obere Koordinaten (a-h) -->
        <div
            v-if="currentShowCoordinates"
            class="flex justify-center items-end h-5"
            :style="{ marginLeft: `${coordinateSpace}px`, marginRight: `${coordinateSpace}px` }"
        >
            <div
                v-for="file in files"
                :key="`top-${file}`"
                class="flex justify-center items-center"
                :style="{ ...coordinateStyle, width: `${squareSize}px` }"
            >
                {{ file }}
            </div>
        </div>

        <!-- Spielfeld mit seitlichen Koordinaten -->
        <div class="flex">
            <!-- Linke Koordinaten (8-1) -->
            <div v-if="currentShowCoordinates" class="flex flex-col justify-center w-5">
                <div
                    v-for="rank in ranks"
                    :key="`left-${rank}`"
                    class="flex justify-center items-center"
                    :style="{ ...coordinateStyle, height: `${squareSize}px` }"
                >
                    {{ rank }}
                </div>
            </div>

            <!-- Das eigentliche Schachbrett -->
            <div class="chess-board">
                <div
                    v-for="rank in ranks"
                    :key="rank"
                    class="board-rank flex"
                >
                    <div
                        v-for="file in files"
                        :key="`${file}${rank}`"
                        class="board-square flex items-center justify-center cursor-pointer transition-all duration-150 hover:brightness-110 relative"
                        :style="getSquareStyle(file, rank)"
                        :data-square="`${file}${rank}`"
                        @click="$emit('squareClick', { file, rank, square: `${file}${rank}` })"
                    >
                        <!-- Hier kommen später die Schachfiguren -->
                        <div class="piece-placeholder text-2xl relative z-10">
                            <!-- Placeholder für Figuren -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rechte Koordinaten (8-1) -->
            <div v-if="currentShowCoordinates" class="flex flex-col justify-center w-5">
                <div
                    v-for="rank in ranks"
                    :key="`right-${rank}`"
                    class="flex justify-center items-center"
                    :style="{ ...coordinateStyle, height: `${squareSize}px` }"
                >
                    {{ rank }}
                </div>
            </div>
        </div>

        <!-- Untere Koordinaten (a-h) -->
        <div
            v-if="currentShowCoordinates"
            class="flex justify-center items-start h-5"
            :style="{ marginLeft: `${coordinateSpace}px`, marginRight: `${coordinateSpace}px` }"
        >
            <div
                v-for="file in files"
                :key="`bottom-${file}`"
                class="flex justify-center items-center"
                :style="{ ...coordinateStyle, width: `${squareSize}px` }"
            >
                {{ file }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.chess-board-container {
    display: inline-block;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.chess-board {
    border: 2px solid #8B4513;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
}

.board-rank {
    display: flex;
}

.board-square {
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.board-square:hover {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.board-square:hover .piece-placeholder {
    transform: scale(1.05);
}
</style>
