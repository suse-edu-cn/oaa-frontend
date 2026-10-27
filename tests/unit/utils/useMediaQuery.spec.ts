import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'

import { useMediaQuery } from '@/utils/useMediaQuery'

/** 构造可控的 matchMedia 实现，记录监听器的挂载与移除 */
function stubMatchMedia(initial: boolean) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    let matches = initial

    const query = {
        get matches() {
            return matches
        },
        media: '(max-width: 800px)',
        onchange: null,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
            listeners.delete(listener),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }

    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => query)
    )

    return {
        query,
        change(next: boolean) {
            matches = next
            for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
        },
        get listenerCount() {
            return listeners.size
        },
    }
}

/** 挂载一个只输出媒体查询结果的组件 */
function mountQuery() {
    return mount(
        defineComponent({
            setup() {
                const matches = useMediaQuery('(max-width: 800px)')
                return { matches }
            },
            template: '<div>{{ matches }}</div>',
        })
    )
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('utils/useMediaQuery', () => {
    it('挂载时读取当前匹配结果', () => {
        stubMatchMedia(true)
        expect(mountQuery().text()).toBe('true')

        stubMatchMedia(false)
        expect(mountQuery().text()).toBe('false')
    })

    it('媒体查询变化时同步更新，卸载后移除监听', async () => {
        const media = stubMatchMedia(false)
        const wrapper = mountQuery()
        expect(wrapper.text()).toBe('false')
        expect(media.listenerCount).toBe(1)

        media.change(true)
        await nextTick()
        expect(wrapper.text()).toBe('true')

        wrapper.unmount()
        expect(media.listenerCount).toBe(0)
    })

    it('环境不支持 matchMedia 时保持 false 且不报错', () => {
        vi.stubGlobal('matchMedia', undefined)
        expect(mountQuery().text()).toBe('false')
    })
})
