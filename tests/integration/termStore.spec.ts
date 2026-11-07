import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
    vi.useRealTimers()
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

    it('加载周期时计算 isInTerm，覆盖申请提交期、面试审核期与区间外', async () => {
        vi.useFakeTimers()
        termListMock.mockResolvedValue({ code: 200, message: 'ok', data: [makeTerm()] })
        const store = useTermStore()

        // 每次 refresh 都按当前时间重新判定
        async function checkAt(iso: string) {
            vi.setSystemTime(new Date(iso))
            await store.refresh()
            return store.isInTerm
        }

        // 申请提交期 2026-08-01 ~ 08-31、面试审核期 2026-09-01 ~ 09-30 均算在周期内，且边界包含
        expect(await checkAt('2026-08-01T12:00:00+08:00')).toBe(true)
        expect(await checkAt('2026-08-31T12:00:00+08:00')).toBe(true)
        expect(await checkAt('2026-09-15T12:00:00+08:00')).toBe(true)
        expect(await checkAt('2026-09-30T12:00:00+08:00')).toBe(true)
        // 周期开始前 / 结束后
        expect(await checkAt('2026-07-31T12:00:00+08:00')).toBe(false)
        expect(await checkAt('2026-10-01T12:00:00+08:00')).toBe(false)
    })

    it('isInTerm 在无周期时为 false，多个周期任一命中为 true', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-15T12:00:00+08:00'))
        termListMock.mockResolvedValue({ code: 200, message: 'ok', data: [] })
        const store = useTermStore()

        await store.ensureLoaded()
        expect(store.isInTerm).toBe(false)

        termListMock.mockResolvedValue({
            code: 200,
            message: 'ok',
            data: [
                makeTerm({
                    id: 6,
                    edit_period: { start_at: '2026-03-01', end_at: '2026-03-31' },
                    query_period: { start_at: '2026-04-01', end_at: '2026-04-30' },
                }),
                makeTerm(),
            ],
        })
        await store.refresh()

        expect(store.isInTerm).toBe(true)
    })
})
