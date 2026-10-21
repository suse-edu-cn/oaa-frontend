import { clearSessionCookies, saveTokens } from '@/utils/session'

export function setAuthCookies(values: { token?: string; refreshToken?: string } = {}): void {
    const { token = 'token', refreshToken = 'refresh_token' } = values

    saveTokens({ token, refreshToken })
}

export function clearAuthCookies(): void {
    clearSessionCookies()
}
