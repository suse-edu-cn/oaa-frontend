import { clearSessionCookies, saveTokens, saveUserId } from '@/utils/session'

export function setAuthCookies(values: { token?: string; refreshToken?: string; userId?: string } = {}): void {
    const { token = 'token', refreshToken = 'refresh_token', userId = '1' } = values

    saveTokens({ token, refreshToken })
    saveUserId(userId)
}

export function clearAuthCookies(): void {
    clearSessionCookies()
}
