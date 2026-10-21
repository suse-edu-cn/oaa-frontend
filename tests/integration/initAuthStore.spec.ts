import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import Cookies from 'js-cookie'

vi.mock('@/api/user', () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { initAuthStore } from '@/utils/initAuthStore'
import type { ApiResponse, UserInfo } from '@/types'
import { setAuthCookies } from '../helpers/auth'
import { deferred } from '../helpers/deferred'
import { makeUser } from '../helpers/factories'

const getCurrentUserMock = vi.mocked(getCurrentUser)

beforeEach(() => {
    setActivePinia(createPinia())
    getCurrentUserMock.mockReset()
})

describe('utils/initAuthStore', () => {
    it('没有 token 时不请求用户信息', async () => {
        const store = useAuthStore()

        await initAuthStore()

        expect(getCurrentUserMock).not.toHaveBeenCalled()
        expect(store.isReady).toBe(true)
        expect(store.isAuthed).toBe(false)
    })

    it('有 token 时写入用户信息', async () => {
        setAuthCookies({ token: 'token', refreshToken: 'refresh' })
        getCurrentUserMock.mockResolvedValue({
            code: 200,
            message: 'ok',
            data: makeUser({ user_id: 7 }),
        })
        const store = useAuthStore()

        await initAuthStore()

        expect(store.token).toBe('token')
        expect(store.refreshToken).toBe('refresh')
        expect(store.userInfo?.user_id).toBe(7)
        expect(store.isAuthed).toBe(true)
        expect(store.isReady).toBe(true)
    })

    it('后端字段缺失时使用默认头像与职位', async () => {
        setAuthCookies()
        const user = { ...makeUser(), avatar: undefined, department: undefined } as unknown as UserInfo
        getCurrentUserMock.mockResolvedValue({ code: 200, message: 'ok', data: user })
        const store = useAuthStore()

        await initAuthStore()

        expect(store.userInfo?.avatar).toEqual({ uri: '', url: '' })
        expect(store.userInfo?.department).toBe('未设置职位')
    })

    it('后端明确拒绝时清空 token', async () => {
        setAuthCookies({ token: 'token' })
        getCurrentUserMock.mockResolvedValue({
            code: 500,
            message: 'bad',
            data: null,
        } as unknown as ApiResponse<UserInfo>)
        const store = useAuthStore()

        await initAuthStore()

        expect(Cookies.get('token')).toBeUndefined()
        expect(store.token).toBe('')
        expect(store.isReady).toBe(true)
        expect(store.isAuthed).toBe(false)
    })

    it('网络失败时保留 token，等待下次重试', async () => {
        setAuthCookies({ token: 'token' })
        getCurrentUserMock.mockResolvedValue(undefined)
        const store = useAuthStore()

        await initAuthStore()

        expect(Cookies.get('token')).toBe('token')
        expect(store.token).toBe('token')
        expect(store.isReady).toBe(true)
        expect(store.isAuthed).toBe(false)
    })

    it('并发调用共享同一次请求', async () => {
        setAuthCookies({ token: 'token' })
        const gate = deferred<ApiResponse<UserInfo>>()
        getCurrentUserMock.mockReturnValue(gate.promise)
        const store = useAuthStore()

        const first = initAuthStore()
        const second = initAuthStore()
        expect(getCurrentUserMock).toHaveBeenCalledTimes(1)

        gate.resolve({ code: 200, message: 'ok', data: makeUser() })
        await Promise.all([first, second])

        expect(store.isReady).toBe(true)
        expect(store.userInfo?.user_id).toBe(1)
    })

    it('token 变化时先清空旧用户信息，再加载新用户', async () => {
        setAuthCookies({ token: 'old-token' })
        const store = useAuthStore()
        store.hydrate()
        store.setUserInfo(makeUser({ user_id: 1 }))

        setAuthCookies({ token: 'new-token' })
        const gate = deferred<ApiResponse<UserInfo>>()
        getCurrentUserMock.mockReturnValue(gate.promise)

        const init = initAuthStore()

        expect(store.token).toBe('new-token')
        expect(store.userInfo).toBeNull()
        expect(store.isAuthed).toBe(false)

        gate.resolve({ code: 200, message: 'ok', data: makeUser({ user_id: 2 }) })
        await init

        expect(store.userInfo?.user_id).toBe(2)
        expect(store.isAuthed).toBe(true)
    })

    it('旧初始化响应不会覆盖新 token 的用户信息', async () => {
        setAuthCookies({ token: 'old-token' })
        const oldGate = deferred<ApiResponse<UserInfo>>()
        const newGate = deferred<ApiResponse<UserInfo>>()
        let calls = 0
        getCurrentUserMock.mockImplementation(() => {
            calls += 1
            return calls === 1 ? oldGate.promise : newGate.promise
        })
        const store = useAuthStore()

        const first = initAuthStore()
        expect(getCurrentUserMock).toHaveBeenCalledTimes(1)

        // 登录态切换到新用户，并开始新初始化
        setAuthCookies({ token: 'new-token' })
        store.beginLogin({ token: 'new-token', refreshToken: 'new-refresh' })
        const second = initAuthStore()
        expect(getCurrentUserMock).toHaveBeenCalledTimes(2)

        newGate.resolve({ code: 200, message: 'ok', data: makeUser({ user_id: 2 }) })
        await second
        expect(store.userInfo?.user_id).toBe(2)

        // 旧请求晚到，不能把新用户覆盖回旧用户
        oldGate.resolve({ code: 200, message: 'ok', data: makeUser({ user_id: 1 }) })
        await first

        expect(store.token).toBe('new-token')
        expect(store.userInfo?.user_id).toBe(2)
    })

    it('初始化期间刷新 token 时保留当前用户信息', async () => {
        setAuthCookies({ token: 'old-token' })
        const gate = deferred<ApiResponse<UserInfo>>()
        getCurrentUserMock.mockReturnValue(gate.promise)
        const store = useAuthStore()
        store.hydrate()
        store.setUserInfo(makeUser({ user_id: 1 }))

        const init = initAuthStore()
        // 模拟请求层在同一用户上刷新 token
        store.applyTokens({ token: 'new-token', refreshToken: 'new-refresh' })
        gate.resolve({ code: 200, message: 'ok', data: makeUser({ user_id: 1 }) })
        await init

        expect(store.token).toBe('new-token')
        expect(store.userInfo?.user_id).toBe(1)
        expect(store.isReady).toBe(true)
    })

    it('请求抛异常时仍然标记为已就绪', async () => {
        setAuthCookies({ token: 'token' })
        getCurrentUserMock.mockRejectedValue(new Error('network down'))
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const store = useAuthStore()

        await initAuthStore()

        expect(warn).toHaveBeenCalled()
        expect(store.token).toBe('token')
        expect(store.isReady).toBe(true)
    })
})
