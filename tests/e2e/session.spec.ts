import { expect, makeUser, test } from './fixtures'

test.describe('会话续期', () => {
    test('token 已过期时先刷新再加载页面', async ({ page, api, signIn }) => {
        api.scenario = { user: makeUser({ username: 'refresh-user' }), refresh: 'success' }
        await signIn({ expiresInSeconds: -60 })

        await page.goto('/user')

        await expect(page).toHaveURL(/\/user$/)
        await expect(page.locator('header .user')).toContainText('refresh-user')
        expect(api.count('POST', '/auth/refresh')).toBe(1)
        expect(api.count('GET', '/user/me')).toBe(1)
    })

    test('401 时刷新 token 并重试请求', async ({ page, api, signIn }) => {
        api.scenario = {
            user: makeUser({ username: 'retry-user' }),
            userMeUnauthorized: 1,
            refresh: 'success',
        }
        await signIn()

        await page.goto('/user')

        await expect(page).toHaveURL(/\/user$/)
        await expect(page.locator('header .user')).toContainText('retry-user')
        expect(api.count('POST', '/auth/refresh')).toBe(1)
        // 第一次 401，重试后成功
        expect(api.count('GET', '/user/me')).toBe(2)
    })

    test('刷新失败时清理登录态并跳转登录页', async ({ page, api, signIn }) => {
        api.scenario = { user: makeUser(), userMeUnauthorized: true, refresh: 'fail' }
        await signIn()

        await page.goto('/user')

        await expect(page).toHaveURL(/\/auth$/)
        await expect(page.getByRole('heading', { name: '欢迎使用青蟹' })).toBeVisible()
        expect(api.count('POST', '/auth/refresh')).toBe(1)

        const token = (await page.context().cookies()).find((cookie) => cookie.name === 'token')
        expect(token).toBeUndefined()
    })
})
