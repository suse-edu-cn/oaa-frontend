import { expect, test } from '@playwright/test'

test('首页可访问', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle('青蟹')
    await expect(page.getByRole('link', { name: '青蟹', exact: true })).toBeVisible()
    await expect(page.getByText('欢迎加入四川轻化工大学开放原子开源协会')).toBeVisible()
})
