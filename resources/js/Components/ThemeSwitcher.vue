<script setup>
import { useThemeStore } from '@/Stores/themeStore'

const themeStore = useThemeStore()

defineProps({
    size: { type: String, default: 'md' }
})
</script>

<template>
    <select
        v-model="themeStore.currentTheme"
        @change="themeStore.setTheme($event.target.value)"
        class="px-3 py-1 text-sm rounded border bg-theme-surface text-theme-primary border-theme transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        :class="{
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-4 py-2 text-base': size === 'lg'
        }"
    >
        <option
            v-for="option in themeStore.themeOptions"
            :key="option.key"
            :value="option.key"
        >
            {{ option.icon }} {{ option.name }}
        </option>
    </select>
</template>
