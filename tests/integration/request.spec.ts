import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import Cookies from 'js-cookie'

const routerPush = vi.hoisted(() => vi.fn())
vi.mock('@/router', () => ({
    default: { currentRoute: { value: { path: '/user' } }, push: routerPush },
}))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { useAuthStore } from '@/stores/auth'
import request from '@/utils/request'
import setToast from '@/utils/setToast'
import type { ApiResponse } from '@/types'
import { setAuthCookies } from '../helpers/auth'
import { deferred } from '../helpers/deferred'
import { makeUser } from '../helpers/factories'
import { makeJwtWithExp } from '../helpers/jwt'
import { useMsw } from '../helpers/msw'
import { server } from '../mocks/server'

const toastMock = vi.mocked(setToast)

useMsw()

beforeEach(() => {
    setActivePinia(createPinia())
    setAuthCookies({ token: 'old-token', refreshToken: 'old-refresh', userId: '1' })
})

function authStoreWithToken(token = 'old-token') {
    const store = useAuthStore()
    store.token = token
    store.refreshToken = 'old-refresh'
    store.userInfo = makeUser({ user_id: 1 })
    return store
}

function ok(data: unknown) {
    return HttpResponse.json({ code: 200, message: 'ok', data })
}

describe('utils/request', () => {
    it('200 返回 data', async () => {
        server.use(http.get('*/v2/user/me', () => ok({ user_id: 1 })))

        const resp = await request<ApiResponse<{ user_id: number }>>({ url: '/user/me' })

        expect(resp).toEqual({ code: 200, message: 'ok', data: { user_id: 1 } })
    })

    it('HTTP 错误时返回后端响应体，不抛出异常', async () => {
        server.use(
            http.get('*/v2/user/me', () =>
                HttpResponse.json({ code: 500, message: '服务异常', data: null }, { status: 500 })
            )
        )

        const resp = await request<ApiResponse<null>>({ url: '/user/me' })

        expect(resp).toEqual({ code: 500, message: '服务异常', data: null })
    })

    it('网络错误返回 undefined', async () => {
        server.use(http.get('*/v2/user/me', () => HttpResponse.error()))

        await expect(request({ url: '/user/me' })).resolves.toBeUndefined()
    })

    it('使用 store 中的 token', async () => {
        let authorization = ''
        server.use(
            http.get('*/v2/user/me', ({ request: req }) => {
                authorization = req.headers.get('Authorization') ?? ''
                return ok({})
            })
        )
        authStoreWithToken('store-token')

        await request({ url: '/user/me' })

        expect(authorization).toBe('Bearer store-token')
    })

    it('显式传入的 token 优先于 store', async () => {
        let authorization = ''
        server.use(
            http.get('*/v2/user/me', ({ request: req }) => {
                authorization = req.headers.get('Authorization') ?? ''
                return ok({})
            })
        )
        authStoreWithToken('store-token')

        await request({ url: '/user/me', token: 'explicit-token' })

        expect(authorization).toBe('Bearer explicit-token')
    })

    it('token 已过期时先刷新再用新 token 请求', async () => {
        const freshToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600)
        let refreshCalls = 0
        let authorization = ''
        server.use(
            http.post('*/v2/auth/refresh', () => {
                refreshCalls += 1
                return ok({ token: freshToken, refresh_token: 'new-refresh' })
            }),
            http.get('*/v2/user/me', ({ request: req }) => {
                authorization = req.headers.get('Authorization') ?? ''
                return ok({})
            })
        )
        const store = authStoreWithToken(makeJwtWithExp(Math.floor(Date.now() / 1000) - 60))

        await request({ url: '/user/me' })

        expect(refreshCalls).toBe(1)
        expect(authorization).toBe(`Bearer ${freshToken}`)
        expect(store.token).toBe(freshToken)
        expect(Cookies.get('token')).toBe(freshToken)
    })

    it('业务 401 时刷新并重试一次', async () => {
        const freshToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600)
        let meCalls = 0
        let refreshCalls = 0
        server.use(
            http.get('*/v2/user/me', () => {
                meCalls += 1
                if (meCalls === 1) {
                    return HttpResponse.json({ code: 401, message: 'expired', data: null })
                }
                return ok({ user_id: 1 })
            }),
            http.post('*/v2/auth/refresh', () => {
                refreshCalls += 1
                return ok({ token: freshToken, refresh_token: 'new-refresh' })
            })
        )
        const store = authStoreWithToken()

        const resp = await request<ApiResponse<{ user_id: number }>>({ url: '/user/me' })

        expect(resp?.code).toBe(200)
        expect(meCalls).toBe(2)
        expect(refreshCalls).toBe(1)
        expect(store.token).toBe(freshToken)
    })

    it('HTTP 401 时同样刷新并重试一次', async () => {
        const freshToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600)
        let meCalls = 0
        let refreshCalls = 0
        server.use(
            http.get('*/v2/user/me', () => {
                meCalls += 1
                if (meCalls === 1) {
                    return HttpResponse.json({ code: 401, message: 'expired', data: null }, { status: 401 })
                }
                return ok({ user_id: 1 })
            }),
            http.post('*/v2/auth/refresh', () => {
                refreshCalls += 1
                return ok({ token: freshToken, refresh_token: 'new-refresh' })
            })
        )
        authStoreWithToken()

        const resp = await request<ApiResponse<{ user_id: number }>>({ url: '/user/me' })

        expect(resp?.code).toBe(200)
        expect(meCalls).toBe(2)
        expect(refreshCalls).toBe(1)
    })

    it('重试后仍是 401 不再递归刷新', async () => {
        const freshToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600)
        let meCalls = 0
        let refreshCalls = 0
        server.use(
            http.get('*/v2/user/me', () => {
                meCalls += 1
                return HttpResponse.json({ code: 401, message: 'expired', data: null })
            }),
            http.post('*/v2/auth/refresh', () => {
                refreshCalls += 1
                return ok({ token: freshToken, refresh_token: 'new-refresh' })
            })
        )
        authStoreWithToken()

        const resp = await request<ApiResponse<null>>({ url: '/user/me' })

        expect(resp?.code).toBe(401)
        expect(meCalls).toBe(2)
        expect(refreshCalls).toBe(1)
    })

    it('缺少 refresh_token 时不发起刷新，直接清理登录态', async () => {
        Cookies.remove('refresh_token', { path: '/' })
        Cookies.remove('user_id', { path: '/' })
        let refreshCalls = 0
        server.use(
            http.get('*/v2/user/me', () => HttpResponse.json({ code: 401, message: 'expired', data: null })),
            http.post('*/v2/auth/refresh', () => {
                refreshCalls += 1
                return ok({ token: 'new', refresh_token: 'new-refresh' })
            })
        )
        const store = useAuthStore()
        store.token = 'old-token'
        store.refreshToken = ''
        store.userInfo = null

        const resp = await request<ApiResponse<null>>({ url: '/user/me' })

        expect(resp?.code).toBe(401)
        expect(refreshCalls).toBe(0)
        expect(store.token).toBe('')
        expect(routerPush).toHaveBeenCalledWith('/auth')
    })

    it('并发 401 共享同一次刷新', async () => {
        const freshToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600)
        const responsesGate = deferred<void>()
        const refreshGate = deferred<void>()
        let meCalls = 0
        let refreshCalls = 0
        server.use(
            http.get('*/v2/user/me', async () => {
                meCalls += 1
                if (meCalls <= 2) {
                    await responsesGate.promise
                    return HttpResponse.json({ code: 401, message: 'expired', data: null })
                }
                return ok({ user_id: 1 })
            }),
            http.post('*/v2/auth/refresh', async () => {
                refreshCalls += 1
                await refreshGate.promise
                return ok({ token: freshToken, refresh_token: 'new-refresh' })
            })
        )
        authStoreWithToken()

        const first = request<ApiResponse<{ user_id: number }>>({ url: '/user/me' })
        const second = request<ApiResponse<{ user_id: number }>>({ url: '/user/me' })
        await vi.waitFor(() => expect(meCalls).toBe(2))

        responsesGate.resolve(undefined)
        await vi.waitFor(() => expect(refreshCalls).toBe(1))
        refreshGate.resolve(undefined)

        const [firstResp, secondResp] = await Promise.all([first, second])

        expect(firstResp?.code).toBe(200)
        expect(secondResp?.code).toBe(200)
        expect(refreshCalls).toBe(1)
    })

    it('刷新业务失败时清理登录态并跳转', async () => {
        let meCalls = 0
        server.use(
            http.get('*/v2/user/me', () => {
                meCalls += 1
                return HttpResponse.json({ code: 401, message: 'expired', data: null })
            }),
            http.post('*/v2/auth/refresh', () =>
                HttpResponse.json({ code: 401, message: 'refresh expired', data: null })
            )
        )
        const store = authStoreWithToken()

        const resp = await request<ApiResponse<null>>({ url: '/user/me' })

        expect(resp?.code).toBe(401)
        expect(meCalls).toBe(1)
        expect(Cookies.get('token')).toBeUndefined()
        expect(Cookies.get('refresh_token')).toBeUndefined()
        expect(Cookies.get('user_id')).toBeUndefined()
        expect(store.token).toBe('')
        expect(store.refreshToken).toBe('')
        expect(store.isAuthed).toBe(false)
        expect(store.userInfo).toBeNull()
        expect(toastMock).toHaveBeenCalledWith('error', '登录已过期', '请重新登录')
        expect(routerPush).toHaveBeenCalledTimes(1)
        expect(routerPush).toHaveBeenCalledWith('/auth')
    })

    it('刷新网络失败时同样清理登录态', async () => {
        server.use(
            http.get('*/v2/user/me', () => HttpResponse.json({ code: 401, message: 'expired', data: null })),
            http.post('*/v2/auth/refresh', () => HttpResponse.error())
        )
        const store = authStoreWithToken()

        const resp = await request<ApiResponse<null>>({ url: '/user/me' })

        expect(resp?.code).toBe(401)
        expect(Cookies.get('token')).toBeUndefined()
        expect(store.token).toBe('')
        expect(toastMock).toHaveBeenCalledWith('error', '登录已过期', '请重新登录')
    })

    it('/auth/* 的 401 不触发刷新', async () => {
        let refreshCalls = 0
        server.use(
            http.post('*/v2/auth/login', () => HttpResponse.json({ code: 401, message: '账号或密码错误', data: null })),
            http.post('*/v2/auth/refresh', () => {
                refreshCalls += 1
                return ok({ token: 'new', refresh_token: 'new-refresh' })
            })
        )

        const resp = await request<ApiResponse<null>>({
            url: '/auth/login',
            method: 'POST',
            data: { account: 'tester', password: 'wrong' },
        })

        expect(resp?.code).toBe(401)
        expect(refreshCalls).toBe(0)
    })
})
