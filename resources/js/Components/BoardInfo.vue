<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/Stores/gameStore.js'

// Stores
const gameStore = useGameStore()

// Props für zusätzliche Flexibilität
const props = defineProps({
    showTitle: {
        type: Boolean,
        default: true
    },
    showFen: {
        type: Boolean,
        default: true
    },
    fenSegmentLimit: {
        type: Number,
        default: 8
    }
})

// ===== COMPUTED PROPERTIES =====

/**
 * Board-Informationen aus Store zusammenstellen
 */
const boardInfo = computed(() => ({
    currentFen: gameStore.currentFEN || 'Lädt...'
}))

/**
 * FEN in Segmente aufteilen für vollständige Darstellung aller FEN-Informationen
 */
const fenSegments = computed(() => {
    if (!boardInfo.value.currentFen || boardInfo.value.currentFen === 'Lädt...') {
        return [{ type: 'loading', value: 'Lädt...', label: 'Status' }]
    }

    // FEN in alle 6 Teile aufteilen
    const fenParts = boardInfo.value.currentFen.split(' ')

    if (fenParts.length !== 6) {
        return [{ type: 'error', value: 'Ungültige FEN', label: 'Fehler' }]
    }

    const [position, activeColor, castling, enPassant, halfmove, fullmove] = fenParts

    // Brett-Position in Reihen aufteilen (8. Reihe bis 1. Reihe)
    const boardRanks = position.split('/')
    const positionValue = boardRanks.map((rank, index) => {
        const rankNumber = 8 - index // 8. Reihe ist Index 0
        return `${rankNumber}:  ${rank}`
    }).join('\n')

    return [
        {
            type: 'position',
            value: positionValue,
            label: 'Brett-Position',
            description: 'Figurenpositionen auf dem Brett (Reihe 8 bis 1)',
            isMultiLine: true
        },
        {
            type: 'activeColor',
            value: activeColor === 'w' ? 'Weiß' : 'Schwarz',
            label: 'Am Zug',
            description: `${activeColor === 'w' ? 'Weiß' : 'Schwarz'} ist am Zug`
        },
        {
            type: 'castling',
            value: castling === '-' ? 'Keine' : castling,
            label: 'Rochade-Rechte',
            description: formatCastlingRights(castling)
        },
        {
            type: 'enPassant',
            value: enPassant === '-' ? 'Keine' : enPassant,
            label: 'En Passant',
            description: enPassant === '-' ? 'Kein En Passant möglich' : `En Passant auf ${enPassant} möglich`
        },
        {
            type: 'halfmove',
            value: halfmove,
            label: 'Halbzüge',
            description: `${halfmove} Halbzüge seit letztem Bauernzug/Schlag (50-Züge-Regel)`
        },
        {
            type: 'fullmove',
            value: fullmove,
            label: 'Zug-Nummer',
            description: `Zug ${fullmove} des Spiels`
        }
    ]
})

/**
 * Rochade-Rechte in lesbarer Form formatieren
 */
const formatCastlingRights = (castling) => {
    if (castling === '-') return 'Keine Rochade möglich'

    const rights = []
    if (castling.includes('K')) rights.push('Weiß kurz (O-O)')
    if (castling.includes('Q')) rights.push('Weiß lang (O-O-O)')
    if (castling.includes('k')) rights.push('Schwarz kurz (o-o)')
    if (castling.includes('q')) rights.push('Schwarz lang (o-o-o)')

    return rights.length > 0 ? rights.join(', ') : 'Keine Rochade möglich'
}

/**
 * Status-Text für Koordinaten
 */
const coordinatesStatus = computed(() => {
    return boardInfo.value.showCoordinates ? 'An' : 'Aus'
})
</script>

<template>
    <div class="board-info-component">
        <!-- Titel (optional) -->
        <h3 v-if="showTitle" class="section-title">
            Board-Info
        </h3>

        <!-- Info-Items -->
        <div class="board-info-content">
            <!-- FEN-Anzeige - Alle Segmente -->
            <div v-if="showFen" class="info-item info-item--fen">
                <span class="info-label">FEN-Notation:</span>
                <div class="fen-segments-container">
                    <div
                        v-for="(segment, index) in fenSegments"
                        :key="index"
                        class="fen-segment-item"
                        :class="[
                            `fen-segment--${segment.type}`,
                            { 'fen-segment--multiline': segment.isMultiLine }
                        ]"
                        :title="segment.description"
                    >
                        <div class="fen-segment-label">{{ segment.label }}:</div>
                        <div
                            class="fen-segment-value"
                            :class="{ 'fen-segment-value--multiline': segment.isMultiLine }"
                        >
                            <!-- Mehrzeilige Darstellung für Brett-Position -->
                            <template v-if="segment.isMultiLine">
                                <div
                                    v-for="(line, lineIndex) in segment.value.split('\n')"
                                    :key="lineIndex"
                                    class="fen-position-line"
                                >
                                    {{ line }}
                                </div>
                            </template>
                            <!-- Normale einzeilige Darstellung -->
                            <template v-else>
                                {{ segment.value }}
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.board-info-component {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #2d3748;
    margin: 0;
}

.board-info-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.info-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.375rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    transition: background-color 200ms ease;
}

.info-item:last-child {
    border-bottom: none;
}

.info-label {
    font-weight: 500;
    color: #4a5568;
    min-width: 80px;
    flex-shrink: 0;
    font-size: 0.875rem;
}

.info-value {
    color: #2d3748;
    font-weight: 400;
    font-size: 0.875rem;
    flex: 1;
}

/* FEN-spezifische Styles */
.info-item--fen {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.25rem;
}

.info-item--fen .info-label {
    min-width: auto;
    margin-bottom: 0.25rem;
}

.fen-display {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.03);
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    width: 100%;
    overflow-x: auto;
}

.fen-segment {
    white-space: nowrap;
    color: #2d3748;
    cursor: help;
    transition: all 200ms ease;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
}

.fen-segment-label {
    font-weight: bold;
    color: #4a5568;
    font-size: 0.75rem;
}

/* Responsive Anpassungen */
@media (max-width: 640px) {
    .info-label {
        min-width: 70px;
        font-size: 0.8125rem;
    }

    .info-value {
        font-size: 0.8125rem;
    }

    .fen-display {
        font-size: 0.6875rem;
        padding: 0.375rem;
    }
}

/* Dark Mode Support (falls später benötigt) */
@media (prefers-color-scheme: dark) {
    .section-title {
        color: #e2e8f0;
    }

    .info-label {
        color: #a0aec0;
    }

    .info-value {
        color: #e2e8f0;
    }

    .fen-display {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .fen-segment {
        color: #e2e8f0;
    }
}
</style>
