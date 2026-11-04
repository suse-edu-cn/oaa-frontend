import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import { initAuthStore } from '@/utils/initAuthStore'
import { registerServiceWorker } from '@/utils/pwa'
import { configureRequestAuth } from '@/utils/request'
import setToast from '@/utils/setToast'
import { useSettingsStore } from '@/stores/settings'

import PrimeVue from 'primevue/config'
import { Tooltip } from 'primevue'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'

import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// 请求层不直接依赖 router，由入口注入跳转与提示，避免模块循环
configureRequestAuth({
    getCurrentRoute: () => router.currentRoute.value,
    redirectToAuth: () => {
        void router.push('/auth')
    },
    notify: (summary, detail) => setToast('error', summary, detail),
})

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

if (import.meta.env.PROD) registerServiceWorker()

app.mount('#app')

console.log(
    `%coaa-frontend%cv${__BUILD_INFO__.version}`,
    'background-color: #10b981; color: #fff; padding: 5px 9px; margin: 4px 0; border-radius: 4px 0 0 4px; font-size: 14px; font-family: "JetBrains Mono", monospace;',
    'background-color: #607d8b; color: #fff; padding: 5px 9px; margin: 4px 0; border-radius: 0 4px 4px 0; font-size: 14px; font-family: "JetBrains Mono", monospace;'
)
console.log('人心中每个微小的改变，都足以在一生的尺度上产生巨浪。')
