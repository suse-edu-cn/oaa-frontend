import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }))

vi.mock('@/utils/setToast', () => ({ default: toast }))

import { SW_URL, UPDATE_CHECK_INTERVAL, registerServiceWorker } from '@/utils/pwa'

type Listener = (event: Event) => void

/** 构造可控的 navigator.serviceWorker 并挂载 */
function stubServiceWorker({ controlled = false } = {}) {
    const listeners = new Map<string, Set<Listener>>()
    const update = vi.fn(() => Promise.resolve() as Promise<never>)
    const registration = { update } as unknown as ServiceWorkerRegistration

    const container = {
        controller: controlled ? ({} as ServiceWorker) : null,
        register: vi.fn(() => Promise.resolve(registration)),
        addEventListener(type: string, listener: Listener) {
            const set = listeners.get(type) ?? new Set<Listener>()
            set.add(listener)
            listeners.set(type, set)
        },
        /** 模拟浏览器派发 SW 事件 */
        emit(type: string) {
            for (const listener of listeners.get(type) ?? []) listener(new Event(type))
        },
    }

    Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true })

    return { container, update }
}

/** 等待 promise 链完成 */
function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
    vi.useRealTimers()
})

afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    Reflect.deleteProperty(document, 'visibilityState')
})

describe('utils/pwa', () => {
    it('环境不支持 Service Worker 时直接返回', () => {
        expect('serviceWorker' in navigator).toBe(false)
        expect(() => registerServiceWorker()).not.toThrow()
    })

    it('页面 load 之后才注册，注册后立即检查一次更新', async () => {
        const { container, update } = stubServiceWorker()

        registerServiceWorker()
        expect(container.register).not.toHaveBeenCalled()

        window.dispatchEvent(new Event('load'))
        await flushPromises()

        expect(container.register).toHaveBeenCalledWith(SW_URL, { scope: '/' })
        expect(update).toHaveBeenCalledTimes(1)
    })

    it('按固定间隔检查更新', async () => {
        vi.useFakeTimers()
        const { update } = stubServiceWorker()

        registerServiceWorker()
        window.dispatchEvent(new Event('load'))
        await vi.advanceTimersByTimeAsync(0)
        expect(update).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL)
        expect(update).toHaveBeenCalledTimes(2)

        await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL)
        expect(update).toHaveBeenCalledTimes(3)
    })

    it('回到前台时检查更新，停留在后台时不检查', async () => {
        const { update } = stubServiceWorker()

        registerServiceWorker()
        window.dispatchEvent(new Event('load'))
        await flushPromises()
        expect(update).toHaveBeenCalledTimes(1)

        document.dispatchEvent(new Event('visibilitychange'))
        expect(update).toHaveBeenCalledTimes(2)

        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
        document.dispatchEvent(new Event('visibilitychange'))
        expect(update).toHaveBeenCalledTimes(2)
    })

    it('检查更新失败时忽略，后续检查照常进行', async () => {
        vi.useFakeTimers()
        const { update } = stubServiceWorker()
        update.mockRejectedValueOnce(new Error('offline'))

        registerServiceWorker()
        window.dispatchEvent(new Event('load'))
        await vi.advanceTimersByTimeAsync(0)
        expect(update).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL)
        expect(update).toHaveBeenCalledTimes(2)
    })

    it('注册失败时不抛异常', async () => {
        const { container } = stubServiceWorker()
        container.register.mockRejectedValueOnce(new Error('insecure context'))

        registerServiceWorker()

        expect(() => window.dispatchEvent(new Event('load'))).not.toThrow()
        await flushPromises()
    })

    it('新版本接管时提示刷新，且只提示一次', () => {
        const { container } = stubServiceWorker({ controlled: true })

        registerServiceWorker()

        container.emit('controllerchange')
        expect(toast).toHaveBeenCalledTimes(1)
        expect(toast).toHaveBeenCalledWith('info', '发现新版本', '刷新页面后即可使用新版本')

        container.emit('controllerchange')
        expect(toast).toHaveBeenCalledTimes(1)
    })

    it('首次安装（页面原本不受 SW 控制）不提示刷新', () => {
        const { container } = stubServiceWorker({ controlled: false })

        registerServiceWorker()
        container.emit('controllerchange')

        expect(toast).not.toHaveBeenCalled()
    })
})
