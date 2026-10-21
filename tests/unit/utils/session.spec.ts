import { beforeEach, describe, expect, it, vi } from 'vitest'
import Cookies from 'js-cookie'

import { clearSessionCookies, readSession, saveTokens } from '@/utils/session'
import { clearAuthCookies } from '../../helpers/auth'

beforeEach(() => {
    clearAuthCookies()
})

describe('utils/session', () => {
    it('没有 cookie 时返回空会话', () => {
        expect(readSession()).toEqual({ token: '', refreshToken: '' })
    })

    it('保存后可读取 token / refresh_token', () => {
        saveTokens({ token: 'access', refreshToken: 'refresh' })

        expect(readSession()).toEqual({ token: 'access', refreshToken: 'refresh' })
        expect(Cookies.get('token')).toBe('access')
        expect(Cookies.get('refresh_token')).toBe('refresh')
    })

    it('清理会删除全部登录态 cookie', () => {
        saveTokens({ token: 'access', refreshToken: 'refresh' })

        clearSessionCookies()

        expect(readSession()).toEqual({ token: '', refreshToken: '' })
        expect(Cookies.get('token')).toBeUndefined()
        expect(Cookies.get('refresh_token')).toBeUndefined()
    })

    it('SSR 没有 document 时不读写 cookie', () => {
        vi.stubGlobal('document', undefined)
        try {
            saveTokens({ token: 'access', refreshToken: 'refresh' })

            expect(readSession()).toEqual({ token: '', refreshToken: '' })
            expect(() => clearSessionCookies()).not.toThrow()
        } finally {
            vi.unstubAllGlobals()
        }
    })
})
