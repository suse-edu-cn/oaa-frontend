import { expect, makeApplication, makeExportFields, makeTerm, makeUser, test } from './fixtures'

test.describe('审核申请', () => {
    test('三个 Tab 按 has_result 拉取并用卡片渲染，已审核走修改审核', async ({ page, api, signIn }) => {
        const term = makeTerm()
        api.scenario = {
            user: makeUser({ role_level: 50 }),
            terms: [term],
            applications: [
                makeApplication({ id: 1, name: '待审核同学' }),
                makeApplication({
                    id: 2,
                    name: '已审核同学',
                    decision: '录取第一志愿',
                    result: { department_id: 1, role_id: 1 },
                    operator_user_id: 2,
                    decision_remark: '表现优秀',
                }),
            ],
        }
        await signIn()

        await page.goto('/apply/review')
        await expect(page.getByRole('heading', { name: '审核申请' })).toBeVisible()

        // 三个 Tab 各自对应一次 /application/list 请求
        await expect.poll(() => api.count('GET', '/application/list')).toBe(3)

        const tab = (name: string) => page.getByRole('tab', { name: new RegExp(name) })
        await expect(tab('全部申请')).toContainText('2')
        await expect(tab('未审核')).toContainText('1')
        await expect(tab('已审核')).toContainText('1')

        // 未审核 -> 审核申请，已审核 -> 修改审核
        // 全部申请
        await expect(page.getByText('待审核同学')).toBeVisible()
        await expect(page.getByText('已审核同学')).toBeVisible()
        await expect(page.getByRole('button', { name: '审核申请' })).toHaveCount(1)
        await expect(page.getByRole('button', { name: '修改审核' })).toHaveCount(1)

        // 未审核
        await tab('未审核').click()
        await expect(page.getByText('待审核同学')).toBeVisible()
        await expect(page.getByText('已审核同学')).toHaveCount(0)
        await expect(page.getByRole('button', { name: '修改审核' })).toHaveCount(0)

        // 已审核
        await tab('已审核').click()
        await expect(page.getByText('已审核同学')).toBeVisible()
        await page.getByRole('button', { name: '修改审核' }).click()
        await expect(page.getByRole('dialog').getByText('修改审核')).toBeVisible()

        // 未审核弹窗
        await page.getByRole('button', { name: '取消' }).click()
        await tab('未审核').click()
        await page.getByRole('button', { name: '审核申请' }).click()
        await expect(page.getByRole('dialog').getByText('审核申请')).toBeVisible()
        await expect(page.getByText('审核结果')).toBeVisible()
    })

    test('每页 10 条申请信息', async ({ page, api, signIn }) => {
        const applications = Array.from({ length: 12 }, (_, index) =>
            makeApplication({ id: index + 1, name: `申请人${String(index + 1).padStart(2, '0')}` })
        )
        api.scenario = { user: makeUser({ role_level: 50 }), terms: [makeTerm()], applications }
        await signIn()

        await page.goto('/apply/review')
        await expect(page.getByRole('heading', { name: '审核申请' })).toBeVisible()

        // 第一页 10 条
        await expect(page.getByText('申请人01')).toBeVisible()
        await expect(page.getByText('申请人10')).toBeVisible()
        await expect(page.getByText('申请人11')).toHaveCount(0)

        // 第二页 2 条
        const paginator = page.locator('.p-paginator')
        const tabList = page.getByRole('tablist')
        await paginator.scrollIntoViewIfNeeded()
        await page.locator('.p-paginator-page').filter({ hasText: /^2$/ }).click()
        await expect(page.getByText('申请人11')).toBeVisible()
        await expect(page.getByText('申请人12')).toBeVisible()
        await expect(page.getByText('申请人01')).toHaveCount(0)
        await expect.poll(async () => Math.abs((await tabList.boundingBox())?.y ?? 9999)).toBeLessThan(150)

        // 切 Tab 回到第一页
        await page.getByRole('tab', { name: /未审核/ }).click()
        await expect(page.getByText('申请人01')).toBeVisible()
    })

    test('打开导出弹窗加载字段，按勾选列下载申请表', async ({ page, api, signIn }) => {
        api.scenario = {
            user: makeUser({ role_level: 80 }),
            terms: [makeTerm()],
            applications: [makeApplication()],
            exportFields: makeExportFields(),
        }
        await signIn()

        await page.goto('/apply/review')
        await expect(page.getByRole('heading', { name: '审核申请' })).toBeVisible()

        await page.getByRole('button', { name: '导出申请表' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog.getByText('导出字段', { exact: true })).toBeVisible()
        await expect.poll(() => api.count('GET', '/interviewer/result/fields')).toBe(1)
        await expect(dialog.getByRole('checkbox')).toHaveCount(22)

        // 字段标签完全来自接口响应，取消 index 0 与 index 3，位状态应为 0110...
        await dialog.getByText('导出字段 0', { exact: true }).click()
        await dialog.getByText('导出字段 3', { exact: true }).click()
        await expect(dialog.getByRole('checkbox').nth(0)).not.toBeChecked()
        await expect(dialog.getByRole('checkbox').nth(3)).not.toBeChecked()

        // 部门 / 审核状态筛选
        const option = (name: string) =>
            page.locator('.p-select-overlay:visible').last().getByRole('option', { name, exact: true })
        const combos = dialog.getByRole('combobox')
        await combos.nth(1).click()
        await option('宣传部').click()
        await combos.nth(2).click()
        await option('未审核').click()

        const exportRequest = page.waitForRequest((req) => req.url().includes('/interviewer/result/export'))
        const downloadPromise = page.waitForEvent('download')
        await dialog.getByRole('button', { name: '导出', exact: true }).click()

        const requestUrl = new URL((await exportRequest).url())
        expect(requestUrl.searchParams.get('term_id')).toBe('7')
        expect(requestUrl.searchParams.get('department_id')).toBe('2')
        expect(requestUrl.searchParams.get('has_result')).toBe('false')
        expect(requestUrl.searchParams.get('fields')).toBe('0110' + '1'.repeat(18))

        const download = await downloadPromise
        expect(download.suggestedFilename()).toBe('2026 秋季招新_面试结果.xlsx')
    })
})
