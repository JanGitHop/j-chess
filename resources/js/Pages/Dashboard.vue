<script setup>
import Navigation from '@/Components/Layout/Navigation.vue'
import { Link } from '@inertiajs/vue3'

console.log('Dashboard loaded');
</script>

<template>
    <div class="chess-page theme-page-bg min-h-screen">
        <!-- Chess Background -->
        <div class="chess-background">
            <div class="chess-pattern"></div>
        </div>

        <!-- Navigation -->
        <Navigation />

        <!-- Hero Section -->
        <main class="container mx-auto py-16 px-4">
            <div class="text-center">
                <h1 class="text-6xl font-bold text-theme-primary mb-4">♛ J-Chess</h1>
                <p class="text-xl text-gray-50 mb-8">Jan's Schach</p>

                <div class="space-x-4">
                    <Link href="/chess" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                        Spiel starten
                    </Link>
                </div>
            </div>

            <!-- Features Section -->
            <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-theme-surface p-6 rounded-lg shadow-md border border-theme">
                    <h3 class="text-xl font-bold mb-3 text-theme-primary">🤖 KI-Gegner</h3>
                    <p class="text-theme-secondary">Spiele gegen verschiedene Schach-Engines mit einstellbarer Schwierigkeit.</p>
                </div>
                <div class="bg-theme-surface p-6 rounded-lg shadow-md border border-theme">
                    <h3 class="text-xl font-bold mb-3 text-theme-primary">👥 Multiplayer</h3>
                    <p class="text-theme-secondary">Fordere andere Spieler zu spannenden Online-Partien heraus.</p>
                </div>
                <div class="bg-theme-surface p-6 rounded-lg shadow-md border border-theme">
                    <h3 class="text-xl font-bold mb-3 text-theme-primary">📊 Analyse</h3>
                    <p class="text-theme-secondary">Analysiere deine Spiele und verbessere dein Schach-Spiel.</p>
                </div>
            </div>
        </main>
    </div>
</template>
