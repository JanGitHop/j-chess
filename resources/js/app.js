import '../css/app.css'

import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { createPinia } from "pinia"
import { useThemeStore } from '@/Stores/themeStore'

const appName = import.meta.env.VITE_APP_NAME || 'J-Chess'
const pinia = createPinia()

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        const app = createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(pinia)

        // Theme Store global initialisieren
        const themeStore = useThemeStore()
        themeStore.initialize()

        return app.mount(el)
    },
    progress: {
        color: '#4F46E5',
    },
})
