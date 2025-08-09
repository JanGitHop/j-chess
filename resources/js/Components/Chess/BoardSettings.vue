<script setup>
import { computed } from 'vue'
import { useBoardStore } from '@/Stores/boardStore.js'

const boardStore = useBoardStore()

const emit = defineEmits(['close'])

// Themes nach Typ gruppieren
const groupedThemes = computed(() => {
    const groups = {
        basic: [],
        simple: [],
        pattern: [],
        image: []
    }

    boardStore.themeList.forEach(theme => {
        if (theme.key.includes('Simple')) {
            groups.simple.push(theme)
        } else if (theme.patternType === 'css') {
            groups.pattern.push(theme)
        } else if (theme.patternType === 'image') {
            groups.image.push(theme)
        } else {
            groups.basic.push(theme)
        }
    })

    return groups
})

// Vorschau-Stil für Theme
const getPreviewStyle = (theme) => {
    const lightStyle = { backgroundColor: theme.preview.light }
    const darkStyle = { backgroundColor: theme.preview.dark }

    const fullTheme = boardStore.themes[theme.key]

    if (fullTheme.pattern === 'css') {
        // Vereinfachte CSS-Patterns für Vorschau
        if (theme.key.includes('wooden')) {
            lightStyle.backgroundImage = 'linear-gradient(45deg, #DEB887, #D2B48C)'
            darkStyle.backgroundImage = 'linear-gradient(45deg, #8B4513, #A0522D)'
        } else if (theme.key.includes('marble')) {
            lightStyle.backgroundImage = 'radial-gradient(circle, #FFFACD, #F5F5DC)'
            darkStyle.backgroundImage = 'radial-gradient(circle, #778899, #696969)'
        } else if (theme.key.includes('leather')) {
            lightStyle.backgroundImage = 'radial-gradient(circle, #DEB887, #D2B48C)'
            darkStyle.backgroundImage = 'radial-gradient(circle, #A0522D, #8B4513)'
        } else if (theme.key.includes('stone')) {
            lightStyle.backgroundImage = 'linear-gradient(135deg, #F0F0F0, #E0E0E0)'
            darkStyle.backgroundImage = 'linear-gradient(135deg, #808080, #696969)'
        }
        lightStyle.backgroundSize = 'cover'
        darkStyle.backgroundSize = 'cover'
    } else if (fullTheme.pattern === 'image') {
        lightStyle.backgroundImage = `url(${fullTheme.lightPattern})`
        darkStyle.backgroundImage = `url(${fullTheme.darkPattern})`
        lightStyle.backgroundSize = 'cover'
        darkStyle.backgroundSize = 'cover'
        lightStyle.backgroundPosition = 'center'
        darkStyle.backgroundPosition = 'center'
    }

    return { lightStyle, darkStyle }
}
</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Board-Einstellungen</h2>
                <button
                    @click="$emit('close')"
                    class="text-gray-500 hover:text-gray-700 text-xl"
                >
                    ×
                </button>
            </div>

            <!-- Board-Größe Auswahl -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-3">Board-Größe</h3>
                <div class="space-y-2">
                    <div
                        v-for="size in boardStore.boardSizeList"
                        :key="size.key"
                        @click="boardStore.setBoardSize(size.key)"
                        class="cursor-pointer border-2 rounded-lg p-3 transition-all"
                        :class="[
              boardStore.settings.boardSizeMode === size.key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            ]"
                    >
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="font-medium">{{ size.name }}</div>
                                <div class="text-sm text-gray-500">{{ size.description }}</div>
                            </div>
                            <div class="text-xs text-gray-400">
                                {{ size.mode === 'responsive' ? '📱' : '📏' }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Theme-Auswahl -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-3">Board-Themes</h3>

                <!-- Basis-Themes -->
                <div class="mb-4">
                    <h4 class="text-md font-medium mb-2 text-gray-700">Standard</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <div
                            v-for="theme in groupedThemes.basic"
                            :key="theme.key"
                            @click="boardStore.setTheme(theme.key)"
                            class="cursor-pointer border-2 rounded-lg p-3 transition-all"
                            :class="[
                boardStore.currentThemeKey === theme.key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
                        >
                            <div class="text-sm font-medium mb-2">{{ theme.name }}</div>
                            <div class="flex rounded overflow-hidden border border-gray-300">
                                <div
                                    class="w-8 h-8 border-r border-gray-300"
                                    :style="getPreviewStyle(theme).lightStyle"
                                ></div>
                                <div
                                    class="w-8 h-8"
                                    :style="getPreviewStyle(theme).darkStyle"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Einfache Farb-Themes -->
                <div class="mb-4">
                    <h4 class="text-md font-medium mb-2 text-gray-700">Einfache Farben</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <div
                            v-for="theme in groupedThemes.simple"
                            :key="theme.key"
                            @click="boardStore.setTheme(theme.key)"
                            class="cursor-pointer border-2 rounded-lg p-3 transition-all"
                            :class="[
                boardStore.currentThemeKey === theme.key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
                        >
                            <div class="text-sm font-medium mb-2">{{ theme.name }}</div>
                            <div class="flex rounded overflow-hidden border border-gray-300">
                                <div
                                    class="w-8 h-8 border-r border-gray-300"
                                    :style="getPreviewStyle(theme).lightStyle"
                                ></div>
                                <div
                                    class="w-8 h-8"
                                    :style="getPreviewStyle(theme).darkStyle"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CSS-Pattern Themes -->
                <div class="mb-4">
                    <h4 class="text-md font-medium mb-2 text-gray-700">Texturen (CSS)</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <div
                            v-for="theme in groupedThemes.pattern"
                            :key="theme.key"
                            @click="boardStore.setTheme(theme.key)"
                            class="cursor-pointer border-2 rounded-lg p-3 transition-all"
                            :class="[
                boardStore.currentThemeKey === theme.key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
                        >
                            <div class="text-sm font-medium mb-2 flex items-center justify-between">
                                {{ theme.name }}
                                <span class="text-xs text-gray-500">🎨</span>
                            </div>
                            <div class="flex rounded overflow-hidden border border-gray-300">
                                <div
                                    class="w-8 h-8 border-r border-gray-300"
                                    :style="getPreviewStyle(theme).lightStyle"
                                ></div>
                                <div
                                    class="w-8 h-8"
                                    :style="getPreviewStyle(theme).darkStyle"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Image-basierte Themes -->
                <div v-if="groupedThemes.image.length > 0" class="mb-4">
                    <h4 class="text-md font-medium mb-2 text-gray-700">Foto-Texturen</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <div
                            v-for="theme in groupedThemes.image"
                            :key="theme.key"
                            @click="boardStore.setTheme(theme.key)"
                            class="cursor-pointer border-2 rounded-lg p-3 transition-all"
                            :class="[
                boardStore.currentThemeKey === theme.key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
                        >
                            <div class="text-sm font-medium mb-2 flex items-center justify-between">
                                {{ theme.name }}
                                <span class="text-xs text-gray-500">📸</span>
                            </div>
                            <div class="flex rounded overflow-hidden border border-gray-300">
                                <div
                                    class="w-8 h-8 border-r border-gray-300"
                                    :style="getPreviewStyle(theme).lightStyle"
                                ></div>
                                <div
                                    class="w-8 h-8"
                                    :style="getPreviewStyle(theme).darkStyle"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Weitere Einstellungen -->
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium">Koordinaten anzeigen</label>
                    <input
                        type="checkbox"
                        :checked="boardStore.settings.showCoordinates"
                        @change="boardStore.updateSetting('showCoordinates', $event.target.checked)"
                        class="rounded"
                    >
                </div>

                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium">Letzten Zug hervorheben</label>
                    <input
                        type="checkbox"
                        :checked="boardStore.settings.highlightLastMove"
                        @change="boardStore.updateSetting('highlightLastMove', $event.target.checked)"
                        class="rounded"
                    >
                </div>

                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium">Mögliche Züge anzeigen</label>
                    <input
                        type="checkbox"
                        :checked="boardStore.settings.highlightPossibleMoves"
                        @change="boardStore.updateSetting('highlightPossibleMoves', $event.target.checked)"
                        class="rounded"
                    >
                </div>
            </div>

            <!-- Aktionen -->
            <div class="flex justify-between mt-6">
                <button
                    @click="boardStore.resetToDefaults"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    Zurücksetzen
                </button>
                <button
                    @click="$emit('close')"
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Fertig
                </button>
            </div>
        </div>
    </div>
</template>
