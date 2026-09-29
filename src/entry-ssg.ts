// SSG Prerender 入口
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { Tooltip } from 'primevue'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'

import App from './App.vue'
import router from './router'

export async function render(): Promise<string> {
    const app = createSSRApp(App)

    app.use(createPinia())
    app.use(PrimeVue, { theme: { preset: Aura } })
    app.directive('tooltip', Tooltip)
    app.use(ToastService)
    app.use(router)

    // 预渲染首页
    await router.push('/')
    await router.isReady()

    return renderToString(app)
}
