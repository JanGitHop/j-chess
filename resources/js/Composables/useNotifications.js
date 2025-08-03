import { ref, computed } from 'vue'

/**
 * Composable for managing notifications in the application
 *
 * @returns {Object} Notification methods and state
 */
export function useNotifications() {
    const notifications = ref([])

    /**
     * Get only active (non-dismissed) notifications
     */
    const activeNotifications = computed(() =>
        notifications.value.filter(n => !n.dismissed)
    )

    /**
     * Add a new notification
     *
     * @param {Object} notification - The notification to add
     * @param {string} notification.type - Type of notification (success, error, warning, info, move)
     * @param {string} notification.message - Message to display
     * @param {number} [notification.duration] - Auto-dismiss duration in ms
     * @param {boolean} [notification.persistent] - If true, won't auto-dismiss
     */
    const addNotification = (notification) => {
        const id = Date.now() + Math.random()
        notifications.value.push({
            id,
            dismissed: false,
            timestamp: new Date(),
            ...notification
        })

        // Auto-dismiss after duration
        if (notification.duration && !notification.persistent) {
            setTimeout(() => {
                dismissNotification(id)
            }, notification.duration)
        }
    }

    /**
     * Dismiss a notification by ID
     *
     * @param {number} id - ID of the notification to dismiss
     */
    const dismissNotification = (id) => {
        const notification = notifications.value.find(n => n.id === id)
        if (notification) {
            notification.dismissed = true
        }
    }

    /**
     * Clear all notifications
     */
    const clearNotifications = () => {
        notifications.value = []
    }

    /**
     * Helper to check if a status is a draw status
     *
     * @param {string} status - Game status to check
     * @returns {boolean} True if it's a draw status
     */
    const isDrawStatus = (status) => {
        return status.startsWith('DRAW_')
    }

    /**
     * Handle game status changes with appropriate notifications
     *
     * @param {string} status - New game status
     */
    const handleGameStatusNotification = (status) => {
        const messages = {
            'CHECK': { type: 'warning', message: 'Schach!' },
            'CHECKMATE': { type: 'error', message: 'Schachmatt!' },
            'STALEMATE': { type: 'info', message: 'Patt - Unentschieden!' },
            'DRAW_FIFTY_MOVE': { type: 'info', message: '50-Züge-Regel - Unentschieden!' },
            'DRAW_REPETITION': { type: 'info', message: 'Stellungswiederholung - Unentschieden!' },
            'DRAW_AGREEMENT': { type: 'info', message: 'Remis vereinbart!' },
            'DRAW_INSUFFICIENT': { type: 'info', message: 'Ungenügend Material - Unentschieden!' },
            'WAITING': { type: 'info', message: 'Warten auf Spieler...' }
        }

        const notification = messages[status]
        if (notification) {
            addNotification({
                ...notification,
                duration: isDrawStatus(status) || status === 'STALEMATE' ? 5000 : 3000,
                persistent: ['CHECKMATE', 'STALEMATE'].includes(status) || isDrawStatus(status)
            })
        }
    }

    return {
        notifications,
        activeNotifications,
        addNotification,
        dismissNotification,
        clearNotifications,
        handleGameStatusNotification,
        isDrawStatus
    }
}
