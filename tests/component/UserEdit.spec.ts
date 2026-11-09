import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/user', () => ({ updateCurrentUser: vi.fn() }))
vi.mock('@/utils/initAuthStore', () => ({ initAuthStore: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { updateCurrentUser } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import setToast from '@/utils/setToast'
import UserEdit from '@/views/user/edit.vue'
import { setAuthCookies } from '../helpers/auth'
import { makeUser } from '../helpers/factories'
import { primevueStubs } from '../helpers/primevueStubs'

const updateMock = vi.mocked(updateCurrentUser)
const toastMock = vi.mocked(setToast)

async function mountView(avatarUri = 'oss://avatar.png') {
    const pinia = createPinia()
    setActivePinia(pinia)
    setAuthCookies()
    const authStore = useAuthStore()
    authStore.hydrate()
    authStore.setUserInfo(
        makeUser({
            username: 'tester',
            email: 'tester@example.com',
            avatar: { uri: avatarUri, url: 'https://obj.suseoaa.com/avatar.png' },
        })
    )
    authStore.markReady()

    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/user/edit', component: UserEdit },
            { path: '/user', component: { template: '<div />' } },
        ],
    })
    await router.push('/user/edit')
    await router.isReady()

    const wrapper = mount(UserEdit, { global: { plugins: [pinia, router], stubs: primevueStubs } })
    await flushPromises()
    return wrapper
}

describe('views/user/edit 编辑个人资料', () => {
    beforeEach(() => {
        updateMock.mockReset()
        toastMock.mockReset()
        updateMock.mockResolvedValue({ code: 200, message: 'ok', data: null })
    })

    it('提交前 trim 用户名与邮箱', async () => {
        const wrapper = await mountView()
        await wrapper.find('input[name="username"]').setValue('  tester  ')
        await wrapper.find('input[name="email"]').setValue('  tester@example.com  ')

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(updateMock).toHaveBeenCalledWith({
            username: 'tester',
            email: 'tester@example.com',
            avatar: 'oss://avatar.png',
        })
    })

    it('头像为空时显示错误且不提交', async () => {
        const wrapper = await mountView('')

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.text()).toContain('请上传有效的头像')
        expect(updateMock).not.toHaveBeenCalled()
        expect(toastMock).toHaveBeenCalledWith('warn', '请完善个人信息', '请上传有效的头像')
    })

    it('邮箱非法时显示内联错误且不提交', async () => {
        const wrapper = await mountView()
        await wrapper.find('input[name="email"]').setValue('not-an-email')

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.text()).toContain('请填写有效的邮箱')
        expect(updateMock).not.toHaveBeenCalled()
    })
})
