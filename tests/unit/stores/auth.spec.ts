import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import Cookies from 'js-cookie'

import { useAuthStore } from '@/stores/auth'
import { setAuthCookies } from '../../helpers/auth'
import { makeUser } from '../../helpers/factories'

beforeEach(() => {
    setActivePinia(createPinia())
})

describe('stores/auth', () => {
    it('hydrate 从 cookie 恢复 token，但不代表用户信息已加载', () => {
        setAuthCookies({ token: 'access', refreshToken: 'refresh' })
        const store = useAuthStore()

        store.hydrate()

        expect(store.token).toBe('access')
        expect(store.refreshToken).toBe('refresh')
        expect(store.hasSession).toBe(true)
        expect(store.isAuthed).toBe(false)
    })

    it('hydrate 遇到同一 token 时保留已有用户信息', () => {
        setAuthCookies({ token: 'access', refreshToken: 'refresh' })
        const store = useAuthStore()
        store.hydrate()
        store.setUserInfo(makeUser({ user_id: 1 }))

        store.hydrate()

        expect(store.userInfo?.user_id).toBe(1)
        expect(store.isAuthed).toBe(true)
    })

    it('hydrate 发现 token 变化时清空旧用户信息', () => {
        setAuthCookies({ token: 'old-token', refreshToken: 'old-refresh' })
        const store = useAuthStore()
        store.hydrate()
        store.setUserInfo(makeUser({ user_id: 1 }))

        setAuthCookies({ token: 'new-token', refreshToken: 'new-refresh' })
        store.hydrate()

        expect(store.token).toBe('new-token')
        expect(store.userInfo).toBeNull()
        expect(store.isAuthed).toBe(false)
    })

    it('beginLogin 清空旧用户信息并写入新 token', () => {
        setAuthCookies({ token: 'old-token', refreshToken: 'old-refresh' })
        const store = useAuthStore()
        store.hydrate()
        store.setUserInfo(makeUser({ user_id: 1 }))

        store.beginLogin({ token: 'new-token', refreshToken: 'new-refresh' })

        expect(store.token).toBe('new-token')
        expect(store.refreshToken).toBe('new-refresh')
        expect(store.userInfo).toBeNull()
        expect(store.isAuthed).toBe(false)
        expect(Cookies.get('token')).toBe('new-token')
        expect(Cookies.get('refresh_token')).toBe('new-refresh')
    })

    it('applyTokens 同时更新内存与 cookie', () => {
        const store = useAuthStore()

        store.applyTokens({ token: 'access', refreshToken: 'refresh' })

        expect(store.token).toBe('access')
        expect(store.refreshToken).toBe('refresh')
        expect(Cookies.get('token')).toBe('access')
        expect(Cookies.get('refresh_token')).toBe('refresh')
    })

    it('setUserInfo 写入用户信息与 user_id cookie，并提供 isAuthed', () => {
        const store = useAuthStore()
        store.applyTokens({ token: 'access', refreshToken: 'refresh' })

        store.setUserInfo(makeUser({ user_id: 9 }))

        expect(store.userInfo?.user_id).toBe(9)
        expect(store.isAuthed).toBe(true)
        expect(Cookies.get('user_id')).toBe('9')
    })

    it('setUserInfo(null) 只清空用户信息，不写 user_id', () => {
        const store = useAuthStore()
        store.applyTokens({ token: 'access', refreshToken: 'refresh' })

        store.setUserInfo(null)

        expect(store.userInfo).toBeNull()
        expect(store.isAuthed).toBe(false)
        expect(Cookies.get('user_id')).toBeUndefined()
    })

    it('clearSession 清空内存与全部 cookie', () => {
        const store = useAuthStore()
        store.applyTokens({ token: 'access', refreshToken: 'refresh' })
        store.setUserInfo(makeUser())
        store.markReady()

        store.clearSession()

        expect(store.token).toBe('')
        expect(store.refreshToken).toBe('')
        expect(store.userInfo).toBeNull()
        expect(store.hasSession).toBe(false)
        expect(store.isAuthed).toBe(false)
        expect(Cookies.get('token')).toBeUndefined()
        expect(Cookies.get('refresh_token')).toBeUndefined()
        expect(Cookies.get('user_id')).toBeUndefined()
    })
})
