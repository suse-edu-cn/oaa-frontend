import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/oauth', () => ({ getOAuthClientPublic: vi.fn() }))
vi.mock('@/utils/initAuthStore', () => ({ initAuthStore: vi.fn().mockResolvedValue(undefined) }))

import { getOAuthClientPublic } from '@/api/oauth'
import { useAuthStore } from '@/stores/auth'
import OAuthView from '@/views/user/oauth.vue'
import { setAuthCookies } from '../helpers/auth'
import { makeUser } from '../helpers/factories'
import { primevueStubs } from '../helpers/primevueStubs'
import type { OAuthClientPublic, OAuthClientScope } from '@/types'

const oauthMock = vi.mocked(getOAuthClientPublic)

const scopes: OAuthClientScope[] = [
    { key: 'openid', title: '基础身份标识', description: '允许验证您的账号身份与唯一用户标识（ID）' },
    { key: 'profile', title: '个人公开档案', description: '允许读取您的真实姓名、学号等公开资料' },
    { key: 'email', title: '电子邮箱地址', description: '允许获取您绑定的电子邮箱' },
]

const client: OAuthClientPublic = {
    client_id: 'hydro_oj',
    client_name: 'OJ 平台',
    scopes,
}

function ok(data: OAuthClientPublic) {
    return { code: 200, message: 'ok', data }
}

function fail(code: number, message: string) {
    return { code, message, data: null as never }
}

async function mountView(query: string) {
    const pinia = createPinia()
    setActivePinia(pinia)
    // 预置登录态与用户信息，避免依赖真实的 /user/me
    setAuthCookies()
    const authStore = useAuthStore()
    authStore.hydrate()
    authStore.setUserInfo(makeUser({ username: 'tester', email: 'tester@example.com' }))
    authStore.markReady()

    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/user/oauth', component: OAuthView }],
    })
    await router.push(`/user/oauth${query}`)
    await router.isReady()

    const wrapper = mount(OAuthView, {
        global: { plugins: [pinia, router], stubs: primevueStubs },
    })
    await flushPromises()
    return wrapper
}

function buttonByText(wrapper: Awaited<ReturnType<typeof mountView>>, label: string) {
    return wrapper.findAll('button').find((button) => button.text() === label)
}

describe('views/user/oauth 授权确认页', () => {
    beforeEach(() => {
        oauthMock.mockReset()
    })

    it('展示应用名称、当前账号与本次 scope 内的权限', async () => {
        oauthMock.mockResolvedValue(ok(client))

        const wrapper = await mountView(
            `?client_id=hydro_oj&scope=${encodeURIComponent('openid email')}` +
                '&redirect_uri=https%3A%2F%2Foj.suseoaa.com%2Fcallback&state=xyz123'
        )

        expect(oauthMock).toHaveBeenCalledWith('hydro_oj')
        expect(wrapper.text()).toContain('OJ 平台')
        expect(wrapper.text()).toContain('tester')
        expect(wrapper.text()).toContain('该应用申请获得以下 2 项权限')
        expect(wrapper.text()).toContain('基础身份标识')
        expect(wrapper.text()).toContain('电子邮箱地址')
        expect(wrapper.text()).not.toContain('个人公开档案')
        expect(buttonByText(wrapper, '同意并授权')?.attributes('disabled')).toBeUndefined()
    })

    it('兼容用 + 编码空格的 scope', async () => {
        oauthMock.mockResolvedValue(ok(client))

        const wrapper = await mountView('?client_id=hydro_oj&scope=openid+profile')

        expect(wrapper.text()).toContain('该应用申请获得以下 2 项权限')
        expect(wrapper.text()).toContain('个人公开档案')
        expect(wrapper.text()).not.toContain('电子邮箱地址')
    })

    it('scope 缺省时展示应用声明的全部权限', async () => {
        oauthMock.mockResolvedValue(ok(client))

        const wrapper = await mountView('?client_id=hydro_oj')

        expect(wrapper.text()).toContain('该应用申请获得以下 3 项权限')
        expect(wrapper.text()).toContain('基础身份标识')
        expect(wrapper.text()).toContain('个人公开档案')
        expect(wrapper.text()).toContain('电子邮箱地址')
    })

    it('提示请求了但应用未声明的权限', async () => {
        oauthMock.mockResolvedValue(ok(client))

        const wrapper = await mountView('?client_id=hydro_oj&scope=openid phone')

        expect(wrapper.text()).toContain('该应用申请获得以下 1 项权限')
        expect(wrapper.text()).toContain('未在应用资料中声明的权限：phone')
    })

    it('请求的权限全部未声明时不显示“未申请任何权限”', async () => {
        oauthMock.mockResolvedValue(ok(client))

        const wrapper = await mountView('?client_id=hydro_oj&scope=phone')

        expect(wrapper.text()).toContain('该应用申请的权限均未在应用资料中声明')
        expect(wrapper.text()).not.toContain('该应用未申请任何权限')
        expect(wrapper.text()).toContain('未在应用资料中声明的权限：phone')
    })

    it('显式传入空 scope 时不展示应用声明的全部权限', async () => {
        oauthMock.mockResolvedValue(ok(client))

        const wrapper = await mountView('?client_id=hydro_oj&scope=')

        expect(wrapper.text()).toContain('该应用未申请任何权限')
        expect(wrapper.text()).not.toContain('基础身份标识')
    })

    it('缺少 client_id 时直接给出错误且不请求接口', async () => {
        const wrapper = await mountView('?scope=openid')

        expect(oauthMock).not.toHaveBeenCalled()
        expect(wrapper.get('[role="alert"]').text()).toContain('缺少应用 id')
        expect(buttonByText(wrapper, '重试')).toBeUndefined()
    })

    it('加载失败时展示后端信息，重试成功后渲染权限', async () => {
        oauthMock.mockResolvedValueOnce(fail(404, '应用不存在')).mockResolvedValueOnce(ok(client))

        const wrapper = await mountView('?client_id=hydro_oj&scope=openid')

        expect(wrapper.get('[role="alert"]').text()).toContain('应用不存在')

        await buttonByText(wrapper, '重试')!.trigger('click')
        await flushPromises()

        expect(oauthMock).toHaveBeenCalledTimes(2)
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('该应用申请获得以下 1 项权限')
        expect(wrapper.text()).toContain('基础身份标识')
    })
})
