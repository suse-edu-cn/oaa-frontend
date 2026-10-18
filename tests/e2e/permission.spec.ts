import { expect, makeUser, test } from './fixtures'

test.describe('路由权限等级', () => {
    test('等级不足时访问组织管理跳转 403 并提示', async ({ page, api, signIn }) => {
        api.scenario = { user: makeUser({ role_level: 20 }) }
        await signIn()

        await page.goto('/manage/org')

        await expect(page).toHaveURL(/\/403$/)
        await expect(page.getByRole('heading', { name: '无访问权限' })).toBeVisible()
        await expect(page.locator('.p-toast-detail')).toHaveText('你当前的权限等级不足以访问该页面')
        await expect(page.getByRole('heading', { name: '组织管理' })).toHaveCount(0)
    })

    test('等级足够时可以进入组织管理', async ({ page, api, signIn }) => {
        api.scenario = { user: makeUser({ role_level: 80 }) }
        await signIn()

        await page.goto('/manage/org')

        await expect(page).toHaveURL(/\/manage\/org$/)
        await expect(page.getByRole('heading', { name: '组织管理' })).toBeVisible()
        await expect(page.getByText('项目实践部').first()).toBeVisible()
    })
})
