import { describe, expect, it } from 'vitest'

import { fromDate, toDate } from '@/utils/date'

describe('utils/date', () => {
    it('fromDate 对空值返回空串', () => {
        expect(fromDate(null)).toBe('')
    })

    it('fromDate 按本地时区补零', () => {
        expect(fromDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    })

    it('toDate 返回本地零点', () => {
        const date = toDate('2026-01-05')
        expect(date).not.toBeNull()
        expect(date?.getHours()).toBe(0)
    })
})
