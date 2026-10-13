import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ToastModule = typeof import('@/utils/setToast')

let toast: ToastModule

beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(0)
    toast = await import('@/utils/setToast')
})

afterEach(() => {
    vi.useRealTimers()
})

describe('utils/setToast', () => {
    it('未初始化时只警告，不抛异常', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        expect(() => toast.default('error', '标题')).not.toThrow()
        expect(warn).toHaveBeenCalled()
    })

    it('初始化后按统一结构弹出', () => {
        const add = vi.fn()
        toast.initToast({ add })

        toast.default('error', '登录失败', '账号或密码错误')

        expect(add).toHaveBeenCalledWith({
            severity: 'error',
            summary: '登录失败',
            detail: '账号或密码错误',
            life: 4500,
        })
    })

    it('2s 内相同内容只弹一次', () => {
        const add = vi.fn()
        toast.initToast({ add })

        toast.default('error', '标题', '详情')
        vi.advanceTimersByTime(1000)
        toast.default('error', '标题', '详情')

        expect(add).toHaveBeenCalledTimes(1)
    })

    it('内容或级别不同则分别弹出', () => {
        const add = vi.fn()
        toast.initToast({ add })

        toast.default('error', '标题', '详情')
        toast.default('warn', '标题', '详情')
        toast.default('error', '标题', '另一个详情')

        expect(add).toHaveBeenCalledTimes(3)
    })

    it('超过 2s 可再次弹出相同内容', () => {
        const add = vi.fn()
        toast.initToast({ add })

        toast.default('error', '标题', '详情')
        vi.advanceTimersByTime(2001)
        toast.default('error', '标题', '详情')

        expect(add).toHaveBeenCalledTimes(2)
    })
})
