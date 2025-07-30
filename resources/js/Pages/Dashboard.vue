<script setup>
import Navigation from '../Components/Navigation.vue'

console.log('Dashboard loaded');
</script>

<template>
    <div class="min-h-screen bg-gray-100">
        <!-- Navigation einbinden -->
        <Navigation />

        <!-- Hero Section -->
        <main class="container mx-auto py-16 px-4">
            <div class="text-center">
                <h1 class="text-6xl font-bold text-gray-900 mb-4">♛ J-Chess</h1>
                <p class="text-xl text-gray-600 mb-8">Jan's Schach</p>

                <div class="space-x-4">
                    <a href="/chess" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                        Spiel starten
                    </a>
                    <a href="/register" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                        Registrieren
                    </a>
                </div>
            </div>

            <!-- Features Section -->
            <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-bold mb-3">🤖 KI-Gegner</h3>
                    <p class="text-gray-600">Spiele gegen verschiedene Schach-Engines mit einstellbarer Schwierigkeit.</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-bold mb-3">👥 Multiplayer</h3>
                    <p class="text-gray-600">Fordere andere Spieler zu spannenden Online-Partien heraus.</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-bold mb-3">📊 Analyse</h3>
                    <p class="text-gray-600">Analysiere deine Spiele und verbessere dein Schach-Spiel.</p>
                </div>
            </div>
        </main>
    </div>
</template>
