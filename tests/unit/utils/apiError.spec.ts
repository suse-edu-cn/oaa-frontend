import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/setToast', () => ({ default: vi.fn() }))

import { UNKNOWN_ERROR, toApiFailure, toastApiError } from '@/utils/apiError'
import setToast from '@/utils/setToast'

const toastMock = vi.mocked(setToast)

beforeEach(() => {
    toastMock.mockReset()
})

describe('utils/apiError', () => {
    it('undefined 视为网络失败并使用兜底文案', () => {
        expect(toApiFailure()).toEqual({ kind: 'network', message: UNKNOWN_ERROR })
    })

    it('后端响应保留 code 与 message', () => {
        expect(toApiFailure({ code: 500, message: '服务异常', data: null })).toEqual({
            kind: 'response',
            code: 500,
            message: '服务异常',
        })
    })

    it('后端 message 为空时使用兜底文案', () => {
        expect(toApiFailure({ code: 500, message: '', data: null })).toEqual({
            kind: 'response',
            code: 500,
            message: UNKNOWN_ERROR,
        })
    })

    it('toastApiError 使用统一兜底文案', () => {
        toastApiError('获取列表失败', undefined)

        expect(toastMock).toHaveBeenCalledWith('error', '获取列表失败', UNKNOWN_ERROR)
    })

    it('toastApiError 优先使用后端 message', () => {
        toastApiError('获取列表失败', { code: 403, message: '无权限', data: null })

        expect(toastMock).toHaveBeenCalledWith('error', '获取列表失败', '无权限')
    })
})
