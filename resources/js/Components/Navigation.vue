<script setup>
import {computed, ref} from 'vue'
import { usePage, router } from '@inertiajs/vue3'

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
    <nav class="bg-white shadow-lg">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <!-- Logo -->
                <div class="flex items-center">
                    <a href="/" class="text-2xl font-bold text-gray-800">
                        ♛ J-Chess
                    </a>
                </div>

                <!-- Desktop Navigation -->
                <div class="hidden md:flex space-x-6">
                    <a href="/" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition duration-200">
                        Start
                    </a>
                    <a href="/chess" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition duration-200">
                        Spielen
                    </a>
                    <a href="/leaderboard" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition duration-200">
                        Rangliste
                    </a>
                    <a href="/profile" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition duration-200">
                        Profil
                    </a>
                </div>

                <!-- Auth Section - Desktop -->
                <div class="hidden md:flex items-center space-x-4">
                    <!-- Not Logged In -->
                    <template v-if="!isLoggedIn">
                        <a href="/login" class="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md transition duration-200">
                            Anmelden
                        </a>
                        <a href="/register" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200">
                            Registrieren
                        </a>
                    </template>

                    <!-- Logged In -->
                    <template v-else>
                        <button
                            @click="goToProfile"
                            class="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition duration-200"
                        >
                            <img
                                :src="user.avatar || '/images/logo.png'"
                                :alt="user.name"
                                class="w-8 h-8 rounded-full border-2 border-gray-200"
                                @error="$event.target.src = '/images/logo.png'"
                            />
                            <span class="font-medium">{{ user.name }}</span>
                        </button>

                        <form @submit.prevent="logout" class="inline">
                            <button
                                type="submit"
                                class="text-gray-600 hover:text-red-600 px-4 py-2 rounded-md transition duration-200 font-medium"
                            >
                                Abmelden
                            </button>
                        </form>
                    </template>
                </div>

                <!-- Mobile menu button -->
                <div class="md:hidden">
                    <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-gray-600 hover:text-gray-900">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Mobile Navigation -->
            <div v-show="mobileMenuOpen" class="md:hidden">
                <div class="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
                    <a href="/" class="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">Start</a>
                    <a href="/chess" class="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">Spielen</a>
                    <a href="/leaderboard" class="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">Rangliste</a>
                    <a href="/profile" class="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">Profil</a>
                    <a href="/login" class="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">Anmelden</a>
                    <a href="/register" class="block bg-blue-600 text-white px-3 py-2 rounded-md">Registrieren</a>

                    <!-- Conditional Auth/User Section -->
                    <div v-if="!isLoggedIn" class="border-t border-gray-200 pt-2">
                        <a href="/login" class="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">Anmelden</a>
                        <a href="/register" class="block bg-blue-600 text-white px-3 py-2 rounded-md">Registrieren</a>
                    </div>

                    <div v-else class="border-t border-gray-200 pt-2">
                        <button @click="goToProfile" class="block w-full text-left text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">
                            {{ user.name }} - Profil
                        </button>
                        <button @click="logout" class="block w-full text-left text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md">
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>
