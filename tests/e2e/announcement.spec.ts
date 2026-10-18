import { expect, makeAnnouncement, makeUser, test } from './fixtures'

test.describe('公告', () => {
    test('从列表进入详情，渲染 Markdown 正文与 OSS 图片', async ({ page, api, signIn }) => {
        const announcement = makeAnnouncement()
        api.scenario = {
            user: makeUser(),
            announcements: [announcement],
            announcement,
        }
        await signIn()

        await page.goto('/announcement/list')
        await expect(page.getByRole('heading', { name: '公告列表' })).toBeVisible()

        await page.getByRole('link', { name: announcement.title, exact: true }).click()

        await expect(page).toHaveURL(new RegExp(`/announcement/${announcement.announcement_id}$`))
        await expect(page).toHaveTitle(announcement.title + ' - 公告详情 - 青蟹')
        await expect(page.getByRole('heading', { name: announcement.title })).toBeVisible()
        await expect(page.getByText('发布于 2026-09-01 10:00')).toBeVisible()

        // Markdown 正文渲染
        await expect(page.getByRole('heading', { name: '招新安排' })).toBeVisible()
        await expect(page.getByText('报名截止')).toBeVisible()

        // OSS 图片地址保持可解析
        await expect(page.locator('img[alt="海报"]')).toHaveAttribute('src', 'https://obj.suseoaa.com/oaa/poster.png')
    })
})
