import { describe, expect, it } from 'vitest'

import { fromDate, fromIso, toDate } from '@/utils/date'

describe('utils/date', () => {
    it('测试时区固定为 Asia/Shanghai', () => {
        expect(new Date(2026, 0, 5).getTimezoneOffset()).toBe(-480)
    })

    describe('fromDate', () => {
        it('空值返回空串', () => {
            expect(fromDate(null)).toBe('')
        })

        it('月和日补零', () => {
            expect(fromDate(new Date(2026, 0, 5))).toBe('2026-01-05')
        })

        it('年末日期不跨日', () => {
            expect(fromDate(new Date(2026, 11, 31))).toBe('2026-12-31')
        })
    })

    describe('toDate', () => {
        it('空值返回 null', () => {
            expect(toDate('')).toBeNull()
            expect(toDate(undefined)).toBeNull()
            expect(toDate(null)).toBeNull()
        })

        it('解析为本地零点', () => {
            const date = toDate('2026-01-05')
            expect(date).not.toBeNull()
            expect(date?.getHours()).toBe(0)
            expect(date?.getMinutes()).toBe(0)
        })

        it('与 fromDate 往返一致', () => {
            expect(fromDate(toDate('2026-01-05'))).toBe('2026-01-05')
        })
    })

    describe('fromIso', () => {
        it('空串返回空串', () => {
            expect(fromIso('')).toBe('')
        })

        it('非法时间返回空串', () => {
            expect(fromIso('not-a-date')).toBe('')
        })

        it('带时区偏移的时间转换为本地时间', () => {
            expect(fromIso('2026-01-05T12:34:56+08:00')).toBe('2026-01-05 12:34')
        })

        it('UTC 时间转换为本地时间', () => {
            expect(fromIso('2026-01-05T00:00:00Z')).toBe('2026-01-05 08:00')
        })
    })
})
