import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/initAuthStore', () => ({ initAuthStore: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { authGuard } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import setToast from '@/utils/setToast'
import { setAuthCookies } from '../helpers/auth'
import { makeUser } from '../helpers/factories'

const initMock = vi.mocked(initAuthStore)
const toastMock = vi.mocked(setToast)

beforeEach(() => {
    setActivePinia(createPinia())
    initMock.mockReset()
    toastMock.mockReset()
})

describe('router/guard', () => {
    it('未登录访问受保护页时跳转登录页', async () => {
        await expect(authGuard({ meta: {} })).resolves.toBe('/auth')

        expect(toastMock).toHaveBeenCalledWith('error', '未登录', '请先登录以访问该页面')
    })

    it('未登录也可以访问公开页', async () => {
        await expect(authGuard({ meta: { requiresAuth: false } })).resolves.toBe(true)

        expect(toastMock).not.toHaveBeenCalled()
        expect(initMock).not.toHaveBeenCalled()
    })

    it('已登录访问公开页直接放行', async () => {
        setAuthCookies()

        await expect(authGuard({ meta: { requiresAuth: false } })).resolves.toBe(true)
    })

    it('等级不足时跳转 403', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = makeUser({ role_level: 20 })

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe('/403')

        expect(toastMock).toHaveBeenCalledWith('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
    })

    it('等级足够时放行', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = makeUser({ role_level: 80 })

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe(true)

        expect(initMock).not.toHaveBeenCalled()
    })

    it('store 未就绪时先完成初始化再判断等级', async () => {
        setAuthCookies()
        initMock.mockImplementation(async () => {
            useAuthStore().setUserInfo(makeUser({ role_level: 80 }))
        })

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe(true)

        expect(initMock).toHaveBeenCalledTimes(1)
    })

    it('初始化期间登录态失效时跳转登录页而不是 403', async () => {
        setAuthCookies()
        initMock.mockImplementation(async () => {
            // 模拟刷新 token 失败
            const current = useAuthStore()
            current.clearSession()
            current.markReady()
        })

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe('/auth')

        expect(toastMock).not.toHaveBeenCalled()
    })

    it('无等级要求的页面不触发用户信息初始化', async () => {
        setAuthCookies()

        await expect(authGuard({ meta: {} })).resolves.toBe(true)

        expect(initMock).not.toHaveBeenCalled()
    })

    it('登录检查先于等级检查', async () => {
        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe('/auth')
    })

    it('用户信息缺失时先补加载，再按真实等级判断', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = null
        initMock.mockImplementation(async () => {
            useAuthStore().setUserInfo(makeUser({ role_level: 80 }))
        })

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe(true)

        expect(initMock).toHaveBeenCalledTimes(1)
        expect(useAuthStore().userInfo?.role_level).toBe(80)
    })

    it('补加载后仍拿不到用户信息时放行，而不是按 0 级跳 403', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = null

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe(true)

        expect(initMock).toHaveBeenCalledTimes(1)
        expect(toastMock).not.toHaveBeenCalled()
    })

    it('等级达标但不是面试官时跳转 403', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = makeUser({ role_level: 20, is_interviewer: false })

        await expect(authGuard({ meta: { level: 20, requiresInterviewer: true } })).resolves.toBe('/403')

        expect(toastMock).toHaveBeenCalledWith('warn', '无访问权限', '仅面试官可访问该页面')
    })

    it('面试官且等级达标时放行', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = makeUser({ role_level: 20, is_interviewer: true })

        await expect(authGuard({ meta: { level: 20, requiresInterviewer: true } })).resolves.toBe(true)

        expect(toastMock).not.toHaveBeenCalled()
    })

    it('等级达到 80 时非面试官也可访问审核页', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = makeUser({ role_level: 80, is_interviewer: false })

        await expect(authGuard({ meta: { level: 20, requiresInterviewer: true } })).resolves.toBe(true)

        expect(toastMock).not.toHaveBeenCalled()
    })

    it('面试官等级不足时仍按等级跳转 403', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = makeUser({ role_level: 20, is_interviewer: true })

        await expect(authGuard({ meta: { level: 50, requiresInterviewer: true } })).resolves.toBe('/403')

        expect(toastMock).toHaveBeenCalledWith('warn', '无访问权限', '你当前的权限等级不足以访问该页面')
    })

    it('拿不到用户信息时不放行面试官页面', async () => {
        setAuthCookies()
        const store = useAuthStore()
        store.token = 'token'
        store.markReady()
        store.userInfo = null

        await expect(authGuard({ meta: { level: 20, requiresInterviewer: true } })).resolves.toBe('/403')

        expect(initMock).toHaveBeenCalledTimes(1)
        expect(toastMock).toHaveBeenCalledWith('warn', '无访问权限', '仅面试官可访问该页面')
    })
})
