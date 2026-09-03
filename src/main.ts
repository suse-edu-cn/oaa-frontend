import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import { initAuthStore } from '@/utils/initAuthStore'

import PrimeVue from 'primevue/config'
import { Tooltip } from 'primevue'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import 'primeicons/primeicons.css'

import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: Aura,
    },
})
app.directive('tooltip', Tooltip)
app.use(ToastService)
initAuthStore()

app.mount('#app')
