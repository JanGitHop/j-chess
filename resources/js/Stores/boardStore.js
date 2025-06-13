import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBoardStore = defineStore('board', () => {
    const mousePosition = ref({
        file: null,
        rank: null,
        square: null,
        x: null,
        y: null,
        pixelX: null,
        pixelY: null,
        isOverBoard: false
    })

    const mouseOver = computed(() => {
        return mousePosition.value.isOverBoard ? mousePosition.value.square : 'Außerhalb'
    })

    // Verfügbare Board-Größen
    const boardSizes = ref({
        fullscreen: {
            name: 'Vollbild',
            mode: 'responsive',
            minSize: 400,
            maxSize: 800,
            description: 'Passt sich an Bildschirmgröße an'
        },
        large: {
            name: 'Groß',
            mode: 'fixed',
            size: 640,
            description: 'Feste Größe für Hauptspiel'
        },
        medium: {
            name: 'Mittel',
            mode: 'fixed',
            size: 480,
            description: 'Standard-Größe'
        },
        small: {
            name: 'Klein',
            mode: 'fixed',
            size: 320,
            description: 'Kompakt für mehrere Boards'
        }
    })

    // Verfügbare Themes (erweitert)
    const themes = ref({
        classic: {
            name: 'Klassisch',
            lightSquare: '#F0D9B5',
            darkSquare: '#B58863',
            border: '#8B4513',
            coordinates: '#654321',
            pattern: false
        },
        modern: {
            name: 'Modern',
            lightSquare: '#EEEED2',
            darkSquare: '#769656',
            border: '#4A4A4A',
            coordinates: '#2C2C2C',
            pattern: false
        },
        blue: {
            name: 'Blau',
            lightSquare: '#E6F3FF',
            darkSquare: '#4A90E2',
            border: '#2C5282',
            coordinates: '#1A365D',
            pattern: false
        },
        minimal: {
            name: 'Minimal',
            lightSquare: '#FFFFFF',
            darkSquare: '#CCCCCC',
            border: '#999999',
            coordinates: '#666666',
            pattern: false
        },
        // Einfache Farb-Varianten
        woodenSimple: {
            name: 'Holz (Einfach)',
            lightSquare: '#DEB887',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: false
        },
        marbleSimple: {
            name: 'Marmor (Einfach)',
            lightSquare: '#F5F5DC',
            darkSquare: '#696969',
            border: '#2F2F2F',
            coordinates: '#000000',
            pattern: false
        },
        leatherSimple: {
            name: 'Leder (Einfach)',
            lightSquare: '#D2B48C',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: false
        },
        stoneSimple: {
            name: 'Stein (Einfach)',
            lightSquare: '#F0F0F0',
            darkSquare: '#808080',
            border: '#404040',
            coordinates: '#202020',
            pattern: false
        },
        // CSS-Pattern Varianten (funktionierend)
        woodenPattern: {
            name: 'Holz (Textur)',
            lightSquare: '#DEB887',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: 'css',
            lightPattern: 'wood-light',
            darkPattern: 'wood-dark'
        },
        marblePattern: {
            name: 'Marmor (Textur)',
            lightSquare: '#F5F5DC',
            darkSquare: '#696969',
            border: '#2F2F2F',
            coordinates: '#000000',
            pattern: 'css',
            lightPattern: 'marble-light',
            darkPattern: 'marble-dark'
        },
        leatherPattern: {
            name: 'Leder (Textur)',
            lightSquare: '#D2B48C',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: 'css',
            lightPattern: 'leather-light',
            darkPattern: 'leather-dark'
        },
        stonePattern: {
            name: 'Stein (Textur)',
            lightSquare: '#F0F0F0',
            darkSquare: '#808080',
            border: '#404040',
            coordinates: '#202020',
            pattern: 'css',
            lightPattern: 'stone-light',
            darkPattern: 'stone-dark'
        },
        // Image-basierte Themes (falls Bilder vorhanden)
        woodenImage: {
            name: 'Holz (Foto)',
            lightSquare: '#DEB887',
            darkSquare: '#8B4513',
            border: '#654321',
            coordinates: '#2F1B14',
            pattern: 'image',
            lightPattern: '/images/board-textures/wood-light.jpg',
            darkPattern: '/images/board-textures/wood-dark.jpg'
        },
        marbleImage: {
            name: 'Marmor (Foto)',
            lightSquare: '#F5F5DC',
            darkSquare: '#696969',
            border: '#2F2F2F',
            coordinates: '#000000',
            pattern: 'image',
            lightPattern: '/images/board-textures/marble-light.jpg',
            darkPattern: '/images/board-textures/marble-dark.jpg'
        }
    })

    // Aktuelles Theme
    const currentThemeKey = ref('classic')

    // Settings
    const settings = ref({
        showCoordinates: true,
        boardSizeMode: 'fullscreen',
        customSize: 480,
        animationSpeed: 300,
        highlightLastMove: true,
        highlightPossibleMoves: true
    })

    // Computed Properties
    const currentTheme = computed(() => themes.value[currentThemeKey.value])
    const currentBoardSize = computed(() => boardSizes.value[settings.value.boardSizeMode])

    const themeList = computed(() =>
        Object.entries(themes.value).map(([key, theme]) => ({
            key,
            name: theme.name,
            preview: {
                light: theme.lightSquare,
                dark: theme.darkSquare
            },
            hasTexture: theme.pattern !== false,
            patternType: theme.pattern || 'none'
        }))
    )

    const boardSizeList = computed(() =>
        Object.entries(boardSizes.value).map(([key, size]) => ({
            key,
            name: size.name,
            mode: size.mode,
            description: size.description
        }))
    )

    // Actions
    function updateMousePosition(position) {
        mousePosition.value = { ...position }
    }

    function setTheme(themeKey) {
        if (themes.value[themeKey]) {
            currentThemeKey.value = themeKey
            saveSettings()
        }
    }

    function setBoardSize(sizeKey) {
        if (boardSizes.value[sizeKey]) {
            settings.value.boardSizeMode = sizeKey
            saveSettings()
        }
    }

    function updateSetting(key, value) {
        if (key in settings.value) {
            settings.value[key] = value
            saveSettings()
        }
    }

    function saveSettings() {
        const settingsData = {
            theme: currentThemeKey.value,
            ...settings.value
        }
        localStorage.setItem('chess-board-settings', JSON.stringify(settingsData))
    }

    function loadSettings() {
        const saved = localStorage.getItem('chess-board-settings')
        if (saved) {
            try {
                const settingsData = JSON.parse(saved)
                if (settingsData.theme && themes.value[settingsData.theme]) {
                    currentThemeKey.value = settingsData.theme
                }
                Object.keys(settings.value).forEach(key => {
                    if (key in settingsData) {
                        settings.value[key] = settingsData[key]
                    }
                })
            } catch (error) {
                console.error('Fehler beim Laden der Board-Einstellungen:', error)
            }
        }
    }

    function resetToDefaults() {
        currentThemeKey.value = 'classic'
        settings.value = {
            showCoordinates: true,
            boardSizeMode: 'fullscreen',
            customSize: 480,
            animationSpeed: 300,
            highlightLastMove: true,
            highlightPossibleMoves: true
        }
        saveSettings()
    }

    // Beim Store-Setup Settings laden
    loadSettings()

    return {
        // State
        themes,
        boardSizes,
        currentThemeKey,
        settings,
        mousePosition,

        // Getters
        currentTheme,
        currentBoardSize,
        themeList,
        boardSizeList,
        mouseOver,

        // Actions
        setTheme,
        setBoardSize,
        updateSetting,
        saveSettings,
        loadSettings,
        resetToDefaults,
        updateMousePosition,
    }
})
