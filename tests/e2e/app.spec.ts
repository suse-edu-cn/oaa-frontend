import { expect, makeApp, makeUser, test } from './fixtures'

test.describe('应用管理', () => {
    const app = makeApp()

    test.beforeEach(async ({ api, signIn }) => {
        api.scenario = { user: makeUser({ role_level: 80 }), apps: [app] }
        await signIn()
    })

    test('展示应用列表并可查看详情', async ({ page, api }) => {
        await page.goto('/manage/app')

        await expect(page.getByRole('heading', { name: '应用管理' })).toBeVisible()
        await expect(page.getByRole('textbox', { name: '搜索应用' })).toBeVisible()
        await expect(page.getByRole('combobox', { name: '按状态筛选' })).toBeVisible()
        await expect(page.getByRole('button', { name: app.name, exact: true })).toBeVisible()
        await expect(page.getByText(app.client_id, { exact: true })).toBeVisible()
        await expect(page.getByText(app.scope)).toBeVisible()

        await page.getByRole('button', { name: app.name, exact: true }).click()

        const dialog = page.getByRole('dialog', { name: '应用详情' })
        await expect(dialog).toBeVisible()
        await expect(dialog).toContainText(app.redirect_uris)
        await expect(dialog).toContainText(app.mask_secret)
        await expect(dialog).toContainText('2026-11-09 21:22')
        await expect.poll(() => api.count('GET', '/app/detail')).toBe(1)
    })

    test('创建应用后展示一次性 client_secret', async ({ page, api }) => {
        await page.goto('/manage/app')
        await page.getByRole('button', { name: '新建应用' }).click()

        const createDialog = page.getByRole('dialog', { name: '新建应用' })
        await createDialog.getByLabel('client_id').fill('suse_cli')
        await createDialog.getByLabel('应用名称').fill('命令行工具')
        await createDialog.getByLabel('回调地址').fill('https://cli.suseoaa.com/callback')
        await createDialog.getByLabel('授权范围').fill('openid   email')
        await createDialog.getByRole('button', { name: '创建' }).click()

        const secretDialog = page.getByRole('dialog', { name: '应用创建成功' })
        await expect(secretDialog).toBeVisible()
        await expect(secretDialog).toContainText('oaa_sec_test_secret')
        await expect(secretDialog).toContainText('仅在创建时显示一次')
        await expect
            .poll(() => api.lastBody('POST', '/app/create'))
            .toEqual({
                client_id: 'suse_cli',
                name: '命令行工具',
                redirect_uris: 'https://cli.suseoaa.com/callback',
                scope: 'openid email',
            })

        await secretDialog.getByRole('button', { name: '我已保存，关闭' }).click()
        await expect(page.getByRole('button', { name: '命令行工具', exact: true })).toBeVisible()
        await expect(page.getByText('suse_cli', { exact: true })).toBeVisible()
    })

    test('编辑应用并保存启用状态', async ({ page, api }) => {
        await page.goto('/manage/app')
        await page.getByRole('button', { name: '编辑应用' }).click()

        const dialog = page.getByRole('dialog', { name: '编辑应用' })
        await expect(dialog.getByLabel('client_id')).toBeDisabled()
        await dialog.getByLabel('应用名称').fill('OJ 平台 2')
        await dialog.getByLabel('回调地址').fill('https://oj2.suseoaa.com')
        await dialog.getByRole('button', { name: '保存' }).click()

        await expect
            .poll(() => api.lastBody('POST', '/app/update'))
            .toEqual({
                client_id: app.client_id,
                name: 'OJ 平台 2',
                redirect_uris: 'https://oj2.suseoaa.com',
                scope: app.scope,
                is_active: true,
            })
        await expect(page.getByRole('button', { name: 'OJ 平台 2', exact: true })).toBeVisible()
    })

    test('删除应用需要二次确认', async ({ page, api }) => {
        await page.goto('/manage/app')
        await page.getByRole('button', { name: '删除应用' }).click()

        const confirm = page.getByRole('dialog', { name: '确认操作' })
        await expect(confirm).toContainText('是否删除应用')
        await confirm.getByRole('checkbox').check()
        await confirm.getByRole('button', { name: '确认' }).click()

        await expect.poll(() => api.lastBody('POST', '/app/delete')).toEqual({ client_id: app.client_id })
        await expect(page.getByText('暂无应用')).toBeVisible()
    })
})
