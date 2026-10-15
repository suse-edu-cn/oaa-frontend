import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/api/application', () => ({
    getDepartmentsByRole: vi.fn(),
    getRolesByDepartment: vi.fn(),
}))
vi.mock('@/api/term', () => ({ getTermList: vi.fn() }))
vi.mock('@/stores/org', () => ({
    useOrgStore: () => ({
        departments: [
            { id: 1, name: '项目实践部', is_active: true },
            { id: 2, name: '算法竞赛部', is_active: true },
        ],
        roles: [
            { id: 11, name: '干事', level: 20, is_active: true },
            { id: 12, name: '部长', level: 50, is_active: true },
        ],
        ensureLoaded: vi.fn(),
    }),
}))
vi.mock('@/utils/uploader', () => ({ uploadImage: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { getDepartmentsByRole, getRolesByDepartment } from '@/api/application'
import { getTermList } from '@/api/term'
import ApplicationForm from '@/components/ApplicationForm.vue'
import { uploadImage } from '@/utils/uploader'
import setToast from '@/utils/setToast'
import type { ApplicationFormData, ApplicationFormPrefill } from '@/types'
import { makeDepartment, makeRole } from '../helpers/factories'
import { mountWithPrimeVue } from '../helpers/mount'
import { SelectStub } from '../helpers/primevueStubs'

const termMock = vi.mocked(getTermList)
const rolesMock = vi.mocked(getRolesByDepartment)
const departmentsMock = vi.mocked(getDepartmentsByRole)
const uploadMock = vi.mocked(uploadImage)
const toastMock = vi.mocked(setToast)

function makeInitial(overrides: Partial<ApplicationFormPrefill> = {}): ApplicationFormPrefill {
    return {
        name: '张三',
        student_id: '20260001',
        termId: 1,
        college: '计算机学院',
        major_class: '计科241',
        gender: '男',
        phone: '13800138000',
        qq: '123456',
        political_status: '共青团员',
        birth_date: '2006-01-05',
        avatar: 'oss://avatar.png',
        avatar_url: 'https://obj.suseoaa.com/avatar.png',
        firstDept: 1,
        firstRole: 11,
        secondDept: 2,
        secondRole: 12,
        allow_adjust: true,
        resume: '个人简历',
        reason: '申请理由',
        ...overrides,
    }
}

async function mountForm(
    initial: ApplicationFormPrefill = makeInitial(),
    props: { termDisabled?: boolean; submitting?: boolean } = {}
) {
    const wrapper = mountWithPrimeVue(ApplicationForm, {
        props: { initial, ...props },
    })
    await flushPromises()
    return wrapper
}

function findDeptSelects(wrapper: Awaited<ReturnType<typeof mountForm>>) {
    return wrapper.findAllComponents(SelectStub).filter((select) => select.props('placeholder') === '请选择部门')
}

function findRoleSelects(wrapper: Awaited<ReturnType<typeof mountForm>>) {
    return wrapper.findAllComponents(SelectStub).filter((select) => select.props('placeholder') === '请选择职位')
}

beforeEach(() => {
    termMock.mockReset()
    rolesMock.mockReset()
    departmentsMock.mockReset()
    uploadMock.mockReset()
    toastMock.mockReset()

    termMock.mockResolvedValue({
        code: 200,
        message: 'ok',
        data: [{ id: 1, title: '2026 秋季招新' }],
    } as never)
    rolesMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeRole()] })
    departmentsMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeDepartment()] })
    uploadMock.mockResolvedValue({ uri: 'oss://avatar.png', url: 'https://obj.suseoaa.com/avatar.png' })
})

describe('components/ApplicationForm', () => {
    it('渲染预填数据，姓名与学号只读', async () => {
        const wrapper = await mountForm()

        const disabledInputs = wrapper.findAll('input[disabled]').map((input) => input.element as HTMLInputElement)
        expect(disabledInputs.map((input) => input.value)).toEqual(['张三', '20260001'])
        expect(wrapper.find<HTMLInputElement>('input[placeholder="请输入学院"]').element.value).toBe('计算机学院')
    })

    it('初始未交互时不显示校验错误', async () => {
        const wrapper = await mountForm({})

        expect(wrapper.text()).not.toContain('请填写学院')
        expect(wrapper.text()).not.toContain('请选择申请周期')
    })

    it('修改手机号后立即显示错误，改回合法值后消失', async () => {
        const wrapper = await mountForm()
        const phone = wrapper.find<HTMLInputElement>('input[placeholder="请输入手机号"]')

        await phone.setValue('123')
        expect(wrapper.text()).toContain('请填写有效的手机号')

        await phone.setValue('13800138000')
        expect(wrapper.text()).not.toContain('请填写有效的手机号')
    })

    it('未勾选信息属实时不能提交', async () => {
        const wrapper = await mountForm()
        const submit = wrapper.find('button')

        expect(submit.attributes('disabled')).toBeDefined()
        await submit.trigger('click')

        expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('勾选后提交，payload 与周期正确', async () => {
        const wrapper = await mountForm()

        await wrapper.find('.confirm-row input[type="checkbox"]').setValue(true)
        await wrapper.find('button').trigger('click')

        const emitted = wrapper.emitted('submit')
        expect(emitted).toHaveLength(1)
        const [payload, termId] = emitted![0] as [ApplicationFormData, number | null]
        expect(payload).toMatchObject({
            birth_date: '2006-01-05',
            first_choice: { department_id: 1, role_id: 11 },
            second_choice: { department_id: 2, role_id: 12 },
            allow_adjust: true,
        })
        expect(termId).toBe(1)
    })

    it('termDisabled 时不校验周期也能提交', async () => {
        const wrapper = await mountForm(makeInitial({ termId: null }), { termDisabled: true })

        expect(wrapper.text()).not.toContain('请选择申请周期')
        await wrapper.find('.confirm-row input[type="checkbox"]').setValue(true)
        await wrapper.find('button').trigger('click')

        const emitted = wrapper.emitted('submit')
        expect(emitted).toHaveLength(1)
        expect(emitted![0][1]).toBeNull()
    })

    it('下拉选项加载完成前显示骨架，完成后渲染下拉', async () => {
        let resolveTerms!: (value: unknown) => void
        termMock.mockReturnValue(
            new Promise((resolve) => {
                resolveTerms = resolve
            }) as never
        )

        const wrapper = mountWithPrimeVue(ApplicationForm, { props: { initial: makeInitial() } })
        await flushPromises()

        expect(wrapper.findAll('[data-testid="skeleton"]')).toHaveLength(5)
        expect(wrapper.findAllComponents(SelectStub)).toHaveLength(1)

        resolveTerms({ code: 200, message: 'ok', data: [] })
        await flushPromises()

        expect(wrapper.findAll('[data-testid="skeleton"]')).toHaveLength(0)
        expect(wrapper.findAllComponents(SelectStub)).toHaveLength(6)
    })

    it('切换第一志愿部门会清空职位并重新请求职位列表', async () => {
        const wrapper = await mountForm()
        rolesMock.mockClear()

        const deptSelect = findDeptSelects(wrapper)[0]
        deptSelect.vm.$emit('update:modelValue', 2)
        deptSelect.vm.$emit('change')
        await flushPromises()

        expect(rolesMock).toHaveBeenCalledWith(2)
        expect(findRoleSelects(wrapper)[0].props('modelValue')).toBeNull()
    })

    it('上传成功后写入头像并提示', async () => {
        const wrapper = await mountForm(makeInitial({ avatar_url: 'https://obj.suseoaa.com/old.png' }))
        uploadMock.mockResolvedValue({ uri: 'oss://new-avatar.png', url: 'https://obj.suseoaa.com/new.png' })
        const file = new File(['x'], 'avatar.png', { type: 'image/png' })
        const input = wrapper.find<HTMLInputElement>('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

        await input.trigger('change')
        await flushPromises()

        expect(uploadMock).toHaveBeenCalledWith(file, 'application')
        expect(toastMock).toHaveBeenCalledWith('success', '头像上传成功', '')
        expect(wrapper.find('.form-image img').attributes('src')).toBe('https://obj.suseoaa.com/new.png')
    })

    it('上传失败时保持原头像', async () => {
        const wrapper = await mountForm(makeInitial({ avatar_url: 'https://obj.suseoaa.com/old.png' }))
        uploadMock.mockResolvedValue(null)
        const file = new File(['x'], 'avatar.png', { type: 'image/png' })
        const input = wrapper.find<HTMLInputElement>('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

        await input.trigger('change')
        await flushPromises()

        expect(wrapper.find('.form-image img').attributes('src')).toBe('https://obj.suseoaa.com/old.png')
        expect(toastMock).not.toHaveBeenCalledWith('success', '头像上传成功', '')
    })
})
