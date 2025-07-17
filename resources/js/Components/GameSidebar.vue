<script setup>
import GameInfo from '@/Components/GameInfo.vue'
import GameControls from '@/Components/GameControls.vue'
import MoveHistory from '@/Components/MoveHistory.vue'
import BoardInfo from '@/Components/BoardInfo.vue'

// Props
defineProps({
    collapsed: {
        type: Boolean,
        default: false
    },
    gameState: {
        type: Object,
        required: true
    },
    timeControl: {
        type: Object,
        required: true
    },
    playerColor: {
        type: String,
        required: true
    },
    gameMode: {
        type: String,
        required: true
    },
    moveHistory: {
        type: Array,
        required: true
    },
    currentMoveIndex: {
        type: Number,
        required: true
    },
    showPlayerInfo: {
        type: Boolean,
        default: true
    },
    showGameControls: {
        type: Boolean,
        default: true
    },
    showMoveHistory: {
        type: Boolean,
        default: true
    },
    showBoardInfo: {
        type: Boolean,
        default: false
    }
})

// Emits
defineEmits([
    'new-game',
    'undo-move',
    'redo-move',
    'resign',
    'offer-draw',
    'goto-move'
])
</script>

<template>
    <aside class="game-sidebar" :class="{ 'sidebar--collapsed': collapsed }">
        <!-- Player Info -->
        <GameInfo
            v-if="showPlayerInfo"
            :game-state="gameState"
            :time-control="timeControl"
            :player-color="playerColor"
            class="sidebar-section"
        />

        <!-- Game Controls -->
        <GameControls
            v-if="showGameControls"
            :game-state="gameState"
            :game-mode="gameMode"
            @new-game="$emit('new-game')"
            @undo-move="$emit('undo-move')"
            @redo-move="$emit('redo-move')"
            @resign="$emit('resign')"
            @offer-draw="$emit('offer-draw')"
            class="sidebar-section"
        />

        <!-- Move History -->
        <MoveHistory
            v-if="showMoveHistory"
            :moves="moveHistory"
            :current-move="currentMoveIndex"
            @goto-move="$emit('goto-move', $event)"
            class="sidebar-section sidebar-section--expandable"
        />

        <!-- Board Settings Compact -->
        <BoardInfo
            v-if="showBoardInfo"
            class="sidebar-section"
            :show-title="true"
            :show-fen="true"
        />
    </aside>
</template>

<style scoped>
.game-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: transparent;
    border-left: 1px solid #e2e8f0;
    overflow-y: auto;
    transition: all 300ms ease;
}

.sidebar--collapsed {
    width: 50px;
    padding: 0.5rem;
}

.sidebar--collapsed > * {
    display: none;
}

.sidebar-section {
    padding: 1rem;
    background: transparent;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sidebar-section--expandable {
    flex: 1;
    min-height: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
    .game-sidebar {
        position: fixed;
        top: 60px;
        right: 0;
        bottom: 0;
        width: 300px;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 300ms ease;
    }

    .game-sidebar:not(.sidebar--collapsed) {
        transform: translateX(0);
    }

    .sidebar--collapsed {
        width: 50px;
        transform: translateX(calc(100% - 50px));
    }
}
</style>
