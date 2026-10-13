import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/org', () => ({
    getDepartmentList: vi.fn(),
    getRoleList: vi.fn(),
}))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { getDepartmentList, getRoleList } from '@/api/org'
import { useOrgStore } from '@/stores/org'
import setToast from '@/utils/setToast'
import { makeDepartment, makeRole } from '../helpers/factories'

const departmentMock = vi.mocked(getDepartmentList)
const roleMock = vi.mocked(getRoleList)
const toastMock = vi.mocked(setToast)

beforeEach(() => {
    setActivePinia(createPinia())
    departmentMock.mockReset()
    roleMock.mockReset()
    toastMock.mockReset()
})

describe('stores/org', () => {
    it('首次 ensureLoaded 拉取部门与职位', async () => {
        departmentMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeDepartment()] })
        roleMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeRole()] })
        const store = useOrgStore()

        await store.ensureLoaded()

        expect(store.departments).toHaveLength(1)
        expect(store.roles).toHaveLength(1)
        expect(store.loaded).toBe(true)
        expect(departmentMock).toHaveBeenCalledTimes(1)
        expect(roleMock).toHaveBeenCalledTimes(1)
    })

    it('已加载后 ensureLoaded 命中缓存', async () => {
        departmentMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeDepartment()] })
        roleMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeRole()] })
        const store = useOrgStore()

        await store.ensureLoaded()
        await store.ensureLoaded()

        expect(departmentMock).toHaveBeenCalledTimes(1)
        expect(roleMock).toHaveBeenCalledTimes(1)
    })

    it('部分失败时不置 loaded，并在下次重试', async () => {
        departmentMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeDepartment()] })
        roleMock.mockResolvedValue({ code: 500, message: '职位信息获取失败', data: null } as never)
        const store = useOrgStore()

        await store.ensureLoaded()

        expect(store.departments).toHaveLength(1)
        expect(store.roles).toEqual([])
        expect(store.loaded).toBe(false)
        expect(toastMock).toHaveBeenCalledWith('error', '获取职位列表失败', '职位信息获取失败')

        roleMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeRole()] })
        await store.ensureLoaded()

        expect(store.loaded).toBe(true)
        expect(store.roles).toHaveLength(1)
        expect(departmentMock).toHaveBeenCalledTimes(2)
        expect(roleMock).toHaveBeenCalledTimes(2)
    })

    it('两个接口都失败时分别提示', async () => {
        departmentMock.mockResolvedValue({ code: 500, message: '部门信息获取失败', data: null } as never)
        roleMock.mockResolvedValue({ code: 500, message: '职位信息获取失败', data: null } as never)
        const store = useOrgStore()

        await store.ensureLoaded()

        expect(store.departments).toEqual([])
        expect(store.roles).toEqual([])
        expect(store.loaded).toBe(false)
        expect(toastMock).toHaveBeenCalledTimes(2)
        expect(toastMock).toHaveBeenCalledWith('error', '获取部门列表失败', '部门信息获取失败')
        expect(toastMock).toHaveBeenCalledWith('error', '获取职位列表失败', '职位信息获取失败')
    })

    it('refresh 无视缓存重新请求', async () => {
        departmentMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeDepartment()] })
        roleMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeRole()] })
        const store = useOrgStore()

        await store.ensureLoaded()
        departmentMock.mockResolvedValue({
            code: 200,
            message: 'ok',
            data: [makeDepartment({ id: 2, name: '算法竞赛部' })],
        })

        await store.refresh()

        expect(departmentMock).toHaveBeenCalledTimes(2)
        expect(roleMock).toHaveBeenCalledTimes(2)
        expect(store.departments[0].name).toBe('算法竞赛部')
    })
})
