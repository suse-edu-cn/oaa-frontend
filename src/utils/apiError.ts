import setToast from './setToast'
import type { ApiResult } from '@/types'

export const UNKNOWN_ERROR = '未知错误，请联系负责后端的同学'

export type ApiFailure = { kind: 'network'; message: string } | { kind: 'response'; code: number; message: string }

/* 把 request 的返回归一为失败信息 */
export function toApiFailure(resp?: ApiResult<unknown>): ApiFailure {
    if (!resp) return { kind: 'network', message: UNKNOWN_ERROR }
    return { kind: 'response', code: resp.code, message: resp.message || UNKNOWN_ERROR }
}

/* 统一的失败提示入口 */
export function toastApiError(action: string, resp?: ApiResult<unknown>): void {
    setToast('error', action, toApiFailure(resp).message)
}
