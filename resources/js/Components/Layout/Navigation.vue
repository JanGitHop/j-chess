<script setup>
import { computed, ref } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import ThemeSwitcher from '@/Components/UI/ThemeSwitcher.vue'

// Responsive Menu Toggle
const mobileMenuOpen = ref(false)
const page = usePage()

const isLoggedIn = computed(() => !!page.props.user)
const user = computed(() => page.props.user)

// Navigation methods
const goToProfile = () => {
    router.visit('/profile')
}

const logout = () => {
    router.post('/logout')
}
</script>

<template>
    <nav class="bg-theme-surface shadow-lg border-b border-theme">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <!-- Logo -->
                <div class="flex items-center">
                    <a href="/public" class="text-2xl font-bold text-theme-primary">
                        ♛ J-Chess
                    </a>
                </div>

                <!-- Desktop Navigation -->
                <div class="hidden md:flex space-x-6">
                    <a href="/public" class="text-theme-secondary hover:text-theme-primary px-3 py-2 rounded-md transition">
                        Start
                    </a>
                    <a href="/chess" class="text-theme-secondary hover:text-theme-primary px-3 py-2 rounded-md transition">
                        Spielen
                    </a>
                    <a href="/leaderboard" class="text-theme-secondary hover:text-theme-primary px-3 py-2 rounded-md transition">
                        Rangliste
                    </a>
                </div>

                <!-- Theme Switcher & Auth -->
                <div class="hidden md:flex items-center space-x-4">
                    <ThemeSwitcher size="sm" />

                    <template v-if="!isLoggedIn">
                        <a href="/login" class="text-theme-secondary hover:text-theme-primary px-4 py-2 rounded-md transition">
                            Anmelden
                        </a>
                        <a href="/register" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition">
                            Registrieren
                        </a>
                    </template>

                    <template v-else>
                        <div class="flex items-center space-x-3">
                            <button @click="goToProfile" class="text-theme-primary font-medium hover:text-theme-primary hover:underline transition">{{ user.name }}</button>
                            <button @click="logout" class="text-theme-secondary hover:text-red-500 transition">
                                Abmelden
                            </button>
                        </div>
                    </template>
                </div>

                <!-- Mobile Menu Button -->
                <button
                    @click="mobileMenuOpen = !mobileMenuOpen"
                    class="md:hidden text-theme-secondary hover:text-theme-primary"
                >
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <!-- Mobile Navigation -->
            <div v-show="mobileMenuOpen" class="md:hidden border-t border-theme pt-4 pb-3 space-y-2">
                <a href="/public" class="block text-theme-secondary hover:text-theme-primary px-3 py-2 rounded-md">Start</a>
                <a href="/chess" class="block text-theme-secondary hover:text-theme-primary px-3 py-2 rounded-md">Spielen</a>
                <a href="/leaderboard" class="block text-theme-secondary hover:text-theme-primary px-3 py-2 rounded-md">Rangliste</a>

                <div class="px-3 py-2">
                    <ThemeSwitcher size="sm" />
                </div>

                <div v-if="!isLoggedIn" class="border-t border-theme pt-2 space-y-2">
                    <a href="/login" class="block text-theme-secondary hover:text-theme-primary px-3 py-2">Anmelden</a>
                    <a href="/register" class="block bg-blue-600 text-white px-3 py-2 rounded-md">Registrieren</a>
                </div>

                <div v-else class="border-t border-theme pt-2">
                    <button @click="goToProfile" class="block w-full text-left text-theme-primary px-3 py-2 font-medium hover:underline">{{ user.name }}</button>
                    <button @click="logout" class="block w-full text-left text-theme-secondary hover:text-red-500 px-3 py-2">
                        Abmelden
                    </button>
                </div>
            </div>
        </div>
    </nav>
</template>
