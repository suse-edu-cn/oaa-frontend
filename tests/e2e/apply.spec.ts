import { expect, makeTerm, makeUser, test } from './fixtures'

test.describe('招新申请', () => {
    test('手机号校验、必填确认与提交成功', async ({ page, api, signIn }) => {
        const term = makeTerm()
        api.scenario = { user: makeUser(), terms: [term], applications: [] }
        await signIn()

        await page.goto('/apply/new')
        await expect(page.getByRole('heading', { name: '添加新申请' })).toBeVisible()

        const termSection = page.locator('.form-section', { hasText: '申请周期' })
        const termSelect = termSection.getByRole('combobox')
        await expect(termSelect).toBeVisible()

        // 活动周期
        await termSelect.click()
        await page.getByRole('option', { name: term.title, exact: true }).click()

        // 个人信息
        const personal = page.locator('.form-section', { hasText: '个人信息' })
        await personal.getByRole('combobox', { name: '请选择', exact: true }).click()
        await page.getByRole('option', { name: '男', exact: true }).click()
        await page.getByPlaceholder('请选择出生日期').fill('2005-01-05')
        await page.getByPlaceholder('请选择出生日期').press('Enter')
        await page.getByPlaceholder('请输入学院').fill('计算机科学与工程学院')
        await page.getByPlaceholder('如：计科241').fill('计科241')
        await page.getByPlaceholder('请输入政治面貌').fill('共青团员')
        // 手机号
        const phone = page.getByPlaceholder('请输入手机号')
        await phone.fill('123')
        await phone.blur()
        await expect(page.getByText('请填写有效的手机号')).toBeVisible()
        await phone.fill('13800138000')
        await expect(page.getByText('请填写有效的手机号')).toHaveCount(0)

        await page.getByPlaceholder('请输入 QQ 号').fill('123456789')

        // 上传头像
        await page.locator('input[type="file"]').setInputFiles({
            name: 'avatar.png',
            mimeType: 'image/png',
            buffer: Buffer.from('e2e-avatar'),
        })
        await expect(page.getByText('头像上传成功')).toBeVisible()
        await expect(page.locator('img[alt="照片"]')).toBeVisible()

        // 志愿
        const firstChoice = page.locator('.form-section', { hasText: '第一志愿' }).locator('.form-grid').first()
        await firstChoice.getByRole('combobox').nth(0).click()
        await page.getByRole('option', { name: '项目实践部', exact: true }).click()
        await firstChoice.getByRole('combobox').nth(1).click()
        await page.getByRole('option', { name: '干事', exact: true }).click()
        const secondChoice = page.locator('.form-section', { hasText: '第二志愿' }).locator('.form-grid').nth(1)
        await secondChoice.getByRole('combobox').nth(0).click()
        await page.getByRole('option', { name: '宣传部', exact: true }).click()
        await secondChoice.getByRole('combobox').nth(1).click()
        await page.getByRole('option', { name: '部长', exact: true }).click()

        // 材料
        await page.getByPlaceholder('个人经历、项目经历等').fill('参与过开源项目维护。')
        await page.getByPlaceholder('希望加入的理由').fill('希望和协会一起做有意思的项目。')

        const submit = page.getByRole('button', { name: '提交申请' })
        await expect(submit).toBeDisabled()

        await page.getByText('我确认以上填写信息均属实').click()
        await expect(submit).toBeEnabled()

        await submit.click()

        await expect(page.getByText('申请提交成功，请等待审核')).toBeVisible()
        await expect(page).toHaveURL(/\/apply$/)
        await expect(page.getByRole('heading', { name: '我的申请' })).toBeVisible()

        expect(api.lastBody('POST', '/application/create')).toMatchObject({
            term_id: term.id,
            phone: '13800138000',
            first_choice: { department_id: 1, role_id: 1 },
            second_choice: { department_id: 2, role_id: 2 },
        })
    })
})
