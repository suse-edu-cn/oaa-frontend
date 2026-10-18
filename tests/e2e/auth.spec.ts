import { expect, makeUser, test } from './fixtures'

test.describe('登录与登出', () => {
    test('登录成功进入个人中心，登出后无法访问受保护页', async ({ page, api }) => {
        const user = makeUser({ username: '青蟹测试员', name: '测试用户', role_level: 30 })
        api.scenario = { user, login: 'success', announcements: [] }

        await page.goto('/auth')
        await expect(page.getByRole('heading', { name: '欢迎使用青蟹' })).toBeVisible()

        // 登录 / 重置密码共用面板，需限定在登录 Tab 内
        const loginPanel = page.getByRole('tabpanel', { name: '登录' })
        await loginPanel.locator('input[name="account"]').fill('tester')
        await loginPanel.locator('input[name="password"]').fill('correct-password')
        await loginPanel.locator('input[name="isAccepted"]').check({ force: true })
        await expect(loginPanel.locator('input[name="isAccepted"]')).toBeChecked()

        await loginPanel.getByRole('button', { name: '登录' }).click()

        // 登录后
        await expect(page).toHaveURL(/\/user$/)
        await expect(page.locator('header .user')).toContainText('青蟹测试员')

        await page.locator('header .user').click()
        await page.getByRole('menuitem', { name: '登出' }).click()

        await expect(page).toHaveURL(/\/auth$/)
        await expect(page.getByText('已登出')).toBeVisible()

        // 登出后
        await page.goto('/user')
        await expect(page).toHaveURL(/\/auth$/)
        await expect(page.getByText('请先登录以访问该页面')).toBeVisible()
    })
})
