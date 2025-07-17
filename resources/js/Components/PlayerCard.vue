<script setup>
import { computed } from 'vue'

const props = defineProps({
    player: {
        type: Object,
        required: true,
        validator: (player) => {
            return player.name &&
                player.color &&
                ['white', 'black'].includes(player.color)
        }
    },
    gameState: {
        type: Object,
        required: true
    }
})

// Computed Properties für erweiterte Spieler-Daten
const playerData = computed(() => ({
    ...props.player,
    isActive: props.gameState.currentPlayer === props.player.color
}))
</script>

<template>
    <div class="player-info-header" :class="[
        `player-info-header--${player.color}`,
        {
            'player-info-header--active': player.isActive && gameState.isGameActive,
            'player-info-header--check': gameState.isInCheck && player.isActive
        }
    ]">
        <!-- Profilbild -->
        <div class="player-avatar">
            <img
                v-if="player.avatar"
                :src="player.avatar"
                :alt="player.name"
                class="avatar-image"
            />
            <div v-else class="avatar-fallback">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 10.66 13.66 12 12 12S9 10.66 9 9V7L3 7V9C3 11.76 5.24 14 8 14V16C8 17.1 8.9 18 10 18H14C15.1 18 16 17.1 16 16V14C18.76 14 21 11.76 21 9Z"/>
                </svg>
            </div>
        </div>

        <!-- Spieler-Details -->
        <div class="player-details">
            <div class="player-name">{{ player.name }}</div>
            <div v-if="player.rating" class="player-rating">
                {{ player.rating }}
            </div>
        </div>

        <!-- Status-Indikatoren -->
        <div class="player-status">
            <!-- Aktiv-Indikator -->
            <div
                v-if="player.isActive && gameState.isGameActive"
                class="turn-indicator"
                :class="`turn-indicator--${player.color}`"
            >
                <div class="turn-pulse"></div>
            </div>

            <!-- Check-Warnung -->
            <div
                v-if="gameState.isInCheck && player.isActive"
                class="check-warning"
            >
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21L12 2L23 21H1ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z"/>
                </svg>
            </div>
        </div>
    </div>
</template>

<style scoped>
.player-info-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 2px solid transparent;
    transition: all 300ms ease;
    min-height: 60px;
}

/* Farbvarianten */
.player-info-header--white {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
}

.player-info-header--black {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.04));
}

/* Aktiver Spieler */
.player-info-header--active {
    border-color: #4299e1;
    background: rgba(66, 153, 225, 0.08);
    box-shadow: 0 0 0 1px rgba(66, 153, 225, 0.2);
}

/* Schach-Zustand */
.player-info-header--check {
    border-color: #e53e3e !important;
    background: rgba(229, 62, 62, 0.1) !important;
    animation: check-pulse 1.5s ease-in-out infinite;
}

/* Profilbild */
.player-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    background: linear-gradient(135deg, #667eea, #764ba2);
}

.avatar-fallback svg {
    width: 20px;
    height: 20px;
}

/* Spieler-Details */
.player-details {
    flex: 1;
    min-width: 0;
}

.player-name {
    font-weight: 600;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.2;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.player-rating {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
    line-height: 1.1;
}

/* Status-Indikatoren */
.player-status {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.turn-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: relative;
    overflow: hidden;
}

.turn-indicator--white {
    background: #e2e8f0;
    border: 1px solid #cbd5e0;
}

.turn-indicator--black {
    background: #2d3748;
    border: 1px solid #4a5568;
}

.turn-pulse {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #4299e1;
    animation: pulse 2s ease-in-out infinite;
}

.check-warning {
    width: 18px;
    height: 18px;
    color: #e53e3e;
    animation: warning-pulse 1s ease-in-out infinite;
}

.check-warning svg {
    width: 100%;
    height: 100%;
}

/* Animationen */
@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.5;
        transform: scale(0.95);
    }
}

@keyframes check-pulse {
    0%, 100% {
        border-color: #e53e3e;
        box-shadow: 0 0 0 1px rgba(229, 62, 62, 0.2);
    }
    50% {
        border-color: #fc8181;
        box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.4);
    }
}

@keyframes warning-pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    .player-info-header {
        padding: 8px 12px;
        gap: 8px;
        min-height: 50px;
    }

    .player-avatar {
        width: 30px;
        height: 30px;
    }

    .player-name {
        font-size: 13px;
    }

    .player-rating {
        font-size: 11px;
    }
}
</style>
