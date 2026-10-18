import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import { useSettingsStore } from '@/stores/settings'
import { DARK_CLASS, THEME_STORAGE_KEY } from '@/utils/theme'

/** 构造可控的 matchMedia 实现，并挂到全局 */
function stubMatchMedia(initial = false) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    let matches = initial

    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
            get matches() {
                return matches
            },
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
                listeners.add(listener),
            removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
                listeners.delete(listener),
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }))
    )

    return {
        change(next: boolean) {
            matches = next
            for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
        },
    }
}

function isDarkApplied(): boolean {
    return document.documentElement.classList.contains(DARK_CLASS)
}

beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('style')
    setActivePinia(createPinia())
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('stores/settings 主题', () => {
    it('默认跟随系统，未存储偏好', () => {
        const store = useSettingsStore()

        expect(store.themeMode).toBe('system')
        expect(store.isDark).toBe(false)
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })

    it('切到深色 / 浅色时同步页面并持久化', () => {
        const store = useSettingsStore()

        store.setThemeMode('dark')
        expect(store.isDark).toBe(true)
        expect(isDarkApplied()).toBe(true)
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

        store.setThemeMode('light')
        expect(store.isDark).toBe(false)
        expect(isDarkApplied()).toBe(false)
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })

    it('恢复历史偏好', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark')

        const store = useSettingsStore()

        expect(store.themeMode).toBe('dark')
        expect(store.isDark).toBe(true)
        expect(isDarkApplied()).toBe(true)
    })

    it('跟随系统时响应系统配色变化', async () => {
        const media = stubMatchMedia(false)
        const store = useSettingsStore()
        expect(store.isDark).toBe(false)

        media.change(true)
        await nextTick()

        expect(store.systemPrefersDark).toBe(true)
        expect(store.isDark).toBe(true)
        expect(isDarkApplied()).toBe(true)
    })

    it('手动指定时忽略系统配色变化', async () => {
        const media = stubMatchMedia(false)
        const store = useSettingsStore()
        store.setThemeMode('light')

        media.change(true)
        await nextTick()

        expect(store.systemPrefersDark).toBe(true)
        expect(store.isDark).toBe(false)
        expect(isDarkApplied()).toBe(false)
    })

    it('非法偏好不会写入', () => {
        const store = useSettingsStore()

        store.setThemeMode('blue' as never)

        expect(store.themeMode).toBe('system')
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })
})
