import { expect, makeApplication, makeTerm, makeUser, test } from './fixtures'

test.describe('站内跳转后的滚动位置', () => {
    test('从已滚动到底部的页面跳转后回到顶部', async ({ page, api, signIn }) => {
        api.scenario = {
            user: makeUser(),
            terms: [makeTerm()],
            applications: Array.from({ length: 6 }, (_, index) => makeApplication({ id: index + 1 })),
        }
        await signIn()

        // 压低 viewport，保证两个页面都必然可滚动
        await page.setViewportSize({ width: 1280, height: 300 })

        await page.goto('/apply')
        await expect(page.getByRole('heading', { name: '我的申请' })).toBeVisible()

        // 滚动容器是 .e-view，不是 window
        const view = page.locator('.e-view')
        const scrolled = await view.evaluate((el) => {
            el.scrollTop = el.scrollHeight
            return el.scrollTop
        })
        expect(scrolled).toBeGreaterThan(0)

        // 站内跳转应该是 SPA 路由
        await page.getByRole('button', { name: '添加新申请' }).click()
        await expect(page).toHaveURL(/\/apply\/new$/)
        await expect(page.getByRole('heading', { name: '添加新申请' })).toBeVisible()

        expect(await view.evaluate((el) => el.scrollTop)).toBe(0)
    })
})
