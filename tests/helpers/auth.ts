import Cookies from 'js-cookie'

const COOKIE_NAMES = ['token', 'refresh_token', 'user_id'] as const

export function setAuthCookies(values: { token?: string; refreshToken?: string; userId?: string } = {}): void {
    const { token = 'token', refreshToken = 'refresh_token', userId = '1' } = values
    const options = { expires: 20, secure: true, sameSite: 'Lax' as const, path: '/' }

    Cookies.set('token', token, options)
    Cookies.set('refresh_token', refreshToken, options)
    Cookies.set('user_id', userId, options)
}

export function clearAuthCookies(): void {
    for (const name of COOKIE_NAMES) {
        Cookies.remove(name, { path: '/' })
    }
}
