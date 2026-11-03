import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import Cookies from 'js-cookie'

vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { authGuard } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import request, { configureRequestAuth } from '@/utils/request'
import setToast from '@/utils/setToast'
import { setAuthCookies } from '../helpers/auth'
import { deferred } from '../helpers/deferred'
import { makeUser } from '../helpers/factories'
import { useMsw } from '../helpers/msw'
import { server } from '../mocks/server'

const routerPush = vi.fn()
const toastMock = vi.mocked(setToast)

useMsw()

beforeEach(() => {
    setActivePinia(createPinia())
    setAuthCookies({ token: 'old-token', refreshToken: 'old-refresh' })
    routerPush.mockReset()
    toastMock.mockReset()
    configureRequestAuth({
        getCurrentRoute: () => ({ path: '/user', meta: {}, matched: [{ meta: {} }] }),
        redirectToAuth: () => routerPush('/auth'),
        notify: (summary, detail) => toastMock('error', summary, detail),
    })
})

describe('登录态竞态场景', () => {
    it('旧请求刷新失败不会把刚登录的会话踢回登录页', async () => {
        const gate = deferred<void>()
        let refreshCalls = 0
        server.use(
            http.get('*/v2/user/me', () => HttpResponse.json({ code: 401, message: 'expired', data: null })),
            http.post('*/v2/auth/refresh', async () => {
                refreshCalls += 1
                await gate.promise
                return HttpResponse.json({ code: 401, message: 'refresh expired', data: null })
            })
        )
        const store = useAuthStore()
        store.hydrate()

        const pending = request({ url: '/user/me' })
        await vi.waitFor(() => expect(refreshCalls).toBe(1))

        // 刷新还在路上，用户已经登录成功
        store.beginLogin({ token: 'new-token', refreshToken: 'new-refresh' })
        gate.resolve(undefined)
        await pending

        expect(store.token).toBe('new-token')
        expect(Cookies.get('token')).toBe('new-token')
        expect(routerPush).not.toHaveBeenCalled()

        // 登录后进入普通受保护页应正常放行
        await expect(authGuard({ meta: {} })).resolves.toBe(true)
    })

    it('用户信息加载失败后等级页不会永久 403，下次导航自愈', async () => {
        let meCalls = 0
        server.use(
            http.get('*/v2/user/me', () => {
                meCalls += 1
                if (meCalls === 1) {
                    return HttpResponse.json({ code: 500, message: '服务异常', data: null }, { status: 500 })
                }
                return HttpResponse.json({ code: 200, message: 'ok', data: makeUser({ role_level: 80 }) })
            })
        )
        const store = useAuthStore()

        await initAuthStore()

        // 第一次初始化失败：会话保留，但没有用户信息
        expect(store.token).toBe('old-token')
        expect(store.userInfo).toBeNull()
        expect(store.isReady).toBe(true)

        // 守卫发现用户信息缺失会补加载，而不是按 0 级跳 403
        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe(true)
        expect(store.userInfo?.role_level).toBe(80)
        expect(meCalls).toBe(2)
        expect(toastMock).not.toHaveBeenCalledWith('warn', '无访问权限', expect.any(String))
    })

    it('补加载时登录态失效则跳转登录页，而不是 403', async () => {
        server.use(
            http.get('*/v2/user/me', () => HttpResponse.json({ code: 401, message: '登录已失效', data: null })),
            http.post('*/v2/auth/refresh', () =>
                HttpResponse.json({ code: 401, message: 'refresh expired', data: null })
            )
        )
        const store = useAuthStore()
        store.hydrate()
        store.markReady()

        await expect(authGuard({ meta: { level: 50 } })).resolves.toBe('/auth')

        expect(store.token).toBe('')
        expect(routerPush).toHaveBeenCalledWith('/auth')
    })
})
