import request from '@/utils/request'
import type { ApiResponse, ApiResult, TermCreateData, TermInfo, TermUpdateData } from '@/types'

// 周期列表 /term/list
export function getTermList(): Promise<ApiResult<TermInfo[]>> {
    return request<ApiResponse<TermInfo[]>>({
        url: '/term/list',
        method: 'GET',
    })
}

// 新建周期 /term/create
export function createTerm(data: TermCreateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/term/create',
        method: 'POST',
        data,
    })
}

// 修改周期 /term/update
export function updateTerm(data: TermUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/term/update',
        method: 'POST',
        data,
    })
}

// 删除周期 /term/delete
export function deleteTerm(termId: number): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/term/delete',
        method: 'POST',
        data: { term_id: termId },
    })
}
