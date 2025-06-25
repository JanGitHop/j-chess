<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePieceStore } from '@/Stores/pieceStore'

const props = defineProps({
    playerColor: {
        type: String,
        required: true,
        validator: (value) => ['white', 'black'].includes(value)
    },
    fromSquare: {
        type: String,
        required: true
    },
    toSquare: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['promote', 'cancel'])

const pieceStore = usePieceStore()
const selectedIndex = ref(0) // Index der aktuell ausgewählten Figur

// Double-click tracking
const lastClickTime = ref(0)
const lastClickIndex = ref(-1)
const doubleClickDelay = 300 // Millisekunden

// Verfügbare Promotion-Figuren (Dame, Turm, Läufer, Springer)
const promotionPieces = computed(() => {
    const pieces = ['q', 'r', 'b', 'n']
    return props.playerColor === 'white'
        ? pieces.map(p => p.toUpperCase()) // ['Q', 'R', 'B', 'N']
        : pieces                            // ['q', 'r', 'b', 'n']
})

// Aktuell ausgewählte Figur
const selectedPiece = computed(() => promotionPieces.value[selectedIndex.value])

// Figur auswählen (per Klick oder Navigation)
const selectPiece = (index) => {
    const currentTime = Date.now()

    // Prüfung für Doppelklick
    if (
        lastClickIndex.value === index &&
        currentTime - lastClickTime.value < doubleClickDelay
    ) {
        // Doppelklick erkannt - direkt bestätigen
        confirmPromotion()
        return
    }

    // Normaler Klick - nur auswählen
    selectedIndex.value = index
    lastClickTime.value = currentTime
    lastClickIndex.value = index
}

// Promotion bestätigen
const confirmPromotion = () => {
    emit('promote', {
        from: props.fromSquare,
        to: props.toSquare,
        promotionPiece: selectedPiece.value
    })
}

// Promotion abbrechen
const cancelPromotion = () => {
    emit('cancel')
}

// Navigation mit Pfeiltasten
const navigateLeft = () => {
    selectedIndex.value = (selectedIndex.value - 1 + promotionPieces.value.length) % promotionPieces.value.length
}

const navigateRight = () => {
    selectedIndex.value = (selectedIndex.value + 1) % promotionPieces.value.length
}

// Keyboard-Event-Handler
const handleKeydown = (event) => {
    switch (event.key) {
        case 'Escape':
            cancelPromotion()
            break
        case 'Enter':
        case ' ':
            event.preventDefault()
            confirmPromotion()
            break
        case 'ArrowLeft':
            event.preventDefault()
            navigateLeft()
            break
        case 'ArrowRight':
            event.preventDefault()
            navigateRight()
            break
        case '1':
            selectPiece(0) // Dame
            break
        case '2':
            selectPiece(1) // Turm
            break
        case '3':
            selectPiece(2) // Läufer
            break
        case '4':
            selectPiece(3) // Springer
            break
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    // Queen default
    selectedIndex.value = 0
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
    <div class="promotion-overlay" @click="cancelPromotion">
        <div class="promotion-modal" @click.stop>
            <!-- Figuren-Auswahl -->
            <div class="promotion-pieces">
                <button
                    v-for="(piece, index) in promotionPieces"
                    :key="piece"
                    class="piece-option"
                    :class="{ 'piece-option--selected': selectedIndex === index }"
                    @click="selectPiece(index)"
                    :title="`${index + 1} - ${piece} (Doppelklick zum Bestätigen)`"
                >
                    <img
                        :src="pieceStore.getPieceImageUrl(piece)"
                        :alt="piece"
                        class="piece-image"
                        draggable="false"
                    />
                    <!-- Numerische Anzeige -->
                    <span class="piece-number">{{ index + 1 }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.promotion-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 150ms ease;
}

.promotion-modal {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: slideIn 200ms ease;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.promotion-pieces {
    display: flex;
    gap: 16px;
    align-items: center;
}

.piece-option {
    position: relative;
    width: 80px;
    height: 80px;
    border: 3px solid transparent;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 200ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
}

.piece-option:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.piece-option--selected {
    border-color: #333;
    background: rgba(0, 0, 0, 0.15);
    box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.3);
}

/* ✅ Doppelklick-Feedback */
.piece-option:active {
    transform: translateY(-1px) scale(0.98);
    transition: all 100ms ease;
}

.piece-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: contrast(1.1) saturate(0.8);
    transition: filter 200ms ease;
    pointer-events: none; /* Verhindert Drag auf dem Bild */
}

.piece-option--selected .piece-image {
    filter: contrast(1.2) saturate(0.9);
}

.piece-number {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    font-family: 'Courier New', monospace;
    pointer-events: none; /* Klicks gehen durch */
}

.piece-option--selected .piece-number {
    background: #333;
    color: white;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Responsive Design */
@media (max-width: 480px) {
    .promotion-modal {
        padding: 16px;
        margin: 16px;
    }

    .promotion-pieces {
        gap: 12px;
    }

    .piece-option {
        width: 60px;
        height: 60px;
        border-radius: 8px;
    }

    .piece-number {
        width: 16px;
        height: 16px;
        font-size: 10px;
        top: 2px;
        right: 2px;
    }
}

/* Focus-Styles für Accessibility */
.piece-option:focus {
    outline: none;
    border-color: #333;
    box-shadow: 0 0 0 3px rgba(51, 51, 51, 0.2);
}

/* Keyboard-Navigation Hinweis */
.promotion-modal::after {
    content: "↔ Navigate | Enter: Select | Doppelklick: Bestätigen | Esc: Cancel";
    position: absolute;
    bottom: -32px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    font-family: 'Courier New', monospace;
}
</style>
