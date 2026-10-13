import { createPinia } from 'pinia'
import { mount, type MountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'

import { primevueStubs } from './primevueStubs'

/**
 * 统一挂载入口
 * 使用真实 Pinia + PrimeVue 的轻量 stub
 */
export function mountWithPrimeVue<Props>(component: Component, options: MountingOptions<Props> = {}) {
    return mount(component, {
        ...options,
        global: {
            plugins: [createPinia()],
            stubs: primevueStubs,
            ...options.global,
        },
    })
}
