import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
    const currentTheme = ref('system') // 'light' | 'dark' | 'system'
    const systemTheme = ref('light')

    const themeOptions = [
        { key: 'light', name: 'Hell', icon: '☀️' },
        { key: 'dark', name: 'Dunkel', icon: '🌙' },
        { key: 'system', name: 'System', icon: '💻' }
    ]

    const effectiveTheme = computed(() => {
        return currentTheme.value === 'system' ? systemTheme.value : currentTheme.value
    })

    function setTheme(theme) {
        currentTheme.value = theme
        updateDOM()
        saveToStorage()
    }

    function updateDOM() {
        const html = document.documentElement
        html.classList.remove('light', 'dark')
        html.classList.add(effectiveTheme.value)
    }

    function detectSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        systemTheme.value = mediaQuery.matches ? 'dark' : 'light'

        mediaQuery.addEventListener('change', (e) => {
            systemTheme.value = e.matches ? 'dark' : 'light'
        })
    }

    function saveToStorage() {
        localStorage.setItem('theme', currentTheme.value)
    }

    function loadFromStorage() {
        const saved = localStorage.getItem('theme')
        if (saved && themeOptions.some(t => t.key === saved)) {
            currentTheme.value = saved
        }
    }

    function initialize() {
        loadFromStorage()
        detectSystemTheme()
        updateDOM()
    }

    // Auto-update DOM when theme changes
    watch([currentTheme, systemTheme], updateDOM)

    return {
        currentTheme,
        effectiveTheme,
        themeOptions,
        setTheme,
        initialize
    }
})
