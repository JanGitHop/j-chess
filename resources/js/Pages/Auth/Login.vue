<script setup>
import { ref, computed } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import { router } from '@inertiajs/vue3'

// Meta-Daten für die Seite
defineOptions({
    layout: false
})

// Form handling mit Inertia
const form = useForm({
    email: '',
    password: '',
    remember: false
})

// UI State
const showPassword = ref(false)
const isSubmitting = ref(false)

// Computed properties
const canSubmit = computed(() => {
    return form.email && form.password && !form.processing
})

// Methods
const submit = () => {
    if (!canSubmit.value) return

    isSubmitting.value = true

    form.post('/login', {
        onFinish: () => {
            isSubmitting.value = false
            form.reset('password')
        },
        onError: () => {
            isSubmitting.value = false
        }
    })
}

const togglePasswordVisibility = () => {
    showPassword.value = !showPassword.value
}

const goToRegister = () => {
    router.visit('/register')
}

const goToHome = () => {
    router.visit('/')
}
</script>

<template>
    <Head title="Anmelden - J-Chess" />

    <div class="auth-container">
        <!-- Background Pattern -->
        <div class="auth-background">
            <div class="chess-pattern"></div>
        </div>

        <!-- Main Content -->
        <div class="auth-content">
            <!-- Header -->
            <div class="auth-header">
                <button
                    @click="goToHome"
                    class="home-btn"
                    title="Zurück zur Startseite"
                >
                    <svg viewBox="0 0 24 24" class="home-icon">
                        <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                </button>

                <div class="brand">
                    <h1 class="brand-title">J-Chess</h1>
                    <p class="brand-subtitle">Anmelden</p>
                </div>
            </div>

            <!-- Login Form Card -->
            <div class="auth-card">
                <div class="card-header">
                    <h2 class="card-title">Willkommen zurück!</h2>
                    <p class="card-subtitle">Melden Sie sich an, um zu spielen</p>
                </div>

                <!-- Form -->
                <form @submit.prevent="submit" class="auth-form">
                    <!-- Email Field -->
                    <div class="form-group">
                        <label for="email" class="form-label">
                            E-Mail-Adresse
                        </label>
                        <div class="input-group">
                            <div class="input-icon">
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                </svg>
                            </div>
                            <input
                                id="email"
                                v-model="form.email"
                                type="email"
                                class="form-input"
                                :class="{ 'form-input--error': form.errors.email }"
                                placeholder="ihre@email.de"
                                required
                                autocomplete="username"
                            />
                        </div>
                        <div v-if="form.errors.email" class="form-error">
                            {{ form.errors.email }}
                        </div>
                    </div>

                    <!-- Password Field -->
                    <div class="form-group">
                        <label for="password" class="form-label">
                            Passwort
                        </label>
                        <div class="input-group">
                            <div class="input-icon">
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                </svg>
                            </div>
                            <input
                                id="password"
                                v-model="form.password"
                                :type="showPassword ? 'text' : 'password'"
                                class="form-input"
                                :class="{ 'form-input--error': form.errors.password }"
                                placeholder="Ihr Passwort"
                                required
                                autocomplete="current-password"
                            />
                            <button
                                type="button"
                                @click="togglePasswordVisibility"
                                class="password-toggle"
                                title="Passwort anzeigen/verbergen"
                            >
                                <svg v-if="showPassword" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                                </svg>
                                <svg v-else viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                </svg>
                            </button>
                        </div>
                        <div v-if="form.errors.password" class="form-error">
                            {{ form.errors.password }}
                        </div>
                    </div>

                    <!-- Remember Me -->
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input
                                v-model="form.remember"
                                type="checkbox"
                                class="checkbox-input"
                            />
                            <span class="checkbox-custom"></span>
                            <span class="checkbox-text">Angemeldet bleiben</span>
                        </label>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="!canSubmit"
                        class="submit-btn"
                        :class="{ 'submit-btn--loading': form.processing }"
                    >
                        <div v-if="form.processing" class="loading-spinner"></div>
                        <span v-if="!form.processing">Anmelden</span>
                        <span v-else>Wird angemeldet...</span>
                    </button>

                    <!-- General Error -->
                    <div v-if="form.errors.general" class="form-error form-error--general">
                        {{ form.errors.general }}
                    </div>
                </form>

                <!-- Card Footer -->
                <div class="card-footer">
                    <p class="footer-text">
                        Noch kein Konto?
                        <button @click="goToRegister" class="footer-link">
                            Jetzt registrieren
                        </button>
                    </p>
                </div>
            </div>

            <!-- Chess Quote -->
            <div class="auth-quote">
                <p class="quote-text">
                    "Schach ist das Spiel, das die Könige lehrt zu denken."
                </p>
                <p class="quote-author">— Voltaire</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* =========================
   MAIN CONTAINER
   ========================= */
.auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: linear-gradient(135deg, #525252 0%, #292929 100%);
    padding: 1rem;
}

/* =========================
   BACKGROUND PATTERN
   ========================= */
.auth-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.1;
    overflow: hidden;
}

.chess-pattern {
    width: 100%;
    height: 100%;
    background-image:
        linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
    background-size: 60px 60px;
    background-position: 0 0, 0 30px, 30px -30px, -30px 0px;
}

/* =========================
   MAIN CONTENT
   ========================= */
.auth-content {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 420px;
}

/* =========================
   HEADER
   ========================= */
.auth-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
}

.home-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.5rem;
    color: white;
    cursor: pointer;
    transition: all 200ms ease;
    backdrop-filter: blur(10px);
}

.home-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
}

.home-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.brand {
    text-align: right;
}

.brand-title {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.brand-subtitle {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    margin-top: 0.25rem;
}

/* =========================
   AUTH CARD
   ========================= */
.auth-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-header {
    text-align: center;
    margin-bottom: 2rem;
}

.card-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
    margin-bottom: 0.5rem;
}

.card-subtitle {
    color: #6b7280;
    margin: 0;
    font-size: 0.875rem;
}

/* =========================
   FORM STYLING
   ========================= */
.auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
}

.input-group {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 0.75rem;
    width: 1.25rem;
    height: 1.25rem;
    color: #9ca3af;
    z-index: 10;
}

.input-icon svg {
    width: 100%;
    height: 100%;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 200ms ease;
    background: white;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input--error {
    border-color: #ef4444;
}

.form-input--error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.password-toggle {
    position: absolute;
    right: 0.75rem;
    width: 1.25rem;
    height: 1.25rem;
    color: #9ca3af;
    cursor: pointer;
    border: none;
    background: none;
    transition: color 200ms ease;
}

.password-toggle:hover {
    color: #6b7280;
}

.password-toggle svg {
    width: 100%;
    height: 100%;
}

.form-error {
    font-size: 0.875rem;
    color: #ef4444;
    margin-top: 0.25rem;
}

.form-error--general {
    text-align: center;
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.5rem;
    margin-top: 1rem;
}

/* =========================
   CHECKBOX STYLING
   ========================= */
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
}

.checkbox-input {
    display: none;
}

.checkbox-custom {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid #d1d5db;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms ease;
    flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
    background: #3b82f6;
    border-color: #3b82f6;
}

.checkbox-input:checked + .checkbox-custom::after {
    content: '✓';
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
}

.checkbox-text {
    font-size: 0.875rem;
    color: #374151;
}

/* =========================
   SUBMIT BUTTON
   ========================= */
.submit-btn {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 200ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.submit-btn--loading {
    cursor: wait;
}

.loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* =========================
   CARD FOOTER
   ========================= */
.card-footer {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
    text-align: center;
}

.footer-text {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
}

.footer-link {
    color: #3b82f6;
    font-weight: 500;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    transition: color 200ms ease;
}

.footer-link:hover {
    color: #1d4ed8;
}

/* =========================
   QUOTE SECTION
   ========================= */
.auth-quote {
    text-align: center;
    margin-top: 2rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.quote-text {
    font-size: 1rem;
    font-style: italic;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    margin-bottom: 0.5rem;
}

.quote-author {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
}

/* =========================
   RESPONSIVE DESIGN
   ========================= */
@media (max-width: 480px) {
    .auth-container {
        padding: 0.5rem;
    }

    .auth-card {
        padding: 1.5rem;
    }

    .brand-title {
        font-size: 1.75rem;
    }

    .auth-header {
        margin-bottom: 1.5rem;
    }

    .auth-quote {
        margin-top: 1.5rem;
        padding: 1rem;
    }
}
</style>
