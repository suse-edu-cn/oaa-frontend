import { expect, makeApplication, makeTerm, makeUser, test } from './fixtures'

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

        // 全部申请
        await expect(page.getByText('待审核同学')).toBeVisible()
        await expect(page.getByText('已审核同学')).toBeVisible()

        // 未审核
        await tab('未审核').click()
        await expect(page.getByText('待审核同学')).toBeVisible()
        await expect(page.getByText('已审核同学')).toHaveCount(0)

        // 已审核弹窗内容
        await tab('已审核').click()
        await expect(page.getByText('已审核同学')).toBeVisible()
        await page.getByRole('button', { name: '审核申请' }).click()
        await expect(page.getByText('修改审核')).toBeVisible()

        // 未审核弹窗内容
        await page.getByRole('button', { name: '取消' }).click()
        await tab('未审核').click()
        await page.getByRole('button', { name: '审核申请' }).click()
        await expect(page.getByText('审核结果')).toBeVisible()
        await expect(page.getByText('修改审核')).toHaveCount(0)
    })
})
