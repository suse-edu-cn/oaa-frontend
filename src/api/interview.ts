import request from '@/utils/request'
import type {
    ApiResponse,
    ApiResult,
    InterviewResultItem,
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

// 审核记录列表 /interviewer/result/list
export function getInterviewResultList(params: { term_id: number }): Promise<ApiResult<InterviewResultItem[]>> {
    return request<ApiResponse<InterviewResultItem[]>>({
        url: '/interviewer/result/list',
        method: 'GET',
        params,
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
