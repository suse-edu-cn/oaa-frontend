import cookies from 'js-cookie'

/**
 * 登录态 cookie 的唯一读写入口
 *
 * 组件、store、请求层都不要直接操作 cookie，避免 cookie 选项在各处漂移。
 */

const COOKIE_OPTIONS = {
    expires: 20,
    secure: true,
    sameSite: 'Lax',
    path: '/',
} as const

const SESSION_COOKIE_NAMES = ['token', 'refresh_token', 'user_id'] as const

export interface SessionSnapshot {
    token: string
    refreshToken: string
    userId: string
}

const EMPTY_SESSION: SessionSnapshot = {
    token: '',
    refreshToken: '',
    userId: '',
}

// SSG 环境没有 document，读写 cookie 一律返回空 / 不执行
function canUseCookies(): boolean {
    return typeof document !== 'undefined'
}

export function readSession(): SessionSnapshot {
    if (!canUseCookies()) return { ...EMPTY_SESSION }

    return {
        token: cookies.get('token') ?? '',
        refreshToken: cookies.get('refresh_token') ?? '',
        userId: cookies.get('user_id') ?? '',
    }
}

export function saveTokens(tokens: { token: string; refreshToken: string }): void {
    if (!canUseCookies()) return

    cookies.set('token', tokens.token, COOKIE_OPTIONS)
    cookies.set('refresh_token', tokens.refreshToken, COOKIE_OPTIONS)
}

export function saveUserId(userId: number | string): void {
    if (!canUseCookies()) return

    cookies.set('user_id', String(userId), COOKIE_OPTIONS)
}

export function clearSessionCookies(): void {
    if (!canUseCookies()) return

    for (const name of SESSION_COOKIE_NAMES) {
        cookies.remove(name, { path: '/' })
    }
}
