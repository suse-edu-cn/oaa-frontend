import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
    DARK_CLASS,
    THEME_STORAGE_KEY,
    applyTheme,
    isThemeMode,
    normalizeThemeMode,
    prefersDarkScheme,
    readStoredThemeMode,
    resolveIsDark,
    storeThemeMode,
    watchSystemTheme,
} from '@/utils/theme'

/** 构造可控的 matchMedia 实现，并挂到全局 */
function stubMatchMedia(initial = false) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    let matches = initial

    const query = {
        get matches() {
            return matches
        },
        media: '(prefers-color-scheme: dark)',
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
        /** 模拟系统配色变化 */
        change(next: boolean) {
            matches = next
            for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
        },
        get listenerCount() {
            return listeners.size
        },
    }
}

function findThemeColorMeta(): HTMLMetaElement {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) throw new Error('theme-color meta 不存在')
    return meta as HTMLMetaElement
}

beforeEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('style')

    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', '#ffffff')
    document.head.appendChild(meta)

    localStorage.clear()
})

afterEach(() => {
    vi.unstubAllGlobals()
    document.querySelector('meta[name="theme-color"]')?.remove()
})

describe('utils/theme', () => {
    describe('isThemeMode / normalizeThemeMode', () => {
        it('识别三种合法 theme', () => {
            expect(isThemeMode('system')).toBe(true)
            expect(isThemeMode('light')).toBe(true)
            expect(isThemeMode('dark')).toBe(true)
        })

        it('拒绝非法值', () => {
            expect(isThemeMode('auto')).toBe(false)
            expect(isThemeMode(null)).toBe(false)
            expect(isThemeMode(undefined)).toBe(false)
        })

        it('非法值回落为跟随系统', () => {
            expect(normalizeThemeMode('')).toBe('system')
            expect(normalizeThemeMode('blue')).toBe('system')
            expect(normalizeThemeMode('dark')).toBe('dark')
        })
    })

    describe('resolveIsDark', () => {
        it('手动指定优先于系统偏好', () => {
            expect(resolveIsDark('light', true)).toBe(false)
            expect(resolveIsDark('dark', false)).toBe(true)
        })

        it('跟随系统时取系统偏好', () => {
            expect(resolveIsDark('system', true)).toBe(true)
            expect(resolveIsDark('system', false)).toBe(false)
        })
    })

    describe('prefersDarkScheme', () => {
        it('环境不支持 matchMedia 时视为浅色', () => {
            expect(prefersDarkScheme()).toBe(false)
        })

        it('读取系统偏好', () => {
            const media = stubMatchMedia(true)
            expect(prefersDarkScheme()).toBe(true)

            media.change(false)
            expect(prefersDarkScheme()).toBe(false)
        })
    })

    describe('偏好持久化', () => {
        it('未存储时默认跟随系统', () => {
            expect(readStoredThemeMode()).toBe('system')
        })

        it('存储后可读回', () => {
            storeThemeMode('dark')
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
            expect(readStoredThemeMode()).toBe('dark')
        })

        it('存储值非法时回落为跟随系统', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'blue')
            expect(readStoredThemeMode()).toBe('system')
        })

        it('localStorage 写入失败不抛异常', () => {
            const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('quota exceeded')
            })

            expect(() => storeThemeMode('dark')).not.toThrow()
            setItem.mockRestore()
        })

        it('localStorage 读取失败时回落为跟随系统', () => {
            const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('blocked')
            })

            expect(readStoredThemeMode()).toBe('system')
            getItem.mockRestore()
        })
    })

    describe('applyTheme', () => {
        it('深色时写入 class、color-scheme 与主题色', () => {
            applyTheme(true)

            expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true)
            expect(document.documentElement.style.colorScheme).toBe('dark')
            expect(findThemeColorMeta().content).toBe('#09090b')
        })

        it('浅色时移除 class', () => {
            applyTheme(true)
            applyTheme(false)

            expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false)
            expect(document.documentElement.style.colorScheme).toBe('light')
            expect(findThemeColorMeta().content).toBe('#ffffff')
        })

        it('缺少 theme-color meta 时不报错', () => {
            findThemeColorMeta().remove()

            expect(() => applyTheme(true)).not.toThrow()
        })
    })

    describe('watchSystemTheme', () => {
        it('系统配色变化时回调，并在取消订阅后停止', () => {
            const media = stubMatchMedia(false)
            const handler = vi.fn()
            const unwatch = watchSystemTheme(handler)

            media.change(true)
            expect(handler).toHaveBeenCalledWith(true)

            unwatch()
            expect(media.listenerCount).toBe(0)
            media.change(false)
            expect(handler).toHaveBeenCalledTimes(1)
        })

        it('环境不支持 matchMedia 时返回空函数', () => {
            const unwatch = watchSystemTheme(vi.fn())
            expect(() => unwatch()).not.toThrow()
        })
    })
})
