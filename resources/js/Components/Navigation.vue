<script setup>
import { ref } from 'vue'

// Responsive Menu Toggle
const mobileMenuOpen = ref(false)
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

                <!-- Auth Buttons -->
                <div class="hidden md:flex space-x-4">
                    <a href="/login" class="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md transition duration-200">
                        Anmelden
                    </a>
                    <a href="/register" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200">
                        Registrieren
                    </a>
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
                </div>
            </div>
        </div>
    </nav>
</template>
