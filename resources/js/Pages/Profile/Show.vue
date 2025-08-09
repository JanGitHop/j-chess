<script setup>
import { useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import Navigation from '../../Components/Layout/Navigation.vue'

const props = defineProps({
    user: Object
})

const form = useForm({
    name: props.user.name,
    email: props.user.email,
    preferred_color: props.user.preferred_color
})

const isEditing = ref(false)

const submit = () => {
    form.patch(route('profile.update'), {
        onSuccess: () => {
            isEditing.value = false
        }
    })
}
</script>

<template>
    <div class="chess-page">
        <!-- Chess Background -->
        <div class="chess-background">
            <div class="chess-pattern"></div>
        </div>

        <!-- Navigation einbinden -->
        <Navigation />

        <!-- Profile Content -->
        <main class="container mx-auto py-8 px-4">
            <div class="max-w-4xl mx-auto">
                <!-- Page Header -->
                <div class="bg-theme-surface rounded-lg shadow-md p-6 mb-8">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-3xl font-bold text-theme-primary">{{ user.name }}</h1>
                            <p class="text-theme-secondary mt-1">Spielerprofil</p>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-theme-primary">{{ user.rating }}</div>
                            <div class="text-sm text-theme-secondary">Rating</div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Statistics Card -->
                    <div class="lg:col-span-2">
                        <div class="bg-theme-surface rounded-lg shadow-md p-6">
                            <h2 class="text-xl font-semibold text-theme-primary mb-6">Spielstatistiken</h2>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-theme-primary">{{ user.games_played }}</div>
                                    <div class="text-sm text-theme-secondary">Spiele</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-green-600">{{ user.games_won }}</div>
                                    <div class="text-sm text-theme-secondary">Siege</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-red-600">{{ user.games_lost }}</div>
                                    <div class="text-sm text-theme-secondary">Niederlagen</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-yellow-600">{{ user.games_drawn }}</div>
                                    <div class="text-sm text-theme-secondary">Unentschieden</div>
                                </div>
                            </div>

                            <div class="mt-6 pt-6 border-t border-theme">
                                <div class="flex justify-between items-center">
                                    <span class="text-theme-secondary">Winrate:</span>
                                    <div class="flex items-center">
                                        <div class="w-32 bg-theme rounded-full h-2 mr-3">
                                            <div
                                                class="bg-green-600 h-2 rounded-full"
                                                :style="{ width: user.win_rate + '%' }"
                                            ></div>
                                        </div>
                                        <span class="text-lg font-semibold text-theme-primary">{{ user.win_rate }}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Profile Info Card -->
                    <div class="lg:col-span-1">
                        <div class="bg-theme-surface rounded-lg shadow-md p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-xl font-semibold text-theme-primary">Profil</h2>
                                <button
                                    v-if="!isEditing"
                                    @click="isEditing = true"
                                    class="text-theme-primary hover:text-theme-primary text-sm font-medium"
                                >
                                    Bearbeiten
                                </button>
                            </div>

                            <!-- Edit Form -->
                            <form @submit.prevent="submit" v-if="isEditing" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-theme-secondary mb-1">Name</label>
                                    <input
                                        v-model="form.name"
                                        type="text"
                                        class="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-primary"
                                        :class="{ 'border-red-500': form.errors.name }"
                                    />
                                    <div v-if="form.errors.name" class="text-red-500 text-sm mt-1">
                                        {{ form.errors.name }}
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-theme-secondary mb-1">E-Mail</label>
                                    <input
                                        v-model="form.email"
                                        type="email"
                                        class="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-primary"
                                        :class="{ 'border-red-500': form.errors.email }"
                                    />
                                    <div v-if="form.errors.email" class="text-red-500 text-sm mt-1">
                                        {{ form.errors.email }}
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-theme-secondary mb-1">Bevorzugte Farbe</label>
                                    <select
                                        v-model="form.preferred_color"
                                        class="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-primary"
                                    >
                                        <option value="white">Weiß</option>
                                        <option value="black">Schwarz</option>
                                        <option value="random">Zufällig</option>
                                    </select>
                                </div>

                                <div class="flex space-x-3 pt-4">
                                    <button
                                        type="submit"
                                        :disabled="form.processing"
                                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition duration-200"
                                    >
                                        {{ form.processing ? 'Speichern...' : 'Speichern' }}
                                    </button>
                                    <button
                                        type="button"
                                        @click="isEditing = false"
                                        class="flex-1 bg-theme text-theme-primary hover:bg-theme-surface px-4 py-2 rounded-md font-medium transition duration-200"
                                    >
                                        Abbrechen
                                    </button>
                                </div>
                            </form>

                            <!-- View Mode -->
                            <div v-else class="space-y-4">
                                <div>
                                    <div class="text-sm text-theme-secondary">Name</div>
                                    <div class="font-medium text-theme-primary">{{ user.name }}</div>
                                </div>
                                <div>
                                    <div class="text-sm text-theme-secondary">E-Mail</div>
                                    <div class="font-medium text-theme-primary">{{ user.email }}</div>
                                </div>
                                <div>
                                    <div class="text-sm text-theme-secondary">Bevorzugte Farbe</div>
                                    <div class="font-medium text-theme-primary">
                                        {{ user.preferred_color === 'white' ? 'Weiß' :
                                        user.preferred_color === 'black' ? 'Schwarz' : 'Zufällig' }}
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm text-theme-secondary">Mitglied seit</div>
                                    <div class="font-medium text-theme-primary">
                                        {{ new Date(user.created_at).toLocaleDateString('de-DE') }}
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm text-theme-secondary">Status</div>
                                    <div class="flex items-center">
                                        <div
                                            class="w-2 h-2 rounded-full mr-2"
                                            :class="user.is_online ? 'bg-green-500' : 'bg-theme'"
                                        ></div>
                                        <span class="font-medium text-theme-primary">
                                            {{ user.is_online ? 'Online' : 'Offline' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Games Section -->
                <div class="mt-8">
                    <div class="bg-theme-surface rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-semibold text-theme-primary mb-6">Letzte Spiele</h2>
                        <div class="text-center text-theme-secondary py-8">
                            <p>Noch keine Spiele gespielt</p>
                            <a href="/chess" class="text-theme-primary hover:text-theme-primary font-medium">
                                Erstes Spiel starten →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>
