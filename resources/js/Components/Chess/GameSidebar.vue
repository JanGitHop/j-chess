<script setup>
import MoveHistory from '@/Components/Chess/MoveHistory.vue'

// Props
defineProps({
    collapsed: {
        type: Boolean,
        default: false
    },
    moveHistory: {
        type: Array,
        required: true
    },
    currentMoveIndex: {
        type: Number,
        required: true
    }
})

// Emits
defineEmits([
    'goto-move'
])
</script>

<template>
    <aside class="game-sidebar" :class="{ 'sidebar--collapsed': collapsed }">
        <!-- Move History -->
        <MoveHistory
            :moves="moveHistory"
            :current-move="currentMoveIndex"
            @goto-move="$emit('goto-move', $event)"
            class="sidebar-section sidebar-section--expandable"
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
    overflow-y: visible;
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
    display: flex;
    flex-direction: column;
}

/* Responsive Design */
@media (max-width: 768px) {
    .game-sidebar {
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
        max-height: 400px;
        overflow-y: auto;
    }
}
</style>
