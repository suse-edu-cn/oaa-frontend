import { describe, expect, it } from 'vitest'

import { resolveRedirect } from '@/utils/redirect'

describe('utils/redirect', () => {
    it('接受站内绝对路径（含查询串）', () => {
        const target = '/user/oauth?client_id=a&redirect_uri=https%3A%2F%2Foj&state=xyz'
        expect(resolveRedirect(target)).toBe(target)
    })

    it('拒绝外部地址与协议相对地址', () => {
        for (const value of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '']) {
            expect(resolveRedirect(value)).toBe('')
        }
    })

    it('拒绝回跳到登录页本身', () => {
        expect(resolveRedirect('/auth')).toBe('')
        expect(resolveRedirect('/auth?redirect=/user')).toBe('')
    })

    it('拒绝非字符串 / 超长 / 含控制字符的值', () => {
        expect(resolveRedirect(undefined)).toBe('')
        expect(resolveRedirect(['/user'])).toBe('')
        expect(resolveRedirect('/' + 'a'.repeat(513))).toBe('')
        expect(resolveRedirect('/user\noauth')).toBe('')
    })
})
