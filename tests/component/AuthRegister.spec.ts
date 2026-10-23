import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/api/auth', () => ({ register: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { register } from '@/api/auth'
import AuthRegister from '@/components/AuthRegister.vue'
import setToast from '@/utils/setToast'
import { mountWithPrimeVue } from '../helpers/mount'

const registerMock = vi.mocked(register)
const toastMock = vi.mocked(setToast)

function mountRegister() {
    return mountWithPrimeVue(AuthRegister)
}

function inputByName(wrapper: ReturnType<typeof mountRegister>, name: string) {
    return wrapper.find(`input[name="${name}"]`)
}

async function fillForm(wrapper: ReturnType<typeof mountRegister>, studentId: string) {
    await inputByName(wrapper, 'student_id').setValue(studentId)
    await inputByName(wrapper, 'student_id').trigger('blur')
    await inputByName(wrapper, 'name').setValue('张三')
    await inputByName(wrapper, 'username').setValue('zhangsan')
    await inputByName(wrapper, 'email').setValue('zhangsan@example.com')
    await inputByName(wrapper, 'password').setValue('12345678')
}

describe('components/AuthRegister', () => {
    beforeEach(() => {
        registerMock.mockReset()
        toastMock.mockReset()
        registerMock.mockResolvedValue({ code: 200, message: 'ok', data: null })
    })

    it('11 位学号失焦后自动填入入学年份', async () => {
        const wrapper = mountRegister()

        await inputByName(wrapper, 'student_id').setValue('25101000000')
        await inputByName(wrapper, 'student_id').trigger('blur')
        await flushPromises()

        expect((inputByName(wrapper, 'grade').element as HTMLInputElement).value).toBe('2025')
    })

    it('学号未失焦时不覆盖手填的入学年份', async () => {
        const wrapper = mountRegister()

        await inputByName(wrapper, 'grade').setValue('2024')
        await inputByName(wrapper, 'student_id').setValue('25101000000')
        await flushPromises()

        expect((inputByName(wrapper, 'grade').element as HTMLInputElement).value).toBe('2024')

        await inputByName(wrapper, 'student_id').trigger('blur')
        await flushPromises()

        expect((inputByName(wrapper, 'grade').element as HTMLInputElement).value).toBe('2025')
    })

    it('12 位学号失焦后不填入入学年份', async () => {
        const wrapper = mountRegister()

        await inputByName(wrapper, 'student_id').setValue('202510000000')
        await inputByName(wrapper, 'student_id').trigger('blur')
        await flushPromises()

        expect((inputByName(wrapper, 'grade').element as HTMLInputElement).value).toBe('')
    })

    it('学号不足 11 位时失焦也不填入学年份', async () => {
        const wrapper = mountRegister()

        await inputByName(wrapper, 'student_id').setValue('25100000')
        await inputByName(wrapper, 'student_id').trigger('blur')
        await flushPromises()

        expect((inputByName(wrapper, 'grade').element as HTMLInputElement).value).toBe('')
    })

    it('提交时入学年份以数字发送', async () => {
        const wrapper = mountRegister()

        await fillForm(wrapper, '25101000000')
        await wrapper.find('#isAccepted').setValue(true)
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(registerMock).toHaveBeenCalledTimes(1)
        expect(registerMock.mock.calls[0]![0]).toEqual({
            student_id: '25101000000',
            grade: 2025,
            name: '张三',
            username: 'zhangsan',
            email: 'zhangsan@example.com',
            password: '12345678',
        })
    })

    it('学号格式不合法时不发起注册', async () => {
        const wrapper = mountRegister()

        await fillForm(wrapper, '25100000')
        await inputByName(wrapper, 'grade').setValue('2025')
        await wrapper.find('#isAccepted').setValue(true)
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(registerMock).not.toHaveBeenCalled()
    })

    it('入学年份早于实验室创立年份时不发起注册', async () => {
        const wrapper = mountRegister()

        await fillForm(wrapper, '202510000000')
        await inputByName(wrapper, 'grade').setValue('2002')
        await wrapper.find('#isAccepted').setValue(true)
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(registerMock).not.toHaveBeenCalled()
    })
})
