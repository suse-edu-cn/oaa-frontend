import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/term', () => ({ getTermList: vi.fn() }))
vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { getTermList } from '@/api/term'
import { useTermStore } from '@/stores/term'
import setToast from '@/utils/setToast'
import { deferred } from '../helpers/deferred'
import { makeTerm } from '../helpers/factories'
import type { ApiResult, TermInfo } from '@/types'

const termListMock = vi.mocked(getTermList)
const toastMock = vi.mocked(setToast)

beforeEach(() => {
    setActivePinia(createPinia())
    termListMock.mockReset()
    toastMock.mockReset()
})

describe('stores/term', () => {
    it('首次 ensureLoaded 拉取周期并写入缓存', async () => {
        termListMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeTerm()] })
        const store = useTermStore()

        await store.ensureLoaded()

        expect(store.terms).toHaveLength(1)
        expect(store.loaded).toBe(true)
        expect(termListMock).toHaveBeenCalledTimes(1)
    })

    it('已加载后 ensureLoaded 命中缓存', async () => {
        termListMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeTerm()] })
        const store = useTermStore()

        await store.ensureLoaded()
        await store.ensureLoaded()

        expect(termListMock).toHaveBeenCalledTimes(1)
    })

    it('并发 ensureLoaded 共享同一次请求', async () => {
        const pending = deferred<ApiResult<TermInfo[]>>()
        termListMock.mockReturnValue(pending.promise)
        const store = useTermStore()

        const first = store.ensureLoaded()
        const second = store.ensureLoaded()

        expect(store.loading).toBe(true)
        expect(termListMock).toHaveBeenCalledTimes(1)

        pending.resolve({ code: 200, message: 'ok', data: [makeTerm()] })

        await expect(first).resolves.toBe(true)
        await expect(second).resolves.toBe(true)
        expect(store.loading).toBe(false)
        expect(store.loaded).toBe(true)
        expect(termListMock).toHaveBeenCalledTimes(1)
    })

    it('失败时提示并允许下次重试', async () => {
        termListMock.mockResolvedValueOnce({ code: 500, message: '周期服务异常', data: null } as never)
        const store = useTermStore()

        await store.ensureLoaded()

        expect(store.terms).toEqual([])
        expect(store.loaded).toBe(false)
        expect(toastMock).toHaveBeenCalledWith('error', '获取活动周期列表失败', '周期服务异常')

        termListMock.mockResolvedValueOnce({ code: 200, message: 'ok', data: [makeTerm()] })
        await store.ensureLoaded()

        expect(store.loaded).toBe(true)
        expect(store.terms).toHaveLength(1)
        expect(termListMock).toHaveBeenCalledTimes(2)
    })

    it('refresh 无视缓存重新请求', async () => {
        termListMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeTerm()] })
        const store = useTermStore()

        await store.ensureLoaded()
        termListMock.mockResolvedValueOnce({
            code: 200,
            message: 'ok',
            data: [makeTerm({ id: 8, title: '2027 春季换届' })],
        })

        await store.refresh()

        expect(termListMock).toHaveBeenCalledTimes(2)
        expect(store.terms[0].id).toBe(8)
        expect(store.terms[0].title).toBe('2027 春季换届')
    })
})
