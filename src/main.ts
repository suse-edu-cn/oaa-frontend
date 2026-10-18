import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import { initAuthStore } from '@/utils/initAuthStore'
import { useSettingsStore } from '@/stores/settings'

import PrimeVue from 'primevue/config'
import { Tooltip } from 'primevue'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'

import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            // 由 html.p-dark 控制深色，便于在跟随系统之外支持手动切换
            darkModeSelector: '.p-dark',
        },
    },
})
app.directive('tooltip', Tooltip)
app.use(ToastService)

useSettingsStore(pinia)
initAuthStore()

app.mount('#app')
