import { describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/auth', () => ({
    login: vi.fn(),
    register: vi.fn(),
    sendVerificationCode: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
}))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import AuthChangePass from '@/components/AuthChangePass.vue'
import AuthLogin from '@/components/AuthLogin.vue'
import AuthResetPass from '@/components/AuthResetPass.vue'

import { mountWithPrimeVue } from '../helpers/mount'

// AuthLogin 会 useRouter，装上内存路由避免注入告警
function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: { template: '<div />' } }],
    })
}

function mountAuth(component: Parameters<typeof mountWithPrimeVue>[0]) {
    return mountWithPrimeVue(component, {
        global: { plugins: [createPinia(), makeRouter()] },
    })
}

/** 每个 label 的 for 都必须指向当前组件里真实存在的控件 */
function expectLabelsResolve(wrapper: ReturnType<typeof mountAuth>, expected: number) {
    const labels = wrapper.findAll('label[for]')
    expect(labels).toHaveLength(expected)

    for (const label of labels) {
        const id = label.attributes('for')!
        expect(wrapper.find(`[id="${id}"]`).exists(), `label for="${id}" 缺少对应控件`).toBe(true)
    }
}

describe('认证表单的可访问性', () => {
    it('登录表单的 label 都指向存在的控件', () => {
        expectLabelsResolve(mountAuth(AuthLogin), 3)
    })

    it('重置密码表单的 label 都指向存在的控件', () => {
        expectLabelsResolve(mountAuth(AuthResetPass), 4)
    })

    it('修改密码表单的 label 都指向存在的控件', () => {
        expectLabelsResolve(mountAuth(AuthChangePass), 3)
    })
})
