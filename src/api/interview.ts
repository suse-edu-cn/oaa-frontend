import request from '@/utils/request'
import type {
    ApiDownloadResult,
    ApiResponse,
    ApiResult,
    InterviewExportFields,
    InterviewExportParams,
    InterviewResultSubmitData,
    InterviewStaffCreateData,
    InterviewStaffItem,
    InterviewStaffUpdateData,
} from '@/types'

// 面试官列表 /interviewer/list
export function getInterviewStaffList(params: { term_id: number }): Promise<ApiResult<InterviewStaffItem[]>> {
    return request<ApiResponse<InterviewStaffItem[]>>({
        url: '/interviewer/list',
        method: 'GET',
        params,
    })
}

// 新建面试官 /interviewer/create
export function createInterviewStaff(data: InterviewStaffCreateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/interviewer/create',
        method: 'POST',
        data,
    })
}

// 修改面试官 /interviewer/update
export function updateInterviewStaff(data: InterviewStaffUpdateData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/interviewer/update',
        method: 'POST',
        data,
    })
}

// 删除面试官 /interviewer/delete
export function deleteInterviewStaff(interviewerId: number): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/interviewer/delete',
        method: 'POST',
        data: { interviewer_id: interviewerId },
    })
}

// 提交审核结果 /interviewer/result/create
export function createInterviewResult(data: InterviewResultSubmitData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/interviewer/result/create',
        method: 'POST',
        data,
    })
}

// 修改审核结果 /interviewer/result/update
export function updateInterviewResult(data: InterviewResultSubmitData): Promise<ApiResult<null>> {
    return request<ApiResponse<null>>({
        url: '/interviewer/result/update',
        method: 'POST',
        data,
    })
}

// 可导出的申请表字段 /interviewer/result/fields
export function getInterviewExportFields(): Promise<ApiResult<InterviewExportFields>> {
    return request<ApiResponse<InterviewExportFields>>({
        url: '/interviewer/result/fields',
        method: 'GET',
    })
}

// 导出申请表 Excel /interviewer/result/export
export function exportInterviewResults(params: InterviewExportParams): Promise<ApiDownloadResult> {
    return request<Blob | ApiResponse<unknown>>({
        url: '/interviewer/result/export',
        method: 'GET',
        params,
        responseType: 'blob',
        timeout: 120 * 1000,
    })
}
