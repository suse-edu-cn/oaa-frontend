/*
 * 深浅色主题状态与页面同步
 *
 * PrimeVue 的深色变量由 `darkModeSelector` 决定作用范围，本项目选用 `html.p-dark`，
 * 这样既能跟随系统，也能让用户在设置页强制指定浅色 / 深色。此模块负责：
 * 读写偏好、推导最终是否深色、把结果同步到 document，以及监听系统配色变化。
 */

export type ThemeMode = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'e-theme-mode'
export const DARK_CLASS = 'p-dark'
const THEME_COLOR = {
    light: '#ffffff',
    dark: '#09090b',
} as const
export const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
    { label: '跟随系统', value: 'system' },
    { label: '浅色', value: 'light' },
    { label: '深色', value: 'dark' },
]

export function isThemeMode(value: unknown): value is ThemeMode {
    return value === 'system' || value === 'light' || value === 'dark'
}

/** 非法或缺失的偏好一律回落到跟随系统 */
export function normalizeThemeMode(value: unknown): ThemeMode {
    return isThemeMode(value) ? value : 'system'
}

/** 结合系统偏好得出最终是否使用深色 */
export function resolveIsDark(mode: ThemeMode, prefersDark: boolean): boolean {
    if (mode === 'dark') return true
    if (mode === 'light') return false
    return prefersDark
}

/** 读取系统深色偏好，SSR 或环境不支持 matchMedia 时视为浅色 */
export function prefersDarkScheme(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function readStoredThemeMode(): ThemeMode {
    if (typeof window === 'undefined') return 'system'
    try {
        return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
        // 隐私模式等场景下 localStorage 不可写，退回默认值即可
        return 'system'
    }
}

export function storeThemeMode(mode: ThemeMode): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
        // 无法持久化时本次会话内仍然生效
    }
}

/** 把主题写到页面上：class 供 PrimeVue 与自定义样式使用，color-scheme 供原生控件使用 */
export function applyTheme(isDark: boolean): void {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    root.classList.toggle(DARK_CLASS, isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', isDark ? THEME_COLOR.dark : THEME_COLOR.light)
}

/** 订阅系统配色变化，返回取消订阅函数 */
export function watchSystemTheme(handler: (prefersDark: boolean) => void): () => void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent) => handler(event.matches)
    query.addEventListener('change', listener)

    return () => query.removeEventListener('change', listener)
}
