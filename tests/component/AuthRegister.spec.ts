import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/api/auth', () => ({ register: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { register } from '@/api/auth'
import AuthRegister from '@/components/AuthRegister.vue'
import setToast from '@/utils/setToast'
import { mountWithPrimeVue } from '../helpers/mount'

const registerMock = vi.mocked(register)
const toastMock = vi.mocked(setToast)

/** 校验依赖当前年份，测试固定在这一年 */
const CURRENT_YEAR = 2026

function mountRegister() {
    return mountWithPrimeVue(AuthRegister)
}

function inputByName(wrapper: ReturnType<typeof mountRegister>, name: string) {
    return wrapper.find(`input[name="${name}"]`)
}

function inputValue(wrapper: ReturnType<typeof mountRegister>, name: string) {
    return (inputByName(wrapper, name).element as HTMLInputElement).value
}

async function fillForm(wrapper: ReturnType<typeof mountRegister>, studentId: string) {
    await inputByName(wrapper, 'student_id').setValue(studentId)
    await inputByName(wrapper, 'student_id').trigger('blur')
    await inputByName(wrapper, 'name').setValue('张三')
    await inputByName(wrapper, 'username').setValue('zhangsan')
    await inputByName(wrapper, 'email').setValue('zhangsan@example.com')
    await inputByName(wrapper, 'password').setValue('12345678')
}

async function submit(wrapper: ReturnType<typeof mountRegister>) {
    await wrapper.find('#isAccepted').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
}

describe('components/AuthRegister', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-30T10:00:00+08:00'))
        expect(new Date().getFullYear()).toBe(CURRENT_YEAR)

        registerMock.mockReset()
        toastMock.mockReset()
        registerMock.mockResolvedValue({ code: 200, message: 'ok', data: null })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('入学年份自动填写', () => {
        it('11 位学号失焦后取前两位', async () => {
            const wrapper = mountRegister()

            await inputByName(wrapper, 'student_id').setValue('25101000000')
            await inputByName(wrapper, 'student_id').trigger('blur')
            await flushPromises()

            expect(inputValue(wrapper, 'grade')).toBe('2025')
        })

        it('首位为 3 的 12 位学号失焦后取第 2~3 位', async () => {
            const wrapper = mountRegister()

            await inputByName(wrapper, 'student_id').setValue('326010000000')
            await inputByName(wrapper, 'student_id').trigger('blur')
            await flushPromises()

            expect(inputValue(wrapper, 'grade')).toBe('2026')
        })

        it('学号未失焦时不覆盖手填的入学年份', async () => {
            const wrapper = mountRegister()

            await inputByName(wrapper, 'grade').setValue('2027')
            await inputByName(wrapper, 'student_id').setValue('26101000000')
            await flushPromises()

            expect(inputValue(wrapper, 'grade')).toBe('2027')

            await inputByName(wrapper, 'student_id').trigger('blur')
            await flushPromises()

            expect(inputValue(wrapper, 'grade')).toBe('2026')
        })

        it('首位不为 3 的 12 位学号不回填', async () => {
            const wrapper = mountRegister()

            await inputByName(wrapper, 'student_id').setValue('202510000000')
            await inputByName(wrapper, 'student_id').trigger('blur')
            await flushPromises()

            expect(inputValue(wrapper, 'grade')).toBe('')
        })

        it('学号不足 11 位时失焦也不回填', async () => {
            const wrapper = mountRegister()

            await inputByName(wrapper, 'student_id').setValue('25100000')
            await inputByName(wrapper, 'student_id').trigger('blur')
            await flushPromises()

            expect(inputValue(wrapper, 'grade')).toBe('')
        })
    })

    describe('注册提交', () => {
        it('提交时入学年份以数字发送', async () => {
            const wrapper = mountRegister()

            await fillForm(wrapper, '26101000000')
            await submit(wrapper)

            expect(registerMock).toHaveBeenCalledTimes(1)
            expect(registerMock.mock.calls[0]![0]).toEqual({
                student_id: '26101000000',
                grade: 2026,
                name: '张三',
                username: 'zhangsan',
                email: 'zhangsan@example.com',
                password: '12345678',
            })
        })

        it('首位为 3 的 12 位学号可以注册', async () => {
            const wrapper = mountRegister()

            await fillForm(wrapper, '326010000000')
            await submit(wrapper)

            expect(registerMock).toHaveBeenCalledTimes(1)
            expect(registerMock.mock.calls[0]![0].student_id).toBe('326010000000')
            expect(registerMock.mock.calls[0]![0].grade).toBe(2026)
        })

        it('学号位数不足时不发起注册', async () => {
            const wrapper = mountRegister()

            await fillForm(wrapper, '25100000')
            await inputByName(wrapper, 'grade').setValue(String(CURRENT_YEAR))
            await submit(wrapper)

            expect(registerMock).not.toHaveBeenCalled()
        })

        it('首位不为 3 的 12 位学号视为格式错误，不发起注册', async () => {
            const wrapper = mountRegister()

            await fillForm(wrapper, '202510000000')
            await inputByName(wrapper, 'grade').setValue(String(CURRENT_YEAR))
            await submit(wrapper)

            expect(registerMock).not.toHaveBeenCalled()
        })

        it('入学年份早于当前年份时不发起注册', async () => {
            const wrapper = mountRegister()

            await fillForm(wrapper, '26101000000')
            await inputByName(wrapper, 'grade').setValue(String(CURRENT_YEAR - 1))
            await submit(wrapper)

            expect(registerMock).not.toHaveBeenCalled()
        })
    })
})
